// Registro de cada execução em `execucoes_ingestao` (alimenta o carimbo "Atualizado em …" e o /auditar-custos).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultadoExecucao } from "./tipos";

/** Mensagem de erro curta e sem segredos (remove chaves e tokens que apareçam em URLs ou cabeçalhos). */
export function limparErro(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : String(erro);
  return texto
    .replace(/(auth[_-]?key|api[_-]?key|token|apikey|key)=[^&\s]+/gi, "$1=***")
    .replace(/DeepL-Auth-Key\s+\S+/gi, "DeepL-Auth-Key ***")
    .replace(/Bearer\s+\S+/gi, "Bearer ***")
    .replace(/sb_secret_\w+/g, "sb_secret_***")
    .slice(0, 1000);
}

export async function registrarExecucao(
  db: SupabaseClient,
  job: string,
  fonteId: string,
  iniciadoEm: Date,
  resultado: ResultadoExecucao,
): Promise<void> {
  const { error } = await db.from("execucoes_ingestao").insert({
    job,
    fonte_id: fonteId,
    iniciado_em: iniciadoEm.toISOString(),
    terminado_em: new Date().toISOString(),
    itens_novos: resultado.itensNovos,
    itens_ignorados: resultado.itensIgnorados,
    caracteres_traduzidos: resultado.caracteresTraduzidos,
    erro: resultado.erro,
  });
  // Falhar ao registrar não deve esconder o resultado da coleta: só avisa no log do job.
  if (error) console.warn(`[ingestao] não foi possível registrar a execução de ${fonteId}: ${error.message}`);
}
