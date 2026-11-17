import { describe, expect, it } from "vitest";
import { descartarRedirecionado, lerListaArsenal } from "./cadastro";

describe("descartarRedirecionado", () => {
  const resumo = { idioma: "en" as const, titulo: "Kamov Ka-50", texto: "O Ka-50…", url: "https://en.wikipedia.org/wiki/Kamov_Ka-50" };

  it("descarta o artigo de outro item (sitelink 'Ka-52' redireciona para o Ka-50, 17/11/2026)", () => {
    const avisos: string[] = [];
    expect(descartarRedirecionado({ ...resumo, qid: "Q269250" }, "Q1723252", avisos)).toBeNull();
    expect(avisos[0]).toMatch(/Kamov Ka-50.*Q269250.*Q1723252/);
  });

  it("mantém o artigo do próprio item ou sem QID informado", () => {
    const avisos: string[] = [];
    expect(descartarRedirecionado({ ...resumo, qid: "Q1723252" }, "Q1723252", avisos)).not.toBeNull();
    expect(descartarRedirecionado({ ...resumo, qid: null }, "Q1723252", avisos)).not.toBeNull();
    expect(avisos).toEqual([]);
  });
});

describe("config/arsenal.yaml", () => {
  it("aceita resumo_frases de 1 a 3 e recusa fora disso", () => {
    const base = "equipamentos:\n  - { slug: x, nome: X, categoria: armamento, classe: Y, qid: Q1";
    expect(lerListaArsenal(`${base}, resumo_frases: 2 }`)[0]!.resumo_frases).toBe(2);
    expect(() => lerListaArsenal(`${base}, resumo_frases: 5 }`)).toThrow();
  });
});
