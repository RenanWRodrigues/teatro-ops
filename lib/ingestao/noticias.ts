// Pipeline de notícias: buscar → normalizar (Zod) → deduplicar → pular as já gravadas →
// traduzir títulos → reclassificar em pt-BR → resumo próprio → gravar em `noticias` (idempotente).
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatarData } from "@/lib/format";
import { deduplicar } from "@/lib/fontes/gdelt-doc";
import { classificar, unirClassificacoes } from "@/lib/fontes/gdelt-doc/classificacao";
import type { AdaptadorFonte, NoticiaNormalizada, ResultadoExecucao } from "@/lib/fontes/_base/tipos";
import { traduzirLote, type DependenciasTraducao } from "@/lib/traducao/traduzir";

export type LinhaNoticia = {
  hash: string;
  fonte_id: string;
  url: string;
  titulo_original: string;
  idioma_original: string | null;
  titulo_pt: string | null;
  resumo_pt: string;
  resumo_automatico: boolean;
  paises: string[];
  temas: string[];
  regiao: string | null;
  publicado_em: string;
};

const ROTULO_TEMA: Record<string, string> = {
  conflitos: "conflitos",
  drones: "drones",
  ia: "inteligência artificial",
  "guerra-eletronica": "guerra eletrônica",
  naval: "naval",
  aereo: "aéreo",
  terrestre: "terrestre",
  nuclear: "nuclear",
  diplomacia: "diplomacia",
};

/**
 * Resumo próprio por regra (opção A da skill traducao-ptbr): fonte, data, região e temas.
 * Não reproduz texto do artigo e não acrescenta fatos.
 */
export function resumoPorRegra(n: Pick<NoticiaNormalizada, "dominio" | "publicadoEm" | "regiao" | "temas">): string {
  const frase1 = `Notícia publicada por ${n.dominio} em ${formatarData(n.publicadoEm)} e indexada pelo GDELT.`;
  const temas = n.temas.map((t) => ROTULO_TEMA[t] ?? t);
  const partes = [n.regiao ? `região: ${n.regiao}` : null, temas.length ? `temas: ${temas.join(", ")}` : null].filter(Boolean);
  return partes.length ? `${frase1} Classificação automática — ${partes.join("; ")}.` : frase1;
}

async function hashesJaGravados(db: SupabaseClient, hashes: string[]): Promise<Set<string>> {
  const existentes = new Set<string>();
  for (let i = 0; i < hashes.length; i += 200) {
    const { data, error } = await db.from("noticias").select("hash").in("hash", hashes.slice(i, i + 200));
    if (error) throw new Error(`consulta de duplicadas: ${error.message}`);
    for (const l of data ?? []) existentes.add(l.hash as string);
  }
  return existentes;
}

export type OpcoesNoticias = {
  /** Não grava nada no banco (nem cache de tradução); só mostra o que faria. */
  seco?: boolean;
  log?: (m: string) => void;
};

export async function processarNoticias(
  db: SupabaseClient,
  adaptador: AdaptadorFonte<unknown, NoticiaNormalizada>,
  desde: Date,
  traducao: DependenciasTraducao,
  opcoes: OpcoesNoticias = {},
): Promise<{ resultado: ResultadoExecucao; linhas: LinhaNoticia[] }> {
  const log = opcoes.log ?? console.log;
  const crus = await adaptador.buscar(desde);

  const normalizadas: NoticiaNormalizada[] = [];
  let ignorados = 0;
  for (const c of crus) {
    const n = adaptador.normalizar(c);
    if (n) normalizadas.push(n);
    else ignorados++;
  }
  const unicas = deduplicar(normalizadas);
  ignorados += normalizadas.length - unicas.length;

  const jaGravados = await hashesJaGravados(db, unicas.map((n) => n.hash));
  const novas = unicas.filter((n) => !jaGravados.has(n.hash));
  ignorados += unicas.length - novas.length;
  log(`[${adaptador.id}] ${crus.length} brutos · ${unicas.length} únicos · ${novas.length} novos`);

  const t = await traduzirLote(
    novas.map((n) => ({ texto: n.tituloOriginal, idioma: n.idiomaOriginal })),
    opcoes.seco ? { ...traducao, cache: { ...traducao.cache, gravar: async () => {} } } : traducao,
  );

  const linhas: LinhaNoticia[] = novas.map((n, i) => {
    const tituloPt = t.saidas[i]!.textoPt;
    const c = tituloPt ? unirClassificacoes(n, classificar(tituloPt, n.temas)) : n;
    return {
      hash: n.hash,
      fonte_id: adaptador.id,
      url: n.url,
      titulo_original: n.tituloOriginal,
      idioma_original: n.idiomaOriginal,
      titulo_pt: tituloPt,
      resumo_pt: resumoPorRegra({ ...n, ...c }),
      resumo_automatico: true,
      paises: c.paises,
      temas: c.temas,
      regiao: c.regiao,
      publicado_em: n.publicadoEm,
    };
  });

  if (!opcoes.seco && linhas.length > 0) {
    for (let i = 0; i < linhas.length; i += 200) {
      const { error } = await db.from("noticias").upsert(linhas.slice(i, i + 200), { onConflict: "hash", ignoreDuplicates: true });
      if (error) throw new Error(`gravação em noticias: ${error.message}`);
    }
  }

  return {
    resultado: {
      itensNovos: linhas.length,
      itensIgnorados: ignorados,
      caracteresTraduzidos: t.caracteresDeepL,
      motores: t.motores,
      erro: null,
    },
    linhas,
  };
}
