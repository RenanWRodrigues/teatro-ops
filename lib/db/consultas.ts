// Consultas tipadas de leitura (chave anon + RLS). Cada função devolve um Resultado explícito:
// as páginas decidem o que mostrar quando o banco não está configurado, falha ou vem vazio.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import {
  esquemaAgregadoEvento,
  esquemaAtualizacao,
  esquemaCobertura,
  esquemaSemana,
  esquemaLinhaConflito,
  esquemaLinhaDecisao,
  esquemaLinhaEquipamento,
  esquemaLinhaEventoPublico,
  esquemaLinhaFonte,
  esquemaLinhaManchete,
  esquemaLinhaMidia,
  esquemaLinhaTemas,
  esquemaResultadoBusca,
  validarLinhas,
  type LinhaConflito,
  type LinhaDecisao,
  type LinhaEquipamento,
  type LinhaEventoPublico,
  type LinhaFonteBanco,
  type LinhaManchete,
  type LinhaMidia,
  type LinhaTemas,
  type ResultadoBusca,
} from "./esquemas";
import { termosLimpos } from "@/lib/tecnologia/topicos";
import { clienteServidor } from "./servidor";

export type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; motivo: "sem-config" }
  | { ok: false; motivo: "erro"; erro: string };

type Consulta = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

/** Executa a consulta, valida cada linha com Zod e registra no log do servidor o que foi descartado. */
async function executar<T>(
  nome: string,
  esquema: z.ZodType<T>,
  montar: (db: SupabaseClient) => Consulta,
  cliente: SupabaseClient | null = clienteServidor(),
): Promise<Resultado<T[]>> {
  if (!cliente) return { ok: false, motivo: "sem-config" };
  try {
    const { data, error } = await montar(cliente);
    if (error) {
      console.warn(`[db] ${nome}: ${error.message}`);
      return { ok: false, motivo: "erro", erro: error.message };
    }
    const { validas, invalidas } = validarLinhas(esquema, data ?? []);
    if (invalidas > 0) console.warn(`[db] ${nome}: ${invalidas} linha(s) inválida(s) descartada(s)`);
    return { ok: true, dados: validas };
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    console.warn(`[db] ${nome}: ${erro}`);
    return { ok: false, motivo: "erro", erro };
  }
}

// ── fontes ──
export const listarFontes = (cliente?: SupabaseClient | null): Promise<Resultado<LinhaFonteBanco[]>> =>
  executar("fontes", esquemaLinhaFonte, (db) => db.from("fontes").select("*").order("id"), cliente);

// ── noticias ──
const COLUNAS_MANCHETE =
  "url, titulo_original, idioma_original, titulo_pt, resumo_pt, temas, regiao, publicado_em, coletado_em, fontes(nome, licenca)";
export const listarManchetes = (limite = 10, cliente?: SupabaseClient | null): Promise<Resultado<LinhaManchete[]>> =>
  executar(
    "noticias",
    esquemaLinhaManchete,
    (db) =>
      db
        .from("noticias")
        .select(COLUNAS_MANCHETE)
        .order("publicado_em", { ascending: false })
        .limit(limite),
    cliente,
  );

/** Notícias recentes de um tema (ex.: "conflitos"), mais novas primeiro. */
export const listarNoticiasPorTema = (
  tema: string,
  limite = 10,
  cliente?: SupabaseClient | null,
): Promise<Resultado<LinhaManchete[]>> =>
  executar(
    "noticias",
    esquemaLinhaManchete,
    (db) => db.from("noticias").select(COLUNAS_MANCHETE).contains("temas", [tema]).order("publicado_em", { ascending: false }).limit(limite),
    cliente,
  );

// ── decisoes_governo ──
const COLUNAS_DECISAO =
  "id, fonte_id, pais, orgao, tipo, titulo_original, titulo_pt, resumo_pt, url_oficial, publicado_em, coletado_em, temas, idioma_original, fontes(nome, licenca, categoria, url_base)";

export const listarDecisoes = (
  filtro: { pais?: string; desde?: string; limite?: number } = {},
  cliente?: SupabaseClient | null,
): Promise<Resultado<LinhaDecisao[]>> =>
  executar(
    "decisoes_governo",
    esquemaLinhaDecisao,
    (db) => {
      let q = db
        .from("decisoes_governo")
        .select(COLUNAS_DECISAO)
        .order("publicado_em", { ascending: false })
        .limit(filtro.limite ?? 50);
      if (filtro.pais) q = q.eq("pais", filtro.pais);
      if (filtro.desde) q = q.gte("publicado_em", filtro.desde);
      return q;
    },
    cliente,
  );

