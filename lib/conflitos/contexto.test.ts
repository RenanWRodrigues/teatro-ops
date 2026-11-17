import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lerCuradoria } from "@/lib/fontes/ucdp-candidato/curadoria";
import { contextoVisivel, lerContexto, SECOES_CONTEXTO } from "./contexto";

const PASTA = path.join(process.cwd(), "content/conflitos");
const slugs = new Set(lerCuradoria(readFileSync(path.join(process.cwd(), "config/conflitos.yaml"), "utf8")).map((c) => c.slug));
const arquivos = readdirSync(PASTA).filter((a) => a.endsWith(".mdx"));

const FONTE = `  - n: 1
    nome: Fonte de teste
    titulo: "Título"
    url: https://example.org/
    data: 2026-11-17
    verificacao: teste`;

const texto = (secoes: readonly string[]) =>
  `---\nid: teste\ntitulo: Teste\nresumo: Resumo.\nstatus: rascunho\nrevisao: pendente\natualizado_em: 2026-11-17\nfontes:\n${FONTE}\n---\n\n` +
  secoes.map((s) => `## ${s}\n\nFato [1].\n`).join("\n");

describe("lerContexto", () => {
  it("aceita as cinco seções na ordem", () => {
    expect(lerContexto(texto(SECOES_CONTEXTO), "teste").secoes).toHaveLength(5);
  });

  it("recusa seção faltando ou fora de ordem", () => {
    expect(() => lerContexto(texto(SECOES_CONTEXTO.slice(0, 4)), "teste")).toThrow(/seções/);
    expect(() => lerContexto(texto([...SECOES_CONTEXTO].reverse()), "teste")).toThrow(/seções/);
  });

  it("recusa id diferente do nome do arquivo", () => {
    expect(() => lerContexto(texto(SECOES_CONTEXTO), "outro")).toThrow(/difere/);
  });

  it("rascunho só aparece em desenvolvimento", () => {
    const d = lerContexto(texto(SECOES_CONTEXTO), "teste");
    expect(contextoVisivel(d, "production")).toBe(false);
    expect(contextoVisivel(d, "development")).toBe(true);
    expect(contextoVisivel({ ...d, status: "publicado" }, "production")).toBe(true);
  });
});

describe("textos de content/conflitos", () => {
  for (const arquivo of arquivos) {
    const slug = arquivo.replace(/\.mdx$/, "");
    it(`${arquivo} é de um conflito da curadoria e é válido`, () => {
      expect(slugs.has(slug)).toBe(true);
      expect(lerContexto(readFileSync(path.join(PASTA, arquivo), "utf8"), slug).secoes.map((s) => s.titulo)).toEqual([...SECOES_CONTEXTO]);
    });
  }
});
