// Curadoria de conflitos (config/conflitos.yaml) e cálculo da intensidade a partir dos eventos do UCDP.
import { parse } from "yaml";
import { z } from "zod";

const esquemaRegra = z.object({ pais: z.string().min(1), conflitos: z.array(z.number().int()).optional() });

export const esquemaConflitoCurado = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nome: z.string().min(1),
  paises: z.array(z.string().length(2)).min(1),
  regiao: z.string().min(1),
  ucdp: z.array(esquemaRegra).min(1),
});
export type ConflitoCurado = z.infer<typeof esquemaConflitoCurado>;

export function lerCuradoria(textoYaml: string): ConflitoCurado[] {
  const { conflitos } = z.object({ conflitos: z.array(esquemaConflitoCurado) }).parse(parse(textoYaml));
  const slugs = new Set<string>();
  for (const c of conflitos) {
    if (slugs.has(c.slug)) throw new Error(`config/conflitos.yaml: slug duplicado ${c.slug}`);
    slugs.add(c.slug);
  }
  return conflitos;
}

/** Slug do conflito a que o evento pertence, ou null. */
export function criarAssociador(curadoria: ConflitoCurado[]) {
  const porPais = new Map<string, { slug: string; ids: Set<number> | null }[]>();
  for (const c of curadoria) {
    for (const r of c.ucdp) {
      const lista = porPais.get(r.pais) ?? [];
      lista.push({ slug: c.slug, ids: r.conflitos ? new Set(r.conflitos) : null });
      porPais.set(r.pais, lista);
    }
  }
  return (paisUcdp: string, idConflito: number | null): string | null => {
    for (const r of porPais.get(paisUcdp) ?? []) {
      if (!r.ids || (idConflito !== null && r.ids.has(idConflito))) return r.slug;
    }
    return null;
  };
}

/** Limiares (mortes estimadas no trimestre): ritmo anual de 1.000 = "guerra" e piso de 25 = "conflito armado" no UCDP. */
export const LIMIAR_ALTA = 250;
export const LIMIAR_TENSAO = 25;

export type EventoParaCalculo = { slug: string | null; data: string; best: number; low: number; high: number; lat: number; lon: number };

export type Estatistica = {
  slug: string;
  intensidade: "alta" | "tensao" | null;
  periodoInicio: string;
  periodoFim: string;
  eventos: number;
  mortes: number;
  mortesMin: number;
  mortesMax: number;
  lon: number | null;
  lat: number | null;
};

const mediana = (v: number[]) => {
  if (v.length === 0) return null;
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m]! : (o[m - 1]! + o[m]!) / 2;
};

/** Primeiro dia do mês, dois meses antes do mês de `fim` (janela de 3 meses civis). */
export function inicioDoTrimestre(fim: string): string {
  const [a, m] = fim.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(a, m - 1 - 2, 1));
  return d.toISOString().slice(0, 10);
}

/** Intensidade e números de cada conflito curado nos últimos 3 meses com dados. */
export function calcularEstatisticas(curadoria: ConflitoCurado[], eventos: EventoParaCalculo[]): Estatistica[] {
  const fim = eventos.reduce((max, e) => (e.data > max ? e.data : max), "");
  if (!fim) return [];
  const inicio = inicioDoTrimestre(fim);
  const doPeriodo = eventos.filter((e) => e.slug && e.data >= inicio && e.data <= fim);

  return curadoria.map((c) => {
    const ev = doPeriodo.filter((e) => e.slug === c.slug);
    const mortes = ev.reduce((s, e) => s + e.best, 0);
    // O UCDP às vezes traz low > best ou high < best; o intervalo exibido sempre contém a estimativa.
    const mortesMin = ev.reduce((s, e) => s + Math.min(e.low, e.best), 0);
    const mortesMax = ev.reduce((s, e) => s + Math.max(e.high, e.best), 0);
    return {
      slug: c.slug,
      intensidade: mortes >= LIMIAR_ALTA ? "alta" : mortes >= LIMIAR_TENSAO ? "tensao" : null,
      periodoInicio: inicio,
      periodoFim: fim,
      eventos: ev.length,
      mortes,
      mortesMin,
      mortesMax,
      lon: mediana(ev.map((e) => e.lon)),
      lat: mediana(ev.map((e) => e.lat)),
    };
  });
}
