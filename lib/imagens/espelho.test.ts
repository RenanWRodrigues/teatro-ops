import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { espelharMidias } from "@/lib/arsenal/gravar";
import type { LinhaMidiaNova } from "@/lib/arsenal/cadastro";
import { caminhoEspelho, ehEspelho, espelharFoto } from "./espelho";

const THUMB = "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/31-48_Training_%288586748%29.jpg/960px-31-48_Training_%288586748%29.jpg?utm_source=commons.wikimedia.org";
const ORIGINAL = "https://upload.wikimedia.org/wikipedia/commons/1/1a/31-48_Training_%288586748%29.jpg";
const PUBLICA = "https://abc.supabase.co/storage/v1/object/public/fotos/";

/** Storage falso: guarda o que foi enviado. */
function dbFalso() {
  const enviados: { caminho: string; tipo?: string; bytes: number }[] = [];
  const db = {
    storage: {
      from: () => ({
        upload: async (caminho: string, bytes: Uint8Array, o: { contentType?: string }) => {
          enviados.push({ caminho, tipo: o.contentType, bytes: bytes.byteLength });
          return { error: null };
        },
        getPublicUrl: (caminho: string) => ({ data: { publicUrl: PUBLICA + caminho } }),
      }),
    },
  } as unknown as SupabaseClient;
  return { db, enviados };
}

const uaAnterior = process.env.WIKIMEDIA_USER_AGENT;
beforeEach(() => {
  process.env.WIKIMEDIA_USER_AGENT = "TEATRO-OPS-teste/1.0 (https://example.org)";
});
afterEach(() => {
  process.env.WIKIMEDIA_USER_AGENT = uaAnterior;
});

describe("cópia das fotos no Storage", () => {
  it("dá o mesmo caminho ao original e a qualquer miniatura do arquivo", () => {
    expect(caminhoEspelho(THUMB, "jpg")).toBe(caminhoEspelho(ORIGINAL, "jpg"));
    expect(caminhoEspelho(THUMB, "jpg")).toMatch(/^commons\/[0-9a-f]{32}-960\.jpg$/);
  });

  it("baixa a miniatura de 960 px com o User-Agent da Wikimedia e grava no bucket", async () => {
    const pedidos: { url: string; ua: string | null }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      pedidos.push({ url, ua: new Headers(init.headers).get("user-agent") });
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
    }) as unknown as typeof fetch;
    const { db, enviados } = dbFalso();

    const url = await espelharFoto(db, THUMB, { fetchImpl });

    expect(pedidos).toEqual([
      { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/31-48_Training_%288586748%29.jpg/960px-31-48_Training_%288586748%29.jpg", ua: "TEATRO-OPS-teste/1.0 (https://example.org)" },
    ]);
    expect(enviados).toEqual([{ caminho: caminhoEspelho(THUMB, "jpg"), tipo: "image/jpeg", bytes: 3 }]);
    expect(ehEspelho(url)).toBe(true);
  });

  it("recusa resposta que não é imagem", async () => {
    const fetchImpl = (async () => new Response("<html>", { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    await expect(espelharFoto(dbFalso().db, THUMB, { fetchImpl })).rejects.toThrow(/tipo inesperado/);
  });

  it("mantém a miniatura do Commons quando a cópia falha", async () => {
    const midia = { equipamento_slug: "x", url: ORIGINAL, miniatura_url: THUMB, fonte_url: "https://commons.wikimedia.org/wiki/File:X.jpg" } as LinhaMidiaNova;
    const avisos: string[] = [];
    const saida = await espelharMidias(dbFalso().db, [midia, { ...midia, miniatura_url: null }], {
      espelhar: async (_db, u) => {
        if (u === THUMB) throw new Error("HTTP 429");
        return `${PUBLICA}commons/ok.jpg`;
      },
      avisar: (m) => avisos.push(m),
    });
    expect(saida.map((m) => m.miniatura_url)).toEqual([THUMB, `${PUBLICA}commons/ok.jpg`]);
    expect(avisos).toHaveLength(1);
  });
});
