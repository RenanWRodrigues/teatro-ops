import { readFileSync } from "node:fs";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { acharVersaoMaisRecente, agregarConflitos, agregarMortes, buscarSeries, csvDoZip } from "./index";

// Amostras REAIS da versão 26.1 (baixadas de https://ucdp.uu.se/downloads/ em 16/11/2026).
const pasta = path.join(__dirname, "__fixtures__");
const ACD = readFileSync(path.join(pasta, "acd-amostra.csv"), "utf8");
const BRD = readFileSync(path.join(pasta, "brd-amostra.csv"), "utf8");
const HTML = readFileSync(path.join(pasta, "downloads-trecho.html"), "utf8");

describe("acharVersaoMaisRecente", () => {
  it("acha ACD e BRD em CSV da mesma versão", () => {
    expect(acharVersaoMaisRecente(HTML)).toEqual({
      versao: "26.1",
      acd: "https://ucdp.uu.se/downloads/ucdpprio/ucdp-prio-acd-261-csv.zip",
      brd: "https://ucdp.uu.se/downloads/brd/ucdp-brd-conf-261-csv.zip",
    });
  });

  it("prefere a versão mais nova presente nos dois conjuntos", () => {
    const html =
      HTML +
      '<a href="https://ucdp.uu.se/downloads/ucdpprio/ucdp-prio-acd-271-csv.zip">' + // ACD novo sem BRD correspondente
      '<a href="https://ucdp.uu.se/downloads/brd/ucdp-brd-conf-251-csv.zip">';
    expect(acharVersaoMaisRecente(html)?.versao).toBe("26.1");
    expect(acharVersaoMaisRecente("<html></html>")).toBeNull();
  });
});

describe("agregarConflitos", () => {
  it("conta por ano, tipo e intensidade e preenche anos sem conflito com zero", () => {
    const { anos, ignoradas } = agregarConflitos(ACD);
    expect(ignoradas).toBe(0);
    expect(anos.map((a) => a.ano)).toEqual([1946, 1947, 1948, 1949, 1950, 1951, 1952]);
    expect(anos[0]).toEqual({ ano: 1946, total: 1, guerras: 1, extrassistemico: 0, interestatal: 0, intraestatal: 1, internacionalizado: 0 });
    expect(anos[1]!.total).toBe(0);
    expect(anos[2]).toEqual({ ano: 1948, total: 2, guerras: 1, extrassistemico: 1, interestatal: 0, intraestatal: 1, internacionalizado: 0 });
  });

  it("descarta linha inválida sem derrubar a agregação", () => {
    const quebrado = ACD.trimEnd() + "\n999,X,,,,,,,,,19xx,9,0,7\n";
    const { anos, ignoradas } = agregarConflitos(quebrado);
    expect(ignoradas).toBe(1);
    expect(anos).toHaveLength(7);
  });
});

describe("agregarMortes", () => {
  it("soma estimativa, mínimo e máximo por ano", () => {
    const { anos } = agregarMortes(BRD);
    expect(anos[0]).toEqual({ ano: 1990, estimativa: 31, minimo: 31, maximo: 335 });
    expect(anos.find((a) => a.ano === 1993)).toEqual({ ano: 1993, estimativa: 110, minimo: 110, maximo: 110 });
    expect(anos.find((a) => a.ano === 1991)?.estimativa).toBe(0);
  });
});

describe("buscarSeries", () => {
  it("baixa a página, os dois zips e agrega", async () => {
    const pedidos: string[] = [];
    const fetchImpl = (async (url: string) => {
      pedidos.push(url);
      if (url.endsWith("/downloads/")) return new Response(HTML);
      if (url.includes("acd")) return new Response(zipSync({ "UcdpPrioConflict_v26_1.csv": strToU8(ACD) }));
      return new Response(zipSync({ "BattleDeaths_v26_1_conf.csv": strToU8(BRD) }));
    }) as unknown as typeof fetch;
    const s = await buscarSeries({ fetchImpl, limite: "1000 req / s", agora: new Date("2026-11-16T12:00:00Z") });
    expect(pedidos).toHaveLength(3);
    expect(s.versao).toBe("26.1");
    expect(s.conflitos.at(-1)?.ano).toBe(1952);
    expect(s.mortes[0]?.ano).toBe(1990);
    expect(s.coletado_em).toBe("2026-11-16T12:00:00.000Z");
  });

  it("recusa zip sem exatamente um CSV", () => {
    expect(() => csvDoZip(zipSync({ "a.txt": strToU8("x") }))).toThrow(/0 CSVs/);
  });
});
