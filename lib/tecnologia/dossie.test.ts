import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatarDataFonte, lerDossie, lerTrechos } from "./dossie";
import { FILTROS_TOPICO } from "./topicos";

const fm = (fontes = "  - { n: 1, nome: A, titulo: T, url: https://a.org/x, data: 2024, verificacao: ok }") =>
  `---\nid: x\ntitulo: X\nresumo: R\nstatus: publicado\nrevisao: ok\natualizado_em: 2026-11-16\nfontes:\n${fontes}\n---\n`;

describe("lerTrechos", () => {
  it("separa texto, negrito, itálico e chamadas [n]", () => {
    expect(lerTrechos("O **FPV** (*first-person view*) [1][2].")).toEqual([
      { tipo: "texto", texto: "O " },
      { tipo: "negrito", texto: "FPV" },
      { tipo: "texto", texto: " (" },
      { tipo: "italico", texto: "first-person view" },
      { tipo: "texto", texto: ") " },
      { tipo: "ref", n: 1 },
      { tipo: "ref", n: 2 },
      { tipo: "texto", texto: "." },
    ]);
  });
});

describe("lerDossie", () => {
  it("lê seções, parágrafos e listas", () => {
    const d = lerDossie(`${fm()}\n## O que é\n\nLinha um\ncontinua [1].\n\n- item a\n- item b\n`, "t");
    expect(d.secoes).toHaveLength(1);
    expect(d.secoes[0]!.blocos.map((b) => b.tipo)).toEqual(["paragrafo", "lista"]);
    expect(d.fontes[0]!.data).toBe("2024");
  });

  it("recusa chamada sem fonte, fonte não citada e numeração fora de ordem", () => {
    expect(() => lerDossie(`${fm()}\n## A\n\nTexto [2] [1].\n`, "t")).toThrow(/\[2\] sem fonte/);
    expect(() => lerDossie(`${fm()}\n## A\n\nSem chamada.\n`, "t")).toThrow(/nunca citada/);
    const fora = "  - { n: 2, nome: A, titulo: T, url: https://a.org/x, data: 2024, verificacao: ok }";
    expect(() => lerDossie(`${fm(fora)}\n## A\n\nTexto [2].\n`, "t")).toThrow(/numeradas/);
  });

  it("recusa sintaxe fora do subconjunto (JSX, links, outros níveis de título)", () => {
    expect(() => lerDossie(`${fm()}\n## A\n\n<Grafico /> [1]\n`, "t")).toThrow(/JSX/);
    expect(() => lerDossie(`${fm()}\n## A\n\nVer [aqui](https://x.org) [1]\n`, "t")).toThrow(/link/);
    expect(() => lerDossie(`${fm()}\n### A\n\nTexto [1]\n`, "t")).toThrow(/título/);
  });

  it("recusa fonte sem https", () => {
    const http = "  - { n: 1, nome: A, titulo: T, url: http://a.org/x, data: 2024, verificacao: ok }";
    expect(() => lerDossie(`${fm(http)}\n## A\n\nTexto [1].\n`, "t")).toThrow();
  });
});

describe("textos publicados em content/tecnologia", () => {
  for (const id of Object.keys(FILTROS_TOPICO)) {
    it(`${id}.mdx é válido, aprovado e tem as três seções`, () => {
      const d = lerDossie(readFileSync(path.join(process.cwd(), `content/tecnologia/${id}.mdx`), "utf8"), id);
      expect(d.id).toBe(id);
      expect(d.status).toBe("publicado");
      expect(d.secoes.map((s) => s.titulo)).toEqual(["O que é", "Contexto histórico", "Debate ético e regulatório"]);
    });
  }
});

describe("formatarDataFonte", () => {
  it("formata datas completas e parciais em pt-BR e mantém textos", () => {
    expect(formatarDataFonte("2025-10-23")).toBe("23/10/2025");
    expect(formatarDataFonte("2023-05")).toBe("05/2023");
    expect(formatarDataFonte("2024")).toBe("2024");
    expect(formatarDataFonte("programa concluído")).toBe("programa concluído");
  });
});
