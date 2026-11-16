// Esquemas Zod das linhas do banco (fronteira com dado externo) e conversão para os tipos das telas.
// Espelham supabase/migrations/0001_inicial.sql; o teste lib/db/esquemas.test.ts cobre os casos.
import { z } from "zod";
import { formatarEspecificacao } from "@/lib/especificacao";
import { UNIDADES, type Unidade } from "@/lib/format";
import {
  CATEGORIAS,
  type Conflito,
  type ConflitoDetalhe,
  type Decisao,
  type Equipamento,
  type EventoPublico,
  type Especificacao,
  type Fonte,
  type Intensidade,
  type ItemFicha,
  type Manchete,
  type Midia,
} from "@/lib/tipos";

const dataHora = z.string().min(1);

// ───────────── Fontes (jsonb `fontes` e fontes por campo em `specs`) ─────────────

export const esquemaFonteJson = z.object({
  nome: z.string().min(1),
  url: z.string().nullable().optional(),
  licenca: z.string().optional(),
  licenca_url: z.string().optional(),
  coletado_em: dataHora.nullable().optional(),
});

// Registros antigos gravaram "Wikipedia" sem acento; a tela sempre mostra "Wikipédia".
const paraFonte = (f: z.infer<typeof esquemaFonteJson>): Fonte => ({
  nome: f.nome.replace(/^Wikipedia\b/, "Wikipédia"),
  url: f.url ?? null,
  licenca: f.licenca,
  licencaUrl: f.licenca_url,
  coletadoEm: f.coletado_em ?? null,
});

/** Lista jsonb de fontes; itens inválidos são descartados (nunca derrubam a página). */
const listaFontes = z.array(z.unknown()).transform((itens) =>
  itens.flatMap((i) => {
    const r = esquemaFonteJson.safeParse(i);
    return r.success ? [paraFonte(r.data)] : [];
  }),
);

/** Exibido quando um registro não tem fonte: deixa a ausência visível em vez de escondê-la. */
export const FONTE_NAO_REGISTRADA: Fonte = { nome: "fonte não registrada", url: null };

// ───────────────────────────── Equipamentos ─────────────────────────────

const camposFonteSpec = {
  fonte: z.string().min(1),
  url: z.string().nullable().optional(),
  licenca: z.string().optional(),
  coletado_em: dataHora.nullable().optional(),
};

const specNumerica = z.object({
  valor: z.number().finite(),
  unidade: z.enum(UNIDADES as [Unidade, ...Unidade[]]),
  aproximado: z.boolean().optional(),
  sufixo: z.string().max(3).optional(),
  ...camposFonteSpec,
});

const specTexto = z.object({ texto: z.string().min(1), ...camposFonteSpec });

const esquemaSpec = z.union([specNumerica, specTexto]);
type SpecBanco = z.infer<typeof esquemaSpec>;

const fonteDaSpec = (s: SpecBanco): Fonte => ({
  nome: s.fonte,
  url: s.url ?? null,
  licenca: s.licenca,
  coletadoEm: s.coletado_em ?? null,
});

/** Rótulos pt-BR das chaves de `equipamentos.specs`, na ordem de exibição da ficha. */
export const ROTULOS_SPEC: Record<string, string> = {
  fabricante: "Fabricante",
  primeiro_voo: "Primeiro voo",
  entrada_servico: "Entrada em serviço",
  tripulacao: "Tripulação",
  comprimento: "Comprimento",
  envergadura: "Envergadura",
  altura: "Altura",
  largura: "Largura",
  massa_vazio: "Massa vazia",
  massa_max: "Massa máx. de decolagem",
  massa: "Massa",
  deslocamento: "Deslocamento",
  motor: "Motor",
  combustivel_interno: "Combustível interno",
  velocidade_max: "Velocidade máx.",
  raio_combate: "Raio de combate",
  alcance: "Alcance",
  autonomia: "Autonomia",
  teto_servico: "Teto de serviço",
  limite_g: "Limite G",
  armamento_principal: "Armamento principal",
  canhao: "Canhão",
  calibre: "Calibre",
  pontos_carga: "Pontos de carga",
  total_produzido: "Total produzido",
  custo_unitario: "Custo unitário",
};

