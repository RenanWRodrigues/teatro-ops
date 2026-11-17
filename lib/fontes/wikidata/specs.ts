// Declarações do Wikidata → `equipamentos.specs` (skill ficha-equipamento). Funções puras, testadas com a fixture.
// Regras: cada campo com fonte e URL; valor da variante primeiro, depois o da família (com a família como fonte);
// declarações da família qualificadas para OUTRA variante ("aplicável a" F-35B) não valem; sem dado → campo vazio.
import { formatarNumero, type Unidade } from "@/lib/format";
import type { Categoria } from "@/lib/tipos";
import { PROPRIEDADES, type Propriedade } from "./consultas";
import { qidDaUri, urlEntidade, type LinhaSparql } from "./index";

export type Declaracao = {
  ent: string;
  prop: Propriedade;
  preferida: boolean;
  valor: string;
  rotulo: string | null;
  /** O rótulo existe em português? Sem isso, nomes comuns (operadores, armamento) são traduzidos. */
  rotuloEmPt: boolean;
  unidadeEn: string | null;
  precisao: number | null;
  data: string | null;
  parte: string | null;
};

export function lerDeclaracoes(linhas: LinhaSparql[]): Declaracao[] {
  return linhas.flatMap((l) => {
    const ent = qidDaUri(l.ent ?? "");
    const prop = /\/(P\d+)$/.exec(l.prop ?? "")?.[1] as Propriedade | undefined;
    if (!ent || !prop || !(prop in PROPRIEDADES) || l.valor === undefined) return [];
    // O serviço de rótulos devolve o próprio QID quando não há rótulo em pt/en.
    const rotulo = l.valorLabel && !/^Q\d+$/.test(l.valorLabel) ? l.valorLabel : null;
    return [
      {
        ent,
        prop,
        preferida: (l.rank ?? "").endsWith("PreferredRank"),
        valor: l.valor,
        rotulo: l.valorPt ?? rotulo,
        rotuloEmPt: !!l.valorPt,
        unidadeEn: l.unidadeEn && l.unidadeEn !== "1" ? l.unidadeEn : null,
        precisao: l.precisao ? Number(l.precisao) : null,
        data: l.data ?? null,
        parte: l.parte ? qidDaUri(l.parte) : null,
      },
    ];
  });
}

export type Selecao = { ent: string; declaracoes: Declaracao[] };

/**
 * Declarações de uma propriedade: as do item; se não houver, as da primeira classe-mãe que tiver
 * (ignorando as qualificadas para outra parte/variante). Com ranking "preferido", só as preferidas.
 */
export function selecionar(todas: Declaracao[], prop: Propriedade, item: string, pais: string[]): Selecao | null {
  for (const ent of [item, ...pais]) {
    let d = todas.filter((x) => x.ent === ent && x.prop === prop && (x.parte === null || x.parte === item));
    // Na família, um valor qualificado para esta variante vence os genéricos.
    if (ent !== item && d.some((x) => x.parte === item)) d = d.filter((x) => x.parte === item);
    if (d.some((x) => x.preferida)) d = d.filter((x) => x.preferida);
    if (d.length > 0) return { ent, declaracoes: d };
  }
  return null;
}

// ───────────────────────────── Unidades ─────────────────────────────

/** Rótulo em inglês da unidade no Wikidata → unidade do site e fator de conversão. */
const CONVERSOES: Record<string, { para: Unidade; fator: number }> = {
  millimetre: { para: "mm", fator: 1 },
  centimetre: { para: "cm", fator: 1 },
  metre: { para: "m", fator: 1 },
  foot: { para: "m", fator: 0.3048 },
  inch: { para: "mm", fator: 25.4 },
  kilometre: { para: "km", fator: 1 },
  mile: { para: "km", fator: 1.609344 },
  "nautical mile": { para: "km", fator: 1.852 },
  "kilometre per hour": { para: "km/h", fator: 1 },
  "mile per hour": { para: "km/h", fator: 1.609344 },
  knot: { para: "nos", fator: 1 },
  "metre per second": { para: "m_s", fator: 1 },
  "Mach number": { para: "mach", fator: 1 },
  kilogram: { para: "kg", fator: 1 },
  tonne: { para: "t", fator: 1 },
  "long ton": { para: "t", fator: 1.0160469 },
  "short ton": { para: "t", fator: 0.9071847 },
  pound: { para: "kg", fator: 0.45359237 },
  kilonewton: { para: "kn", fator: 1 },
  kilowatt: { para: "kw", fator: 1 },
};

