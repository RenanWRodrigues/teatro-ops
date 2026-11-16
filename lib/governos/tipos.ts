// Tipos compartilhados do monitor de governos.
import type { Grupo } from "./termos";

/** Decisão/comunicado oficial pronto para filtro, tradução e gravação em `decisoes_governo`. */
export type DecisaoNormalizada = {
  hash: string;
  fonteId: string;
  pais: string;
  orgao: string;
  tituloOriginal: string;
  idiomaOriginal: string | null;
  /** Só para filtrar e classificar (máx. 300 caracteres); nunca é gravada nem exibida. */
  descricao: string | null;
  urlOficial: string;
  publicadoEm: string;
  tipoDocumento?: string | null;
  subtipoDocumento?: string | null;
  origem: "rss" | "registro";
  /** Agência estatal (Xinhua, IRNA…): a interface exibe o selo "Mídia estatal". */
  estatal: boolean;
};

export type DecisaoClassificada = DecisaoNormalizada & { grupos: Grupo[] };

/** Trunca a descrição a 300 caracteres, sem HTML (skill integrar-fonte-dados, regra de RSS). */
export function descricaoCurta(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const limpo = texto
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return limpo ? limpo.slice(0, 300) : null;
}
