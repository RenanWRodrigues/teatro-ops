import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { criarAdaptadorFr, montarUrlFr, normalizarDocumentoFr, orgaoFr } from ".";

const fixture = (nome: string) => JSON.parse(readFileSync(path.join(import.meta.dirname, "__fixtures__", `${nome}.json`), "utf8"));

describe("Federal Register (amostras reais de 15/11/2026)", () => {
  it("normaliza todos os documentos das amostras", () => {
    for (const nome of ["orgaos", "presdocu"]) {
      const docs = fixture(nome).results as unknown[];
      const n = docs.map((d) => normalizarDocumentoFr(d, "fr-eua", Date.parse("2026-11-16T15:00:00Z")));
      expect(n.every(Boolean)).toBe(true);
      for (const d of n) {
        expect(d!.pais).toBe("US");
        expect(d!.urlOficial).toMatch(/^https:\/\/www\.federalregister\.gov\/documents\//);
        expect(d!.publicadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T12:00:00\.000Z$/);
      }
    }
  });

  it("identifica o órgão (Presidência, OFAC, Defesa, Estado)", () => {
    expect(orgaoFr({ type: "Presidential Document", agencies: [{ slug: "executive-office-of-the-president" }] })).toBe("Presidência dos EUA (Casa Branca)");
    expect(orgaoFr({ type: "Notice", agencies: [{ slug: "treasury-department" }, { slug: "foreign-assets-control-office" }] })).toBe(
      "Departamento do Tesouro dos EUA (OFAC)",
    );
    expect(orgaoFr({ type: "Notice", agencies: [{ slug: "defense-department" }, { raw_name: "Office of the Secretary" }] })).toBe("Departamento de Defesa dos EUA");
    expect(orgaoFr({ type: "Notice", agencies: [{ slug: "state-department" }] })).toBe("Departamento de Estado dos EUA");
  });

  it("documento programado para o dia seguinte só entra na data de publicação", () => {
    const programado = (fixture("orgaos").results as { publication_date: string }[]).find((d) => d.publication_date === "2026-11-16");
    expect(normalizarDocumentoFr(programado, "fr-eua", Date.parse("2026-11-15T20:00:00Z"))).toBeNull();
    expect(normalizarDocumentoFr(programado, "fr-eua", Date.parse("2026-11-16T04:00:00Z"))).not.toBeNull();
  });

  it("descarta documento inválido", () => {
    expect(normalizarDocumentoFr({ title: "[TESTE]" })).toBeNull();
    expect(normalizarDocumentoFr(null)).toBeNull();
  });

  it("monta a URL com campos, filtros e data mínima", () => {
    const u = decodeURIComponent(montarUrlFr(["conditions[type][]=PRESDOCU"], new Date("2026-11-01T05:00:00Z"), 2));
    expect(u).toContain("conditions[type][]=PRESDOCU");
    expect(u).toContain("conditions[publication_date][gte]=2026-11-01");
    expect(u).toContain("fields[]=html_url");
    expect(u).toContain("page=2");
  });

  it("busca as duas consultas e para quando não há próxima página", async () => {
    const chamadas: string[] = [];
    const fetchImpl = (async (url: string) => {
      chamadas.push(url);
      const corpo = url.includes("PRESDOCU") ? fixture("presdocu") : fixture("orgaos");
      return new Response(JSON.stringify({ ...corpo, next_page_url: null }), { status: 200 });
    }) as unknown as typeof fetch;
    const ad = criarAdaptadorFr({ id: "fr-eua-teste", limite: "1000 req / s" }, fetchImpl);
    const crus = await ad.buscar(new Date("2026-11-01T00:00:00Z"));
    expect(chamadas).toHaveLength(2);
    expect(crus).toHaveLength(40);
  });
});
