import { describe, expect, it } from "vitest";
import { fontesUnicas, formatarEspecificacao } from "./especificacao";

const fonte = { nome: "Wikidata", url: "https://www.wikidata.org/wiki/Q1" };
const NBSP = " ";

describe("formatarEspecificacao", () => {
  it("põe o sufixo entre o número e a unidade", () => {
    expect(formatarEspecificacao({ valor: 1090, unidade: "km", sufixo: "+", fonte })).toBe(`1.090+${NBSP}km`);
  });

  it("marca valores aproximados com til", () => {
    expect(formatarEspecificacao({ valor: 2, unidade: "mach", aproximado: true, fonte })).toBe(`~Mach${NBSP}2`);
  });

  it("mantém Mach antes do número mesmo com sufixo", () => {
    expect(formatarEspecificacao({ valor: 1.6, unidade: "mach", sufixo: "+", fonte })).toBe(`Mach${NBSP}1,6+`);
  });
});

describe("fontesUnicas", () => {
  it("remove repetidas e preserva a ordem", () => {
    const outra = { nome: "GAO", url: null };
    expect(fontesUnicas([fonte, outra, { ...fonte }])).toEqual([fonte, outra]);
  });
});
