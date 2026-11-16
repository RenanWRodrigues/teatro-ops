import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lerSeriesUcdp } from "./series";

const real = () => JSON.parse(readFileSync(path.join(process.cwd(), "content/arquivo/ucdp-series.json"), "utf8"));

describe("lerSeriesUcdp", () => {
  it("o arquivo gerado é válido: conflitos desde 1946 e mortes desde 1989, anos contínuos", () => {
    const s = lerSeriesUcdp(real());
    expect(s.conflitos[0]!.ano).toBe(1946);
    expect(s.mortes[0]!.ano).toBe(1989);
    expect(s.ignoradas).toBe(0);
  });

  it("recusa contagens inconsistentes e anos com lacunas", () => {
    const a = real();
    a.conflitos[0].total += 1;
    expect(() => lerSeriesUcdp(a)).toThrow(/inconsistentes/);
    const b = real();
    b.mortes.splice(3, 1);
    expect(() => lerSeriesUcdp(b)).toThrow(/lacunas/);
  });
});
