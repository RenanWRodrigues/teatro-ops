import { describe, expect, it } from "vitest";
import type { FonteYaml } from "@/lib/fontes/registro";
import { publicarAlerta, TITULO_ALERTA_DEEPL, TITULO_ALERTA_FONTES } from "./alertas";
import { montarAlertas } from "./index";
import { avaliarColeta, enderecoDaFonte, sondarEndereco } from "./saude";

const fonte = (id: string, extra: Partial<FonteYaml> = {}): FonteYaml =>
  ({ id, nome: id, tipo: "api", categoria: "pesquisa", licenca: "CC BY 4.0", status: "ativa", job: "noticias", url: `https://${id}.exemplo.org/`, ...extra }) as FonteYaml;

const agora = new Date("2026-11-16T12:00:00Z");
const horasAtras = (h: number) => new Date(agora.getTime() - h * 3_600_000).toISOString();

describe("avaliarColeta", () => {
  it("marca como quebrada a fonte ativa sem sucesso dentro do limite do job", () => {
    const r = avaliarColeta(
      [fonte("boa"), fonte("velha"), fonte("nunca"), fonte("diaria", { job: "eventos" }), fonte("parada", { status: "quebrada" })],
      [
        { fonte_id: "boa", terminado_em: horasAtras(1), erro: null },
        { fonte_id: "velha", terminado_em: horasAtras(2), erro: "HTTP 500" },
        { fonte_id: "velha", terminado_em: horasAtras(20), erro: null },
        { fonte_id: "diaria", terminado_em: horasAtras(40), erro: null },
      ],
      agora,
    );
    expect(r.map((c) => [c.id, c.quebrada])).toEqual([
      ["boa", false],
      ["velha", true],
      ["nunca", true],
      ["diaria", false],
    ]);
    expect(r.find((c) => c.id === "velha")?.mensagem).toBe("HTTP 500");
  });

  it("ignora fontes sem job agendado (ex.: wikipedia-en, arquivo manual)", () => {
    expect(avaliarColeta([fonte("x", { job: undefined }), fonte("y", { job: "arquivo" })], [], agora)).toEqual([]);
  });
});

describe("sondarEndereco", () => {
  it("prefere o feed, ignora variáveis de ambiente e classifica a resposta", async () => {
    expect(enderecoDaFonte(fonte("a", { feed: "https://a.org/rss", url: "https://a.org/api" }))).toBe("https://a.org/rss");
    expect(enderecoDaFonte(fonte("b", { url: "${LIBRETRANSLATE_URL}" }))).toBeNull();
    const responde = (status: number) => (async () => new Response("", { status })) as unknown as typeof fetch;
    expect((await sondarEndereco(fonte("ok"), { fetchImpl: responde(200) }))?.ok).toBe(true);
    expect((await sondarEndereco(fonte("auth"), { fetchImpl: responde(401) }))?.motivo).toMatch(/credencial/);
    expect((await sondarEndereco(fonte("robo"), { fetchImpl: responde(403) }))?.motivo).toMatch(/403/);
    const falha = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await sondarEndereco(fonte("rede"), { fetchImpl: falha })).toMatchObject({ ok: false, status: null, motivo: "falha de rede" });
  });
});

describe("montarAlertas", () => {
  it("alerta fontes sem coleta e endereços fora do ar, mas não APIs que só pedem parâmetros", () => {
    const alertas = montarAlertas(
      {
        coleta: [{ id: "velha", job: "noticias", ultimoSucesso: null, ultimoErro: null, mensagem: "a|b", quebrada: true }],
        enderecos: [
          { id: "api", url: "https://api.org", status: 400, ms: 10, ok: false, motivo: "responde, mas pede parâmetros ou credencial" },
          { id: "caiu", url: "https://caiu.org", status: 503, ms: 10, ok: false, motivo: "HTTP 503" },
        ],
        deepl: { usados: 100, limite: 500_000, fracao: 0.0002 },
      },
      agora,
    );
    expect(alertas.map((a) => a.titulo)).toEqual([TITULO_ALERTA_FONTES]);
    expect(alertas[0]!.corpo).toContain("`velha`");
    expect(alertas[0]!.corpo).toContain("`caiu`");
    expect(alertas[0]!.corpo).not.toContain("`api`");
    expect(alertas[0]!.corpo).toContain("a/b"); // "|" quebraria a tabela em Markdown
  });

  it("alerta a cota do DeepL acima de 70% e fica quieto quando está tudo bem", () => {
    const deepl = montarAlertas({ coleta: [], enderecos: [], deepl: { usados: 360_000, limite: 500_000, fracao: 0.72 } }, agora);
    expect(deepl.map((a) => a.titulo)).toEqual([TITULO_ALERTA_DEEPL]);
    expect(deepl[0]!.corpo).toContain("72,0%");
    expect(montarAlertas({ coleta: [], enderecos: [], deepl: null }, agora)).toEqual([]);
  });
});

describe("publicarAlerta", () => {
  const destino = (abertas: { number: number; title: string }[], pedidos: { metodo: string; url: string }[]) => ({
    token: "t",
    repositorio: "dono/repo",
    fetchImpl: (async (url: string, init?: RequestInit) => {
      pedidos.push({ metodo: init?.method ?? "GET", url });
      if (!init?.method) return Response.json(abertas);
      return Response.json({ number: 99 });
    }) as unknown as typeof fetch,
  });

  it("comenta na issue aberta de mesmo título em vez de criar outra", async () => {
    const pedidos: { metodo: string; url: string }[] = [];
    const r = await publicarAlerta({ titulo: "Alerta X", corpo: "c" }, destino([{ number: 7, title: "Alerta X" }], pedidos));
    expect(r).toEqual({ acao: "comentada", numero: 7 });
    expect(pedidos.at(-1)).toEqual({ metodo: "POST", url: "https://api.github.com/repos/dono/repo/issues/7/comments" });
  });

  it("cria a issue quando não há uma aberta", async () => {
    const pedidos: { metodo: string; url: string }[] = [];
    const r = await publicarAlerta({ titulo: "Alerta Y", corpo: "c" }, destino([{ number: 7, title: "Outro" }], pedidos));
    expect(r).toEqual({ acao: "criada", numero: 99 });
    expect(pedidos.at(-1)).toEqual({ metodo: "POST", url: "https://api.github.com/repos/dono/repo/issues" });
  });
});
