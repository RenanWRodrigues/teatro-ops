// Valores com unidade, no padrão das fichas técnicas (ver skill ficha-equipamento).
// As chaves batem com o campo "unidade" de equipamentos.specs no banco.

import { formatarNumero, type OpcoesNumero } from "./numero";

const SIMBOLOS = {
  mm: "mm",
  cm: "cm",
  m: "m",
  km: "km",
  kg: "kg",
  t: "t",
  "km/h": "km/h",
  m_s: "m/s",
  nos: "nós",
  kn: "kN",
  kw: "kW",
  pes: "pés",
  mach: "Mach",
  g: "G", // fator de carga (ex.: "9 G")
} as const;

export type Unidade = keyof typeof SIMBOLOS;

export const UNIDADES = Object.keys(SIMBOLOS) as Unidade[];

const NBSP = " "; // número e unidade nunca quebram de linha separados

/** Ex.: (1090, "km") → "1.090 km"; (1.6, "mach") → "Mach 1,6". */
export function formatarUnidade(valor: number, unidade: Unidade, opcoes?: OpcoesNumero): string {
  const numero = formatarNumero(valor, opcoes);
  if (numero === "—") return numero;
  if (unidade === "mach") return `Mach${NBSP}${numero}`;
  return `${numero}${NBSP}${SIMBOLOS[unidade]}`;
}
