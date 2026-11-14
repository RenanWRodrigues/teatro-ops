// Monta a cadeia de tradução a partir das variáveis de ambiente (só scripts de ingestão).
import { readFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteDeepL } from "./deepl";
import { criarTravador, glossarioParaTsv, lerGlossario } from "./glossario";
import { criarClienteLibre } from "./libretranslate";
import type { CacheTraducao, DependenciasTraducao } from "./traduzir";

export { traduzirLote } from "./traduzir";
export type { ItemTraducao, ResultadoTraducao, SaidaTraducao } from "./traduzir";

export function cacheSupabase(db: SupabaseClient): CacheTraducao {
  return {
    async ler(hashes) {
      const mapa = new Map<string, string>();
      for (let i = 0; i < hashes.length; i += 200) {
        const { data, error } = await db.from("traducoes_cache").select("hash, texto_pt").in("hash", hashes.slice(i, i + 200));
        if (error) throw new Error(error.message);
        for (const l of data ?? []) mapa.set(l.hash as string, l.texto_pt as string);
      }
      return mapa;
    },
    async gravar(linhas) {
      const { error } = await db.from("traducoes_cache").upsert(linhas, { onConflict: "hash", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    },
  };
}

export type DiagnosticoTradutor = { deepl: "ativo" | "sem chave" | "erro"; glossario: string; libre: "ativo" | "sem URL" };

export async function criarDependenciasTraducao(
  db: SupabaseClient,
  log: (m: string) => void,
): Promise<{ deps: DependenciasTraducao; diagnostico: DiagnosticoTradutor }> {
  const glossario = lerGlossario(readFileSync(path.join(process.cwd(), "config/glossario-militar.csv"), "utf8"));
  const travador = criarTravador(glossario);

  const chave = process.env.DEEPL_API_KEY?.trim();
  const deepl = chave ? criarClienteDeepL(chave) : null;
  let glossarioIdDeepL: string | null = null;
  const diagnostico: DiagnosticoTradutor = { deepl: deepl ? "ativo" : "sem chave", glossario: "não criado", libre: "sem URL" };

  if (deepl) {
    try {
      glossarioIdDeepL = await deepl.garantirGlossario(glossarioParaTsv(glossario));
      diagnostico.glossario = glossarioIdDeepL ? `DeepL ${glossarioIdDeepL.slice(0, 8)}…` : "par EN→PT não suportado; só travamento local";
    } catch (e) {
      diagnostico.deepl = "erro";
      diagnostico.glossario = "falhou";
      log(`DeepL: não foi possível preparar o glossário (${(e as Error).message})`);
    }
  }

  const urlLibre = process.env.LIBRETRANSLATE_URL?.trim();
  const libre = urlLibre ? criarClienteLibre(urlLibre) : null;
  if (libre) diagnostico.libre = "ativo";

  return {
    deps: { cache: cacheSupabase(db), travador, deepl, glossarioIdDeepL, libre, log },
    diagnostico,
  };
}