// ── conflitos ──
const COLUNAS_CONFLITO =
  "slug, nome_pt, regiao, paises, intensidade, resumo_pt, lon, lat, fontes, periodo_inicio, periodo_fim, eventos_periodo, mortes_estimadas, mortes_min, mortes_max";

export const listarConflitos = (cliente?: SupabaseClient | null): Promise<Resultado<LinhaConflito[]>> =>
  executar(
    "conflitos",
    esquemaLinhaConflito,
    (db) => db.from("conflitos").select(COLUNAS_CONFLITO).order("mortes_estimadas", { ascending: false, nullsFirst: false }),
    cliente,
  );

/** A API devolve no máximo 1.000 linhas por chamada: pagina até `maxPaginas`. */
async function executarPaginado<T>(
  nome: string,
  esquema: z.ZodType<T>,
  montar: (db: SupabaseClient, de: number, ate: number) => Consulta,
  cliente: SupabaseClient | null = clienteServidor(),
  maxPaginas = 10,
): Promise<Resultado<T[]>> {
  const todos: T[] = [];
  for (let p = 0; p < maxPaginas; p++) {
    const r = await executar(nome, esquema, (db) => montar(db, p * 1000, p * 1000 + 999), cliente);
    if (!r.ok) return r;
    todos.push(...r.dados);
    if (r.dados.length < 1000) break;
  }
  return { ok: true, dados: todos };
}

export const listarEventosAgregados = (cliente?: SupabaseClient | null) =>
  executarPaginado("eventos_agregados", esquemaAgregadoEvento, (db, de, ate) => db.from("eventos_agregados").select("conflito_slug, lat, lon, eventos, mortes_estimadas").range(de, ate), cliente);

export const listarCoberturaMidia = (cliente?: SupabaseClient | null) =>
  executarPaginado("cobertura_midia", esquemaCobertura, (db, de, ate) => db.from("cobertura_midia").select("lat, lon, noticias").range(de, ate), cliente);

export const listarSemanas = (slug: string, cliente?: SupabaseClient | null) =>
  executar("eventos_semanais", esquemaSemana, (db) => db.from("eventos_semanais").select("semana, eventos, mortes_estimadas").eq("conflito_slug", slug).order("semana"), cliente);

/** Notícias recentes que citam algum dos países do conflito. */
export const listarNoticiasPorPaises = (paises: string[], limite = 6, cliente?: SupabaseClient | null): Promise<Resultado<LinhaManchete[]>> =>
  executar(
    "noticias",
    esquemaLinhaManchete,
    (db) => db.from("noticias").select(COLUNAS_MANCHETE).overlaps("paises", paises).order("publicado_em", { ascending: false }).limit(limite),
    cliente,
  );

/**
 * Notícias cujo título (original ou traduzido) cita algum dos termos ("F-35", "HIMARS").
 * Os termos vão entre aspas no filtro do PostgREST: "Gerald R. Ford" tem ponto e espaço.
 */
export const listarNoticiasPorTermos = (termos: string[], limite = 6, cliente?: SupabaseClient | null): Promise<Resultado<LinhaManchete[]>> => {
  const limpos = termosLimpos(termos);
  if (limpos.length === 0) return Promise.resolve({ ok: true, dados: [] });
  const filtro = limpos.flatMap((t) => [`titulo_original.ilike."*${t}*"`, `titulo_pt.ilike."*${t}*"`]).join(",");
  return executar(
    "noticias",
    esquemaLinhaManchete,
    (db) => db.from("noticias").select(COLUNAS_MANCHETE).or(filtro).order("publicado_em", { ascending: false }).limit(limite),
    cliente,
  );
};

/**
 * Notícias com TODOS os `temas` e, se houver `termos`, ao menos um deles no título (original ou pt-BR).
 * Usada pelas abas de /tecnologia (filtros em lib/tecnologia/topicos.ts).
 */
export const listarNoticiasPorTemasETermos = (
  filtro: { temas: string[]; termos?: string[] },
  limite = 6,
  cliente?: SupabaseClient | null,
): Promise<Resultado<LinhaManchete[]>> => {
  const termos = termosLimpos(filtro.termos);
  return executar(
    "noticias",
    esquemaLinhaManchete,
    (db) => {
      let q = db.from("noticias").select(COLUNAS_MANCHETE).contains("temas", filtro.temas);
      if (termos.length > 0) q = q.or(termos.flatMap((t) => [`titulo_original.ilike."*${t}*"`, `titulo_pt.ilike."*${t}*"`]).join(","));
      return q.order("publicado_em", { ascending: false }).limit(limite);
    },
    cliente,
  );
};