/** Especificações que aparecem como números grandes no topo da ficha (até 4). */
const CHAVES_ESTATISTICAS = ["velocidade_max", "raio_combate", "alcance", "teto_servico", "limite_g", "deslocamento"];

export const esquemaLinhaEquipamento = z.object({
  slug: z.string().min(1),
  nome: z.string().min(1),
  categoria: z.enum(Object.keys(CATEGORIAS) as [keyof typeof CATEGORIAS, ...(keyof typeof CATEGORIAS)[]]),
  classe: z.string().nullable(),
  descricao: z.string().nullable(),
  pais_origem: z.array(z.string()),
  fabricante: z.string().nullable(),
  wikipedia_pt: z.string().nullable(),
  resumo_pt: z.string().nullable(),
  em_servico: z.boolean().nullable(),
  specs: z.record(z.string(), z.unknown()),
  variantes: z.array(z.object({ nome: z.string(), descricao: z.string() })).catch([]),
  operadores: z.array(z.string()),
  fontes: listaFontes,
  atualizado_em: dataHora,
});
export type LinhaEquipamento = z.infer<typeof esquemaLinhaEquipamento>;

export const esquemaLinhaMidia = z.object({
  equipamento_slug: z.string().optional(),
  url: z.url(),
  /** Miniatura de 960 px gerada pelo Commons: é a exibida (o original pode ter vários MB). */
  miniatura_url: z.url().nullable().optional(),
  legenda_pt: z.string().nullable(),
  autor: z.string().nullable(),
  licenca: z.string().min(1),
  licenca_url: z.string().nullable(),
  fonte_url: z.url(),
});
export type LinhaMidia = z.infer<typeof esquemaLinhaMidia>;

const formatarSpecTexto = (s: SpecBanco) => ("texto" in s ? s.texto : formatarEspecificacao(paraEspecificacao(s)));

function paraEspecificacao(s: z.infer<typeof specNumerica>): Especificacao {
  return { valor: s.valor, unidade: s.unidade, aproximado: s.aproximado, sufixo: s.sufixo, fonte: fonteDaSpec(s) };
}

export const urlWikipediaPt = (titulo: string) =>
  `https://pt.wikipedia.org/wiki/${encodeURIComponent(titulo.replaceAll(" ", "_"))}`;

