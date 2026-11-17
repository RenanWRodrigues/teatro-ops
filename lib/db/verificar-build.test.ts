import { afterEach, describe, expect, it, vi } from "vitest";
import { verificarBancoNoBuild } from "./verificar-build";

const URL_OK = "https://abcdefghijklmnop.supabase.co";
const CHAVE = "sb_publishable_chave-de-teste-com-tamanho";

const comEnv = (url?: string, chave?: string) => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url ?? "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", chave ?? "");
};
const responde = (status: number) => (async () => new Response("[]", { status })) as unknown as typeof fetch;

afterEach(() => vi.unstubAllEnvs());

describe("verificarBancoNoBuild", () => {
  it("falha sem as variáveis, sem expor valores", async () => {
    comEnv(undefined, CHAVE);
    const r = await verificarBancoNoBuild({ fetchImpl: responde(200) });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.motivo).toMatch(/NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    expect(!r.ok && r.motivo).not.toContain(CHAVE);
  });

  it("passa quando o banco responde com a chave anon", async () => {
    comEnv(URL_OK, CHAVE);
    let pedido: { url: string; apikey: string | null } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      pedido = { url, apikey: new Headers(init.headers).get("apikey") };
      return new Response("[]", { status: 200 });
    }) as unknown as typeof fetch;
    expect(await verificarBancoNoBuild({ fetchImpl })).toEqual({ ok: true });
    expect(pedido).toEqual({ url: `${URL_OK}/rest/v1/equipamentos?select=slug&limit=1`, apikey: CHAVE });
  });

  it("explica chave recusada e endereço errado", async () => {
    comEnv(URL_OK, CHAVE);
    const r401 = await verificarBancoNoBuild({ fetchImpl: responde(401) });
    expect(!r401.ok && r401.motivo).toMatch(/HTTP 401.*chave anon/);
    const r404 = await verificarBancoNoBuild({ fetchImpl: responde(404) });
    expect(!r404.ok && r404.motivo).toMatch(/HTTP 404.*sem \/rest\/v1/);
  });

  it("falha quando o Supabase não responde", async () => {
    comEnv(URL_OK, CHAVE);
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const r = await verificarBancoNoBuild({ fetchImpl });
    expect(!r.ok && r.motivo).toMatch(/inacessível/);
  });
});
