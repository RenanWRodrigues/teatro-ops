// Pipeline do monitor de governos: buscar → normalizar (Zod) → filtro de relevância → deduplicar →
// pular as já gravadas → traduzir títulos → classificar tipo → resumo próprio → `decisoes_governo` (idempotente).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdaptadorFonte, ResultadoExecucao } from "@/lib/fontes/_base/tipos";
import { classificarTipo, resumoDecisao, type TipoDecisao } from "@/lib/governos/classificacao";
import { gruposRelevantes, relevanteNoRegistro } from "@/lib/governos/termos";
import type { DecisaoClassificada, DecisaoNormalizada } from "@/lib/governos/tipos";
import { traduzirLote, type DependenciasTraducao } from "@/lib/traducao/traduzir";

export type LinhaDecisao = {
  hash: string;
  fonte_id: string;
  pais: string;
  orgao: string;
  tipo: TipoDecisao;
  titulo_original: string;
  titulo_pt: string | null;
  resumo_pt: string | null;
  url_oficial: string;
  publicado_em: string;
  temas: string[];
  idioma_original: string | null;
};

/** Mantém só o que passa no filtro de relevância (título + descrição curta). */
export function filtrarRelevantes(itens: DecisaoNormalizada[]): { relevantes: DecisaoClassificada[]; descartados: number } {
  const relevantes: DecisaoClassificada[] = [];
  for (const d of itens) {
    const grupos = gruposRelevantes(d.tituloOriginal, d.descricao);
    if (grupos.length === 0) continue;
    const registroComum = d.origem === "registro" && d.tipoDocumento !== "Presidential Document";
    if (registroComum && !relevanteNoRegistro(d.tituloOriginal, grupos)) continue;
    relevantes.push({ ...d, grupos });
  }
  return { relevantes, descartados: itens.length - relevantes.length };
}

export function paraLinha(d: DecisaoClassificada, tituloPt: string | null): LinhaDecisao {
  const tipo = classificarTipo({
    titulo: d.tituloOriginal,
    descricao: d.descricao,
    tipoDocumento: d.tipoDocumento,
    subtipoDocumento: d.subtipoDocumento,
    origem: d.origem,
  });
  return {
    hash: d.hash,
    fonte_id: d.fonteId,
    pais: d.pais,
    orgao: d.orgao,
    tipo,
    titulo_original: d.tituloOriginal,
    titulo_pt: tituloPt,
    resumo_pt: resumoDecisao({ grupos: d.grupos }),
    url_oficial: d.urlOficial,
    publicado_em: d.publicadoEm,
    temas: d.grupos,
    idioma_original: d.idiomaOriginal,
  };
}

async function hashesJaGravados(db: SupabaseClient, hashes: string[]): Promise<Set<string>> {
  const existentes = new Set<string>();
  for (let i = 0; i < hashes.length; i += 200) {
    const { data, error } = await db.from("decisoes_governo").select("hash").in("hash", hashes.slice(i, i + 200));
    if (error) throw new Error(`consulta de duplicadas: ${error.message}`);
    for (const l of data ?? []) existentes.add(l.hash as string);
  }
  return existentes;
}

const semGravarCache = (t: DependenciasTraducao): DependenciasTraducao => ({ ...t, cache: { ...t.cache, gravar: async () => {} } });

export async function processarDecisoes(
  db: SupabaseClient,
  adaptador: AdaptadorFonte<unknown, DecisaoNormalizada>,
  desde: Date,
  traducao: DependenciasTraducao,
  opcoes: { seco?: boolean; log?: (m: string) => void } = {},
): Promise<{ resultado: ResultadoExecucao; linhas: LinhaDecisao[] }> {
  const log = opcoes.log ?? console.log;
  const crus = await adaptador.buscar(desde);

  const normalizadas: DecisaoNormalizada[] = [];
  for (const c of crus) {
    const n = adaptador.normalizar(c);
    if (n) normalizadas.push(n);
  }
  const unicas = [...new Map(normalizadas.map((n) => [n.hash, n])).values()];
  const { relevantes } = filtrarRelevantes(unicas);

  const jaGravados = await hashesJaGravados(db, relevantes.map((d) => d.hash));
  const novas = relevantes.filter((d) => !jaGravados.has(d.hash));
  log(`[${adaptador.id}] ${crus.length} brutos · ${normalizadas.length} válidos · ${relevantes.length} relevantes · ${novas.length} novos`);

  const t = await traduzirLote(
    novas.map((d) => ({ texto: d.tituloOriginal, idioma: d.idiomaOriginal })),
    opcoes.seco ? semGravarCache(traducao) : traducao,
  );
  const linhas = novas.map((d, i) => paraLinha(d, t.saidas[i]!.textoPt));

  if (!opcoes.seco && linhas.length > 0) {
    for (let i = 0; i < linhas.length; i += 200) {
      const { error } = await db.from("decisoes_governo").upsert(linhas.slice(i, i + 200), { onConflict: "hash", ignoreDuplicates: true });
      if (error) throw new Error(`gravação em decisoes_governo: ${error.message}`);
    }
  }

  return {
    resultado: {
      itensNovos: linhas.length,
      itensIgnorados: crus.length - linhas.length,
      caracteresTraduzidos: t.caracteresDeepL,
      motores: t.motores,
      erro: null,
    },
    linhas,
  };
}

/** Retraduz títulos de decisões que ficaram pendentes (motor indisponível na coleta). */
export async function retraduzirDecisoesPendentes(
  db: SupabaseClient,
  traducao: DependenciasTraducao,
  opcoes: { limite?: number; seco?: boolean } = {},
): Promise<{ traduzidos: number; caracteresDeepL: number }> {
  const { data, error } = await db
    .from("decisoes_governo")
    .select("hash, titulo_original, idioma_original")
    .is("titulo_pt", null)
    .order("publicado_em", { ascending: false })
    .limit(opcoes.limite ?? 100);
  if (error) throw new Error(`consulta de pendentes: ${error.message}`);
  const pendentes = (data ?? []) as { hash: string; titulo_original: string; idioma_original: string | null }[];
  if (pendentes.length === 0) return { traduzidos: 0, caracteresDeepL: 0 };
  const t = await traduzirLote(
    pendentes.map((p) => ({ texto: p.titulo_original, idioma: p.idioma_original })),
    opcoes.seco ? semGravarCache(traducao) : traducao,
  );
  let traduzidos = 0;
  for (const [i, p] of pendentes.entries()) {
    const pt = t.saidas[i]!.textoPt;
    if (!pt || opcoes.seco) continue;
    const { error: e } = await db.from("decisoes_governo").update({ titulo_pt: pt }).eq("hash", p.hash).is("titulo_pt", null);
    if (!e) traduzidos++;
  }
  return { traduzidos, caracteresDeepL: t.caracteresDeepL };
}
