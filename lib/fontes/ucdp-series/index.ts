// Séries anuais do UCDP (fonte "ucdp-series") para /arquivo (Fase 9, item 2):
// - UCDP/PRIO Armed Conflict Dataset (ACD): uma linha por conflito-ano com participação de Estado, desde 1946;
// - UCDP Battle-Related Deaths Dataset (BRD, nível de conflito): mortes em combate por conflito-ano, desde 1989.
// Baixados de https://ucdp.uu.se/downloads/ (sem chave), licença CC BY 4.0. Versões anuais: o script
// scripts/arquivo/ucdp-series.ts acha a mais recente, agrega e grava content/arquivo/ucdp-series.json.
import { strFromU8, unzipSync } from "fflate";
import { z } from "zod";
import { lerCsvComCabecalho } from "../_base/csv";
import { fetchComRetry } from "../_base/http";
import { rateLimiter } from "../_base/limitador";

export const ID = "ucdp-series";
export const PAGINA_DOWNLOADS = "https://ucdp.uu.se/downloads/";

export type ArquivosUcdp = { versao: string; acd: string; brd: string };

/** Acha a versão mais recente com ACD e BRD em CSV (ex.: 261 → "26.1"). */
export function acharVersaoMaisRecente(html: string): ArquivosUcdp | null {
  const acd = new Map<number, string>();
  const brd = new Map<number, string>();
  for (const m of html.matchAll(/href="(https:\/\/ucdp\.uu\.se\/downloads\/ucdpprio\/ucdp-prio-acd-(\d{3})-csv\.zip)"/g)) acd.set(Number(m[2]), m[1]!);
  for (const m of html.matchAll(/href="(https:\/\/ucdp\.uu\.se\/downloads\/brd\/ucdp-brd-conf-(\d{3})-csv\.zip)"/g)) brd.set(Number(m[2]), m[1]!);
  const comuns = [...acd.keys()].filter((v) => brd.has(v)).sort((a, b) => b - a);
  const v = comuns[0];
  if (v === undefined) return null;
  return { versao: `${Math.floor(v / 10)}.${v % 10}`, acd: acd.get(v)!, brd: brd.get(v)! };
}

const ano = z.string().regex(/^\d{4}$/).transform(Number);
const inteiro = z.string().transform((s) => (s.trim() === "" ? 0 : Number.parseInt(s, 10))).pipe(z.number().int().min(0));

export const esquemaLinhaAcd = z.object({
  conflict_id: z.string().regex(/^\d+$/),
  year: ano,
  /** 1 = 25 a 999 mortes em combate no ano; 2 = 1.000 ou mais ("guerra"). */
  intensity_level: z.enum(["1", "2"]),
  /** 1 extrassistêmico, 2 interestatal, 3 intraestatal, 4 intraestatal internacionalizado. */
  type_of_conflict: z.enum(["1", "2", "3", "4"]),
});

export const esquemaLinhaBrd = z.object({
  conflict_id: z.string().regex(/^\d+$/),
  year: ano,
  bd_best: inteiro,
  bd_low: inteiro,
  bd_high: inteiro,
});

export type AnoConflitos = {
  ano: number;
  total: number;
  /** Conflitos com 1.000 ou mais mortes em combate no ano. */
  guerras: number;
  extrassistemico: number;
  interestatal: number;
  intraestatal: number;
  internacionalizado: number;
};
export type AnoMortes = { ano: number; estimativa: number; minimo: number; maximo: number };

const CAMPO_TIPO = { "1": "extrassistemico", "2": "interestatal", "3": "intraestatal", "4": "internacionalizado" } as const;

