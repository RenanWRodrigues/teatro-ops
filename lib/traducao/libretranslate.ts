// LibreTranslate / Argos auto-hospedado (LIBRETRANSLATE_URL): grátis e sem cota, qualidade menor.
import { z } from "zod";
import { fetchComRetry } from "@/lib/fontes/_base/http";

const esquema = z.object({ translatedText: z.union([z.string(), z.array(z.string())]) });

export function criarClienteLibre(urlBase: string, fetchImpl: typeof fetch = fetch) {
  return {
    async traduzir(textos: string[], idiomaOrigem?: string): Promise<string[]> {
      const r = await fetchComRetry(`${urlBase.replace(/\/$/, "")}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: textos, source: idiomaOrigem ?? "auto", target: "pt", format: "text" }),
        fetchImpl,
        tentativas: 2,
      });
      const { translatedText } = esquema.parse(await r.json());
      return Array.isArray(translatedText) ? translatedText : [translatedText];
    },
  };
}
