// Esquemas Zod das linhas do banco (fronteira com dado externo) e conversão para os tipos das telas.
// Espelham supabase/migrations/0001_inicial.sql; o teste lib/db/esquemas.test.ts cobre os casos.
import { z } from "zod";
import { formatarEspecificacao } from "@/lib/especificacao";
import { UNIDADES, type Unidade } from "@/lib/format";
import {
  CATEGORIAS,
  type Conflito,
  type Equipamento,
  type Especificacao,
  type Fonte,
  type Intensidade,
  type ItemFicha,
  type Manchete,
  type Midia,
} from "@/lib/tipos";

const dataHora = z.string().min(1);

// ───────────── Fontes (jsonb `fontes` e fontes por campo em `specs`) ─────────────

export const esquemaFonteJson = z.object({
  nome: z.string().min(1),
  url: z.string().nullable().optional(),
  licenca: z.string().optional(),
  licenca_url: z.string().optional(),
  coletado_em: dataHora.nullable().optional(),
});

const paraFonte = (f: z.infer<typeof esquemaFonteJson>): Fonte => ({
  nome: f.nome,
  url: f.url ?? null,
  licenca: f.licenca,
  licencaUrl: f.licenca_url,
  coletadoEm: f.coletado_em ?? null,
});

/** Lista jsonb de fontes; itens inválidos são descartados (nunca derrubam a página). */
const listaFontes = z.array(z.unknown()).transform((itens) =>
  itens.flatMap((i) => {
    const r = esquemaFonteJson.safeParse(i);
    return r.success ? [paraFonte(r.data)] : [];
  }),
);

/** Exibido quando um registro não tem fonte: deixa a ausência visível em vez de escondê-la. */
export const FONTE_NAO_REGISTRADA: Fonte = { nome: "fonte não registrada", url: null };

// ───────────────────────────── Equipamentos ─────────────────────────────

const camposFonteSpec = {
  fonte: z.string().min(1),
  url: z.string().nullable().optional(),
  licenca: z.string().optional(),
  coletado_em: dataHora.nullable().optional(),
};

const specNumerica = z.object({
  valor: z.number().finite(),
  unidade: z.enum(UNIDADES as [Unidade, ...Unidade[]]),
  aproximado: z.boolean().optional(),
  sufixo: z.string().max(3).optional(),
  ...camposFonteSpec,
});

const specTexto = z.object({ texto: z.string().min(1), ...camposFonteSpec });

const esquemaSpec = z.union([specNumerica, specTexto]);
type SpecBanco = z.infer<typeof esquemaSpec>;

const fonteDaSpec = (s: SpecBanco): Fonte => ({
  nome: s.fonte,
  url: s.url ?? null,
  licenca: s.licenca,
  coletadoEm: s.coletado_em ?? null,
});

/** Rótulos pt-BR das chaves de `equipamentos.specs`, na ordem de exibição da ficha. */
export const ROTULOS_SPEC: Record<string, string> = {
  fabricante: "Fabricante",
  primeiro_voo: "Primeiro voo",
  entrada_servico: "Entrada em serviço",
  tripulacao: "Tripulação",
  comprimento: "Comprimento",
  envergadura: "Envergadura",
  altura: "Altura",
  largura: "Largura",
  massa_vazio: "Massa vazia",
  massa_max: "Massa máx. de decolagem",
  deslocamento: "Deslocamento",
  motor: "Motor",
  combustivel_interno: "Combustível interno",
  velocidade_max: "Velocidade máx.",
  raio_combate: "Raio de combate",
  alcance: "Alcance",
  autonomia: "Autonomia",
  teto_servico: "Teto de serviço",
  limite_g: "Limite G",
  armamento_principal: "Armamento principal",
  canhao: "Canhão",
  pontos_carga: "Pontos de carga",
  custo_unitario: "Custo unitário",
};

/** Especificações que aparecem como números grandes no topo da ficha (até 4). */
const CHAVES_ESTATISTICAS = ["velocidade_max", "raio_combate", "alcance", "teto_servico", "limite_g", "deslocamento"];

export const esquemaLinhaEquipamento = z.object({
  slug: z.string().min(1),
  nome: z.string().min(1),
  categoria: z.enum(Object.keys(CATEGORIAS) as [keyof typeof CATEGORIAS, ...(keyof typeof CATEGORIAS)[]]),
  classe: z.string().nullable(),
  descricao: z.string().nullable(),
  pais_origem: z.array(z.string()),
  fabricante: z.string().nullable(),
  wikipedia_pt: z.string().nullable(),
  resumo_pt: z.string().nullable(),
  em_servico: z.boolean().nullable(),
  specs: z.record(z.string(), z.unknown()),
  variantes: z.array(z.object({ nome: z.string(), descricao: z.string() })).catch([]),
  operadores: z.array(z.string()),
  fontes: listaFontes,
  atualizado_em: dataHora,
});
export type LinhaEquipamento = z.infer<typeof esquemaLinhaEquipamento>;

