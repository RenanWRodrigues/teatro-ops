import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lerDossie } from "@/lib/tecnologia/dossie";
import { TATICAS } from "./taticas";

const PASTA = path.join(process.cwd(), "content/taticas");

describe("textos de content/taticas", () => {
  it("cada arquivo corresponde a uma tática da lista e vice-versa", () => {
    const arquivos = readdirSync(PASTA).filter((a) => a.endsWith(".mdx")).map((a) => a.replace(/\.mdx$/, ""));
    expect(arquivos.sort()).toEqual(TATICAS.map((t) => t.id).sort());
  });

  for (const { id } of TATICAS) {
    it(`${id}.mdx é válido, publicado e tem as quatro seções`, () => {
      const d = lerDossie(readFileSync(path.join(PASTA, `${id}.mdx`), "utf8"), id);
      expect(d.id).toBe(id);
      expect(d.status).toBe("publicado");
      expect(d.secoes).toHaveLength(4);
      expect(d.secoes[0]!.titulo).toBe("O que é");
      expect(d.secoes[2]!.titulo).toBe("Casos históricos");
    });
  }
});