/** Conversões extras para a unidade-alvo da ficha (ex.: kg → t em tanques e navios). */
const ENTRE_UNIDADES: Partial<Record<Unidade, Partial<Record<Unidade, number>>>> = {
  kg: { t: 0.001 },
  t: { kg: 1000 },
  "km/h": { nos: 1 / 1.852 },
  nos: { "km/h": 1.852 },
};

const CASAS: Partial<Record<Unidade, number>> = { m: 2, mach: 2, t: 1, mm: 0, km: 0, "km/h": 0, kg: 0, nos: 0 };

export const arredondar = (v: number, u: Unidade) => {
  // Metros acima de 100 (teto, comprimento de navio) sem casas: "7.315 m", não "7.315,2 m".
  const c = u === "m" && v >= 100 ? 0 : (CASAS[u] ?? 1);
  return Math.round(v * 10 ** c) / 10 ** c;
};

function converter(d: Declaracao, alvo: Unidade): number | null {
  const n = Number(d.valor);
  if (!Number.isFinite(n) || !d.unidadeEn) return null;
  const c = CONVERSOES[d.unidadeEn];
  if (!c) return null;
  if (c.para === alvo) return n * c.fator;
  const extra = ENTRE_UNIDADES[c.para]?.[alvo];
  return extra ? n * c.fator * extra : null;
}

// ───────────────────────────── Especificações ─────────────────────────────

export type FonteSpec = { fonte: string; url: string; licenca: "CC0"; coletado_em: string };
export type SpecGravada =
  | ({ valor: number; unidade: Unidade; aproximado?: boolean } & FonteSpec)
  | ({ texto: string } & FonteSpec);

type DefNumerica = { prop: Propriedade; alvos: (c: Categoria) => Unidade[] };

const AERONAVE = (c: Categoria) => c === "cacas" || c === "avioes" || c === "helicopteros" || c === "drones";
const PESADO = (c: Categoria) => c === "tanques" || c === "embarcacoes" || c === "defesa-aerea" || c === "armamento";

/** Chave de `specs` → propriedade e unidades-alvo por ordem de preferência. */
export const NUMERICAS: Record<string, DefNumerica> = {
  comprimento: { prop: "P2043", alvos: () => ["m"] },
  envergadura: { prop: "P2050", alvos: () => ["m"] },
  altura: { prop: "P2048", alvos: () => ["m"] },
  largura: { prop: "P2049", alvos: () => ["m"] },
  velocidade_max: { prop: "P2052", alvos: (c) => (AERONAVE(c) && c !== "helicopteros" ? ["mach", "km/h"] : c === "embarcacoes" ? ["nos", "km/h"] : ["km/h"]) },
  alcance: { prop: "P2073", alvos: () => ["km"] },
  teto_servico: { prop: "P2254", alvos: () => ["m"] },
  calibre: { prop: "P4403", alvos: () => ["mm"] },
};

/** Massa: em navios é o deslocamento (t); em blindados e lançadores, t; em aeronaves, kg. */
const chaveMassa = (c: Categoria) => (c === "embarcacoes" ? "deslocamento" : "massa");

const LIMITE_DIVERGENCIA = 0.02;

export type ContextoSpecs = {
  item: string;
  pais: string[];
  categoria: Categoria;
  /** Rótulo pt da família por QID, para citar "Wikidata — família F-35 Lightning II". */
  rotulos: Record<string, string>;
  /** Traduções de rótulos que o Wikidata só tem em inglês (operadores, armamento). */
  traducoes?: Record<string, string>;
  coletadoEm: string;
};

