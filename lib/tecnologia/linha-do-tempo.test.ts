import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lerLinhaDoTempo } from "./linha-do-tempo";

const FONTE = "  - { n: 1, nome: A, titulo: T, url: https://a.org/x, data: 2024, verificacao: ok }";
const yaml = (marcos: string, fontes = FONTE) =>
  `status: publicado\nrevisao: ok\natualizado_em: 2026-11-16\nmarcos:\n${marcos}\nfontes:\n${fontes}\n`;

describe("lerLinhaDoTempo", () => {
  it("lê marcos com chamadas de fonte", () => {
    const l = lerLinhaDoTempo(yaml('  - { marco: "1935", descricao: D, fontes: [1] }'), "t");
    expect(l.eventos).toEqual([{ marco: "1935", descricao: "D", atual: undefined, fontes: [1] }]);
  });

  it("recusa marco sem fonte, chamada inexistente, marco repetido e dois marcos atuais", () => {
    expect(() => lerLinhaDoTempo(yaml('  - { marco: "1935", descricao: D, fontes: [] }'), "t")).toThrow();
    expect(() => lerLinhaDoTempo(yaml('  - { marco: "1935", descricao: D, fontes: [1, 2] }'), "t")).toThrow(/\[2\] sem fonte/);
    const dup = '  - { marco: "1935", descricao: D, fontes: [1] }\n  - { marco: "1935", descricao: E, fontes: [1] }';
    expect(() => lerLinhaDoTempo(yaml(dup), "t")).toThrow(/repetido/);
    const atuais = '  - { marco: "a", descricao: D, atual: true, fontes: [1] }\n  - { marco: "b", descricao: E, atual: true, fontes: [1] }';
    expect(() => lerLinhaDoTempo(yaml(atuais), "t")).toThrow(/atual/);
  });

  it("o arquivo real é válido e cada marco tem fonte", () => {
    const arquivo = "content/tecnologia/linha-do-tempo.yaml";
    const l = lerLinhaDoTempo(readFileSync(path.join(process.cwd(), arquivo), "utf8"), arquivo);
    expect(l.eventos.length).toBeGreaterThanOrEqual(5);
    for (const e of l.eventos) expect(e.fontes!.length).toBeGreaterThan(0);
  });
});
