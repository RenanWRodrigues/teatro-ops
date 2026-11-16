import { describe, expect, it } from "vitest";
import {
  esquemaLinhaConflito,
  esquemaLinhaEquipamento,
  esquemaLinhaManchete,
  FONTE_NAO_REGISTRADA,
  paraConflito,
  paraEquipamento,
  paraManchete,
  validarLinhas,
} from "./esquemas";

// [EXEMPLO] Linhas fictícias só para testar a conversão; não são dados publicados.
const linhaEquipamento = {
  slug: "exemplo-caca",
  nome: "[EXEMPLO] Caça",
  categoria: "cacas",
  classe: "Caça · exemplo",
  descricao: null,
  pais_origem: ["XX"],
  fabricante: "Fabricante X",
  wikipedia_pt: "Caça de exemplo",
  resumo_pt: "Resumo de teste.",
  em_servico: true,
  specs: {
    velocidade_max: { valor: 1.6, unidade: "mach", fonte: "Wikidata", url: "https://www.wikidata.org/wiki/Q1", licenca: "CC0" },
    raio_combate: { valor: 1090, unidade: "km", sufixo: "+", fonte: "Wikidata", url: null },
    comprimento: { valor: 15.7, unidade: "m", fonte: "Wikidata" },
    envergadura: { valor: 10.7, unidade: "m", fonte: "Wikidata" },
    motor: { texto: "Motor X", fonte: "Fabricante X" },
    lixo: { valor: "não é número", unidade: "m", fonte: "?" },
    unidade_invalida: { valor: 1, unidade: "parsecs", fonte: "?" },
  },
  variantes: [{ nome: "A", descricao: "Versão A" }],
  operadores: ["XX"],
  fontes: [{ nome: "Fonte geral", url: "https://exemplo.org", licenca: "CC BY 4.0" }, { sem: "nome" }],
  atualizado_em: "2026-11-14T12:00:00Z",
};

describe("paraEquipamento", () => {
  const linha = esquemaLinhaEquipamento.parse(linhaEquipamento);
  const e = paraEquipamento(linha, [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/x.jpg",
      legenda_pt: "Em voo",
      autor: null,
      licenca: "CC BY-SA 4.0",
      licenca_url: null,
      fonte_url: "https://commons.wikimedia.org/wiki/File:x.jpg",
    },
  ]);

  it("monta estatísticas, ficha e planta só com specs válidas, cada uma com sua fonte", () => {
    expect(e.estatisticas?.map((s) => s.rotulo)).toEqual(["Velocidade máx.", "Raio de combate"]);
    expect(e.ficha?.map((i) => [i.rotulo, i.valor])).toEqual([
      ["Comprimento", "15,7 m"],
      ["Envergadura", "10,7 m"],
      ["Motor", "Motor X"],
      ["Velocidade máx.", "Mach 1,6"],
      ["Raio de combate", "1.090+ km"],
    ]);
    expect(e.ficha?.find((i) => i.rotulo === "Motor")?.fonte.nome).toBe("Fabricante X");
    expect(e.planta?.comprimento.valor).toBe(15.7);
    expect(e.destaque).toBe("Mach 1,6");
  });

  it("atribui o resumo à Wikipédia em português com licença CC BY-SA", () => {
    expect(e.resumo?.fonte).toMatchObject({
      nome: "Wikipédia em português",
      url: "https://pt.wikipedia.org/wiki/Ca%C3%A7a_de_exemplo",
      licenca: "CC BY-SA 4.0",
    });
  });

  it("descarta fontes inválidas da lista jsonb", () => {
    expect(e.fontes).toEqual([{ nome: "Fonte geral", url: "https://exemplo.org", licenca: "CC BY 4.0", licencaUrl: undefined, coletadoEm: null }]);
  });

  it("foto sem autor fica marcada, nunca sem crédito", () => {
    expect(e.galeria?.[0]).toMatchObject({ autor: "autor não identificado", licenca: "CC BY-SA 4.0" });
  });

  it("não mostra resumo sem fonte", () => {
    const semFonte = esquemaLinhaEquipamento.parse({ ...linhaEquipamento, wikipedia_pt: null, fontes: [] });
    expect(paraEquipamento(semFonte).resumo).toBeUndefined();
  });
});

describe("paraConflito", () => {
  const base = { slug: "x", nome_pt: "[EXEMPLO]", regiao: "Europa", resumo_pt: null, lon: 30, lat: 50, fontes: [] };

  it("converte cessar_fogo e marca ausência de fonte de forma visível", () => {
    const c = paraConflito(esquemaLinhaConflito.parse({ ...base, intensidade: "cessar_fogo" }));
    expect(c?.intensidade).toBe("cessar-fogo");
    expect(c?.fonte).toEqual(FONTE_NAO_REGISTRADA);
    expect(c?.coordenadas).toEqual([30, 50]);
  });

  it("exclui encerrados e sem classificação", () => {
    expect(paraConflito(esquemaLinhaConflito.parse({ ...base, intensidade: "encerrado" }))).toBeNull();
    expect(paraConflito(esquemaLinhaConflito.parse({ ...base, intensidade: null }))).toBeNull();
  });
});

describe("paraManchete", () => {
  const base = {
    url: "https://www.exemplo.org/n",
    titulo_original: "[EXAMPLE] Headline",
    idioma_original: "en",
    titulo_pt: "[EXEMPLO] Título",
    resumo_pt: null,
    temas: ["conflitos"],
    regiao: null,
    publicado_em: "2026-11-13T10:00:00Z",
    coletado_em: "2026-11-13T10:05:00Z",
    fontes: { nome: "GDELT DOC 2.0 API", licenca: "Livre com citação" },
  };

  it("atribui ao veículo, com o agregador como 'via'", () => {
    const m = paraManchete(esquemaLinhaManchete.parse(base));
    expect(m).toMatchObject({
      regiao: "Mundo",
      titulo: "[EXEMPLO] Título",
      traducaoPendente: false,
      publicadoEm: "2026-11-13T10:00:00Z",
      fonte: { nome: "exemplo.org", url: "https://www.exemplo.org/n" },
      via: { nome: "GDELT Project", url: "https://www.gdeltproject.org/" },
    });
  });

  it("com tradução pendente, mostra o original e marca o idioma", () => {
    const m = paraManchete(esquemaLinhaManchete.parse({ ...base, titulo_pt: null }));
    expect(m).toMatchObject({ titulo: "[EXAMPLE] Headline", traducaoPendente: true, idiomaOriginal: "en" });
  });
});

describe("validarLinhas", () => {
  it("separa linhas válidas e conta as inválidas", () => {
    const r = validarLinhas(esquemaLinhaManchete, [{ url: "não é url" }, {}]);
    expect(r).toEqual({ validas: [], invalidas: 2 });
  });
});

describe("paraEquipamento sem artigo em português", () => {
  it("credita o resumo traduzido à Wikipédia em inglês, nunca ao Wikidata", () => {
    const linha = esquemaLinhaEquipamento.parse({
      ...linhaEquipamento,
      wikipedia_pt: null,
      fontes: [
        { nome: "Wikidata", url: "https://www.wikidata.org/wiki/Q1", licenca: "CC0" },
        { nome: "Wikipedia em inglês (traduzido automaticamente)", url: "https://en.wikipedia.org/wiki/X", licenca: "CC BY-SA 4.0" },
      ],
    });
    const e = paraEquipamento(linha, []);
    expect(e.resumo?.fonte).toMatchObject({ nome: "Wikipédia em inglês (traduzido automaticamente)", licenca: "CC BY-SA 4.0" });
  });
});