/** Data e temas das notícias com algum dos `temas`, desde `desde` (ISO). Pagina além de 1.000 linhas. */
export const listarTemasNoticias = (temas: string[], desde: string, cliente?: SupabaseClient | null): Promise<Resultado<LinhaTemas[]>> =>
  executarPaginado(
    "noticias_temas",
    esquemaLinhaTemas,
    (db, de, ate) => db.from("noticias").select("publicado_em, temas").overlaps("temas", temas).gte("publicado_em", desde).order("publicado_em").range(de, ate),
    cliente,
  );

// ── eventos (só pela view pública: atraso de 24 h e coordenadas agregadas) ──
export const listarEventosPublicos = (
  filtro: { conflito?: string; limite?: number } = {},
  cliente?: SupabaseClient | null,
): Promise<Resultado<LinhaEventoPublico[]>> =>
  executar(
    "eventos_publicos",
    esquemaLinhaEventoPublico,
    (db) => {
      let q = db.from("eventos_publicos").select("*").order("data", { ascending: false }).limit(filtro.limite ?? 500);
      if (filtro.conflito) q = q.eq("conflito_slug", filtro.conflito);
      return q;
    },
    cliente,
  );

// ── equipamentos + midias ──
const COLUNAS_EQUIPAMENTO =
  "slug, nome, categoria, classe, descricao, pais_origem, fabricante, wikipedia_pt, resumo_pt, em_servico, specs, variantes, operadores, fontes, atualizado_em";

const COLUNAS_MIDIA = "equipamento_slug, url, miniatura_url, legenda_pt, autor, licenca, licenca_url, fonte_url";

/** Todas as fotos (poucas por equipamento): a 1ª de cada um vira a capa do card no catálogo. */
export const listarMidias = (cliente?: SupabaseClient | null): Promise<Resultado<LinhaMidia[]>> =>
  executar("midias", esquemaLinhaMidia, (db) => db.from("midias").select(COLUNAS_MIDIA).order("id"), cliente);

export const listarEquipamentos = (cliente?: SupabaseClient | null): Promise<Resultado<LinhaEquipamento[]>> =>
  executar("equipamentos", esquemaLinhaEquipamento, (db) => db.from("equipamentos").select(COLUNAS_EQUIPAMENTO).order("nome"), cliente);

export async function buscarEquipamentoBanco(
  categoria: string,
  slug: string,
  cliente?: SupabaseClient | null,
): Promise<Resultado<{ linha: LinhaEquipamento; midias: LinhaMidia[] } | null>> {
  const equip = await executar(
    "equipamentos",
    esquemaLinhaEquipamento,
    (db) => db.from("equipamentos").select(COLUNAS_EQUIPAMENTO).eq("categoria", categoria).eq("slug", slug).limit(1),
    cliente,
  );
  if (!equip.ok) return equip;
  const linha = equip.dados[0];
  if (!linha) return { ok: true, dados: null };
  const midias = await executar(
    "midias",
    esquemaLinhaMidia,
    (db) => db.from("midias").select(COLUNAS_MIDIA).eq("equipamento_slug", slug).order("id"),
    cliente,
  );
  // Falha nas mídias não derruba a ficha: mostra os placeholders.
  return { ok: true, dados: { linha, midias: midias.ok ? midias.dados : [] } };
}

// ── atualizacoes_publicas (carimbo "Atualizado em …") ──
export async function ultimaAtualizacao(jobs: string[], cliente?: SupabaseClient | null): Promise<Resultado<string | null>> {
  const r = await executar(
    "atualizacoes_publicas",
    esquemaAtualizacao,
    (db) => db.from("atualizacoes_publicas").select("job, atualizado_em").in("job", jobs).order("atualizado_em", { ascending: false }).limit(1),
    cliente,
  );
  return r.ok ? { ok: true, dados: r.dados[0]?.atualizado_em ?? null } : r;
}

// ── busca global (função SQL `buscar`, migração 0004) ──
export const buscarGlobal = (termo: string, limite = 10, cliente?: SupabaseClient | null): Promise<Resultado<ResultadoBusca[]>> =>
  executar("buscar", esquemaResultadoBusca, (db) => db.rpc("buscar", { termo, limite }), cliente);
