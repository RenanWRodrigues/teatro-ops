// Trava do build de produção: sem banco acessível, o deploy falha em vez de publicar só fixtures [EXEMPLO].
//
// Em 17/11/2026 o site foi ao ar inteiro com dados de exemplo: as variáveis do Supabase não
// chegaram ao build da Vercel e nada avisou. Chamado por next.config.ts só quando
// VERCEL_ENV=production; builds locais, de CI, de preview e o e2e continuam funcionando sem banco.
// As mensagens nunca incluem os valores das variáveis.
import { configPublica } from "./config";

export type ResultadoVerificacao = { ok: true } | { ok: false; motivo: string };

export async function verificarBancoNoBuild(opcoes: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): Promise<ResultadoVerificacao> {
  const config = configPublica();
  if (!config) {
    return {
      ok: false,
      motivo:
        "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausente ou mal formada neste build. " +
        "Na Vercel: Settings → Environment Variables, marque o ambiente Production e confira o valor (sem aspas nem espaços).",
    };
  }
  const fetchImpl = opcoes.fetchImpl ?? fetch;
  const url = `${config.url.replace(/\/+$/, "")}/rest/v1/equipamentos?select=slug&limit=1`;
  try {
    const resp = await fetchImpl(url, {
      headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}` },
      signal: AbortSignal.timeout(opcoes.timeoutMs ?? 15_000),
    });
    if (resp.ok) return { ok: true };
    const dica =
      resp.status === 401 || resp.status === 403
        ? "a chave anon foi recusada (confira NEXT_PUBLIC_SUPABASE_ANON_KEY)"
        : resp.status === 404
          ? "endereço não encontrado (confira NEXT_PUBLIC_SUPABASE_URL: só https://<ref>.supabase.co, sem /rest/v1)"
          : "o Supabase respondeu com erro (o projeto pode estar pausado no plano gratuito)";
    return { ok: false, motivo: `Supabase respondeu HTTP ${resp.status}: ${dica}.` };
  } catch (e) {
    return { ok: false, motivo: `Supabase inacessível no build (${(e as Error).name}). Confira NEXT_PUBLIC_SUPABASE_URL e se o projeto não está pausado.` };
  }
}
