import { describe, expect, it } from "vitest";
import { formatarCarimbo, formatarData, formatarDataHora, formatarHora, formatarNumero, formatarUnidade } from "./index";

const NBSP = " ";

describe("formatarData", () => {
  it("usa dd/mm/aaaa", () => {
    expect(formatarData("2026-03-05T15:00:00Z")).toBe("05/03/2026");
  });

  it("converte para o fuso de Brasília (01h UTC ainda é o dia anterior)", () => {
    expect(formatarData("2026-11-14T01:00:00Z")).toBe("13/11/2026");
  });

  it("data sem hora não muda de dia por causa do fuso", () => {
    expect(formatarData("2026-07-01")).toBe("01/07/2026");
  });

  it("aceita Date e timestamp", () => {
    const d = new Date("2026-01-31T12:00:00Z");
    expect(formatarData(d)).toBe("31/01/2026");
    expect(formatarData(d.getTime())).toBe("31/01/2026");
  });

  it("devolve travessão para data inválida", () => {
    expect(formatarData("não é data")).toBe("—");
  });
});

describe("formatarDataHora", () => {
  it("usa dd/mm/aaaa hh:mm em 24 h no horário de Brasília", () => {
    expect(formatarDataHora("2026-11-14T12:30:00Z")).toBe("14/11/2026 09:30");
  });

  it("meia-noite aparece como 00, não 24", () => {
    expect(formatarDataHora("2026-11-14T03:00:00Z")).toBe("14/11/2026 00:00");
  });

  it("devolve travessão para data inválida", () => {
    expect(formatarDataHora(Number.NaN)).toBe("—");
  });
});

describe("formatarNumero", () => {
  it("usa vírgula decimal e ponto de milhar", () => {
    expect(formatarNumero(1234567.891)).toBe("1.234.567,89");
  });

  it("agrupa também números de 4 dígitos", () => {
    expect(formatarNumero(1090)).toBe("1.090");
  });

  it("respeita casas decimais", () => {
    expect(formatarNumero(15.7, { casas: 0 })).toBe("16");
    expect(formatarNumero(2, { casasMinimas: 1, casas: 1 })).toBe("2,0");
  });

  it("devolve travessão para valores não finitos", () => {
    expect(formatarNumero(Number.NaN)).toBe("—");
    expect(formatarNumero(Infinity)).toBe("—");
  });
});

describe("formatarUnidade", () => {
  it("segue o padrão das fichas técnicas", () => {
    expect(formatarUnidade(1090, "km")).toBe(`1.090${NBSP}km`);
    expect(formatarUnidade(15.7, "m")).toBe(`15,7${NBSP}m`);
    expect(formatarUnidade(30, "nos")).toBe(`30${NBSP}nós`);
  });

  it("coloca Mach antes do número", () => {
    expect(formatarUnidade(1.6, "mach")).toBe(`Mach${NBSP}1,6`);
  });

  it("devolve travessão sem unidade para valor inválido", () => {
    expect(formatarUnidade(Number.NaN, "kg")).toBe("—");
  });
});

describe("formatarCarimbo e formatarHora", () => {
  it("segue o microcopy 'dd/mm/aaaa às HHhMM' em Brasília", () => {
    expect(formatarCarimbo("2026-11-14T14:20:00Z")).toBe("14/11/2026 às 11h20");
  });

  it("hora curta em 24 h", () => {
    expect(formatarHora("2026-11-14T23:05:00Z")).toBe("20:05");
  });

  it("devolve travessão para data inválida", () => {
    expect(formatarCarimbo("x")).toBe("—");
    expect(formatarHora("x")).toBe("—");
  });
});

describe("formatarDiaHora", () => {
  it("mostra dia/mês e hora de Brasília, como no aviso de fonte indisponível", async () => {
    const { formatarDiaHora } = await import("./data");
    expect(formatarDiaHora("2026-11-16T12:30:00Z")).toBe("16/11 às 09:30");
    expect(formatarDiaHora("invalida")).toBe("—");
  });
});