/** Conta os conflitos ativos por ano e tipo. Linhas inválidas são descartadas e contadas. */
export function agregarConflitos(csv: string): { anos: AnoConflitos[]; ignoradas: number } {
  const porAno = new Map<number, AnoConflitos>();
  let ignoradas = 0;
  for (const bruta of lerCsvComCabecalho(csv)) {
    const r = esquemaLinhaAcd.safeParse(bruta);
    if (!r.success) {
      ignoradas++;
      continue;
    }
    const l = r.data;
    const a = porAno.get(l.year) ?? { ano: l.year, total: 0, guerras: 0, extrassistemico: 0, interestatal: 0, intraestatal: 0, internacionalizado: 0 };
    a.total++;
    if (l.intensity_level === "2") a.guerras++;
    a[CAMPO_TIPO[l.type_of_conflict]]++;
    porAno.set(l.year, a);
  }
  return { anos: preencherAnos(porAno, (ano) => ({ ano, total: 0, guerras: 0, extrassistemico: 0, interestatal: 0, intraestatal: 0, internacionalizado: 0 })), ignoradas };
}

/** Soma as mortes em combate (estimativa, mínimo e máximo do UCDP) por ano. */
export function agregarMortes(csv: string): { anos: AnoMortes[]; ignoradas: number } {
  const porAno = new Map<number, AnoMortes>();
  let ignoradas = 0;
  for (const bruta of lerCsvComCabecalho(csv)) {
    const r = esquemaLinhaBrd.safeParse(bruta);
    if (!r.success) {
      ignoradas++;
      continue;
    }
    const l = r.data;
    const a = porAno.get(l.year) ?? { ano: l.year, estimativa: 0, minimo: 0, maximo: 0 };
    a.estimativa += l.bd_best;
    a.minimo += l.bd_low;
    a.maximo += l.bd_high;
    porAno.set(l.year, a);
  }
  return { anos: preencherAnos(porAno, (ano) => ({ ano, estimativa: 0, minimo: 0, maximo: 0 })), ignoradas };
}

/** Ordena e preenche anos sem linhas com zero, do primeiro ao último ano da série. */
function preencherAnos<T extends { ano: number }>(porAno: Map<number, T>, vazio: (ano: number) => T): T[] {
  if (porAno.size === 0) return [];
  const anos = [...porAno.keys()];
  const lista: T[] = [];
  for (let a = Math.min(...anos); a <= Math.max(...anos); a++) lista.push(porAno.get(a) ?? vazio(a));
  return lista;
}

/** Extrai o único CSV de um zip do UCDP. */
export function csvDoZip(zip: Uint8Array): string {
  const arquivos = Object.entries(unzipSync(zip)).filter(([nome]) => nome.toLowerCase().endsWith(".csv"));
  if (arquivos.length !== 1) throw new Error(`zip do UCDP com ${arquivos.length} CSVs (esperado 1)`);
  return strFromU8(arquivos[0]![1]);
}

export type SeriesUcdp = {
  versao: string;
  coletado_em: string;
  arquivos: { acd: string; brd: string };
  conflitos: AnoConflitos[];
  mortes: AnoMortes[];
  ignoradas: number;
};

/** Baixa a versão mais recente e agrega as duas séries. */
export async function buscarSeries(opcoes: { fetchImpl?: typeof fetch; limite?: string; agora?: Date } = {}): Promise<SeriesUcdp> {
  const { fetchImpl, limite, agora = new Date() } = opcoes;
  const aguardar = rateLimiter(ID, limite);
  await aguardar();
  const html = await (await fetchComRetry(PAGINA_DOWNLOADS, { fetchImpl })).text();
  const arquivos = acharVersaoMaisRecente(html);
  if (!arquivos) throw new Error("página de downloads do UCDP sem ACD/BRD em CSV na mesma versão");
  await aguardar();
  const acd = csvDoZip(new Uint8Array(await (await fetchComRetry(arquivos.acd, { fetchImpl, timeoutMs: 120_000 })).arrayBuffer()));
  await aguardar();
  const brd = csvDoZip(new Uint8Array(await (await fetchComRetry(arquivos.brd, { fetchImpl, timeoutMs: 120_000 })).arrayBuffer()));
  const c = agregarConflitos(acd);
  const m = agregarMortes(brd);
  return {
    versao: arquivos.versao,
    coletado_em: agora.toISOString(),
    arquivos: { acd: arquivos.acd, brd: arquivos.brd },
    conflitos: c.anos,
    mortes: m.anos,
    ignoradas: c.ignoradas + m.ignoradas,
  };
}
