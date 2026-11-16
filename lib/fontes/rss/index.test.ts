import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { configFontes } from "@/lib/fontes/_base/config";
import { criarAdaptadorRss, lerDataFeed, lerFeed, normalizarItemRss } from ".";

const fixture = (id: string) => readFileSync(path.join(import.meta.dirname, "__fixtures__", `${id}.xml`), "utf8");
const FEEDS = ["defesa-eua", "kremlin", "governo-russia", "presidencia-ira", "irna", "governo-de", "defesa-de"];
const cfg = configFontes();

describe("lerFeed (amostras reais de 15/11/2026)", () => {
  it.each(FEEDS)("%s: todos os itens viram decisões válidas", (id) => {
    const itens = lerFeed(fixture(id));
    expect(itens.length).toBeGreaterThan(0);
    const fonte = cfg.get(id)!;
    const normalizados = itens.map((i) => normalizarItemRss(i, fonte, Date.parse("2026-11-16T00:00:00Z")));
    expect(normalizados.every(Boolean)).toBe(true);
    for (const n of normalizados) {
      expect(n!.urlOficial).toMatch(/^https:\/\//);
      expect(n!.pais).toBe(fonte.pais);
      expect(n!.descricao === null || n!.descricao.length <= 300).toBe(true);
    }
  });

  it("lê Atom (Kremlin): título, link alternate e data de publicação", () => {
    const [primeiro] = lerFeed(fixture("kremlin"));
    expect(primeiro!.link).toMatch(/^http:\/\/en\.kremlin\.ru\/events\/president\/news\/\d+$/);
    expect(primeiro!.data).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("marca agência estatal e usa o órgão curto", () => {
    const [i] = lerFeed(fixture("irna"));
    const n = normalizarItemRss(i!, cfg.get("irna")!, Date.parse("2026-11-16T00:00:00Z"))!;
    expect(n.estatal).toBe(true);
    expect(n.orgao).toBe("IRNA");
  });

  it("feeds alemães ficam com idioma de", () => {
    const [i] = lerFeed(fixture("defesa-de"));
    expect(normalizarItemRss(i!, cfg.get("defesa-de")!, Date.parse("2026-11-16T00:00:00Z"))!.idiomaOriginal).toBe("de");
  });

  it("recusa o que não é RSS nem Atom", () => {
    expect(() => lerFeed("<html><body>oi</body></html>")).toThrow(/nem Atom/);
  });
});

describe("lerDataFeed", () => {
  it("RFC 822 com fuso de meia hora (Irã)", () => {
    expect(lerDataFeed("Sun, 15 Nov 2026 14:36:00 +0330")).toBe("2026-11-15T11:06:00.000Z");
  });
  it("data sem fuso usa o fuso da fonte", () => {
    expect(lerDataFeed("2026-11-12 14:11:06", "+03:30")).toBe("2026-11-12T10:41:06.000Z");
    expect(lerDataFeed("2026-11-12 14:11:06")).toBe("2026-11-12T14:11:06.000Z");
  });
  it("inválida vira null", () => {
    expect(lerDataFeed("ontem")).toBeNull();
    expect(lerDataFeed(null)).toBeNull();
  });
});

describe("normalizarItemRss", () => {
  const fonte = { id: "kremlin", nome: "Presidência da Rússia (Kremlin)", pais: "RU", categoria: "oficial" as const };
  const agora = Date.parse("2026-11-16T00:00:00Z");

  it("descarta item sem título, sem link válido ou sem data", () => {
    expect(normalizarItemRss({ titulo: "", link: "https://x.invalid/a", data: "2026-11-12T10:00:00Z", descricao: null }, fonte, agora)).toBeNull();
    expect(normalizarItemRss({ titulo: "[TESTE] Título", link: "nao-e-url", data: "2026-11-12T10:00:00Z", descricao: null }, fonte, agora)).toBeNull();
    expect(normalizarItemRss({ titulo: "[TESTE] Título", link: "https://x.invalid/a", data: null, descricao: null }, fonte, agora)).toBeNull();
  });

  it("descarta data no futuro em vez de inventar", () => {
    expect(normalizarItemRss({ titulo: "[TESTE] Título", link: "https://x.invalid/a", data: "2027-01-01T00:00:00Z", descricao: null }, fonte, agora)).toBeNull();
  });

  it("hash igual para a mesma URL com rastreadores", () => {
    const a = normalizarItemRss({ titulo: "[TESTE] Título", link: "https://x.invalid/a?utm_source=rss", data: "2026-11-12T10:00:00Z", descricao: null }, fonte, agora)!;
    const b = normalizarItemRss({ titulo: "[TESTE] Título", link: "https://x.invalid/a", data: "2026-11-12T10:00:00Z", descricao: null }, fonte, agora)!;
    expect(a.hash).toBe(b.hash);
  });
});

describe("criarAdaptadorRss", () => {
  it("busca o feed e ignora itens anteriores à janela", async () => {
    const fetchImpl = (async () => new Response(fixture("governo-russia"), { status: 200 })) as typeof fetch;
    const ad = criarAdaptadorRss(cfg.get("governo-russia")!, fetchImpl);
    const crus = await ad.buscar(new Date("2026-11-10T00:00:00Z"));
    const validos = crus.map((c) => ad.normalizar(c)).filter(Boolean);
    expect(crus.length).toBe(20);
    expect(validos.length).toBeGreaterThan(0);
    expect(validos.length).toBeLessThan(20);
    expect(validos.every((v) => v!.publicadoEm >= "2026-11-10")).toBe(true);
  });
});