/** Converte a linha do banco no tipo usado pelo card e pela ficha. */
export function paraEquipamento(linha: LinhaEquipamento, midias: LinhaMidia[] = []): Equipamento {
  const specs = new Map<string, SpecBanco>();
  for (const [chave, bruto] of Object.entries(linha.specs)) {
    const r = esquemaSpec.safeParse(bruto);
    if (r.success) specs.set(chave, r.data);
  }

  const numerica = (chave: string) => {
    const s = specs.get(chave);
    return s && "valor" in s ? paraEspecificacao(s) : undefined;
  };

  const estatisticas = CHAVES_ESTATISTICAS.flatMap((chave) => {
    const spec = numerica(chave);
    return spec ? [{ rotulo: ROTULOS_SPEC[chave] ?? chave, spec, realce: chave === "velocidade_max" }] : [];
  }).slice(0, 4);

  const ficha: ItemFicha[] = Object.keys(ROTULOS_SPEC).flatMap((chave) => {
    const s = specs.get(chave);
    return s ? [{ rotulo: ROTULOS_SPEC[chave] ?? chave, valor: formatarSpecTexto(s), fonte: fonteDaSpec(s) }] : [];
  });

  const comprimento = numerica("comprimento");
  const envergadura = numerica("envergadura");
  const largura = numerica("largura");
  const velocidade = numerica("velocidade_max");

  // O resumo só aparece com fonte: a Wikipédia em português (CC BY-SA 4.0) ou, sem artigo em português,
  // o artigo da Wikipédia em inglês de onde ele foi traduzido. Nunca o Wikidata (CC0), que não tem resumo.
  const fonteResumo: Fonte | undefined = linha.wikipedia_pt
    ? {
        nome: "Wikipédia em português",
        url: urlWikipediaPt(linha.wikipedia_pt),
        licenca: "CC BY-SA 4.0",
        licencaUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.pt_BR",
        coletadoEm: linha.atualizado_em,
      }
    : (linha.fontes.find((f) => /^Wikip[eé]dia/.test(f.nome)) ?? linha.fontes[0]);

  const galeria: Midia[] = midias.map((m) => ({
    legenda: m.legenda_pt ?? linha.nome,
    url: m.miniatura_url ?? m.url,
    autor: m.autor ?? "autor não identificado",
    licenca: m.licenca,
    licencaUrl: m.licenca_url ?? undefined,
    fonteUrl: m.fonte_url,
  }));

  return {
    slug: linha.slug,
    nome: linha.nome,
    categoria: linha.categoria,
    classe: linha.classe ?? undefined,
    descricao: linha.descricao ?? linha.classe ?? CATEGORIAS[linha.categoria],
    paises: linha.pais_origem,
    fabricante: linha.fabricante ?? undefined,
    emServico: linha.em_servico ?? undefined,
    destaque: velocidade ? formatarEspecificacao(velocidade) : "",
    resumo: linha.resumo_pt && fonteResumo ? { texto: linha.resumo_pt, fonte: fonteResumo } : undefined,
    estatisticas,
    ficha,
    // Planta: silhueta de aeronave (comprimento × envergadura) ou casco/chassi (comprimento × largura).
    planta:
      comprimento && envergadura
        ? { forma: "aeronave", comprimento, envergadura }
        : comprimento && largura
          ? { forma: "casco", comprimento, envergadura: largura }
          : undefined,
    // A variante cadastrada é destacada na lista do programa ("F-35A Lightning II" entre A, B e C).
    variantes: linha.variantes.map((v) => ({ ...v, atual: v.nome === linha.nome || linha.nome.startsWith(`${v.nome} `) })),
    galeria,
    operadores: linha.operadores,
    fontes: linha.fontes,
    numericas: Object.keys(ROTULOS_SPEC).flatMap((chave) => {
      const spec = numerica(chave);
      return spec ? [{ chave, rotulo: ROTULOS_SPEC[chave] ?? chave, spec }] : [];
    }),
  };
}

// ───────────────────────────── Conflitos ─────────────────────────────

export const esquemaLinhaConflito = z.object({
  slug: z.string().min(1),
  nome_pt: z.string().min(1),
  regiao: z.string().min(1),
  paises: z.array(z.string()).catch([]),
  periodo_inicio: z.string().nullable().catch(null),
  periodo_fim: z.string().nullable().catch(null),
  eventos_periodo: z.number().int().nullable().catch(null),
  mortes_estimadas: z.number().int().nullable().catch(null),
  mortes_min: z.number().int().nullable().catch(null),
  mortes_max: z.number().int().nullable().catch(null),
  intensidade: z.enum(["alta", "tensao", "cessar_fogo", "encerrado"]).nullable(),
  resumo_pt: z.string().nullable(),
  lon: z.number().nullable(),
  lat: z.number().nullable(),
  fontes: listaFontes,
});
export type LinhaConflito = z.infer<typeof esquemaLinhaConflito>;

const INTENSIDADE: Record<"alta" | "tensao" | "cessar_fogo", Intensidade> = {
  alta: "alta",
  tensao: "tensao",
  cessar_fogo: "cessar-fogo",
};

/** Conflito completo para /conflitos (inclui os abaixo do limiar, com intensidade null). */
export function paraConflitoDetalhe(l: LinhaConflito): ConflitoDetalhe {
  return {
    slug: l.slug,
    nome: l.nome_pt,
    regiao: l.regiao,
    paises: l.paises,
    intensidade: l.intensidade && l.intensidade !== "encerrado" ? INTENSIDADE[l.intensidade] : null,
    resumo: l.resumo_pt,
    fontes: l.fontes,
    coordenadas: l.lon !== null && l.lat !== null ? [l.lon, l.lat] : undefined,
    periodoInicio: l.periodo_inicio,
    periodoFim: l.periodo_fim,
    eventos: l.eventos_periodo ?? 0,
    mortes: l.mortes_estimadas ?? 0,
    mortesMin: l.mortes_min ?? 0,
    mortesMax: l.mortes_max ?? 0,
  };
}

export const esquemaAgregadoEvento = z.object({
  conflito_slug: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
  eventos: z.number().int(),
  mortes_estimadas: z.number().int(),
});

