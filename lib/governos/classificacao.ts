// Classificação de `tipo` das decisões de governo por regras (skill monitor-governos):
// palavras-chave primeiro, depois o tipo de documento do Federal Register; o resto é comunicado.
import { ROTULO_GRUPO, type Grupo } from "./termos";

export const TIPOS_DECISAO = ["ordem_executiva", "lei", "sancao", "comunicado", "acordo", "exercicio_militar", "orcamento", "outro"] as const;
export type TipoDecisao = (typeof TIPOS_DECISAO)[number];

export const ROTULO_TIPO: Record<TipoDecisao, string> = {
  ordem_executiva: "Decreto ou ato executivo",
  lei: "Lei",
  sancao: "Sanção",
  comunicado: "Comunicado",
  acordo: "Acordo ou tratado",
  exercicio_militar: "Exercício militar",
  orcamento: "Orçamento",
  outro: "Outro",
};

const R = (termos: string[]) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${termos.join("|")})(?![\\p{L}\\p{N}])`, "iu");

// Ordem importa: a primeira regra que casar define o tipo.
const REGRAS: [TipoDecisao, RegExp][] = [
  [
    "sancao",
    R([
      "sanctions?", "sanctioning", "OFAC", "embargo", "export controls?", "entity list", "designations?", "designated",
      "blocking property", "general licen[cs]es?", "asset freeze", "national emergency with respect to",
      "Sanktion(en)?", "санкци\\p{L}*", "санкці\\p{L}*", "制裁", "تحریم\\p{L}*",
    ]),
  ],
  ["exercicio_militar", R(["military (exercises?|drills?)", "joint (exercises?|drills?)", "naval drills?", "war games", "Manöver", "Militärübung\\p{L}*", "военн\\p{L}* учени\\p{L}*", "军演", "رزمایش"])],
  // Atos presidenciais antes de orçamento/acordo: "Presidential Determination … NDAA" é ato executivo.
  ["ordem_executiva", R(["executive orders?", "decree", "ukase", "proclamation", "presidential (determination|memorandum|directive)", "\\p{L}*verordnung", "указ\\p{L}*", "постановлени\\p{L}*"])],
  // Compostos alemães: "Verteidigungshaushalt", "Haushaltsausschuss", "…gesetz".
  ["orcamento", R(["budget", "appropriations?", "National Defense Authorization Act", "NDAA", "defen[cs]e spending", "military spending", "\\p{L}*haushalt\\p{L}*", "Sondervermögen", "бюджет\\p{L}*"])],
  ["acordo", R(["treaty", "agreements?", "accords?", "memorandum of understanding", "\\p{L}*abkommen","договор\\p{L}*", "соглашени\\p{L}*", "угод\\p{L}*", "条约", "协定"])],
  ["lei", R(["signed into law", "bill", "act of \\d{4}", "law", "legislation", "\\p{L}*gesetz", "закон\\p{L}*", "قانون"])],
];

export type EntradaClassificacao = {
  titulo: string;
  descricao?: string | null;
  /** Federal Register: "Presidential Document", "Rule", "Proposed Rule", "Notice". */
  tipoDocumento?: string | null;
  /** Federal Register: "Executive Order", "Proclamation", "Memorandum", "Determination", "Notice". */
  subtipoDocumento?: string | null;
  /** Origem: "rss" (comunicados de imprensa) ou "registro" (publicação oficial). */
  origem: "rss" | "registro";
};

/** Tipos que a descrição sozinha pode definir (sanção e lei exigem o termo no título: "designated" solto engana). */
const PELA_DESCRICAO = new Set<TipoDecisao>(["exercicio_militar", "acordo", "orcamento"]);

export function classificarTipo(e: EntradaClassificacao): TipoDecisao {
  const presidencial = e.tipoDocumento === "Presidential Document";
  const pelaRegra =
    REGRAS.find(([, re]) => re.test(e.titulo))?.[0] ??
    REGRAS.find(([tipo, re]) => PELA_DESCRICAO.has(tipo) && re.test(e.descricao ?? ""))?.[0];
  // Ato presidencial é ato executivo, salvo quando trata de sanções.
  if (presidencial) return pelaRegra === "sancao" ? "sancao" : "ordem_executiva";
  if (pelaRegra) return pelaRegra;
  if (e.subtipoDocumento === "Executive Order") return "ordem_executiva";
  return e.origem === "rss" ? "comunicado" : "outro";
}

/**
 * Texto próprio por regra: os temas do filtro de relevância.
 * Não reproduz o texto do documento nem acrescenta fatos (CLAUDE.md §1.4 e §1.5).
 */
export function resumoDecisao(d: { grupos: Grupo[] }): string | null {
  // Data, órgão e tipo já aparecem no card: o texto gerado diz só os temas encontrados pelo filtro.
  if (d.grupos.length === 0) return null;
  const temas = d.grupos.map((g) => ROTULO_GRUPO[g]).join(", ");
  return `Temas: ${temas}.`;
}

/**
 * Rótulo exibido do tipo. Texto de agência estatal sem tipo específico é notícia, não comunicado de governo
 * (uma coluna da Xinhua não é nota do governo chinês).
 */
export function rotuloTipo(d: { tipo: TipoDecisao; estatal: boolean }): string {
  return d.estatal && d.tipo === "comunicado" ? "Notícia de agência estatal" : ROTULO_TIPO[d.tipo];
}

/** Contagem por rótulo exibido (o mesmo do card), na ordem de TIPOS_DECISAO; notícias de agência estatal por último. */
export function contarPorRotulo(decisoes: { tipo: TipoDecisao; estatal: boolean }[]): [rotulo: string, quantidade: number][] {
  const contagem = new Map<string, number>();
  for (const t of TIPOS_DECISAO) contagem.set(ROTULO_TIPO[t], 0);
  for (const d of decisoes) contagem.set(rotuloTipo(d), (contagem.get(rotuloTipo(d)) ?? 0) + 1);
  return [...contagem.entries()].filter(([, q]) => q > 0);
}
