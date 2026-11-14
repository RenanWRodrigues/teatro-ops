import { createHash } from "node:crypto";

const PARAMETROS_DE_RASTREIO = /^(utm_.+|fbclid|gclid|mc_cid|mc_eid|ocid|cmpid|ref|ref_src)$/i;

/** Remove parâmetros de rastreio e âncora, força https e tira a barra final redundante. */
export function normalizarUrl(bruta: string): string {
  const url = new URL(bruta.trim());
  url.protocol = "https:";
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  for (const chave of [...url.searchParams.keys()]) {
    if (PARAMETROS_DE_RASTREIO.test(chave)) url.searchParams.delete(chave);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}

export const sha256 = (texto: string) => createHash("sha256").update(texto, "utf8").digest("hex");

/** Chave de deduplicação de notícias: sha256 da URL normalizada. */
export const hashUrl = (url: string) => sha256(normalizarUrl(url));

/** Domínio sem "www." (ex.: "reuters.com"). */
export const dominioDe = (url: string) => new URL(url).hostname.toLowerCase().replace(/^www\./, "");
