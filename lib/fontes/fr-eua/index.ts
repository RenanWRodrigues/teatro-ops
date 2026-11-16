// Federal Register (EUA): documentos presidenciais (PRESDOCU) e publicações de Defesa, Estado e Tesouro/OFAC.
// API sem chave; pedimos só os campos necessários (fields[]). Domínio público (governo dos EUA).
import { z } from "zod";
import { fetchComRetry } from "@/lib/fontes/_base/http";
import { rateLimiter } from "@/lib/fontes/_base/limitador";
import type { AdaptadorFonte } from "@/lib/fontes/_base/tipos";
import { hashUrl, normalizarUrl } from "@/lib/fontes/_base/url";
import type { FonteYaml } from "@/lib/fontes/registro";
import { diaBrasilia } from "@/lib/governos/semanas";
import { descricaoCurta, type DecisaoNormalizada } from "@/lib/governos/tipos";

export const BASE_FR = "https://www.federalregister.gov/api/v1/documents.json";

const CAMPOS = ["document_number", "title", "type", "subtype", "abstract", "html_url", "publication_date", "agencies"];

/** Consultas feitas a cada coleta: atos presidenciais e os órgãos de defesa, diplomacia e sanções. */
export const CONSULTAS_FR: Record<string, string[]> = {
  presidencia: ["conditions[type][]=PRESDOCU"],
  orgaos: [
    "conditions[agencies][]=defense-department",
    "conditions[agencies][]=state-department",
    "conditions[agencies][]=foreign-assets-control-office",
  ],
};

export const esquemaDocumentoFr = z.object({
  document_number: z.string().min(1),
  title: z.string().min(1),
  type: z.string(),
  subtype: z.string().nullable().optional(),
  abstract: z.string().nullable().optional(),
  html_url: z.string().url(),
  publication_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  agencies: z.array(z.object({ slug: z.string().optional(), name: z.string().optional(), raw_name: z.string().optional() })).default([]),
});
export type DocumentoFr = z.infer<typeof esquemaDocumentoFr>;

export const esquemaRespostaFr = z.object({
  count: z.number(),
  next_page_url: z.string().nullable().optional(),
  results: z.array(z.unknown()).default([]),
});

/** Órgão exibido, do mais específico ao mais geral. */
const ORGAOS: [string, string][] = [
  ["executive-office-of-the-president", "Presidência dos EUA (Casa Branca)"],
  ["foreign-assets-control-office", "Departamento do Tesouro dos EUA (OFAC)"],
  ["defense-department", "Departamento de Defesa dos EUA"],
  ["state-department", "Departamento de Estado dos EUA"],
  ["treasury-department", "Departamento do Tesouro dos EUA"],
];

export function orgaoFr(doc: Pick<DocumentoFr, "type" | "agencies">): string {
  const slugs = new Set(doc.agencies.map((a) => a.slug).filter(Boolean));
  if (doc.type === "Presidential Document") return ORGAOS[0]![1];
  for (const [slug, nome] of ORGAOS) if (slugs.has(slug)) return nome;
  return "Governo dos EUA (Federal Register)";
}

export function montarUrlFr(consulta: string[], desde: Date, pagina = 1): string {
  const params = [
    "per_page=100",
    "order=newest",
    `page=${pagina}`,
    ...CAMPOS.map((c) => `fields[]=${c}`),
    ...consulta,
    `conditions[publication_date][gte]=${desde.toISOString().slice(0, 10)}`,
  ];
  return `${BASE_FR}?${params.map((p) => p.replace("[", "%5B").replace("]", "%5D").replace("[", "%5B").replace("]", "%5D").replace("[", "%5B").replace("]", "%5D")).join("&")}`;
}

export function normalizarDocumentoFr(cru: unknown, fonteId = "fr-eua", agora = Date.now()): DecisaoNormalizada | null {
  const r = esquemaDocumentoFr.safeParse(cru);
  if (!r.success) return null;
  const d = r.data;
  // O Federal Register lista com antecedência documentos programados para o dia seguinte: só entram na data.
  if (d.publication_date > diaBrasilia(new Date(agora).toISOString())) return null;
  const url = normalizarUrl(d.html_url);
  return {
    hash: hashUrl(url),
    fonteId,
    pais: "US",
    orgao: orgaoFr(d),
    tituloOriginal: d.title.trim(),
    idiomaOriginal: "en",
    descricao: descricaoCurta(d.abstract),
    urlOficial: url,
    // Data de publicação no Federal Register (meio-dia UTC evita virar o dia no fuso de Brasília).
    publicadoEm: `${d.publication_date}T12:00:00.000Z`,
    tipoDocumento: d.type,
    subtipoDocumento: d.subtype ?? null,
    origem: "registro",
    estatal: false,
  };
}

export function criarAdaptadorFr(config: Pick<FonteYaml, "id" | "limite">, fetchImpl?: typeof fetch): AdaptadorFonte<unknown, DecisaoNormalizada> {
  const esperar = rateLimiter(config.id, config.limite);
  return {
    id: config.id,
    async buscar(desde) {
      const itens: unknown[] = [];
      for (const consulta of Object.values(CONSULTAS_FR)) {
        // Até 5 páginas de 100 por consulta: cobre com folga a janela do job (horas).
        for (let pagina = 1; pagina <= 5; pagina++) {
          await esperar();
          const resp = await fetchComRetry(montarUrlFr(consulta, desde, pagina), { fetchImpl });
          const corpo = esquemaRespostaFr.parse(await resp.json());
          itens.push(...corpo.results);
          if (!corpo.next_page_url || corpo.results.length === 0) break;
        }
      }
      return itens;
    },
    normalizar: (item) => normalizarDocumentoFr(item, config.id),
    hash: (item) => item.hash,
  };
}
