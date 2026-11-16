import { describe, expect, it } from "vitest";
import type { Equipamento, Especificacao } from "@/lib/tipos";
import { linhasComparaveis, melhorParComparavel } from "./comparar";

const fonte = { nome: "[TESTE]", url: null };
const spec = (valor: number, unidade: Especificacao["unidade"]): Especificacao => ({ valor, unidade, fonte });
const equip = (slug: string, numericas: Equipamento["numericas"]): Equipamento => ({ slug, nome: slug, categoria: "cacas", descricao: "", paises: [], destaque: "", numericas });

describe("linhasComparaveis", () => {
  it("compara só campos presentes nos dois, na mesma unidade", () => {
    const a = equip("a", [
      { chave: "comprimento", rotulo: "Comprimento", spec: spec(15.7, "m") },
      { chave: "velocidade_max", rotulo: "Velocidade máx.", spec: spec(1.6, "mach") },
      { chave: "teto_servico", rotulo: "Teto de serviço", spec: spec(15000, "m") },
    ]);
    const b = equip("b", [
      { chave: "comprimento", rotulo: "Comprimento", spec: spec(19.8, "m") },
      { chave: "velocidade_max", rotulo: "Velocidade máx.", spec: spec(2100, "km/h") },
      { chave: "alcance", rotulo: "Alcance", spec: spec(3500, "km") },
    ]);
    const r = linhasComparaveis(a, b);
    expect(r.linhas.map((l) => l.chave)).toEqual(["comprimento"]);
    expect(r.soDeUm).toEqual(["Velocidade máx.", "Teto de serviço", "Alcance"]);
  });
});

describe("melhorParComparavel", () => {
  const c = (v: number) => ({ chave: "comprimento", rotulo: "Comprimento", spec: spec(v, "m") });
  const e = (v: number) => ({ chave: "envergadura", rotulo: "Envergadura", spec: spec(v, "m") });
  const vel = (v: number) => ({ chave: "velocidade_max", rotulo: "Velocidade máx.", spec: spec(v, "mach") });

  it("escolhe o par da mesma categoria com mais especificações comparáveis", () => {
    const x = equip("x", [c(15), e(10), vel(1.6)]);
    const y = equip("y", [c(20), e(14), vel(2)]);
    const z = equip("z", [c(18), e(12)]);
    const tanque = { ...equip("t", [c(9), e(3), vel(0.1)]), categoria: "tanques" as const };
    const par = melhorParComparavel([z, x, tanque, y]);
    expect([par?.a.slug, par?.b.slug]).toEqual(["x", "y"]);
    expect(par?.linhas).toHaveLength(3);
  });

  it("devolve null sem par com ao menos duas especificações em comum", () => {
    expect(melhorParComparavel([])).toBeNull();
    expect(melhorParComparavel([equip("a", [c(1)]), equip("b", [c(2)])])).toBeNull();
  });
});
