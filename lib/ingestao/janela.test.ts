import { describe, expect, it } from "vitest";
import { calcularDesde, MARGEM_MS } from "./janela";

const agora = new Date("2026-11-16T10:00:00Z");
const horasAtras = (h: number) => new Date(agora.getTime() - h * 3_600_000);

describe("calcularDesde", () => {
  it("sem histórico ou sem recuperação, usa a janela padrão", () => {
    expect(calcularDesde({ agora, padraoHoras: 2, tetoHoras: 24, ultimoSucesso: null })).toEqual(horasAtras(2));
    expect(calcularDesde({ agora, padraoHoras: 48, tetoHoras: null, ultimoSucesso: horasAtras(100) })).toEqual(horasAtras(48));
  });

  it("cron atrasado: recupera desde a última execução bem-sucedida, com margem", () => {
    // Medido em 16/11/2026: última execução às 02h47 UTC, a seguinte só ~8 h depois.
    const ultimo = new Date("2026-11-16T02:47:00Z");
    expect(calcularDesde({ agora, padraoHoras: 2, tetoHoras: 24, ultimoSucesso: ultimo })).toEqual(new Date(ultimo.getTime() - MARGEM_MS));
  });

  it("execução recente: nunca encolhe abaixo da janela padrão", () => {
    expect(calcularDesde({ agora, padraoHoras: 2, tetoHoras: 24, ultimoSucesso: horasAtras(0.5) })).toEqual(horasAtras(2));
  });

  it("parada longa: limita ao teto", () => {
    expect(calcularDesde({ agora, padraoHoras: 2, tetoHoras: 24, ultimoSucesso: horasAtras(72) })).toEqual(horasAtras(24));
  });
});