export const esquemaCobertura = z.object({ lat: z.number(), lon: z.number(), noticias: z.number().int() });

export const esquemaSemana = z.object({ semana: z.string(), eventos: z.number().int(), mortes_estimadas: z.number().int() });

export function paraEventoPublico(l: LinhaEventoPublico): EventoPublico {
  return {
    data: l.data,
    local: l.local,
    pais: l.pais,
    tipo: l.tipo_evento,
    atores: l.atores ?? [],
    mortes: l.mortes_estimadas,
    mortesMin: l.mortes_min,
    mortesMax: l.mortes_max,
  };
}

/** `null` para conflitos encerrados ou sem classificação (não entram em "Conflitos em foco"). */
export function paraConflito(l: LinhaConflito): Conflito | null {
  if (!l.intensidade || l.intensidade === "encerrado") return null;
  return {
    slug: l.slug,
    nome: l.nome_pt,
    regiao: l.regiao,
    intensidade: INTENSIDADE[l.intensidade],
    resumo: l.resumo_pt ?? "",
    fonte: l.fontes[0] ?? FONTE_NAO_REGISTRADA,
    coordenadas: l.lon !== null && l.lat !== null ? [l.lon, l.lat] : undefined,
  };
}

// ───────────────────────────── Notícias ─────────────────────────────

export const esquemaLinhaManchete = z.object({
  url: z.url(),
  titulo_original: z.string().min(1),
  idioma_original: z.string().nullable(),
  titulo_pt: z.string().min(1).nullable(),
  resumo_pt: z.string().nullable(),
  temas: z.array(z.string()),
  regiao: z.string().nullable(),
  publicado_em: dataHora,
  coletado_em: dataHora,
  fontes: z.object({ nome: z.string(), licenca: z.string() }),
});
export type LinhaManchete = z.infer<typeof esquemaLinhaManchete>;

/** Só data e temas, para contar notícias por semana (/tecnologia, Fase 8). */
export const esquemaLinhaTemas = z.object({ publicado_em: dataHora, temas: z.array(z.string()) });
export type LinhaTemas = z.infer<typeof esquemaLinhaTemas>;

/** Agregadores: o veículo é a fonte exibida; o agregador aparece como "via", com link e licença (config/fontes.yaml). */
const VIA_GDELT: Fonte = { nome: "GDELT Project", url: "https://www.gdeltproject.org/", licenca: "uso livre com citação" };
const AGREGADORES: Record<string, Fonte> = { "GDELT DOC 2.0 API": VIA_GDELT, "GDELT GKG 2.0 (arquivos de 15 min)": VIA_GDELT };

export function paraManchete(l: LinhaManchete): Manchete {
  const veiculo = new URL(l.url).hostname.replace(/^www\./, "");
  const via = AGREGADORES[l.fontes.nome];
  return {
    regiao: l.regiao ?? "Mundo",
    titulo: l.titulo_pt ?? l.titulo_original,
    traducaoPendente: l.titulo_pt === null,
    idiomaOriginal: l.idioma_original,
    url: l.url,
    publicadoEm: l.publicado_em,
    fonte: {
      nome: via ? veiculo : l.fontes.nome,
      url: l.url,
      licenca: via ? "título e link; resumo próprio" : l.fontes.licenca,
      coletadoEm: l.coletado_em,
    },
    ...(via ? { via } : {}),
  };
}

// ───────────────────────────── Execuções ─────────────────────────────

export const esquemaAtualizacao = z.object({ job: z.string(), atualizado_em: dataHora });

/** Valida um array de linhas, descartando (e contando) as inválidas em vez de falhar a página. */
export function validarLinhas<T>(esquema: z.ZodType<T>, linhas: unknown[]): { validas: T[]; invalidas: number } {
  const validas: T[] = [];
  let invalidas = 0;
  for (const l of linhas) {
    const r = esquema.safeParse(l);
    if (r.success) validas.push(r.data);
    else invalidas++;
  }
  return { validas, invalidas };
}

// ───────────────────── Fontes, decisões e eventos (consultas diretas) ─────────────────────

