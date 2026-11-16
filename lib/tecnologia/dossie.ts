// Leitor dos textos explicativos de /tecnologia (content/tecnologia/*.mdx, Fase 8, item 2).
// Sem dependência de MDX: os arquivos usam só um subconjunto de Markdown, e qualquer coisa fora
// dele (JSX, links, imagens, títulos de outro nível) é recusada, para não sumir em silêncio na página.
// Subconjunto aceito: "## Seção", parágrafos, listas "- item", **negrito**, *itálico* e chamadas [n].
import { parse } from "yaml";
import { z } from "zod";

const texto = z.string().trim().min(1);
/** O YAML lê "2024" como número; datas parciais ("2023-05") e textos ("programa concluído") também valem. */
const dataFonte = z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(texto);

export const esquemaFonteDossie = z.object({
  n: z.number().int().positive(),
  nome: texto,
  titulo: texto,
  url: z.url({ protocol: /^https$/ }),
  data: dataFonte,
  verificacao: texto,
  /** Idioma do título (ISO 639-1), para o leitor de tela pronunciar certo (WCAG 3.1.2). Sem o campo: português. */
  idioma: z.string().regex(/^[a-z]{2}$/).optional(),
  /** Licença do material citado, quando ele tem licença livre (ex.: Wikipédia, CC BY-SA 4.0). */
  licenca: texto.optional(),
  licenca_url: z.url().optional(),
}).refine((f) => !/(^|\.)wikipedia\.org$/.test(new URL(f.url).hostname) || (f.licenca && f.licenca_url), {
  message: "fonte da Wikipédia precisa de licenca e licenca_url (CC BY-SA 4.0)",
});
export type FonteDossie = z.infer<typeof esquemaFonteDossie>;

const esquemaFrontmatter = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  titulo: texto,
  resumo: texto,
  status: z.enum(["rascunho", "publicado"]),
  revisao: texto,
  atualizado_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fontes: z.array(esquemaFonteDossie).min(1),
});

export type Trecho =
  | { tipo: "texto"; texto: string }
  | { tipo: "negrito"; texto: string }
  | { tipo: "italico"; texto: string }
  | { tipo: "ref"; n: number };
export type Bloco = { tipo: "paragrafo"; trechos: Trecho[] } | { tipo: "lista"; itens: Trecho[][] };
export type SecaoDossie = { titulo: string; blocos: Bloco[] };

export type Dossie = {
  id: string;
  titulo: string;
  resumo: string;
  status: "rascunho" | "publicado";
  revisao: string;
  atualizadoEm: string;
  fontes: FonteDossie[];
  secoes: SecaoDossie[];
};

const RE_INLINE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[(\d+)\]/g;

/** Quebra uma linha em texto, negrito, itálico e chamadas de fonte. */
export function lerTrechos(linha: string): Trecho[] {
  const trechos: Trecho[] = [];
  let ultimo = 0;
  for (const m of linha.matchAll(RE_INLINE)) {
    if (m.index > ultimo) trechos.push({ tipo: "texto", texto: linha.slice(ultimo, m.index) });
    if (m[1] !== undefined) trechos.push({ tipo: "negrito", texto: m[1] });
    else if (m[2] !== undefined) trechos.push({ tipo: "italico", texto: m[2] });
    else trechos.push({ tipo: "ref", n: Number(m[3]) });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < linha.length) trechos.push({ tipo: "texto", texto: linha.slice(ultimo) });
  return trechos;
}

const PROIBIDO = [
  { re: /^\s*</, motivo: "JSX/HTML" },
  { re: /!?\[[^\]]*\]\(/, motivo: "link ou imagem em Markdown (fontes vão no frontmatter)" },
  { re: /^\s*(#|###)/, motivo: "título fora do nível ## " },
  { re: /^\s*(\d+\.|\*|\+)\s/, motivo: "lista fora do formato '- item'" },
  { re: /`/, motivo: "código" },
];

function lerCorpo(corpo: string, arquivo: string): SecaoDossie[] {
  const secoes: SecaoDossie[] = [];
  let paragrafo: string[] = [];
  let lista: string[] | null = null;

  const atual = () => {
    const s = secoes.at(-1);
    if (!s) throw new Error(`${arquivo}: texto antes da primeira seção "## "`);
    return s;
  };
  const fechar = () => {
    if (paragrafo.length) atual().blocos.push({ tipo: "paragrafo", trechos: lerTrechos(paragrafo.join(" ")) });
    if (lista) atual().blocos.push({ tipo: "lista", itens: lista.map(lerTrechos) });
    paragrafo = [];
    lista = null;
  };

  corpo.split(/\r?\n/).forEach((bruta, i) => {
    const linha = bruta.trim();
    if (linha.startsWith("## ")) {
      fechar();
      secoes.push({ titulo: linha.slice(3).trim(), blocos: [] });
      return;
    }
    for (const p of PROIBIDO) if (p.re.test(bruta)) throw new Error(`${arquivo}, linha ${i + 1} do corpo: ${p.motivo} não é aceito`);
    if (linha === "") return fechar();
    if (linha.startsWith("- ")) {
      if (paragrafo.length) fechar();
      (lista ??= []).push(linha.slice(2).trim());
      return;
    }
    if (lista) fechar();
    paragrafo.push(linha);
  });
  fechar();
  return secoes;
}

function refsDe(secoes: SecaoDossie[]): number[] {
  const trechos = secoes.flatMap((s) => s.blocos.flatMap((b) => (b.tipo === "paragrafo" ? b.trechos : b.itens.flat())));
  return trechos.flatMap((t) => (t.tipo === "ref" ? [t.n] : []));
}

/** Fontes numeradas 1..k em ordem; toda chamada [n] aponta para uma fonte, e toda fonte é citada. */
export function validarChamadas(fontes: FonteDossie[], chamadas: number[], arquivo: string): void {
  fontes.forEach((f, i) => {
    if (f.n !== i + 1) throw new Error(`${arquivo}: fontes devem ser numeradas 1, 2, 3… em ordem (achei ${f.n} na posição ${i + 1})`);
  });
  const citadas = new Set(chamadas);
  for (const n of citadas) if (n < 1 || n > fontes.length) throw new Error(`${arquivo}: chamada [${n}] sem fonte correspondente`);
  for (const f of fontes) if (!citadas.has(f.n)) throw new Error(`${arquivo}: fonte [${f.n}] listada mas nunca citada`);
}

/** Lê e valida um arquivo. `arquivo` só aparece nas mensagens de erro. */
export function lerDossie(conteudo: string, arquivo: string): Dossie {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(conteudo);
  if (!m) throw new Error(`${arquivo}: frontmatter "---" ausente`);
  const fm = esquemaFrontmatter.parse(parse(m[1]!));
  const secoes = lerCorpo(m[2]!, arquivo);
  if (secoes.length === 0) throw new Error(`${arquivo}: nenhuma seção "## "`);

  validarChamadas(fm.fontes, refsDe(secoes), arquivo);

  return {
    id: fm.id,
    titulo: fm.titulo,
    resumo: fm.resumo,
    status: fm.status,
    revisao: fm.revisao,
    atualizadoEm: fm.atualizado_em,
    fontes: fm.fontes,
    secoes,
  };
}

/** "2025-10-23" → "23/10/2025"; "2023-05" → "05/2023"; "2024" e textos ficam como estão. */
export function formatarDataFonte(data: string): string {
  const completa = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (completa) return `${completa[3]}/${completa[2]}/${completa[1]}`;
  const mes = /^(\d{4})-(\d{2})$/.exec(data);
  if (mes) return `${mes[2]}/${mes[1]}`;
  return data;
}
