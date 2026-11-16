// Semanas (segunda a domingo) e dias no fuso de Brasília, para agrupar e comparar decisões.
// Brasília não tem horário de verão desde 2019: UTC−3 fixo.

const OFFSET_MS = -3 * 3_600_000;

/** "2026-11-15" — dia civil em Brasília de um instante ISO. */
export function diaBrasilia(iso: string): string {
  return new Date(Date.parse(iso) + OFFSET_MS).toISOString().slice(0, 10);
}

/** Segunda-feira (dia civil em Brasília) da semana do instante. */
export function inicioSemana(iso: string): string {
  const d = new Date(`${diaBrasilia(iso)}T00:00:00Z`);
  const diaSemana = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - diaSemana);
  return d.toISOString().slice(0, 10);
}

/** Domingo da semana que começa em `segunda` ("AAAA-MM-DD"). */
export function fimSemana(segunda: string): string {
  const d = new Date(`${segunda}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

/** "AAAA-MM-DD" → "dd/mm/aaaa" sem passar por fuso (é um dia civil). */
export const diaParaBr = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
