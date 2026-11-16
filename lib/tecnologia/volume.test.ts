import { describe, expect, it } from "vitest";
import { agregarVolumeSemanal, inicioSemana } from "./volume";

describe("inicioSemana", () => {
  it("devolve a segunda-feira (UTC)", () => {
    expect(inicioSemana(new Date("2026-11-16T10:00:00Z"))).toBe("2026-11-16"); // segunda
    expect(inicioSemana(new Date("2026-11-15T23:59:00Z"))).toBe("2026-11-09"); // domingo
    expect(inicioSemana(new Date("2026-11-21T00:00:00Z"))).toBe("2026-11-16"); // sábado
  });
});

describe("agregarVolumeSemanal", () => {
  const agora = new Date("2026-11-18T12:00:00Z");

  it("conta por tema e semana, começando na semana da notícia mais antiga", () => {
    const v = agregarVolumeSemanal(
      [
        { publicado_em: "2026-11-03T08:00:00Z", temas: ["drones"] },
        { publicado_em: "2026-11-17T08:00:00Z", temas: ["drones", "ia", "drones"] },
        { publicado_em: "2026-11-17T09:00:00Z", temas: ["guerra-eletronica"] },
      ],
      agora,
    );
    expect(v.semanas).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(v.series.drones).toEqual([1, 0, 1]);
    expect(v.series.ia).toEqual([0, 0, 1]);
    expect(v.series["guerra-eletronica"]).toEqual([0, 0, 1]);
    expect(v.ultimaParcial).toBe(true);
  });

  it("ignora datas futuras, inválidas e anteriores à janela", () => {
    const v = agregarVolumeSemanal(
      [
        { publicado_em: "2030-01-01T00:00:00Z", temas: ["drones"] },
        { publicado_em: "lixo", temas: ["drones"] },
        { publicado_em: "2025-01-01T00:00:00Z", temas: ["drones"] },
      ],
      agora,
      4,
    );
    expect(v.semanas).toEqual([]);
    expect(v.ultimaParcial).toBe(false);
  });
});
