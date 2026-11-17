// Cadastro de equipamento (skill ficha-equipamento / comando /novo-equipamento):
// Wikidata (specs, CC0) → Wikipedia (resumo, CC BY-SA 4.0) → Commons (fotos livres) → linha de `equipamentos` + `midias`.
// Nada é preenchido de memória: o que as fontes não têm fica vazio e entra no relatório.
import { parse } from "yaml";
import { z } from "zod";
import { criarClienteCommons, escolherFotos, pontuarFoto, type FotoCommons } from "@/lib/fontes/commons";
import { consultaDeclaracoes, consultaMetadados, consultaVariantes } from "@/lib/fontes/wikidata/consultas";
import { qidDaUri, urlEntidade, type ClienteWikidata, type LinhaSparql } from "@/lib/fontes/wikidata";
import { arquivoDoP18, lerDeclaracoes, listaDeRotulos, montarSpecs, rotulosSemPt, selecionar, type SpecGravada } from "@/lib/fontes/wikidata/specs";
import { criarClienteWikipedia, encurtarResumo, tituloDaUrl, type ResumoWikipedia } from "@/lib/fontes/wikipedia";
import { CATEGORIAS, type Categoria } from "@/lib/tipos";
import type { ItemTraducao, ResultadoTraducao } from "@/lib/traducao/traduzir";

// ───────────────────────────── Lista curada ─────────────────────────────

export const esquemaEntradaArsenal = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nome: z.string().min(1),
  categoria: z.enum(Object.keys(CATEGORIAS) as [Categoria, ...Categoria[]]),
  /** Rótulo do selo, com base nas classes do Wikidata (ex.: "caças de quinta geração" → "Caça · 5ª geração"). */
  classe: z.string().min(1),
  qid: z.string().regex(/^Q\d+$/),
  /** QID da família (ex.: F-35 para o F-35A): só dela se herdam dados que faltam no item. Conferido à mão. */
  familia: z.string().regex(/^Q\d+$/).optional(),
  /** Como o equipamento aparece em títulos de notícia (para "notícias relacionadas"). */
  termos: z.array(z.string().min(2)).default([]),
  /** QIDs das variantes a listar (padrão: subclasses diretas da família, sem propostas nem agrupamentos). */
  variantes: z.array(z.string().regex(/^Q\d+$/)).optional(),
  /**
   * Corte editorial do resumo da Wikipédia: só as N primeiras frases. Use quando as seguintes trazem
   * juízo de valor ("o melhor do mundo"), comparação sem fonte ou detalhe que não cabe no site
   * (CLAUDE.md §1.5 e §1.6). Registre o motivo num comentário ao lado da entrada.
   */
  resumo_frases: z.number().int().min(1).max(3).optional(),
});
export type EntradaArsenal = z.infer<typeof esquemaEntradaArsenal>;

export function lerListaArsenal(yaml: string): EntradaArsenal[] {
  return z.object({ equipamentos: z.array(esquemaEntradaArsenal) }).parse(parse(yaml)).equipamentos;
}

// ───────────────────────────── Tipos de saída ─────────────────────────────

type FonteJson = { nome: string; url: string; licenca: string; licenca_url?: string; coletado_em: string };

export type LinhaEquipamentoNova = {
  slug: string;
  nome: string;
  categoria: Categoria;
  classe: string;
  descricao: string | null;
  pais_origem: string[];
  fabricante: string | null;
  wikidata_id: string;
  wikipedia_pt: string | null;
  resumo_pt: string | null;
  em_servico: boolean | null;
  specs: Record<string, SpecGravada>;
  variantes: { nome: string; descricao: string }[];
  operadores: string[];
  fontes: FonteJson[];
  atualizado_em: string;
};

export type LinhaMidiaNova = {
  equipamento_slug: string;
  url: string;
  miniatura_url: string | null;
  legenda_pt: string | null;
  autor: string;
  licenca: string;
  licenca_url: string | null;
  fonte_url: string;
  largura: number | null;
  altura: number | null;
};

