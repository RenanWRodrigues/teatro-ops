import { describe, expect, it, vi } from "vitest";
import { limparErro } from "./execucao";
import { ErroHttp, fetchComRetry, lerRetryAfter } from "./http";
import { criarLimitador, intervaloDoLimite } from "./limitador";
import { dominioDe, hashUrl, normalizarUrl } from "./url";

describe("normalizarUrl / hashUrl", () => {
  it("remove rastreio e âncora, força https e ordena parâmetros", () => {
    expect(normalizarUrl("http://WWW.Exemplo.org/a/?utm_source=x&b=2&fbclid=y&a=1#topo")).toBe("https://www.exemplo.org/a?a=1&b=2");
  });

  it("URLs equivalentes têm o mesmo hash", () => {
    expect(hashUrl("https://exemplo.org/n?utm_medium=rss")).toBe(hashUrl("http://exemplo.org/n/"));
    expect(hashUrl("https://exemplo.org/n")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("extrai o domínio sem www", () => {
    expect(dominioDe("https://www.Reuters.com/world")).toBe("reuters.com");
  });
});

describe("intervaloDoLimite", () => {
  it.each([
    ["1 req / 5 s", 5000],
    ["1 req / s", 1000],
    ["2 req / s", 500],
    ["10 req / min", 6000],
    ["500.000 caracteres/mês", null],
    [undefined, null],
  ])("%s → %s ms", (limite, esperado) => {
    expect(intervaloDoLimite(limite)).toBe(esperado);
  });
});

describe("criarLimitador", () => {
  it("espaça chamadas, inclusive concorrentes", async () => {
    let agora = 0;
    const esperas: number[] = [];
    const aguardar = criarLimitador(5000, {
      agora: () => agora,
      esperar: async (ms) => {
        esperas.push(ms);
        agora += ms;
      },
    });
    await Promise.all([aguardar(), aguardar(), aguardar()]);
    expect(esperas).toEqual([5000, 5000]);
  });
});

describe("lerRetryAfter", () => {
  it("aceita segundos e data HTTP", () => {
    expect(lerRetryAfter("7")).toBe(7000);
    expect(lerRetryAfter("Thu, 01 Jan 2026 00:00:10 GMT", Date.parse("2026-01-01T00:00:00Z"))).toBe(10_000);
    expect(lerRetryAfter(null)).toBeNull();
  });
});

describe("fetchComRetry", () => {
  const resp = (status: number, headers: Record<string, string> = {}) => new Response(status === 200 ? "{}" : "erro", { status, headers });

  it("repete em 503 com backoff e envia User-Agent", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(resp(503)).mockResolvedValueOnce(resp(200));
    const esperar = vi.fn().mockResolvedValue(undefined);
    const r = await fetchComRetry("https://exemplo.org", { fetchImpl, esperar, esperaBaseMs: 100 });
    expect(r.status).toBe(200);
    expect(esperar).toHaveBeenCalledWith(100);
    expect(fetchImpl.mock.calls[0]![1].headers["User-Agent"]).toMatch(/^TEATRO-OPS\//);
  });

  it("respeita Retry-After em 429", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(resp(429, { "retry-after": "3" })).mockResolvedValueOnce(resp(200));
    const esperar = vi.fn().mockResolvedValue(undefined);
    await fetchComRetry("https://exemplo.org", { fetchImpl, esperar });
    expect(esperar).toHaveBeenCalledWith(3000);
  });

  it("não repete em 404 e lança ErroHttp", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resp(404));
    await expect(fetchComRetry("https://exemplo.org", { fetchImpl, esperar: async () => {} })).rejects.toBeInstanceOf(ErroHttp);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("repete falha de rede e desiste após o limite de tentativas", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchComRetry("https://exemplo.org", { fetchImpl, esperar: async () => {}, tentativas: 3 })).rejects.toThrow("fetch failed");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe("limparErro", () => {
  it("não deixa chaves e tokens chegarem ao banco", () => {
    const msg = limparErro(new Error("falhou: https://x.org/?auth_key=abc123&q=1 DeepL-Auth-Key segredo:fx Bearer tok sb_secret_xyz"));
    expect(msg).not.toMatch(/abc123|segredo|tok\b|xyz/);
  });
});
