import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { criarClienteWikipedia, encurtarResumo, tituloDaUrl } from ".";

const amostra = readFileSync(path.join(import.meta.dirname, "__fixtures__", "f-35-pt.json"), "utf8");

describe("Wikipedia (amostra real do artigo F-35 em português, 15/11/2026)", () => {
  it("lê o resumo, encurta e devolve o link do artigo", async () => {
    process.env.WIKIMEDIA_USER_AGENT ??= "TEATRO-OPS-teste/1.0";
    const fetchImpl = (async () => new Response(amostra, { status: 200 })) as typeof fetch;
    const r = await criarClienteWikipedia({ fetchImpl }).resumo("pt", "Lockheed Martin F-35 Lightning II");
    expect(r).toMatchObject({ idioma: "pt", titulo: "Lockheed Martin F-35 Lightning II" });
    expect(r!.url).toMatch(/^https:\/\/pt\.wikipedia\.org\/wiki\//);
    expect(r!.texto.length).toBeLessThanOrEqual(600);
  });

  it("recusa página de desambiguação", async () => {
    process.env.WIKIMEDIA_USER_AGENT ??= "TEATRO-OPS-teste/1.0";
    const corpo = JSON.stringify({ ...JSON.parse(amostra), type: "disambiguation" });
    const fetchImpl = (async () => new Response(corpo, { status: 200 })) as typeof fetch;
    expect(await criarClienteWikipedia({ fetchImpl }).resumo("pt", "F-35")).toBeNull();
  });
});

describe("auxiliares", () => {
  it("encurta em frases inteiras", () => {
    expect(encurtarResumo("Um. Dois. Três. Quatro.", 2)).toBe("Um. Dois.");
  });
  it("título a partir da URL do artigo", () => {
    expect(tituloDaUrl("https://pt.wikipedia.org/wiki/USS_Gerald_R._Ford_(CVN-78)")).toBe("USS Gerald R. Ford (CVN-78)");
  });
});
