import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { arquivoDoP18, formatarDataWikidata, lerDeclaracoes, listaDeRotulos, montarSpecs, selecionar, type Declaracao } from "./specs";

const fixture = JSON.parse(readFileSync(path.join(import.meta.dirname, "__fixtures__", "f-35a.json"), "utf8"));
const todas = lerDeclaracoes(fixture.declaracoes);
const ctx = {
  item: "Q17519093",
  pais: ["Q29261"],
  categoria: "cacas" as const,
  rotulos: { Q29261: "Lockheed Martin F-35 Lightning II" },
  coletadoEm: "2026-11-15T12:00:00Z",
};

describe("Wikidata → specs (amostra real do F-35A, 15/11/2026)", () => {
  const { specs, vazios } = montarSpecs(todas, ctx);

  it("usa o valor declarado em metros (não o convertido de pés) e cita a família como fonte", () => {
    expect(specs.comprimento).toMatchObject({ valor: 15.7, unidade: "m", fonte: "Wikidata (dado da família Lockheed Martin F-35 Lightning II)" });
    expect(specs.comprimento!.url).toBe("https://www.wikidata.org/wiki/Q29261#P2043");
    expect(specs.envergadura).toMatchObject({ valor: 10.7, unidade: "m" });
    expect(specs.altura).toMatchObject({ valor: 4.38, unidade: "m" });
  });

  it("velocidade de caça em Mach", () => {
    expect(specs.velocidade_max).toMatchObject({ valor: 1.6, unidade: "mach" });
  });

  it("prefere o dado da própria variante ao da família", () => {
    expect(specs.fabricante).toMatchObject({ texto: "Lockheed Martin", fonte: "Wikidata", url: "https://www.wikidata.org/wiki/Q17519093#P176" });
    expect(specs.motor).toMatchObject({ texto: "Pratt & Whitney F135", fonte: "Wikidata" });
  });

  it("não usa custos da família qualificados para OUTRAS variantes (F-35B, F-35C)", () => {
    expect(specs.custo_unitario).toBeUndefined();
    expect(vazios).toContain("custo_unitario");
  });

  it("datas na precisão do Wikidata", () => {
    expect(specs.primeiro_voo).toMatchObject({ texto: "15/12/2006" });
    expect(specs.entrada_servico).toMatchObject({ texto: "31/07/2015" });
  });

  it("campos sem dado ficam vazios, não inventados", () => {
    expect(vazios).toEqual(expect.arrayContaining(["alcance", "teto_servico", "massa", "armamento_principal"]));
    for (const v of vazios) expect(specs[v]).toBeUndefined();
  });

  it("operadores: os da variante, nunca os da família qualificados para outra variante", () => {
    const op = listaDeRotulos(todas, "P137", ctx)!;
    expect(op.ent).toBe("Q17519093");
    expect(op.rotulos).not.toContain("Marinha Real Britânica");
  });
});

describe("regras de seleção", () => {
  const d = (x: Partial<Declaracao>): Declaracao => ({ ent: "Q1", prop: "P2043", preferida: false, valor: "10", rotulo: null, rotuloEmPt: false, unidadeEn: "metre", precisao: null, data: null, parte: null, ...x });

  it("ranking preferido vence os normais", () => {
    const s = selecionar([d({ valor: "10" }), d({ valor: "12", preferida: true })], "P2043", "Q1", []);
    expect(s!.declaracoes.map((x) => x.valor)).toEqual(["12"]);
  });

  it("valores divergentes viram intervalo com aviso", () => {
    const { specs } = montarSpecs([d({ valor: "10" }), d({ valor: "12" })], { ...ctx, item: "Q1", pais: [] });
    expect(specs.comprimento).toMatchObject({ texto: "10–12 m (valores divergentes no Wikidata)" });
  });

  it("massa de navio vira deslocamento em toneladas", () => {
    const { specs } = montarSpecs([d({ prop: "P2067", valor: "100000", unidadeEn: "tonne" })], { ...ctx, item: "Q1", pais: [], categoria: "embarcacoes" });
    expect(specs.deslocamento).toMatchObject({ valor: 100000, unidade: "t" });
  });

  it("datas e arquivo do P18", () => {
    expect(formatarDataWikidata("2006-12-15T00:00:00Z", 9)).toBe("2006");
    expect(formatarDataWikidata("2006-12-15T00:00:00Z", 10)).toBe("12/2006");
    expect(arquivoDoP18("http://commons.wikimedia.org/wiki/Special:FilePath/F-35%20at%20Edwards.jpg")).toBe("F-35 at Edwards.jpg");
  });
});