export type Relatorio = { vazios: string[]; avisos: string[]; caracteresDeepL: number };

export type DependenciasCadastro = {
  wikidata: ClienteWikidata;
  wikipedia: ReturnType<typeof criarClienteWikipedia>;
  commons: ReturnType<typeof criarClienteCommons>;
  traduzir: (itens: ItemTraducao[]) => Promise<ResultadoTraducao>;
  agora?: () => Date;
};

// ───────────────────────────── Auxiliares ─────────────────────────────

const LICENCA_CC_BY_SA = "https://creativecommons.org/licenses/by-sa/4.0/deed.pt_BR";
const maiuscula = (s: string) => (s ? s[0]!.toLocaleUpperCase("pt-BR") + s.slice(1) : s);

type Metadado = { qid: string; papel: "item" | "pai"; rotuloPt?: string; rotuloEn?: string; descPt?: string; descEn?: string; wikiPt?: string; wikiEn?: string };

function lerMetadados(linhas: LinhaSparql[]): Metadado[] {
  return linhas.flatMap((l) => {
    const qid = qidDaUri(l.ent ?? "");
    return qid ? [{ qid, papel: (l.papel === "pai" ? "pai" : "item") as Metadado["papel"], ...l }] : [];
  });
}

/** Variantes reais: tira propostas, agrupamentos "em serviço" e a própria família. */
const variantePlausivel = (descEn: string | undefined) => !/\bproposed\b|\bin service\b|\bfamily\b/i.test(descEn ?? "");

/** "Lockheed Martin F-35A Lightning II" → "F-35A Lightning II" quando começa pelo fabricante. */
export function nomeCurto(rotulo: string, fabricantes: string[]): string {
  for (const f of fabricantes.sort((a, b) => b.length - a.length)) if (rotulo.startsWith(`${f} `)) return rotulo.slice(f.length + 1);
  return rotulo;
}

// ───────────────────────────── Cadastro ─────────────────────────────

