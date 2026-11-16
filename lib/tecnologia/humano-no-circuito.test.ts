import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lerHumanoNoCircuito } from "./humano-no-circuito";

const ARQUIVO = "content/tecnologia/humano-no-circuito.yaml";
const real = () => readFileSync(path.join(process.cwd(), ARQUIVO), "utf8");

describe("lerHumanoNoCircuito", () => {
  it("o arquivo real é válido: cada trecho cita fonte e o andamento está em ordem", () => {
    const d = lerHumanoNoCircuito(real(), ARQUIVO);
    expect(d.niveis.map((n) => n.sigla)).toEqual(["NO CIRCUITO", "SOBRE O CIRCUITO", "FORA DO CIRCUITO"]);
    expect(d.andamento.length).toBeGreaterThanOrEqual(3);
    expect(d.andamento.filter((a) => a.atual).length).toBeLessThanOrEqual(1);
  });

  it("recusa posição sem fonte", () => {
    const quebrado = real().replace(/^posicoes:\r?\n/m, "posicoes:\n  - Afirmação sem fonte.\n");
    expect(() => lerHumanoNoCircuito(quebrado, ARQUIVO)).toThrow(/sem chamada de fonte/);
  });

  it("recusa andamento fora de ordem", () => {
    const quebrado = real().replace("data: 2023-12-22", "data: 2027-01-01");
    expect(() => lerHumanoNoCircuito(quebrado, ARQUIVO)).toThrow(/ordem cronológica/);
  });
});