function fonte(ctx: ContextoSpecs, ent: string, prop: Propriedade): FonteSpec {
  return {
    fonte: ent === ctx.item ? "Wikidata" : `Wikidata (dado da família ${ctx.rotulos[ent] ?? ent})`,
    url: urlEntidade(ent, prop),
    licenca: "CC0",
    coletado_em: ctx.coletadoEm,
  };
}

function numerica(todas: Declaracao[], prop: Propriedade, alvos: Unidade[], ctx: ContextoSpecs): SpecGravada | null {
  const sel = selecionar(todas, prop, ctx.item, ctx.pais);
  if (!sel) return null;
  for (const alvo of alvos) {
    // Só converte o que já está na unidade-alvo ou em equivalente direto (pés → m, mph → km/h…).
    const diretas = sel.declaracoes.filter((d) => d.unidadeEn && CONVERSOES[d.unidadeEn]?.para === alvo);
    const valores = (diretas.length ? diretas : sel.declaracoes).flatMap((d) => {
      const v = converter(d, alvo);
      // "Nativo" = declarado já na unidade-alvo (15,7 m), preferido ao convertido (51 pés → 15,54 m).
      return v !== null && v > 0 ? [{ v, nativo: CONVERSOES[d.unidadeEn ?? ""]?.fator === 1 && CONVERSOES[d.unidadeEn ?? ""]?.para === alvo }] : [];
    });
    if (valores.length === 0) continue;
    const candidatas = valores.map((x) => x.v);
    const min = Math.min(...candidatas);
    const max = Math.max(...candidatas);
    const escolhido = (valores.find((x) => x.nativo) ?? valores[0]!).v;
    if ((max - min) / max <= LIMITE_DIVERGENCIA) return { valor: arredondar(escolhido, alvo), unidade: alvo, ...fonte(ctx, sel.ent, prop) };
    // Fontes divergentes: mostra o intervalo (skill ficha-equipamento).
    const fmt = (v: number) => formatarNumero(arredondar(v, alvo));
    const simbolo = alvo === "mach" ? "Mach" : alvo === "nos" ? "nós" : alvo === "m_s" ? "m/s" : alvo;
    const intervalo = alvo === "mach" ? `Mach ${fmt(min)}–${fmt(max)}` : `${fmt(min)}–${fmt(max)} ${simbolo}`;
    return { texto: `${intervalo} (valores divergentes no Wikidata)`, ...fonte(ctx, sel.ent, prop) };
  }
  return null;
}

