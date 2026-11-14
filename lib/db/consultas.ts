// Consultas tipadas de leitura (chave anon + RLS). Cada função devolve um Resultado explícito:
// as páginas decidem o que mostrar quando o banco não está configurado, falha ou vem vazio.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import {
  esquemaAtualizacao,
  esquemaLinhaConflito,
  esquemaLinhaDecisao,
  esquemaLinhaEquipamento,
  esquemaLinhaEventoPublico,
  esquemaLinhaFonte,
  esquemaLinhaManchete,
  esquemaLinhaMidia,
  validarLinhas,
  type LinhaConflito,
  type LinhaDecisao,
  type LinhaEquipamento,
  type LinhaEventoPublico,
  type LinhaFonteBanco,
  type LinhaManchete,
  type LinhaMidia,
} from "./esquemas";
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
export const listarDecisoes = (
  filtro: { pais?: string; limite?: number } = {},
  cliente?: SupabaseClient | null,
): Promise<Resultado<LinhaDecisao[]>> =>
  executar(
    "decisoes_governo",
    esquemaLinhaDecisao,
    (db) => {
      let q = db
        .from("decisoes_governo")
        .select("id, pais, orgao, tipo, titulo_original, titulo_pt, resumo_pt, url_oficial, publicado_em, coletado_em, fontes(nome, licenca)")
        .order("publicado_em", { ascending: false })
        .limit(filtro.limite ?? 50);
      if (filtro.pais) q = q.eq("pais", filtro.pais);
      return q;
    },
    cliente,
  );

// ── conflitos ──
export const listarConflitos = (cliente?: SupabaseClient | null): Promise<Resultado<LinhaConflito[]>> =>
  executar(
    "conflitos",
    esquemaLinhaConflito,
    (db) => db.from("conflitos").select("slug, nome_pt, regiao, intensidade, resumo_pt, lon, lat, fontes").order("atualizado_em", { ascending: false }),
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
    (db) => db.from("midias").select("url, legenda_pt, autor, licenca, licenca_url, fonte_url").eq("equipamento_slug", slug).order("id"),
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
