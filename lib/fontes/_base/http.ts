// fetch com timeout, novas tentativas com backoff exponencial e respeito a Retry-After.

/** Identificação do robô. Sem e-mail pessoal: o contato público entra com o domínio (Fase 11). */
export const USER_AGENT =
  process.env.INGESTAO_USER_AGENT ?? "TEATRO-OPS/1.0 (portal informativo nao comercial; ingestao de fontes abertas)";

export type OpcoesFetch = RequestInit & {
  timeoutMs?: number;
  tentativas?: number;
  /** Base do backoff (dobra a cada tentativa). */
  esperaBaseMs?: number;
  /** Injetável nos testes. */
  fetchImpl?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
};

export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly corpo: string,
  ) {
    super(`HTTP ${status} em ${new URL(url).host}: ${corpo.slice(0, 200)}`);
  }
}

const esperarPadrao = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Converte Retry-After (segundos ou data HTTP) em milissegundos. */
export function lerRetryAfter(valor: string | null, agora = Date.now()): number | null {
  if (!valor) return null;
  const segundos = Number(valor);
  if (Number.isFinite(segundos)) return Math.max(0, segundos * 1000);
  const data = Date.parse(valor);
  return Number.isNaN(data) ? null : Math.max(0, data - agora);
}

const deveRepetir = (status: number) => status === 429 || status === 408 || status >= 500;

export async function fetchComRetry(url: string, opcoes: OpcoesFetch = {}): Promise<Response> {
  const {
    timeoutMs = 20_000,
    tentativas = 3,
    esperaBaseMs = 2_000,
    fetchImpl = fetch,
    esperar = esperarPadrao,
    headers,
    ...init
  } = opcoes;

  const backoff = (tentativa: number) => esperaBaseMs * 2 ** (tentativa - 1);

  for (let tentativa = 1; ; tentativa++) {
    const ultima = tentativa >= tentativas;

    let resposta: Response;
    try {
      resposta = await fetchImpl(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (erroDeRede) {
      // Timeout, DNS, conexão recusada…
      if (ultima) throw erroDeRede;
      await esperar(backoff(tentativa));
      continue;
    }

    if (resposta.ok) return resposta;

    const corpo = await resposta.text().catch(() => "");
    if (ultima || !deveRepetir(resposta.status)) throw new ErroHttp(resposta.status, url, corpo);
    await esperar(lerRetryAfter(resposta.headers.get("retry-after")) ?? backoff(tentativa));
  }
}
