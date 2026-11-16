import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listarFontesPublicas } from "./publico";

describe("listarFontesPublicas", () => {
  const secoes = listarFontesPublicas(readFileSync(path.join(process.cwd(), "config/fontes.yaml"), "utf8"));

  it("cobre as seções de dados, sem placeholders nem serviços de tradução", () => {
    expect(secoes.map((s) => s.id)).toEqual(["conflitos", "governos", "arsenal", "imprensa_defesa"]);
    const ids = secoes.flatMap((s) => s.fontes.map((f) => f.id));
    expect(ids).not.toContain("imprensa-exemplo");
    expect(ids).not.toContain("deepl");
    expect(ids).toContain("ucdp-series");
  });

  it("põe as fontes coletando primeiro e traduz rótulos para pt-BR", () => {
    for (const s of secoes) {
      const ordem = s.fontes.map((f) => f.status);
      const primeiraNaoAtiva = ordem.findIndex((st) => st !== "ativa");
      if (primeiraNaoAtiva >= 0) expect(ordem.slice(primeiraNaoAtiva)).not.toContain("ativa");
    }
    const gkg = secoes[0]!.fontes.find((f) => f.id === "gdelt-gkg")!;
    expect(gkg).toMatchObject({ rotuloStatus: "Coletando", frequencia: "A cada 30 min" });
    for (const f of secoes.flatMap((s) => s.fontes)) expect(f.licenca.length).toBeGreaterThan(0);
  });
});
