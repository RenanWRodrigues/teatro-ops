import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { ClienteDeepL } from "./deepl";
import { criarTravador, glossarioParaTsv, lerCsv, lerGlossario } from "./glossario";
import { traduzirLote, type CacheTraducao, type DependenciasTraducao } from "./traduzir";

const CSV_REAL = readFileSync(path.join(import.meta.dirname, "../../config/glossario-militar.csv"), "utf8");
const glossario = lerGlossario(CSV_REAL);
const travador = criarTravador(glossario);

describe("glossário", () => {
  it("lê o CSV real, inclusive campos com aspas", () => {
    expect(glossario.length).toBeGreaterThan(40);
    expect(glossario.find((e) => e.en === "unmanned aerial vehicle")?.observacao).toBe('"VANT" só em contexto técnico');
    expect(lerCsv('a,"b, c",d\n')).toEqual([["a", "b, c", "d"]]);
  });

  it("trava expressões e siglas, mais longas primeiro, sem travar duas vezes", () => {
    const t = travador.travar("NATO warns of loitering munition and drone swarm attacks; nato summit");
    expect(t).toBe(
      "<keep>OTAN</keep> warns of <keep>munição de espera</keep> and <keep>enxame de drones</keep> attacks; nato summit",
    );
    expect(travador.travar(t)).toBe(t);
    expect(travador.destravar(t)).not.toContain("<keep>");
  });

  it("não trava palavras soltas (ficam para o glossário do DeepL, que flexiona)", () => {
    expect(travador.travar("A stealth destroyer")).toBe("A stealth destroyer");
    const tsv = glossarioParaTsv(glossario);
    expect(tsv).toContain("destroyer\tdestróier");
    expect(tsv).not.toContain("loitering munition");
  });
});

// ── Cadeia de tradução com motores falsos ──

function cacheEmMemoria(inicial: Record<string, string> = {}): CacheTraducao & { gravados: unknown[] } {
  const gravados: unknown[] = [];
  return {
    gravados,
    ler: async (hashes) => new Map(hashes.filter((h) => h in inicial).map((h) => [h, inicial[h]!])),
    gravar: async (linhas) => {
      gravados.push(...linhas);
    },
  };
}

function deeplFalso(restante = 400_000, falhar = false): ClienteDeepL & { chamadas: unknown[] } {
  const chamadas: unknown[] = [];
  return {
    chamadas,
    restante: async () => restante,
    traduzir: vi.fn(async (textos: string[], opcoes: { idiomaOrigem?: string; glossarioId?: string } = {}) => {
      chamadas.push({ textos, opcoes });
      if (falhar) throw new Error("HTTP 456 quota");
      return textos.map((t) => ({ texto: `PT(${t})`, idiomaDetectado: opcoes.idiomaOrigem ?? "ru" }));
    }),
    garantirGlossario: async () => "g1",
  };
}

const deps = (extra: Partial<DependenciasTraducao>): DependenciasTraducao => ({ cache: cacheEmMemoria(), travador, ...extra });

describe("traduzirLote", () => {
  it("usa o original em português e o cache antes de qualquer motor", async () => {
    const { chaveCache } = await import("./traduzir");
    const cache = cacheEmMemoria({ [chaveCache("Hello", "en")]: "Olá (cache)" });
    const deepl = deeplFalso();
    const r = await traduzirLote(
      [
        { texto: "Já em português", idioma: "pt" },
        { texto: "Hello", idioma: "en" },
      ],
      deps({ cache, deepl }),
    );
    expect(r.saidas).toEqual([
      { textoPt: "Já em português", motor: "original" },
      { textoPt: "Olá (cache)", motor: "cache" },
    ]);
    expect(deepl.chamadas).toHaveLength(0);
    expect(r.caracteresDeepL).toBe(0);
  });

  it("DeepL: inglês com glossário e termos travados; outros idiomas com detecção; grava no cache e conta caracteres", async () => {
    const cache = cacheEmMemoria();
    const deepl = deeplFalso();
    const r = await traduzirLote(
      [
        { texto: "NATO ceasefire", idioma: "en" },
        { texto: "Удар дронов", idioma: "ru" },
      ],
      deps({ cache, deepl, glossarioIdDeepL: "g1" }),
    );
    expect(deepl.chamadas).toContainEqual({ textos: ["<keep>OTAN</keep> ceasefire"], opcoes: { idiomaOrigem: "en", glossarioId: "g1" } });
    expect(deepl.chamadas).toContainEqual({ textos: ["Удар дронов"], opcoes: { idiomaOrigem: undefined, glossarioId: undefined } });
    expect(r.saidas[0]).toEqual({ textoPt: "PT(OTAN ceasefire)", motor: "deepl" });
    expect(r.caracteresDeepL).toBe("<keep>OTAN</keep> ceasefire".length + "Удар дронов".length);
    expect(cache.gravados).toHaveLength(2);
  });

  it("com cota abaixo da reserva, pula o DeepL e usa o LibreTranslate", async () => {
    const deepl = deeplFalso(15_000);
    const libre = { traduzir: vi.fn(async (t: string[]) => t.map((x) => `LT(${x})`)) };
    const r = await traduzirLote([{ texto: "Hello", idioma: "en" }], deps({ deepl, libre }));
    expect(deepl.chamadas).toHaveLength(0);
    expect(r.saidas[0]).toEqual({ textoPt: "LT(Hello)", motor: "argos" });
  });

  it("se o DeepL falhar, cai para o LibreTranslate; sem motores, fica pendente sem lançar erro", async () => {
    const libre = { traduzir: vi.fn(async (t: string[]) => t.map((x) => `LT(${x})`)) };
    const comLibre = await traduzirLote([{ texto: "Hi", idioma: null }], deps({ deepl: deeplFalso(400_000, true), libre }));
    expect(comLibre.saidas[0]?.motor).toBe("argos");

    const semNada = await traduzirLote([{ texto: "Hi", idioma: "en" }], deps({ deepl: null, libre: null }));
    expect(semNada.saidas[0]).toEqual({ textoPt: null, motor: null });
    expect(semNada.motores.pendente).toBe(1);
  });

  it("se o glossário for recusado, repete sem glossário", async () => {
    const deepl = deeplFalso();
    let primeira = true;
    deepl.traduzir = vi.fn(async (textos: string[], opcoes: { glossarioId?: string } = {}) => {
      if (primeira && opcoes.glossarioId) {
        primeira = false;
        throw new Error("glossary not supported for PT-BR");
      }
      return textos.map((t) => ({ texto: `PT(${t})`, idiomaDetectado: "en" }));
    });
    const r = await traduzirLote([{ texto: "Hello", idioma: "en" }], deps({ deepl, glossarioIdDeepL: "g1" }));
    expect(r.saidas[0]?.motor).toBe("deepl");
  });
});

describe("escape XML para o DeepL (tag_handling=xml)", async () => {
  const { escaparParaXml, desescaparXml } = await import("./deepl");
  it("escapa & < > fora de <keep> e preserva as marcas", () => {
    expect(escaparParaXml("Texas A&M <b> and <keep>OTAN</keep> & co")).toBe("Texas A&amp;M &lt;b&gt; and <keep>OTAN</keep> &amp; co");
    expect(escaparParaXml("<keep>P&D</keep>")).toBe("<keep>P&amp;D</keep>");
  });
  it("desfaz o escape na volta, sem dupla conversão", () => {
    expect(desescaparXml("A&amp;M &lt;3 &amp;lt;")).toBe("A&M <3 &lt;");
  });
});
