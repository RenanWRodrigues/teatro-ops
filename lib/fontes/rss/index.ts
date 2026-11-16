// Adaptador RSS 2.0 / Atom genérico para os feeds oficiais de governos (grupo `governos` de config/fontes.yaml).
// Guarda só título, link, data e descrição truncada a 300 caracteres (para filtrar; nunca exibida).
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { fetchComRetry } from "@/lib/fontes/_base/http";
import { rateLimiter } from "@/lib/fontes/_base/limitador";
import type { AdaptadorFonte } from "@/lib/fontes/_base/tipos";
import { hashUrl, normalizarUrl } from "@/lib/fontes/_base/url";
import type { FonteYaml } from "@/lib/fontes/registro";
import { descricaoCurta, type DecisaoNormalizada } from "@/lib/governos/tipos";

/** Item cru, já tirado do XML (RSS ou Atom). */
export type ItemRss = { titulo: string; link: string; data: string | null; descricao: string | null };

const texto = z
  .union([z.string(), z.number(), z.looseObject({ "#text": z.union([z.string(), z.number()]).optional() })])
  .transform((v) => (typeof v === "object" ? String(v["#text"] ?? "") : String(v)));

export const esquemaItemRss = z.object({
  titulo: z.string().trim().min(3),
  link: z.string().url(),
  data: z.string().nullable(),
  descricao: z.string().nullable(),
});

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  // Itens de feed sempre como lista, mesmo quando há um só.
  isArray: (nome) => nome === "item" || nome === "entry" || nome === "link",
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
});

const lista = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const str = (v: unknown): string | null => {
  const r = texto.safeParse(v);
  return r.success && r.data.trim() ? r.data.trim() : null;
};

/** Link de um item Atom: o `rel="alternate"` (ou o primeiro sem `rel`). */
function linkAtom(links: unknown[]): string | null {
  const objs = links.map((l) => (typeof l === "string" ? { "@href": l } : (l as Record<string, string>)));
  const alt = objs.find((l) => !l["@rel"] || l["@rel"] === "alternate") ?? objs[0];
  return alt?.["@href"] ?? null;
}

/** Converte o XML de um feed em itens crus. Lança erro se não for RSS nem Atom. */
export function lerFeed(xml: string): ItemRss[] {
  const doc = parser.parse(xml) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (doc.rss || doc["rdf:RDF"]) {
    const canal = doc.rss?.channel ?? doc["rdf:RDF"];
    const itens = lista(canal?.item ?? doc["rdf:RDF"]?.item);
    return itens.map((i) => ({
      titulo: str(i.title) ?? "",
      link: str(lista(i.link)[0]) ?? str(i.guid) ?? "",
      data: str(i.pubDate) ?? str(i["dc:date"]),
      descricao: descricaoCurta(str(i.description)),
    }));
  }
  if (doc.feed) {
    return lista(doc.feed.entry).map((e) => ({
      titulo: str(e.title) ?? "",
      link: linkAtom(lista(e.link)) ?? "",
      data: str(e.published) ?? str(e.updated),
      descricao: descricaoCurta(str(e.summary) ?? str(e.content)),
    }));
  }
  throw new Error("resposta não é RSS nem Atom");
}

/**
 * Data do feed em ISO. Aceita RFC 822 ("Sun, 15 Nov 2026 14:36:00 +0330"), ISO 8601 e
 * "2026-11-12 14:11:06" sem fuso (usa `fuso` da fonte; padrão UTC). Datas inválidas → null.
 */
export function lerDataFeed(bruta: string | null, fuso = "+00:00"): string | null {
  if (!bruta) return null;
  const s = bruta.trim();
  const semFuso = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/.exec(s);
  // RFC 822 com fuso numérico de 4 dígitos (+0330): o Date do V8 entende.
  const t = Date.parse(semFuso ? `${semFuso[1]}T${semFuso[2]}${fuso}` : s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

const remover = (nome: string) => nome.replace(/\s*\((mídia estatal)\)\s*$/i, "").trim();

export function normalizarItemRss(
  cru: ItemRss,
  fonte: Pick<FonteYaml, "id" | "nome" | "orgao" | "pais" | "idioma" | "fuso" | "categoria">,
  agora = Date.now(),
): DecisaoNormalizada | null {
  const r = esquemaItemRss.safeParse(cru);
  if (!r.success || !fonte.pais) return null;
  const publicadoEm = lerDataFeed(r.data.data, fonte.fuso);
  // Sem data ou com data no futuro (> 1 dia): descarta em vez de inventar.
  if (!publicadoEm || Date.parse(publicadoEm) > agora + 86_400_000) return null;
  const url = normalizarUrl(r.data.link);
  return {
    hash: hashUrl(url),
    fonteId: fonte.id,
    pais: fonte.pais,
    orgao: fonte.orgao ?? remover(fonte.nome),
    tituloOriginal: r.data.titulo.replace(/\s+/g, " "),
    idiomaOriginal: fonte.idioma ?? "en",
    descricao: r.data.descricao,
    urlOficial: url,
    publicadoEm,
    origem: "rss",
    estatal: fonte.categoria === "estatal",
  };
}

export function criarAdaptadorRss(fonte: FonteYaml, fetchImpl?: typeof fetch): AdaptadorFonte<ItemRss, DecisaoNormalizada> {
  if (!fonte.feed) throw new Error(`${fonte.id}: sem feed em config/fontes.yaml`);
  const feed = fonte.feed;
  const esperar = rateLimiter(fonte.id, fonte.limite);
  let corte = 0;
  return {
    id: fonte.id,
    async buscar(desde) {
      corte = desde.getTime();
      await esperar();
      const resp = await fetchComRetry(feed, { fetchImpl, headers: { Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5" } });
      return lerFeed(await resp.text());
    },
    normalizar(item) {
      const n = normalizarItemRss(item, fonte);
      // Itens anteriores à janela do job são ignorados (o feed pode trazer semanas de histórico).
      return n && Date.parse(n.publicadoEm) >= corte ? n : null;
    },
    hash: (item) => item.hash,
  };
}