export const esquemaLinhaMidia = z.object({
  url: z.url(),
  legenda_pt: z.string().nullable(),
  autor: z.string().nullable(),
  licenca: z.string().min(1),
  licenca_url: z.string().nullable(),
  fonte_url: z.url(),
});
export type LinhaMidia = z.infer<typeof esquemaLinhaMidia>;

const formatarSpecTexto = (s: SpecBanco) => ("texto" in s ? s.texto : formatarEspecificacao(paraEspecificacao(s)));

function paraEspecificacao(s: z.infer<typeof specNumerica>): Especificacao {
  return { valor: s.valor, unidade: s.unidade, aproximado: s.aproximado, sufixo: s.sufixo, fonte: fonteDaSpec(s) };
}

export const urlWikipediaPt = (titulo: string) =>
  `https://pt.wikipedia.org/wiki/${encodeURIComponent(titulo.replaceAll(" ", "_"))}`;

/** Converte a linha do banco no tipo usado pelo card e pela ficha. */
export function paraEquipamento(linha: LinhaEquipamento, midias: LinhaMidia[] = []): Equipamento {
  const specs = new Map<string, SpecBanco>();
  for (const [chave, bruto] of Object.entries(linha.specs)) {
    const r = esquemaSpec.safeParse(bruto);
    if (r.success) specs.set(chave, r.data);
  }

  const numerica = (chave: string) => {
    const s = specs.get(chave);
    return s && "valor" in s ? paraEspecificacao(s) : undefined;
  };

  const estatisticas = CHAVES_ESTATISTICAS.flatMap((chave) => {
    const spec = numerica(chave);
    return spec ? [{ rotulo: ROTULOS_SPEC[chave] ?? chave, spec, realce: chave === "velocidade_max" }] : [];
  }).slice(0, 4);

  const ficha: ItemFicha[] = Object.keys(ROTULOS_SPEC).flatMap((chave) => {
    const s = specs.get(chave);
    return s ? [{ rotulo: ROTULOS_SPEC[chave] ?? chave, valor: formatarSpecTexto(s), fonte: fonteDaSpec(s) }] : [];
  });

  const comprimento = numerica("comprimento");
  const envergadura = numerica("envergadura");
  const velocidade = numerica("velocidade_max");

  // O resumo só aparece com fonte: a Wikipedia em português (CC BY-SA 4.0) ou a 1ª fonte registrada.
  const fonteResumo: Fonte | undefined = linha.wikipedia_pt
    ? {
        nome: "Wikipedia em português",
        url: urlWikipediaPt(linha.wikipedia_pt),
        licenca: "CC BY-SA 4.0",
        licencaUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.pt_BR",
        coletadoEm: linha.atualizado_em,
      }
    : linha.fontes[0];

  const galeria: Midia[] = midias.map((m) => ({
    legenda: m.legenda_pt ?? linha.nome,
    url: m.url,
    autor: m.autor ?? "autor não identificado",
    licenca: m.licenca,
    licencaUrl: m.licenca_url ?? undefined,
    fonteUrl: m.fonte_url,
  }));

  return {
    slug: linha.slug,
    nome: linha.nome,
    categoria: linha.categoria,
    classe: linha.classe ?? undefined,
    descricao: linha.descricao ?? linha.classe ?? CATEGORIAS[linha.categoria],
    paises: linha.pais_origem,
    fabricante: linha.fabricante ?? undefined,
    emServico: linha.em_servico ?? undefined,
    destaque: velocidade ? formatarEspecificacao(velocidade) : "",
    resumo: linha.resumo_pt && fonteResumo ? { texto: linha.resumo_pt, fonte: fonteResumo } : undefined,
    estatisticas,
    ficha,
    planta: comprimento && envergadura ? { comprimento, envergadura } : undefined,
    variantes: linha.variantes,
    galeria,
    operadores: linha.operadores,
    fontes: linha.fontes,
  };
}

// ───────────────────────────── Conflitos ─────────────────────────────

export const esquemaLinhaConflito = z.object({
  slug: z.string().min(1),
  nome_pt: z.string().min(1),
  regiao: z.string().min(1),
  intensidade: z.enum(["alta", "tensao", "cessar_fogo", "encerrado"]).nullable(),
  resumo_pt: z.string().nullable(),
  lon: z.number().nullable(),
  lat: z.number().nullable(),
  fontes: listaFontes,
});
export type LinhaConflito = z.infer<typeof esquemaLinhaConflito>;

const INTENSIDADE: Record<"alta" | "tensao" | "cessar_fogo", Intensidade> = {
  alta: "alta",
  tensao: "tensao",
  cessar_fogo: "cessar-fogo",
};

