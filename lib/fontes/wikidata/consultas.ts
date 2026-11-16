// Consultas SPARQL das fichas técnicas (skill ficha-equipamento). Propriedades conferidas no Wikidata em 15/11/2026.

/** Propriedades usadas, com o rótulo que o Wikidata dá a cada uma (conferido via wbgetentities). */
export const PROPRIEDADES = {
  P176: "fabricante",
  P495: "país de origem",
  P606: "primeiro voo",
  P729: "entrada em serviço",
  P730: "saída de serviço",
  P2043: "comprimento",
  P2050: "envergadura",
  P2048: "altura",
  P2049: "largura",
  P2067: "massa",
  P2052: "velocidade",
  P2073: "autonomia (alcance do veículo)",
  P2254: "altitude máxima de operação",
  P2130: "custo",
  P516: "propulsionado por",
  P520: "armamento",
  P4403: "calibre",
  P1092: "total produzido",
  P137: "operador",
  P373: "categoria da Commons",
  P18: "imagem",
} as const;
export type Propriedade = keyof typeof PROPRIEDADES;

const LISTA = Object.keys(PROPRIEDADES)
  .map((p) => `wd:${p}`)
  .join(" ");

/**
 * Declarações do item e, se houver, da família declarada em config/arsenal.yaml (ex.: F-35A → F-35), para herdar
 * o que a variante não tem. A família é explícita: classes-mãe genéricas ("aeronave militar") não servem.
 */
export function consultaDeclaracoes(qid: string, familia?: string): string {
  return `
SELECT ?ent ?prop ?rank ?valor ?valorLabel ?valorPt ?unidadeEn ?precisao ?data ?parte ?parteLabel WHERE {
  VALUES ?ent { wd:${qid}${familia ? ` wd:${familia}` : ""} }
  VALUES ?prop { ${LISTA} }
  ?prop wikibase:claim ?p ; wikibase:statementProperty ?ps .
  ?ent ?p ?st . ?st ?ps ?valor ; wikibase:rank ?rank .
  FILTER(?rank != wikibase:DeprecatedRank)
  OPTIONAL {
    ?prop wikibase:statementValue ?psv . ?st ?psv ?no .
    OPTIONAL { ?no wikibase:quantityUnit ?unidade . ?unidade rdfs:label ?unidadeEn . FILTER(LANG(?unidadeEn) = "en") }
    OPTIONAL { ?no wikibase:timePrecision ?precisao . }
  }
  OPTIONAL { ?st pq:P585 ?data . }
  OPTIONAL { ?st pq:P518 ?parte . }
  OPTIONAL { ?valor rdfs:label ?valorPt . FILTER(LANG(?valorPt) = "pt" || LANG(?valorPt) = "pt-br") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". }
}`;
}

/** Rótulos, descrições e artigos da Wikipedia (pt e en) do item e da família. */
export function consultaMetadados(qid: string, familia?: string): string {
  return `
SELECT ?ent ?papel ?rotuloPt ?rotuloEn ?descPt ?descEn ?wikiPt ?wikiEn WHERE {
  { VALUES ?ent { wd:${qid} } BIND("item" AS ?papel) }${familia ? ` UNION { VALUES ?ent { wd:${familia} } BIND("pai" AS ?papel) }` : ""}
  OPTIONAL { ?ent rdfs:label ?rotuloPt . FILTER(LANG(?rotuloPt) = "pt") }
  OPTIONAL { ?ent rdfs:label ?rotuloEn . FILTER(LANG(?rotuloEn) = "en") }
  OPTIONAL { ?ent schema:description ?descPt . FILTER(LANG(?descPt) = "pt") }
  OPTIONAL { ?ent schema:description ?descEn . FILTER(LANG(?descEn) = "en") }
  OPTIONAL { ?wikiPt schema:about ?ent ; schema:isPartOf <https://pt.wikipedia.org/> . }
  OPTIONAL { ?wikiEn schema:about ?ent ; schema:isPartOf <https://en.wikipedia.org/> . }
}`;
}

/** Variantes: subclasses diretas da família (F-35A, F-35B, F-35C de F-35) ou do próprio item, com rótulo e descrição. */
export function consultaVariantes(qidFamilia: string): string {
  return `
SELECT ?v ?rotuloPt ?rotuloEn ?descPt ?descEn WHERE {
  ?v wdt:P279 wd:${qidFamilia} .
  OPTIONAL { ?v rdfs:label ?rotuloPt . FILTER(LANG(?rotuloPt) = "pt") }
  OPTIONAL { ?v rdfs:label ?rotuloEn . FILTER(LANG(?rotuloEn) = "en") }
  OPTIONAL { ?v schema:description ?descPt . FILTER(LANG(?descPt) = "pt") }
  OPTIONAL { ?v schema:description ?descEn . FILTER(LANG(?descEn) = "en") }
}
LIMIT 20`;
}
