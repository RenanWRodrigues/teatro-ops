import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resumoPorRegra } from "@/lib/ingestao/noticias";
import { classificar, unirClassificacoes } from "./classificacao";
import { dataGdelt, deduplicar, lerResposta, montarUrl, normalizarArtigo, timespan } from "./index";

// [EXEMPLO] Artigo sintético no formato documentado do ArtList, só para testar regras isoladas.
const artigoExemplo = {
  url: "http://www.exemplo.org/noticia/?utm_source=rss",
  title: "  Russian drone strike hits Kyiv  as NATO allies meet ",
  seendate: "20261114T091500Z",
  domain: "exemplo.org",
  language: "English",
  sourcecountry: "United States",
};

describe("classificação por regras", () => {
  it("países na ordem do título, região do primeiro e temas por palavra-chave", () => {
    expect(classificar("Russian drone strike hits Kyiv", ["conflitos"])).toEqual({
      paises: ["RU", "UA"],
      temas: ["conflitos", "drones"],
      regiao: "Europa Oriental",
    });
  });

  it("reconhece português e siglas só em maiúsculas", () => {
    expect(classificar("Israel e Hezbolá negociam cessar-fogo no Líbano").paises).toEqual(["IL", "LB"]);
    expect(classificar("Israel e Hezbolá negociam cessar-fogo no Líbano").temas).toContain("diplomacia");
    expect(classificar("US strikes").paises).toEqual(["US"]);
    expect(classificar("they focus on us").paises).toEqual([]);
  });

  it("não confunde termos ambíguos", () => {
    expect(classificar("Georgia election results in Atlanta").paises).toEqual([]);
    expect(classificar("Nigeria and Niger").paises).toEqual(["NG", "NE"]);
  });

  it("une a classificação do original com a da tradução", () => {
    const a = classificar("Strike near the border", ["conflitos"]);
    const b = classificar("Ataque perto da fronteira com a Síria");
    expect(unirClassificacoes(a, b)).toMatchObject({ paises: ["SY"], regiao: "Oriente Médio" });
  });
});

describe("normalização do GDELT", () => {
  it("converte data, idioma, URL e classifica", () => {
    const n = normalizarArtigo({ artigo: artigoExemplo, consulta: "drones" })!;
    expect(n).toMatchObject({
      url: "https://www.exemplo.org/noticia",
      tituloOriginal: "Russian drone strike hits Kyiv as NATO allies meet",
      idiomaOriginal: "en",
      dominio: "exemplo.org",
      publicadoEm: "2026-11-14T09:15:00Z",
      paises: ["RU", "UA"],
      regiao: "Europa Oriental",
    });
    expect(n.temas).toEqual(["drones"]);
  });

  it("descarta itens inválidos em vez de falhar", () => {
    expect(normalizarArtigo({ artigo: { ...artigoExemplo, seendate: "ontem" }, consulta: "conflitos" })).toBeNull();
    expect(normalizarArtigo({ artigo: { ...artigoExemplo, title: "Oi" }, consulta: "conflitos" })).toBeNull();
    expect(normalizarArtigo({ artigo: "lixo", consulta: "conflitos" })).toBeNull();
  });

  it("deduplica a mesma URL vinda de consultas diferentes, somando temas", () => {
    const a = normalizarArtigo({ artigo: artigoExemplo, consulta: "drones" })!;
    const b = normalizarArtigo({ artigo: { ...artigoExemplo, url: "https://www.exemplo.org/noticia#x" }, consulta: "conflitos" })!;
    const unicas = deduplicar([a, b]);
    expect(unicas).toHaveLength(1);
    expect(unicas[0]!.temas).toEqual(["conflitos", "drones"]);
  });

  it("lê {} como zero resultados e recusa texto puro (aviso de limite)", () => {
    expect(lerResposta("{}")).toEqual([]);
    expect(() => lerResposta("Please limit requests to one every 5 seconds")).toThrow(/texto em vez de JSON/);
  });

  it("monta a URL com ArtList, JSON, 75 itens e janela mínima de 15 min", () => {
    const agora = new Date("2026-11-14T12:00:00Z");
    expect(timespan(new Date("2026-11-14T11:55:00Z"), agora)).toBe("15min");
    expect(timespan(new Date("2026-11-14T10:00:00Z"), agora)).toBe("120min");
    const url = new URL(montarUrl("(war OR ceasefire)", new Date("2026-11-14T10:00:00Z"), agora));
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ mode: "ArtList", format: "json", maxrecords: "75", sort: "DateDesc" });
    expect(dataGdelt("20261114T091500Z")).toBe("2026-11-14T09:15:00Z");
  });

  it("resumo próprio cita fonte e data, sem copiar o artigo", () => {
    expect(
      resumoPorRegra({ dominio: "exemplo.org", publicadoEm: "2026-11-14T09:15:00Z", regiao: "Europa Oriental", temas: ["drones"] }),
    ).toBe("Notícia publicada por exemplo.org em 14/11/2026 e indexada pelo GDELT. Classificação automática — região: Europa Oriental; temas: drones.");
  });
});

// Amostra REAL salva de uma requisição ao GDELT (skill integrar-fonte-dados, passo 3).
const AMOSTRA = path.join(import.meta.dirname, "__fixtures__/amostra.json");
const amostra = existsSync(AMOSTRA) ? lerResposta(readFileSync(AMOSTRA, "utf8")) : [];

describe.skipIf(amostra.length === 0)("amostra real do GDELT", () => {
  it("todos os itens válidos normalizam com hash, data ISO e título", () => {
    const normalizados = amostra.map((artigo) => normalizarArtigo({ artigo, consulta: "conflitos" }));
    const validos = normalizados.filter((n) => n !== null);
    expect(validos.length).toBeGreaterThan(amostra.length * 0.9);
    for (const n of validos) {
      expect(n.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(n.publicadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(n.temas).toContain("conflitos");
    }
  });
});
