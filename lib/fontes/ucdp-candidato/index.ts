// UCDP Candidate GED (fonte "ucdp-candidato"): eventos de violência organizada, versão preliminar mensal,
// baixada de https://ucdp.uu.se/downloads/ (a API exige token; os downloads não). Licença CC BY 4.0.
// Usamos só campos estruturados. Os trechos de reportagens (source_article/source_headline) são descartados.
import { z } from "zod";
import { lerCsvComCabecalho } from "../_base/csv";
import { fetchComRetry } from "../_base/http";
import { rateLimiter } from "../_base/limitador";
import { sha256 } from "../_base/url";

export const ID = "ucdp-candidato";
export const PAGINA_DOWNLOADS = "https://ucdp.uu.se/downloads/";

/** Acha o CSV acumulado mais recente: GEDEvent_vAA_01_AA_MM.csv (janeiro → mês MM do ano AA). */
export function acharArquivoAcumulado(html: string): { url: string; ano: number; mes: number } | null {
  let melhor: { url: string; ano: number; mes: number } | null = null;
  for (const m of html.matchAll(/href="(https:\/\/ucdp\.uu\.se\/downloads\/candidateged\/GEDEvent_v(\d{2})_01_(\d{2})_(\d{2})\.csv)"/g)) {
    const ano = 2000 + Number(m[2]);
    const mes = Number(m[4]);
    if (!melhor || ano > melhor.ano || (ano === melhor.ano && mes > melhor.mes)) melhor = { url: m[1]!, ano, mes };
  }
  return melhor;
}

const inteiro = z.string().transform((s) => (s.trim() === "" ? 0 : Number.parseInt(s, 10)));
const numero = z.string().transform((s) => Number(s));

export const esquemaLinhaUcdp = z.object({
  id: z.string().regex(/^\d+$/),
  type_of_violence: z.enum(["1", "2", "3"]),
  conflict_new_id: z.string().transform((s) => (s.trim() === "" ? null : Number.parseInt(s, 10))),
  conflict_name: z.string(),
  side_a: z.string(),
  side_b: z.string(),
  country: z.string().min(1),
  adm_1: z.string(),
  latitude: numero.pipe(z.number().min(-90).max(90)),
  longitude: numero.pipe(z.number().min(-180).max(180)),
  date_start: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  best: inteiro.pipe(z.number().int().min(0)),
  low: inteiro.pipe(z.number().int().min(0)),
  high: inteiro.pipe(z.number().int().min(0)),
});
export type LinhaUcdp = z.infer<typeof esquemaLinhaUcdp>;

export const TIPO_VIOLENCIA: Record<LinhaUcdp["type_of_violence"], string> = {
  "1": "Conflito com participação de Estado",
  "2": "Conflito entre grupos não estatais",
  "3": "Violência unilateral contra civis",
};

/** Países do UCDP → ISO 3166-1 alfa-2 (os que aparecem nos dados; desconhecidos mantêm o nome do UCDP). */
const ISO: Record<string, string> = {
  Ukraine: "UA", "Russia (Soviet Union)": "RU", "Yemen (North Yemen)": "YE", "Saudi Arabia": "SA", Nigeria: "NG",
  Pakistan: "PK", Ethiopia: "ET", Sudan: "SD", Colombia: "CO", Somalia: "SO", "DR Congo (Zaire)": "CD", Mali: "ML",
  Israel: "IL", "Myanmar (Burma)": "MM", "Burkina Faso": "BF", Niger: "NE", Haiti: "HT", Syria: "SY", Afghanistan: "AF",
  "South Sudan": "SS", Iran: "IR", Cameroon: "CM", Lebanon: "LB", Mozambique: "MZ", India: "IN", Iraq: "IQ",
  Indonesia: "ID", Chad: "TD", Philippines: "PH", "Central African Republic": "CF", Mexico: "MX", Ecuador: "EC",
  Brazil: "BR", "South Africa": "ZA", "Sri Lanka": "LK", Kenya: "KE", Benin: "BJ", Togo: "TG", Libya: "LY",
  Egypt: "EG", Turkey: "TR", Thailand: "TH", Bangladesh: "BD", Peru: "PE", Venezuela: "VE", Honduras: "HN",
  Guatemala: "GT", "El Salvador": "SV", Jamaica: "JM", Uganda: "UG", Burundi: "BI", Rwanda: "RW", Algeria: "DZ",
  Tunisia: "TN", Morocco: "MA", Azerbaijan: "AZ", Armenia: "AM", Georgia: "GE", Tajikistan: "TJ", Kyrgyzstan: "KG",
  China: "CN", "United States of America": "US", Qatar: "QA", "United Arab Emirates": "AE", Jordan: "JO",
};
export const isoDoPaisUcdp = (nome: string) => ISO[nome] ?? nome;

export type LinhaEvento = {
  hash: string;
  fonte_id: string;
  id_externo: string;
  conflito_slug: string | null;
  data: string;
  pais: string;
  lat: number;
  lon: number;
  tipo_evento: string;
  atores: string[];
  mortes_estimadas: number;
  mortes_min: number;
  mortes_max: number;
  local: string | null;
};

/** "XXX475" e afins são atores não identificados no UCDP. */
const ator = (s: string) => (/^XXX\d+$/.test(s.trim()) ? "ator não identificado" : s.trim());

export function normalizarLinhaUcdp(
  bruta: Record<string, string>,
  associar: (pais: string, conflito: number | null) => string | null,
): LinhaEvento | null {
  const r = esquemaLinhaUcdp.safeParse(bruta);
  if (!r.success) return null;
  const l = r.data;
  return {
    hash: sha256(`ucdp:${l.id}`),
    fonte_id: ID,
    id_externo: l.id,
    conflito_slug: associar(l.country, l.conflict_new_id),
    data: l.date_start.slice(0, 10),
    pais: isoDoPaisUcdp(l.country),
    lat: l.latitude,
    lon: l.longitude,
    tipo_evento: TIPO_VIOLENCIA[l.type_of_violence],
    atores: [ator(l.side_a), ator(l.side_b)].filter(Boolean),
    mortes_estimadas: l.best,
    mortes_min: Math.min(l.low, l.best),
    mortes_max: Math.max(l.high, l.best),
    local: l.adm_1.trim() || null,
  };
}

export type ArquivoUcdp = { url: string; ano: number; mes: number; linhas: Record<string, string>[] };

/** Baixa a página de downloads, acha o acumulado mais recente e devolve as linhas do CSV. */
export async function baixarUcdp(limite?: string, fetchImpl: typeof fetch = fetch): Promise<ArquivoUcdp> {
  const aguardar = rateLimiter(ID, limite);
  await aguardar();
  const html = await (await fetchComRetry(PAGINA_DOWNLOADS, { fetchImpl })).text();
  const arquivo = acharArquivoAcumulado(html);
  if (!arquivo) throw new Error("UCDP: nenhum arquivo candidato acumulado (GEDEvent_vAA_01_AA_MM.csv) na página de downloads");
  await aguardar();
  const csv = await (await fetchComRetry(arquivo.url, { fetchImpl, timeoutMs: 120_000 })).text();
  return { ...arquivo, linhas: lerCsvComCabecalho(csv) };
}