export const esquemaLinhaFonte = z.object({
  id: z.string(),
  nome: z.string(),
  url_base: z.string(),
  licenca: z.string(),
  tipo: z.enum(["api", "rss", "dataset", "scrape"]),
  categoria: z.enum(["estatal", "oficial", "imprensa", "pesquisa", "humanitaria", "enciclopedia"]),
  pais: z.string().nullable(),
  status: z.enum(["ativa", "a_verificar", "quebrada", "desativada"]),
  ultima_verificacao: dataHora.nullable(),
});
export type LinhaFonteBanco = z.infer<typeof esquemaLinhaFonte>;

export const esquemaLinhaDecisao = z.object({
  id: z.number(),
  fonte_id: z.string(),
  pais: z.string(),
  orgao: z.string(),
  tipo: z.enum(["ordem_executiva", "lei", "sancao", "comunicado", "acordo", "exercicio_militar", "orcamento", "outro"]),
  titulo_original: z.string(),
  titulo_pt: z.string().nullable(),
  resumo_pt: z.string().nullable(),
  url_oficial: z.url(),
  publicado_em: dataHora,
  coletado_em: dataHora,
  temas: z.array(z.string()).default([]),
  idioma_original: z.string().nullable().default(null),
  fontes: z.object({ nome: z.string(), licenca: z.string(), categoria: z.string(), url_base: z.string() }),
});
export type LinhaDecisao = z.infer<typeof esquemaLinhaDecisao>;

/** Fontes de governo coletadas por um intermediário que exige citação e link. */
const VIA_DECISAO: Record<string, Fonte> = {
  xinhua: { nome: "GDELT Project", url: "https://www.gdeltproject.org/", licenca: "uso livre com citação" },
};

/** Licenças com texto público para linkar (atribuição exigida pela própria licença). */
const URL_LICENCA: Record<string, string> = {
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/deed.pt_BR",
};

export function paraDecisao(l: LinhaDecisao): Decisao {
  return {
    id: l.id,
    pais: l.pais,
    orgao: l.orgao,
    tipo: l.tipo,
    titulo: l.titulo_pt ?? l.titulo_original,
    tituloOriginal: l.titulo_original,
    traducaoPendente: l.titulo_pt === null,
    idiomaOriginal: l.idioma_original,
    resumo: l.resumo_pt,
    urlOficial: l.url_oficial,
    publicadoEm: l.publicado_em,
    temas: l.temas,
    estatal: l.fontes.categoria === "estatal",
    // O link da fonte é o próprio documento oficial; o nome é o do canal de coleta (feed, Federal Register…).
    fonte: {
      nome: l.fontes.nome.replace(/\s*\(mídia estatal\)\s*$/i, ""),
      url: l.url_oficial,
      licenca: l.fontes.licenca,
      licencaUrl: URL_LICENCA[l.fontes.licenca],
      coletadoEm: l.coletado_em,
    },
    via: VIA_DECISAO[l.fonte_id],
  };
}

export const esquemaLinhaEventoPublico = z.object({
  id: z.number(),
  fonte_id: z.string(),
  conflito_slug: z.string().nullable(),
  data: z.string(),
  pais: z.string(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  tipo_evento: z.string().nullable(),
  atores: z.array(z.string()).nullable(),
  mortes_estimadas: z.number().int().nullable(),
  notas_pt: z.string().nullable(),
  coletado_em: dataHora,
  local: z.string().nullable().catch(null),
  mortes_min: z.number().int().nullable().catch(null),
  mortes_max: z.number().int().nullable().catch(null),
});
export type LinhaEventoPublico = z.infer<typeof esquemaLinhaEventoPublico>;

// ───────────────────────────── Busca (Fase 10) ─────────────────────────────

/** Linha da função SQL `buscar` (migração 0004). */
export const esquemaResultadoBusca = z.object({
  tipo: z.enum(["noticia", "decisao", "conflito", "equipamento"]),
  chave: z.string().min(1),
  titulo: z.string().min(1),
  resumo: z.string().nullable(),
  url: z.url().nullable(),
  data: dataHora.nullable(),
  extra: z.string().nullable(),
  relevancia: z.number(),
  pendente: z.boolean(),
  idioma: z.string().nullable(),
});
export type ResultadoBusca = z.infer<typeof esquemaResultadoBusca>;