/** `null` para conflitos encerrados ou sem classificação (não entram em "Conflitos em foco"). */
export function paraConflito(l: LinhaConflito): Conflito | null {
  if (!l.intensidade || l.intensidade === "encerrado") return null;
  return {
    slug: l.slug,
    nome: l.nome_pt,
    regiao: l.regiao,
    intensidade: INTENSIDADE[l.intensidade],
    resumo: l.resumo_pt ?? "",
    fonte: l.fontes[0] ?? FONTE_NAO_REGISTRADA,
    coordenadas: l.lon !== null && l.lat !== null ? [l.lon, l.lat] : undefined,
  };
}

// ───────────────────────────── Notícias ─────────────────────────────

export const esquemaLinhaManchete = z.object({
  url: z.url(),
  titulo_original: z.string().min(1),
  idioma_original: z.string().nullable(),
  titulo_pt: z.string().min(1).nullable(),
  resumo_pt: z.string().nullable(),
  temas: z.array(z.string()),
  regiao: z.string().nullable(),
  publicado_em: dataHora,
  coletado_em: dataHora,
  fontes: z.object({ nome: z.string(), licenca: z.string() }),
});
export type LinhaManchete = z.infer<typeof esquemaLinhaManchete>;

/** Agregadores: o veículo é a fonte exibida; o agregador aparece como "via". */
const AGREGADORES: Record<string, string> = { "GDELT DOC 2.0 API": "GDELT" };

export function paraManchete(l: LinhaManchete): Manchete {
  const veiculo = new URL(l.url).hostname.replace(/^www\./, "");
  const via = AGREGADORES[l.fontes.nome];
  return {
    regiao: l.regiao ?? "Mundo",
    titulo: l.titulo_pt ?? l.titulo_original,
    traducaoPendente: l.titulo_pt === null,
    idiomaOriginal: l.idioma_original,
    url: l.url,
    publicadoEm: l.publicado_em,
    fonte: {
      nome: via ? `${veiculo}, via ${via}` : l.fontes.nome,
      url: l.url,
      licenca: via ? "título e link; resumo próprio" : l.fontes.licenca,
      coletadoEm: l.coletado_em,
    },
  };
}

// ───────────────────────────── Execuções ─────────────────────────────

export const esquemaAtualizacao = z.object({ job: z.string(), atualizado_em: dataHora });

/** Valida um array de linhas, descartando (e contando) as inválidas em vez de falhar a página. */
export function validarLinhas<T>(esquema: z.ZodType<T>, linhas: unknown[]): { validas: T[]; invalidas: number } {
  const validas: T[] = [];
  let invalidas = 0;
  for (const l of linhas) {
    const r = esquema.safeParse(l);
    if (r.success) validas.push(r.data);
    else invalidas++;
  }
  return { validas, invalidas };
}

// ───────────────────── Fontes, decisões e eventos (consultas diretas) ─────────────────────

export const esquemaLinhaFonte = z.object({
  id: z.string(),
  nome: z.string(),
  url_base: z.string(),
  licenca: z.string(),
  tipo: z.enum(["api", "rss", "dataset", "scrape"]),
  categoria: z.enum(["estatal", "oficial", "imprensa", "pesquisa", "humanitaria", "enciclopedia"]),
  pais: z.string().nullable(),
  status: z.enum(["ativa", "a_verificar", "quebrada", "desativada"]),
  ultima_verificacao: dataHora.nullable(),
});
export type LinhaFonteBanco = z.infer<typeof esquemaLinhaFonte>;

export const esquemaLinhaDecisao = z.object({
  id: z.number(),
  pais: z.string(),
  orgao: z.string(),
  tipo: z.enum(["ordem_executiva", "lei", "sancao", "comunicado", "acordo", "exercicio_militar", "orcamento", "outro"]),
  titulo_original: z.string(),
  titulo_pt: z.string().nullable(),
  resumo_pt: z.string().nullable(),
  url_oficial: z.url(),
  publicado_em: dataHora,
  coletado_em: dataHora,
  fontes: z.object({ nome: z.string(), licenca: z.string() }),
});
export type LinhaDecisao = z.infer<typeof esquemaLinhaDecisao>;

export const esquemaLinhaEventoPublico = z.object({
  id: z.number(),
  fonte_id: z.string(),
  conflito_slug: z.string().nullable(),
  data: z.string(),
  pais: z.string(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  tipo_evento: z.string().nullable(),
  atores: z.array(z.string()).nullable(),
  mortes_estimadas: z.number().int().nullable(),
  notas_pt: z.string().nullable(),
  coletado_em: dataHora,
});
export type LinhaEventoPublico = z.infer<typeof esquemaLinhaEventoPublico>;
