import { describe, expect, it } from "vitest";
import { classificarTipo, resumoDecisao, rotuloTipo } from "./classificacao";
import { descricaoCurta } from "./tipos";
import { ehRelevante, gruposRelevantes, relevanteNoRegistro, semNomeDeOrgao } from "./termos";

describe("filtro de relevância", () => {
  it("aceita títulos de defesa, sanções, conflito e armas", () => {
    expect(gruposRelevantes("Notice of OFAC Sanctions Actions")).toEqual(["sancoes"]);
    expect(gruposRelevantes("Implementing the Lindsey O. Graham Sanctioning Russia and Iran Act of 2026")).toContain("sancoes");
    expect(gruposRelevantes("Russia and China urge immediate end to war against Iran")).toContain("conflito");
    expect(gruposRelevantes("IRGC downs 17th US MQ-1 drone over Qeshm Island")).toContain("armas");
    expect(gruposRelevantes("Meeting of the CSTO Collective Security Council")).toEqual(["defesa"]);
  });

  it("descarta agenda protocolar, cultura e economia doméstica", () => {
    expect(ehRelevante("Veterans Day, 2026")).toBe(false);
    expect(ehRelevante("Pilot for Online Version of Application for a U.S. Passport (Form DS-11)")).toBe(false);
    expect(ehRelevante("Deutscher Kurzfilmpreis 2026: Die Nominierungen stehen fest")).toBe(false);
    expect(ehRelevante("Greetings to the 7th World Quality Day International Forum")).toBe(false);
  });

  it("o nome do próprio órgão não conta como termo", () => {
    expect(ehRelevante("Department of War Expands Community-Based Childcare Fee Assistance")).toBe(false);
    expect(ehRelevante("Department of War Awards $41 Million Grant to School District")).toBe(false);
    expect(semNomeDeOrgao("Secretary of War Pete Hegseth")).not.toMatch(/War/);
    // …mas o assunto continua contando.
    expect(gruposRelevantes("Department of War Certifies Production Capacity for Second Guided-Missile Destroyer")).toEqual(["armas"]);
  });

  it("casa palavras inteiras (sem falso positivo dentro de outra palavra)", () => {
    expect(ehRelevante("Software warranty update")).toBe(false);
    expect(ehRelevante("In accordance with the schedule")).toBe(false);
  });

  it("reconhece termos alemães compostos e de outros idiomas", () => {
    expect(gruposRelevantes("Haushaltsausschuss beschließt Verteidigungshaushalt 2027")).toEqual(expect.arrayContaining(["defesa", "orcamento_defesa"]));
    expect(gruposRelevantes("Bundesregierung verhängt neue Sanktionen")).toEqual(["sancoes"]);
    expect(gruposRelevantes("Заявление о санкциях")).toEqual(["sancoes"]);
  });

  it("usa a descrição quando o título não basta", () => {
    expect(ehRelevante("Meeting with President of Belarus", "The talks focused on military cooperation.")).toBe(true);
  });
});

describe("Federal Register: avisos administrativos", () => {
  it("descarta rotina administrativa e documentos só com o tema defesa", () => {
    const ver = (t: string) => relevanteNoRegistro(t, gruposRelevantes(t));
    expect(ver("Information Collection Requirement; Defense Federal Acquisition Regulation Supplement")).toBe(false);
    expect(ver("President's Military Spouse Commission; Notice of Federal Advisory Committee Meeting")).toBe(false);
    expect(ver("Certificate of Alternate Compliance for USS Harrisburg (LPD 30)")).toBe(false);
    expect(ver("Arms Sales Notification")).toBe(true);
    expect(ver("Notice of Removal of Designated Chinese Military Company")).toBe(true);
  });
});

describe("classificação de tipo", () => {
  const rss = { origem: "rss" as const };
  it("sanção, exercício, acordo, orçamento e lei por palavra-chave", () => {
    expect(classificarTipo({ ...rss, titulo: "Notice of OFAC Sanctions Action" })).toBe("sancao");
    expect(classificarTipo({ ...rss, titulo: "Navy begins joint exercises in the Pacific" })).toBe("exercicio_militar");
    expect(classificarTipo({ ...rss, titulo: "BAE Systems Sign Framework Agreement" })).toBe("acordo");
    expect(classificarTipo({ ...rss, titulo: "Haushaltsausschuss beschließt Verteidigungshaushalt 2027" })).toBe("orcamento");
    expect(classificarTipo({ ...rss, titulo: "Bundestag beschließt Bundeswehr-Infrastrukturbeschleunigungsgesetz" })).toBe("lei");
  });

  it("documento presidencial é ato executivo, salvo sanções", () => {
    const pres = { origem: "registro" as const, tipoDocumento: "Presidential Document" };
    expect(classificarTipo({ ...pres, titulo: "Delegation of Authority Under Section 8335 of the NDAA" })).toBe("ordem_executiva");
    expect(classificarTipo({ ...pres, titulo: "Continuation of the National Emergency With Respect to Iran" })).toBe("sancao");
  });

  it("a descrição sozinha não transforma em sanção", () => {
    expect(classificarTipo({ ...rss, titulo: "USS Colorado Announced as First Submarine for Rotational Force", descricao: "designated by the Navy" })).toBe("comunicado");
  });

  it("padrão: comunicado (RSS) ou outro (registro oficial)", () => {
    expect(classificarTipo({ ...rss, titulo: "Meeting with members of the Security Council" })).toBe("comunicado");
    expect(classificarTipo({ origem: "registro", titulo: "Final Deauthorization List", tipoDocumento: "Notice" })).toBe("outro");
  });
});

describe("resumo próprio", () => {
  it("diz só os temas, sem copiar o texto do documento", () => {
    expect(resumoDecisao({ grupos: ["defesa", "sancoes"] })).toBe("Temas: defesa, sanções.");
    expect(resumoDecisao({ grupos: [] })).toBeNull();
  });

  it("texto de agência estatal sem tipo específico é notícia, não comunicado de governo", () => {
    expect(rotuloTipo({ tipo: "comunicado", estatal: true })).toBe("Notícia de agência estatal");
    expect(rotuloTipo({ tipo: "comunicado", estatal: false })).toBe("Comunicado");
    expect(rotuloTipo({ tipo: "sancao", estatal: true })).toBe("Sanção");
  });
});

describe("descrição curta", () => {
  it("tira HTML e trunca em 300 caracteres", () => {
    expect(descricaoCurta("<p>Olá &amp; <b>mundo</b></p>")).toBe("Olá & mundo");
    expect(descricaoCurta("a".repeat(500))!.length).toBe(300);
    expect(descricaoCurta("  ")).toBeNull();
  });
});

describe("contarPorRotulo", () => {
  it("conta pelo rótulo exibido no card", async () => {
    const { contarPorRotulo } = await import("./classificacao");
    expect(
      contarPorRotulo([
        { tipo: "sancao", estatal: false },
        { tipo: "comunicado", estatal: false },
        { tipo: "comunicado", estatal: true },
        { tipo: "comunicado", estatal: true },
      ]),
    ).toEqual([
      ["Sanção", 1],
      ["Comunicado", 1],
      ["Notícia de agência estatal", 2],
    ]);
  });
});
