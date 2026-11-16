// Janela de coleta de cada execução ("desde quando buscar").
// O cron gratuito do GitHub Actions atrasa ou pula execuções (medido em 15–16/11/2026: intervalos de
// 4–8 h num agendamento de 30 min). Uma janela fixa perderia o que saiu entre uma execução e outra; por
// isso a coleta recomeça do início da última execução sem erro da fonte, com sobreposição (a
// deduplicação por hash descarta o repetido), limitada a um teto.
import type { SupabaseClient } from "@supabase/supabase-js";

const HORA = 3_600_000;
/** Sobreposição com a execução anterior: cobre o atraso de publicação dos arquivos de 15 min do GDELT. */
export const MARGEM_MS = 30 * 60_000;

export type ParametrosJanela = {
  agora: Date;
  /** Janela mínima (a de sempre, sem histórico). */
  padraoHoras: number;
  /** Até onde recuperar; `null` = o job não recupera (janela fixa). */
  tetoHoras: number | null;
  /** Início da última execução sem erro da fonte, se houver. */
  ultimoSucesso: Date | null;
};

/** Nunca menos que a janela padrão; nunca mais que o teto. */
export function calcularDesde({ agora, padraoHoras, tetoHoras, ultimoSucesso }: ParametrosJanela): Date {
  const padrao = agora.getTime() - padraoHoras * HORA;
  if (tetoHoras === null || !ultimoSucesso) return new Date(padrao);
  const teto = agora.getTime() - tetoHoras * HORA;
  const recuperar = ultimoSucesso.getTime() - MARGEM_MS;
  return new Date(Math.min(padrao, Math.max(recuperar, teto)));
}

/** Início da última execução sem erro da fonte (`execucoes_ingestao`). Falha de leitura = sem histórico. */
export async function ultimoSucesso(db: SupabaseClient, fonteId: string): Promise<Date | null> {
  const { data, error } = await db
    .from("execucoes_ingestao")
    .select("iniciado_em")
    .eq("fonte_id", fonteId)
    .is("erro", null)
    .order("iniciado_em", { ascending: false })
    .limit(1);
  if (error || !data?.[0]) return null;
  const d = new Date(data[0].iniciado_em as string);
  return Number.isNaN(d.getTime()) ? null : d;
}
