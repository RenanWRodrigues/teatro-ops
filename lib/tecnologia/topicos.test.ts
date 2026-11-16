import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";
import { FILTROS_TOPICO, termosLimpos } from "./topicos";

// Temas que a ingestão grava em noticias.temas (lib/fontes/gdelt-doc/classificacao.ts e consultas do GKG).
const TEMAS_GRAVADOS = new Set(["conflitos", "drones", "ia", "guerra-eletronica", "naval", "aereo", "terrestre", "nuclear", "diplomacia"]);

describe("filtros das abas de /tecnologia", () => {
  it("cada aba tem texto em content/tecnologia e cada texto corresponde a uma aba", () => {
    const arquivos = readdirSync(path.join(process.cwd(), "content/tecnologia")).filter((a) => a.endsWith(".mdx"));
    expect(arquivos.map((a) => a.replace(/\.mdx$/, "")).sort()).toEqual(Object.keys(FILTROS_TOPICO).sort());
    for (const f of Object.values(FILTROS_TOPICO)) expect(f.rotulo.trim()).not.toBe("");
  });

  it("só usa temas que a ingestão grava e traz critério em pt-BR", () => {
    for (const f of Object.values(FILTROS_TOPICO)) {
      expect(f.temas.length).toBeGreaterThan(0);
      for (const t of f.temas) expect(TEMAS_GRAVADOS.has(t)).toBe(true);
      expect(f.criterio).toMatch(/^Notícias classificadas no tema /);
      expect(f.criterio.endsWith(".")).toBe(true);
    }
  });
});

describe("termosLimpos", () => {
  it("tira caracteres que quebram o filtro do PostgREST, termos curtos e repetidos", () => {
    expect(termosLimpos(['"FPV"', "swarm,", "a", "swarm", " C-UAS "])).toEqual(["FPV", "swarm", "C-UAS"]);
    expect(termosLimpos()).toEqual([]);
  });
});
