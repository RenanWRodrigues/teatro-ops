import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { gerarSeedSql, lerRegistroFontes } from "./registro";

const YAML_REAL = readFileSync(path.join(import.meta.dirname, "../../config/fontes.yaml"), "utf8");

describe("lerRegistroFontes", () => {
  it("lê o config/fontes.yaml real sem erros", () => {
    const { fontes, ignoradas } = lerRegistroFontes(YAML_REAL);
    expect(fontes.length).toBeGreaterThan(20);
    expect(fontes.find((f) => f.id === "gdelt-doc")).toMatchObject({
      url_base: "https://api.gdeltproject.org/api/v2/doc/doc",
      categoria: "pesquisa",
      status: "a_verificar",
    });
    // Fonte só com página (feed ainda não descoberto) usa a página como url_base.
    expect(fontes.find((f) => f.id === "kremlin")?.url_base).toBe("http://en.kremlin.ru/events/president/news");
    expect(ignoradas).toContainEqual({ id: "imprensa-exemplo", motivo: "placeholder [preencher]" });
    // Serviços de tradução não viram fonte exibida.
    expect(fontes.some((f) => f.id === "deepl")).toBe(false);
  });

  it("aponta o id da entrada inválida", () => {
    const yaml = "conflitos:\n  - { id: ruim, nome: X, url: https://x, tipo: email, categoria: pesquisa, licenca: L, status: ativa }\n";
    expect(() => lerRegistroFontes(yaml)).toThrow(/id: ruim/);
  });

  it("recusa ids duplicados e seções desconhecidas", () => {
    const item = "{ id: a, nome: A, url: https://a, tipo: api, categoria: pesquisa, licenca: L, status: ativa }";
    expect(() => lerRegistroFontes(`conflitos:\n  - ${item}\narsenal:\n  - ${item}\n`)).toThrow(/duplicado/);
    expect(() => lerRegistroFontes("outra: []\n")).toThrow(/desconhecidas/);
  });
});

describe("gerarSeedSql", () => {
  it("escapa aspas simples e é idempotente", () => {
    const sql = gerarSeedSql([
      { id: "x", nome: "D'Ávila", url_base: "https://x", licenca: "CC0", tipo: "api", categoria: "pesquisa", pais: null, status: "ativa" },
    ]);
    expect(sql).toContain("'D''Ávila'");
    expect(sql).toContain("on conflict (id) do update");
    expect(sql).toContain("null");
  });
});
