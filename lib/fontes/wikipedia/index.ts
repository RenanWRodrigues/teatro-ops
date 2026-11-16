// Resumo da Wikipedia (CC BY-SA 4.0) pela API REST: /page/summary/{título}. Só o extrato inicial (lead).
import { z } from "zod";
import { fetchComRetry } from "@/lib/fontes/_base/http";
import { rateLimiter } from "@/lib/fontes/_base/limitador";
import { userAgentWikimedia } from "@/lib/fontes/wikidata";

export const esquemaResumo = z.object({
  type: z.string(),
  title: z.string(),
  extract: z.string(),
  content_urls: z.object({ desktop: z.object({ page: z.string().url() }) }),
});

export type ResumoWikipedia = { idioma: "pt" | "en"; titulo: string; texto: string; url: string };

/** Até 3 frases, sem passar de ~600 caracteres: o card mostra um parágrafo curto, com link para o artigo. */
export function encurtarResumo(texto: string, maxFrases = 3, maxCaracteres = 600): string {
  const frases = texto.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [texto];
  let saida = "";
  for (const f of frases.slice(0, maxFrases)) {
    if ((saida + f).length > maxCaracteres && saida) break;
    saida += f;
  }
  return saida.trim();
}

/** Título do artigo a partir da URL do sitelink ("https://pt.wikipedia.org/wiki/Lockheed_Martin_F-35_Lightning_II"). */
export const tituloDaUrl = (url: string) => decodeURIComponent(url.split("/wiki/")[1] ?? "").replaceAll("_", " ");

export function criarClienteWikipedia(opcoes: { fetchImpl?: typeof fetch } = {}) {
  const esperar = rateLimiter("wikipedia", "1 req / s");
  return {
    async resumo(idioma: "pt" | "en", titulo: string): Promise<ResumoWikipedia | null> {
      await esperar();
      const url = `https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo.replaceAll(" ", "_"))}`;
      const resp = await fetchComRetry(url, { fetchImpl: opcoes.fetchImpl, headers: { "User-Agent": userAgentWikimedia() } });
      const r = esquemaResumo.safeParse(await resp.json());
      // Páginas de desambiguação não servem de resumo.
      if (!r.success || r.data.type !== "standard" || !r.data.extract.trim()) return null;
      return { idioma, titulo: r.data.title, texto: encurtarResumo(r.data.extract), url: r.data.content_urls.desktop.page };
    },
  };
}
