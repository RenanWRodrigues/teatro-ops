import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { linhasConflitos, resumoConflito, FONTE_UCDP } from "@/lib/ingestao/eventos";
import { lerCsvComCabecalho } from "../_base/csv";
import { calcularEstatisticas, criarAssociador, inicioDoTrimestre, lerCuradoria } from "./curadoria";
import { acharArquivoAcumulado, normalizarLinhaUcdp } from "./index";

// Amostra REAL do UCDP Candidate GED v26_01_26_09 (40 linhas), com os trechos de reportagem removidos.
const linhas = lerCsvComCabecalho(readFileSync(path.join(import.meta.dirname, "__fixtures__/amostra.csv"), "utf8"));
const curadoria = lerCuradoria(readFileSync(path.join(import.meta.dirname, "../../../config/conflitos.yaml"), "utf8"));
const associar = criarAssociador(curadoria);

describe("descoberta do arquivo", () => {
  it("escolhe o acumulado mais recente da página de downloads", () => {
    const html = `
      <a href="https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_0_9.csv">mensal</a>
      <a href="https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_01_26_08.csv">jan-ago</a>
      <a href="https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_01_26_09.csv">jan-set</a>`;
    expect(acharArquivoAcumulado(html)).toEqual({
      url: "https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_01_26_09.csv",
      ano: 2026,
      mes: 9,
    });
    expect(acharArquivoAcumulado("<html></html>")).toBeNull();
  });
});

describe("curadoria", () => {
  it("lê os 28 conflitos aprovados", () => {
    expect(curadoria).toHaveLength(28);
    expect(curadoria[0]).toMatchObject({ slug: "russia-ucrania", paises: ["UA", "RU"] });
  });

  it("associa por país e, quando definido, por id de conflito", () => {
    expect(associar("Ukraine", 13243)).toBe("russia-ucrania");
    expect(associar("Russia (Soviet Union)", 13243)).toBe("russia-ucrania");
    expect(associar("Russia (Soviet Union)", 999)).toBeNull();
    expect(associar("Saudi Arabia", 230)).toBe("iemen");
    expect(associar("Mexico", 107)).toBeNull(); // fora da curadoria (violência entre grupos criminosos)
  });
});

describe("normalização da amostra real", () => {
  const eventos = linhas.map((l) => normalizarLinhaUcdp(l, associar));

  it("todas as linhas válidas viram eventos com hash, data, ISO e intervalo de mortes coerente", () => {
    expect(eventos.every((e) => e !== null)).toBe(true);
    for (const e of eventos) {
      expect(e!.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(e!.data).toMatch(/^2026-\d{2}-\d{2}$/);
      expect(e!.mortes_min).toBeLessThanOrEqual(e!.mortes_estimadas);
      expect(e!.mortes_max).toBeGreaterThanOrEqual(e!.mortes_estimadas);
    }
    expect(new Set(eventos.map((e) => e!.pais))).toContain("UA");
  });

  it("não carrega texto de reportagem e troca atores não identificados", () => {
    const json = JSON.stringify(eventos);
    expect(json).not.toContain("[removido]");
    expect(json).not.toMatch(/XXX\d+/);
  });

  it("descarta linha inválida em vez de falhar", () => {
    expect(normalizarLinhaUcdp({ ...linhas[0]!, latitude: "abc" }, associar)).toBeNull();
  });
});

describe("intensidade", () => {
  const base = { lat: 0, lon: 0, low: 0, high: 0 };
  it("janela de 3 meses civis terminando no último dado", () => {
    expect(inicioDoTrimestre("2026-09-30")).toBe("2026-07-01");
    expect(inicioDoTrimestre("2026-02-10")).toBe("2025-12-01");
  });

  it("alta >= 250, tensão 25–249, abaixo disso sem classificação; ignora eventos fora da janela", () => {
    const ev = [
      { ...base, slug: "sudao", data: "2026-09-30", best: 250 },
      { ...base, slug: "mali", data: "2026-08-01", best: 25 },
      { ...base, slug: "chade", data: "2026-07-01", best: 24 },
      { ...base, slug: "chade", data: "2026-06-30", best: 5000 },
    ];
    const s = Object.fromEntries(calcularEstatisticas(curadoria, ev).map((x) => [x.slug, x.intensidade]));
    expect(s).toMatchObject({ sudao: "alta", mali: "tensao", chade: null });
  });

  it("resumo neutro, só com números da fonte e a ressalva de dado preliminar", () => {
    const [stat] = calcularEstatisticas(curadoria, [{ ...base, slug: "russia-ucrania", data: "2026-09-10", best: 1200, low: 1000, high: 1500 }]);
    expect(resumoConflito(stat!)).toBe(
      "Segundo o UCDP, 1 evento de violência organizada e cerca de 1.200 mortes (estimativa entre 1.000 e 1.500) de 01/07/2026 a 10/09/2026. Dados preliminares, sujeitos a revisão.",
    );
    const [linha] = linhasConflitos(curadoria, [stat!], FONTE_UCDP({ url: "https://ucdp.uu.se/x.csv" }, "2026-11-14T00:00:00Z"));
    expect(linha).toMatchObject({ slug: "russia-ucrania", intensidade: "alta", fontes: [{ licenca: "CC BY 4.0" }] });
  });
});
