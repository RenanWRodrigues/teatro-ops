// Saúde das fontes para o job `manutencao` (Fase 11, item 3) e para `pnpm fontes:verificar`.
// Duas medidas independentes:
//  1) coleta: há quanto tempo cada fonte ativa não tem uma execução sem erro (execucoes_ingestao);
//  2) endereço: uma requisição ao feed/URL/página da fonte (status HTTP e tempo de resposta).
import type { FonteYaml } from "@/lib/fontes/registro";

/** Horas sem coleta bem-sucedida a partir das quais uma fonte ativa é considerada quebrada, por job. */
export const LIMITE_HORAS_SEM_COLETA: Record<string, number> = {
  noticias: 12, // cron de 30 min, mas o agendador gratuito do GitHub atrasa horas
  governos: 24,
  eventos: 72,
  arsenal: 24 * 9,
};

export type Execucao = { fonte_id: string | null; terminado_em: string | null; erro: string | null };

export type SaudeColeta = {
  id: string;
  job: string;
  ultimoSucesso: string | null;
  ultimoErro: string | null;
  /** Mensagem do erro mais recente, quando a última execução falhou. */
  mensagem: string | null;
  quebrada: boolean;
};

/** Avalia as fontes ativas que têm job agendado, a partir das execuções recentes (ordem qualquer). */
export function avaliarColeta(fontes: FonteYaml[], execucoes: Execucao[], agora: Date): SaudeColeta[] {
  const porFonte = new Map<string, Execucao[]>();
  for (const e of execucoes) {
    if (!e.fonte_id || !e.terminado_em) continue;
    porFonte.set(e.fonte_id, [...(porFonte.get(e.fonte_id) ?? []), e]);
  }
  return fontes
    .filter((f) => f.status === "ativa" && f.job && LIMITE_HORAS_SEM_COLETA[f.job] !== undefined)
    .map((f) => {
      const lista = (porFonte.get(f.id) ?? []).sort((a, b) => b.terminado_em!.localeCompare(a.terminado_em!));
      const sucesso = lista.find((e) => !e.erro)?.terminado_em ?? null;
      const ultima = lista[0];
      const limiteMs = LIMITE_HORAS_SEM_COLETA[f.job!]! * 3_600_000;
      const quebrada = !sucesso || agora.getTime() - Date.parse(sucesso) > limiteMs;
      return {
        id: f.id,
        job: f.job!,
        ultimoSucesso: sucesso,
        ultimoErro: ultima?.erro ? ultima.terminado_em : null,
        mensagem: ultima?.erro ?? null,
        quebrada,
      };
    });
}

export type SondagemEndereco = { id: string; url: string; status: number | null; ms: number; ok: boolean; motivo: string | null };

/** Endereço testável da fonte: verificar › feed › url › página; `null` quando não há (ou é variável de ambiente). */
export function enderecoDaFonte(f: FonteYaml): string | null {
  const url = f.verificar ?? f.feed ?? f.url ?? f.pagina ?? null;
  return url && /^https?:\/\//.test(url) && !url.includes("${") ? url : null;
}

/**
 * Uma requisição GET (sem tentativas extras: o objetivo é medir). 2xx e 3xx = ok. APIs que respondem 400/401
 * sem parâmetros ou chave aparecem como "responde, mas pede parâmetros/credencial", não como fora do ar.
 */
export async function sondarEndereco(
  f: FonteYaml,
  opcoes: { fetchImpl?: typeof fetch; timeoutMs?: number; userAgent?: string } = {},
): Promise<SondagemEndereco | null> {
  const url = enderecoDaFonte(f);
  if (!url) return null;
  const { fetchImpl = fetch, timeoutMs = 20_000, userAgent = "TEATRO-OPS/1.0 (verificacao de fontes)" } = opcoes;
  const inicio = Date.now();
  try {
    const r = await fetchImpl(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": userAgent } });
    await r.body?.cancel().catch(() => undefined);
    const ms = Date.now() - inicio;
    if (r.ok) return { id: f.id, url, status: r.status, ms, ok: true, motivo: null };
    const motivo =
      r.status === 400 || r.status === 401 || r.status === 422
        ? "responde, mas pede parâmetros ou credencial"
        : r.status === 403
          ? "bloqueia acesso automatizado (403)"
          : r.status === 429
            ? "limite de requisições (429)"
            : `HTTP ${r.status}`;
    return { id: f.id, url, status: r.status, ms, ok: false, motivo };
  } catch (e) {
    const ms = Date.now() - inicio;
    const motivo = e instanceof Error && e.name === "TimeoutError" ? `sem resposta em ${Math.round(timeoutMs / 1000)} s` : "falha de rede";
    return { id: f.id, url, status: null, ms, ok: false, motivo };
  }
}
