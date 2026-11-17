// Resumo de contexto de cada conflito (content/conflitos/<slug>.mdx), no mesmo formato validado
// dos textos de /tecnologia e /taticas (lib/tecnologia/dossie.ts), com seções fixas.
import { lerDossie, type Dossie } from "@/lib/tecnologia/dossie";

/** Seções obrigatórias, nesta ordem. */
export const SECOES_CONTEXTO = ["Origem", "Partes envolvidas", "O que está em disputa", "Marcos", "Situação humanitária"] as const;

/** Lê e valida o texto de contexto de um conflito. Erro de formato quebra o build de propósito. */
export function lerContexto(conteudo: string, slug: string): Dossie {
  const arquivo = `content/conflitos/${slug}.mdx`;
  const d = lerDossie(conteudo, arquivo);
  if (d.id !== slug) throw new Error(`${arquivo}: id "${d.id}" difere do nome do arquivo`);
  const titulos = d.secoes.map((s) => s.titulo);
  if (titulos.join("|") !== SECOES_CONTEXTO.join("|")) {
    throw new Error(`${arquivo}: as seções devem ser, nesta ordem: ${SECOES_CONTEXTO.join(", ")} (achei: ${titulos.join(", ")})`);
  }
  return d;
}

/**
 * Só textos `publicado` vão ao ar. Em `pnpm dev` os rascunhos também aparecem (com aviso),
 * para o editor revisar na página antes de aprovar.
 */
export const contextoVisivel = (d: Dossie, ambiente = process.env.NODE_ENV): boolean =>
  d.status === "publicado" || ambiente === "development";