/** "2006-12-15T00:00:00Z" com precisão 11 → "15/12/2006"; 10 → "12/2006"; 9 → "2006". */
export function formatarDataWikidata(iso: string, precisao: number | null): string {
  const m = /^[+]?(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  if (precisao !== null && precisao <= 9) return m[1]!;
  if (precisao === 10) return `${m[2]}/${m[1]}`;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Um rótulo por entidade (o mesmo valor volta uma vez para cada rótulo pt/pt-br), na ordem em que aparecem. */
const rotulos = (s: Selecao, traducoes: Record<string, string> = {}) => {
  const porValor = new Map<string, string>();
  for (const d of s.declaracoes) {
    const r = d.rotulo && !d.rotuloEmPt ? (traducoes[d.rotulo] ?? d.rotulo) : d.rotulo;
    if (r && !porValor.has(d.valor)) porValor.set(d.valor, r);
  }
  return [...new Set(porValor.values())];
};

/** Rótulos só em inglês das propriedades cujos valores são nomes comuns (para traduzir antes de montar). */
export function rotulosSemPt(todas: Declaracao[], props: Propriedade[], ctx: Pick<ContextoSpecs, "item" | "pais">): string[] {
  return [
    ...new Set(
      props.flatMap((p) => selecionar(todas, p, ctx.item, ctx.pais)?.declaracoes.filter((d) => d.rotulo && !d.rotuloEmPt).map((d) => d.rotulo!) ?? []),
    ),
  ];
}

function texto(todas: Declaracao[], prop: Propriedade, ctx: ContextoSpecs, montar: (s: Selecao) => string | null): SpecGravada | null {
  const sel = selecionar(todas, prop, ctx.item, ctx.pais);
  const t = sel ? montar(sel) : null;
  return sel && t ? { texto: t, ...fonte(ctx, sel.ent, prop) } : null;
}

function custo(s: Selecao): string | null {
  const usd = s.declaracoes.filter((d) => d.unidadeEn === "United States dollar" && Number.isFinite(Number(d.valor)));
  if (usd.length === 0) return null;
  const partes = usd.map((d) => {
    const mi = Number(d.valor) / 1e6;
    const ano = d.data ? ` (${d.data.slice(0, 4)})` : "";
    return `US$ ${formatarNumero(mi, { casas: mi < 10 ? 1 : 0 })} milhões${ano}`;
  });
  return [...new Set(partes)].join(" · ");
}

/**
 * Massa em t nas categorias pesadas e em kg nas demais. Abaixo de 1 t volta para kg: em defesa aérea e
 * armamento o Wikidata costuma trazer a massa do míssil (22 kg viravam "0 t" no Javelin, 17/11/2026).
 */
function massa(todas: Declaracao[], ctx: ContextoSpecs): SpecGravada | null {
  const v = numerica(todas, "P2067", PESADO(ctx.categoria) ? ["t", "kg"] : ["kg", "t"], ctx);
  if (v && "valor" in v && v.unidade === "t" && v.valor < 1) return numerica(todas, "P2067", ["kg"], ctx);
  return v;
}

/** Monta `specs` e diz quais campos ficaram vazios (para o relatório do cadastro). */
export function montarSpecs(todas: Declaracao[], ctx: ContextoSpecs): { specs: Record<string, SpecGravada>; vazios: string[] } {
  const specs: Record<string, SpecGravada> = {};
  const vazios: string[] = [];
  const por = (chave: string, v: SpecGravada | null) => (v ? (specs[chave] = v) : vazios.push(chave));

  por("fabricante", texto(todas, "P176", ctx, (s) => rotulos(s).join(" / ") || null));
  por("primeiro_voo", texto(todas, "P606", ctx, (s) => formatarDataWikidata(s.declaracoes[0]!.valor, s.declaracoes[0]!.precisao)));
  por("entrada_servico", texto(todas, "P729", ctx, (s) => formatarDataWikidata(s.declaracoes[0]!.valor, s.declaracoes[0]!.precisao)));
  for (const [chave, def] of Object.entries(NUMERICAS)) por(chave, numerica(todas, def.prop, def.alvos(ctx.categoria), ctx));
  por(chaveMassa(ctx.categoria), massa(todas, ctx));
  por("motor", texto(todas, "P516", ctx, (s) => rotulos(s).join(" / ") || null));
  por("armamento_principal", texto(todas, "P520", ctx, (s) => rotulos(s, ctx.traducoes).slice(0, 4).join(" · ") || null));
  por(
    "total_produzido",
    texto(todas, "P1092", ctx, (s) => {
      const d = s.declaracoes[0]!;
      if (!Number.isFinite(Number(d.valor))) return null;
      // Sem data de referência, o número não pode parecer atual.
      return `${formatarNumero(Number(d.valor))} ${d.data ? `(em ${formatarDataWikidata(d.data, d.precisao ?? 9)})` : "(sem data de referência no Wikidata)"}`;
    }),
  );
  por("custo_unitario", texto(todas, "P2130", ctx, custo));
  return { specs, vazios };
}

/** Listas simples (país de origem, operadores) com a mesma regra de seleção. */
export const listaDeRotulos = (todas: Declaracao[], prop: Propriedade, ctx: Pick<ContextoSpecs, "item" | "pais" | "traducoes">) => {
  const s = selecionar(todas, prop, ctx.item, ctx.pais);
  return s ? { ent: s.ent, rotulos: rotulos(s, ctx.traducoes) } : null;
};

/** Nome do arquivo no Commons a partir da URL Special:FilePath do P18. */
export const arquivoDoP18 = (url: string) => decodeURIComponent(url.split("/Special:FilePath/")[1] ?? "") || null;
