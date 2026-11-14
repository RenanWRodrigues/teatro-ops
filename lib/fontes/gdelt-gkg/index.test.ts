import { readFileSync } from "node:fs";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { configFonte } from "../_base/config";
import { casa, compilarConsulta } from "./consultas";
import {
  carimbosDaJanela,
  compilarConsultas,
  criarAdaptadorGkg,
  dataGkg,
  limparTitulo,
  lerTsv,
  normalizarLinha,
  tituloDaLinha,
} from "./index";

// Amostra REAL: linhas de https://data.gdeltproject.org/gdeltv2/20261114191500.gkg.csv.zip (14/11/2026).
const AMOSTRA = readFileSync(path.join(import.meta.dirname, "__fixtures__/amostra.gkg.csv"), "utf8");
const linhas = lerTsv(AMOSTRA);
const config = configFonte("gdelt-gkg");
const consultas = compilarConsultas(config);

describe("consultas do YAML aplicadas ao título", () => {
  it("OR dentro do grupo, E entre grupos, frases e siglas", () => {
    const ia = compilarConsulta('("artificial intelligence" OR "AI") (military OR defense OR weapon)');
    expect(casa(ia, "Pentagon expands AI use in military planning")).toBe(true);
    expect(casa(ia, "New AI model writes poems")).toBe(false);
    expect(casa(ia, "Said the military")).toBe(false);
    const conflitos = compilarConsulta("(war OR airstrike OR ceasefire)");
    expect(casa(conflitos, "Ceasefire holds in the south")).toBe(true);
    expect(casa(conflitos, "Warriors win the final")).toBe(false);
  });
});

describe("limpeza de título", () => {
  it("decodifica entidades e tira o nome do site do fim", () => {
    expect(limparTitulo("Iran says IAEA can&#39;t resume inspections - Israel &amp; Jewish News")).toBe("Iran says IAEA can't resume inspections");
    expect(limparTitulo("Short - Site")).toBe("Short - Site");
    expect(limparTitulo("Arab News | Israeli drone strike kills 2 Palestinians in Gaza")).toBe("Israeli drone strike kills 2 Palestinians in Gaza");
  });
});

describe("janela de arquivos", () => {
  it("lista carimbos de 15 em 15 min até `desde`, com teto", () => {
    expect(carimbosDaJanela("20261114191500", new Date("2026-11-14T18:40:00Z"))).toEqual([
      "20261114191500",
      "20261114190000",
      "20261114184500",
    ]);
    expect(carimbosDaJanela("20261114191500", new Date(0), 4)).toHaveLength(4);
    expect(dataGkg("20261114191500")).toBe("2026-11-14T19:15:00Z");
  });
});

describe("amostra real do GKG", () => {
  it("todas as linhas têm título e 27 colunas", () => {
    expect(linhas.length).toBe(19);
    for (const l of linhas) {
      expect(l).toHaveLength(27);
      expect(tituloDaLinha(l)).toBeTruthy();
    }
  });

  it("filtra pelas consultas e classifica as que passam", () => {
    const normalizadas = linhas.map((l) => normalizarLinha(l, consultas)).filter((n) => n !== null);
    // Só as manchetes com termos das consultas passam ("military" sozinho não é termo de nenhuma).
    expect(normalizadas.map((n) => n.tituloOriginal)).toEqual([
      "Pakistan Army Major among two Martyred in Balochistan Drone Attack: ISPR",
      "Israeli drone strike kills 2 Palestinians in Gaza, and other Mideast news",
    ]);
    const gaza = normalizadas.find((n) => n.tituloOriginal.startsWith("Israeli drone strike kills 2 Palestinians in Gaza"));
    expect(gaza).toMatchObject({ idiomaOriginal: "en", publicadoEm: "2026-11-14T19:15:00Z", regiao: "Oriente Médio" });
    expect(gaza?.temas).toEqual(expect.arrayContaining(["drones"]));
    expect(gaza?.paises).toEqual(expect.arrayContaining(["IL", "PS"]));
    for (const n of normalizadas) {
      expect(n.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(n.url.startsWith("https://")).toBe(true);
    }
  });
});

describe("adaptador com rede simulada", () => {
  it("lê o lastupdate, baixa os zips da janela e pula arquivo ausente", async () => {
    const zip = zipSync({ "20261114191500.gkg.csv": strToU8(AMOSTRA) });
    const pedidos: string[] = [];
    const fetchImpl = (async (url: string) => {
      pedidos.push(url);
      if (url.endsWith("lastupdate.txt")) {
        return new Response("3280563 x http://data.gdeltproject.org/gdeltv2/20261114191500.gkg.csv.zip\n");
      }
      if (url.includes("20261114191500")) return new Response(zip);
      return new Response("not found", { status: 404 });
    }) as typeof fetch;
    const adaptador = criarAdaptadorGkg({ ...config, limite: "100 req / s" }, fetchImpl);
    const brutas = await adaptador.buscar(new Date("2026-11-14T19:00:00Z"));
    expect(pedidos.filter((p) => p.endsWith(".zip"))).toHaveLength(2);
    expect(brutas).toHaveLength(19);
  });
});

describe("filtros de precisão", () => {
  const linhaCom = (titulo: string, temas: string) => {
    const l = [...linhas[0]!];
    l[7] = temas;
    l[26] = `<PAGE_TITLE>${titulo}</PAGE_TITLE>`;
    return l;
  };

  it("exige tema de segurança do GDELT e aplica as exclusões do YAML", () => {
    expect(normalizarLinha(linhaCom("Miami Dolphins offensive line review for Week 9", ""), consultas)).toBeNull();
    expect(normalizarLinha(linhaCom("Drone light show debuts at Christmas park", "TAX_WEAPONS"), consultas)).toBeNull();
    expect(normalizarLinha(linhaCom("Democrats aim to roll back tariffs, trade war lingers", "KILL"), consultas)).toBeNull();
    expect(normalizarLinha(linhaCom("Myanmar airstrike on displaced persons camp kills 12", "ARMEDCONFLICT;KILL"), consultas)).not.toBeNull();
  });
});
