// Datas sempre exibidas no fuso de Brasília, no formato dd/mm/aaaa.

export const FUSO_PADRAO = "America/Sao_Paulo";

/** Texto exibido quando a data recebida é inválida (nunca mostramos erro cru). */
export const DATA_INDISPONIVEL = "—";

export type EntradaData = Date | string | number;

function paraDate(entrada: EntradaData): Date | null {
  const data = entrada instanceof Date ? entrada : new Date(entrada);
  return Number.isNaN(data.getTime()) ? null : data;
}

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_PADRAO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatadorDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_PADRAO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partes(formatador: Intl.DateTimeFormat, data: Date) {
  const mapa: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const parte of formatador.formatToParts(data)) mapa[parte.type] = parte.value;
  return mapa;
}

/** Ex.: 14/11/2026. Data sem hora ("2026-07-01") é exibida como está, sem conversão de fuso. */
export function formatarData(entrada: EntradaData): string {
  if (typeof entrada === "string") {
    const so = /^(\d{4})-(\d{2})-(\d{2})$/.exec(entrada.trim());
    if (so) return `${so[3]}/${so[2]}/${so[1]}`;
  }
  const data = paraDate(entrada);
  if (!data) return DATA_INDISPONIVEL;
  const p = partes(formatadorData, data);
  return `${p.day}/${p.month}/${p.year}`;
}

/** Ex.: 14/11/2026 09:30 (horário de Brasília). */
export function formatarDataHora(entrada: EntradaData): string {
  const data = paraDate(entrada);
  if (!data) return DATA_INDISPONIVEL;
  const p = partes(formatadorDataHora, data);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** Carimbo de atualização do microcopy: "14/11/2026 às 11h20" (horário de Brasília). */
export function formatarCarimbo(entrada: EntradaData): string {
  const data = paraDate(entrada);
  if (!data) return DATA_INDISPONIVEL;
  const p = partes(formatadorDataHora, data);
  return `${p.day}/${p.month}/${p.year} às ${p.hour}h${p.minute}`;
}

/** "16/11 às 09:30" (horário de Brasília), para avisos curtos de dado defasado. */
export function formatarDiaHora(entrada: EntradaData): string {
  const data = paraDate(entrada);
  if (!data) return DATA_INDISPONIVEL;
  const p = partes(formatadorDataHora, data);
  return `${p.day}/${p.month} às ${p.hour}:${p.minute}`;
}

/** Hora curta "11:20" no horário de Brasília. */
export function formatarHora(entrada: EntradaData): string {
  const data = paraDate(entrada);
  if (!data) return DATA_INDISPONIVEL;
  const p = partes(formatadorDataHora, data);
  return `${p.hour}:${p.minute}`;
}