export async function montarEquipamento(
  e: EntradaArsenal,
  deps: DependenciasCadastro,
): Promise<{ linha: LinhaEquipamentoNova; midias: LinhaMidiaNova[]; relatorio: Relatorio }> {
  const agora = (deps.agora?.() ?? new Date()).toISOString();
  const avisos: string[] = [];
  let caracteresDeepL = 0;
  const traduzir = async (textos: (string | null | undefined)[]): Promise<(string | null)[]> => {
    const idx = textos.flatMap((t, i) => (t ? [i] : []));
    if (idx.length === 0) return textos.map(() => null);
    const r = await deps.traduzir(idx.map((i) => ({ texto: textos[i]!, idioma: "en" })));
    caracteresDeepL += r.caracteresDeepL;
    const saida: (string | null)[] = textos.map(() => null);
    idx.forEach((i, k) => (saida[i] = r.saidas[k]!.textoPt));
    return saida;
  };

  // 1) Wikidata
  const decl = lerDeclaracoes(await deps.wikidata.sparql(consultaDeclaracoes(e.qid, e.familia)));
  const meta = lerMetadados(await deps.wikidata.sparql(consultaMetadados(e.qid, e.familia)));
  const item = meta.find((m) => m.papel === "item");
  if (!item) throw new Error(`${e.qid} não encontrado no Wikidata`);
  const pais = [...new Set(meta.filter((m) => m.papel === "pai").map((m) => m.qid))];
  // Sem rótulo pt/en na consulta, o título do artigo da Wikipedia identifica a família.
  const rotulos: Record<string, string> = {};
  for (const m of meta) {
    const r = m.rotuloPt ?? m.rotuloEn ?? (m.wikiPt ? tituloDaUrl(m.wikiPt) : m.wikiEn ? tituloDaUrl(m.wikiEn) : null);
    if (r && !rotulos[m.qid]) rotulos[m.qid] = r;
  }
  const base = { item: e.qid, pais, categoria: e.categoria, rotulos, coletadoEm: agora };
  // Operadores e armamento sem rótulo em pt: traduz ("Royal Moroccan Army", "Rheinmetall 120 mm gun").
  const semPt = rotulosSemPt(decl, ["P137", "P520"], base);
  const trad = await traduzir(semPt);
  const traducoes = Object.fromEntries(semPt.flatMap((r, i) => (trad[i] ? [[r, trad[i]!]] : [])));
  const ctx = { ...base, traducoes };
  const { specs, vazios } = montarSpecs(decl, ctx);

  const origem = listaDeRotulos(decl, "P495", ctx)?.rotulos ?? [];
  if (origem.length === 0) vazios.push("pais_origem");
  const operadores = listaDeRotulos(decl, "P137", ctx);
  if (!operadores) vazios.push("operadores");
  const servico = selecionar(decl, "P730", e.qid, pais) ? false : selecionar(decl, "P729", e.qid, pais) ? true : null;
  const fabricantes = specs.fabricante && "texto" in specs.fabricante ? specs.fabricante.texto.split(" / ") : [];

  // 2) Descrição curta do card: pt do item › pt da família › en do item traduzido
  const familia = meta.find((m) => m.papel === "pai");
  let descricao = item.descPt ?? familia?.descPt ?? null;
  // "multiúso" é grafia anterior ao Acordo Ortográfico; em pt-BR atual, "multiuso".
  if (descricao) descricao = descricao.replace(/multiúso/gi, "multiuso");
  if (!descricao && item.descEn) descricao = (await traduzir([item.descEn]))[0] ?? null;
  if (!descricao) vazios.push("descricao");

  // 3) Resumo: Wikipedia em português do item › da família › inglês traduzido
  const fontes: FonteJson[] = [{ nome: "Wikidata", url: urlEntidade(e.qid), licenca: "CC0", coletado_em: agora }];
  let resumo: ResumoWikipedia | null = null;
  const comPt = [item, ...meta.filter((m) => m.papel === "pai")].find((m) => m.wikiPt);
  if (comPt?.wikiPt) resumo = descartarRedirecionado(await deps.wikipedia.resumo("pt", tituloDaUrl(comPt.wikiPt)), comPt.qid, avisos);
  let resumoPt: string | null = resumo?.texto ?? null;
  let wikipediaPt: string | null = resumo ? resumo.titulo : null;
  if (!resumo) {
    const comEn = [item, ...meta.filter((m) => m.papel === "pai")].find((m) => m.wikiEn);
    const en = comEn?.wikiEn ? descartarRedirecionado(await deps.wikipedia.resumo("en", tituloDaUrl(comEn.wikiEn)), comEn.qid, avisos) : null;
    if (en) {
      resumoPt = (await traduzir([en.texto]))[0] ?? null;
      wikipediaPt = null;
      fontes.push({ nome: "Wikipédia em inglês (traduzido automaticamente)", url: en.url, licenca: "CC BY-SA 4.0", licenca_url: LICENCA_CC_BY_SA, coletado_em: agora });
      resumo = en;
    }
  } else {
    fontes.push({ nome: "Wikipédia em português", url: resumo.url, licenca: "CC BY-SA 4.0", licenca_url: LICENCA_CC_BY_SA, coletado_em: agora });
  }
  if (resumoPt && e.resumo_frases) resumoPt = encurtarResumo(resumoPt, e.resumo_frases);
  if (!resumoPt) vazios.push("resumo_pt");
  if (resumo && comPt && comPt.qid !== e.qid) avisos.push(`resumo do artigo da família (${resumo.titulo}), não da variante`);

  // 4) Variantes: subclasses da família
  let variantes: { nome: string; descricao: string }[] = [];
  {
    // Subclasses da família (variantes irmãs) ou, sem família declarada, do próprio item (suas versões).
    const vs = (await deps.wikidata.sparql(consultaVariantes(familia?.qid ?? e.qid)))
      .map((v) => ({ qid: qidDaUri(v.v ?? "") ?? "", rotuloPt: v.rotuloPt, rotuloEn: v.rotuloEn, descPt: v.descPt, descEn: v.descEn }))
      .filter((v) => v.qid && (e.variantes ? e.variantes.includes(v.qid) : variantePlausivel(v.descEn)));
    const ordem = e.variantes ?? [];
    vs.sort((a, b) => (ordem.indexOf(a.qid) - ordem.indexOf(b.qid)) || (a.rotuloEn ?? "").localeCompare(b.rotuloEn ?? ""));
    const descs = await traduzir(vs.map((v) => (v.descPt ? null : v.descEn)));
    variantes = vs.flatMap((v, i) => {
      const rotulo = v.rotuloPt ?? v.rotuloEn;
      const d = v.descPt ?? descs[i];
      // Sem nome ou sem descrição, a variante não é exibida (um QID solto não informa nada).
      return rotulo && d ? [{ nome: nomeCurto(rotulo, fabricantes), descricao: maiuscula(d) }] : [];
    });
  }

  // 5) Fotos: P18 do item, categoria do item, categoria da família — até 6, só licença livre
  const fotos: FotoCommons[] = [];
  const p18 = selecionar(decl, "P18", e.qid, pais);
  const arquivo = p18 ? arquivoDoP18(p18.declaracoes[0]!.valor) : null;
  if (arquivo) {
    const f = await deps.commons.arquivo(arquivo);
    if (f && pontuarFoto(f) !== null) fotos.push(f);
  }
  for (const ent of [e.qid, ...pais]) {
    if (fotos.length >= 6) break;
    const cat = decl.find((d) => d.ent === ent && d.prop === "P373")?.valor;
    if (!cat) continue;
    const { fotos: daCat } = await deps.commons.daCategoria(cat, 50);
    for (const f of escolherFotos(daCat)) if (fotos.length < 6 && !fotos.some((x) => x.arquivo === f.arquivo)) fotos.push(f);
  }
  if (fotos.length === 0) vazios.push("fotos");
  else fontes.push({ nome: "Wikimedia Commons", url: "https://commons.wikimedia.org/", licenca: "varia por arquivo (crédito em cada foto)", coletado_em: agora });
  const legendas = await traduzir(fotos.map((f) => f.descricao));

  const midias: LinhaMidiaNova[] = fotos.map((f, i) => ({
    equipamento_slug: e.slug,
    url: f.url,
    miniatura_url: f.miniaturaUrl,
    legenda_pt: legendas[i] ? legendas[i]!.slice(0, 160) : null,
    autor: f.autor,
    licenca: f.licenca,
    licenca_url: f.licencaUrl,
    fonte_url: f.paginaUrl,
    largura: f.largura,
    altura: f.altura,
  }));

  return {
    linha: {
      slug: e.slug,
      nome: e.nome,
      categoria: e.categoria,
      classe: e.classe,
      descricao: descricao ? maiuscula(descricao) : null,
      pais_origem: origem,
      fabricante: fabricantes[0] ?? null,
      wikidata_id: e.qid,
      wikipedia_pt: wikipediaPt,
      resumo_pt: resumoPt,
      em_servico: servico,
      specs,
      variantes,
      operadores: operadores?.rotulos ?? [],
      fontes,
      atualizado_em: agora,
    },
    midias,
    relatorio: { vazios, avisos, caracteresDeepL },
  };
}

/**
 * Sitelink que redireciona para o artigo de outro item (ex.: "Ka-52" na Wikipédia em inglês cai em
 * "Kamov Ka-50", outro helicóptero; 17/11/2026): o resumo descreveria o equipamento errado.
 */
export function descartarRedirecionado(r: ResumoWikipedia | null, qidEsperado: string, avisos: string[]): ResumoWikipedia | null {
  if (!r || !r.qid || r.qid === qidEsperado) return r;
  avisos.push(`resumo descartado: o artigo "${r.titulo}" (Wikipédia ${r.idioma}) é de outro item (${r.qid}), não de ${qidEsperado}`);
  return null;
}
