// Cliente do Wikidata (CC0): SPARQL e wbgetentities, com User-Agent identificável e 1 consulta por segundo.
import { z } from "zod";
import { fetchComRetry } from "@/lib/fontes/_base/http";
import { rateLimiter } from "@/lib/fontes/_base/limitador";

export const SPARQL = "https://query.wikidata.org/sparql";
export const API_WIKIDATA = "https://www.wikidata.org/w/api.php";

/** A Wikimedia exige User-Agent identificável (https://meta.wikimedia.org/wiki/User-Agent_policy). */
export function userAgentWikimedia(): string {
  const ua = process.env.WIKIMEDIA_USER_AGENT?.trim();
  if (!ua) throw new Error("WIKIMEDIA_USER_AGENT não definida (exigida pela política de User-Agent da Wikimedia)");
  return ua;
}

const esquemaRespostaSparql = z.object({
  results: z.object({ bindings: z.array(z.record(z.string(), z.looseObject({ value: z.string() }))) }),
});

export type LinhaSparql = Record<string, string>;

export type ClienteWikidata = {
  sparql(consulta: string): Promise<LinhaSparql[]>;
};

export function criarClienteWikidata(opcoes: { fetchImpl?: typeof fetch; limite?: string } = {}): ClienteWikidata {
  const esperar = rateLimiter("wikidata", opcoes.limite ?? "1 req / s");
  return {
    async sparql(consulta) {
      await esperar();
      const resp = await fetchComRetry(`${SPARQL}?format=json&query=${encodeURIComponent(consulta)}`, {
        fetchImpl: opcoes.fetchImpl,
        headers: { "User-Agent": userAgentWikimedia(), Accept: "application/sparql-results+json" },
        timeoutMs: 60_000,
      });
      const corpo = esquemaRespostaSparql.parse(await resp.json());
      // Achata { var: { value } } em { var: value }.
      return corpo.results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
    },
  };
}

export const urlEntidade = (qid: string, propriedade?: string) =>
  `https://www.wikidata.org/wiki/${qid}${propriedade ? `#${propriedade}` : ""}`;

export const qidDaUri = (uri: string) => /\/entity\/(Q\d+)$/.exec(uri)?.[1] ?? null;
