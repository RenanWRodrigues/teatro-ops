// Pipeline de eventos do UCDP: baixar → normalizar → gravar `eventos` (atualiza revisões) →
// recalcular intensidade e números de cada conflito curado → gravar `conflitos`.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatarData } from "@/lib/format";
import type { ResultadoExecucao } from "@/lib/fontes/_base/tipos";
import type { FonteYaml } from "@/lib/fontes/registro";
import { baixarUcdp, normalizarLinhaUcdp, type ArquivoUcdp, type LinhaEvento } from "@/lib/fontes/ucdp-candidato";
import { calcularEstatisticas, criarAssociador, lerCuradoria, type ConflitoCurado, type Estatistica } from "@/lib/fontes/ucdp-candidato/curadoria";

export const FONTE_UCDP = (arquivo: Pick<ArquivoUcdp, "url">, coletadoEm: string) => ({
  nome: "UCDP Candidate GED (versão preliminar)",
  url: arquivo.url,
  licenca: "CC BY 4.0",
  licenca_url: "https://creativecommons.org/licenses/by/4.0/deed.pt_BR",
  coletado_em: coletadoEm,
});

const fmt = new Intl.NumberFormat("pt-BR", { useGrouping: "always" });

/** Resumo próprio e neutro, só com números da fonte. */
export function resumoConflito(e: Estatistica): string {
  if (e.eventos === 0) return `Sem eventos registrados pelo UCDP entre ${formatarData(e.periodoInicio)} e ${formatarData(e.periodoFim)}.`;
  return (
    `Segundo o UCDP, ${fmt.format(e.eventos)} ${e.eventos === 1 ? "evento" : "eventos"} de violência organizada e cerca de ` +
    `${fmt.format(e.mortes)} ${e.mortes === 1 ? "morte" : "mortes"} (estimativa entre ${fmt.format(e.mortesMin)} e ${fmt.format(e.mortesMax)}) ` +
    `de ${formatarData(e.periodoInicio)} a ${formatarData(e.periodoFim)}. Dados preliminares, sujeitos a revisão.`
  );
}

export function linhasConflitos(curadoria: ConflitoCurado[], stats: Estatistica[], fonte: ReturnType<typeof FONTE_UCDP>) {
  const porSlug = new Map(stats.map((s) => [s.slug, s]));
  return curadoria.map((c) => {
    const s = porSlug.get(c.slug);
    return {
      slug: c.slug,
      nome_pt: c.nome,
      paises: c.paises,
      regiao: c.regiao,
      intensidade: s?.intensidade ?? null,
      resumo_pt: s ? resumoConflito(s) : null,
      lon: s?.lon ?? null,
      lat: s?.lat ?? null,
      periodo_inicio: s?.periodoInicio ?? null,
      periodo_fim: s?.periodoFim ?? null,
      eventos_periodo: s?.eventos ?? 0,
      mortes_estimadas: s?.mortes ?? 0,
      mortes_min: s?.mortesMin ?? 0,
      mortes_max: s?.mortesMax ?? 0,
      fontes: [fonte],
      atualizado_em: fonte.coletado_em,
    };
  });
}

export const lerCuradoriaDoDisco = () => lerCuradoria(readFileSync(path.join(process.cwd(), "config/conflitos.yaml"), "utf8"));

export async function processarUcdp(
  db: SupabaseClient,
  fonte: FonteYaml,
  opcoes: { seco?: boolean; log?: (m: string) => void; arquivo?: ArquivoUcdp } = {},
): Promise<{ resultado: ResultadoExecucao; eventos: LinhaEvento[]; stats: Estatistica[] }> {
  const log = opcoes.log ?? console.log;
  const curadoria = lerCuradoriaDoDisco();
  const associar = criarAssociador(curadoria);

  const arquivo = opcoes.arquivo ?? (await baixarUcdp(fonte.limite));
  log(`[${fonte.id}] ${arquivo.url.split("/").pop()} · ${arquivo.linhas.length} linhas`);

  const eventos: LinhaEvento[] = [];
  let ignorados = 0;
  for (const bruta of arquivo.linhas) {
    const e = normalizarLinhaUcdp(bruta, associar);
    if (e) eventos.push(e);
    else ignorados++;
  }

  const stats = calcularEstatisticas(
    curadoria,
    eventos.map((e) => ({ slug: e.conflito_slug, data: e.data, best: e.mortes_estimadas, low: e.mortes_min, high: e.mortes_max, lat: e.lat, lon: e.lon })),
  );
  const coletadoEm = new Date().toISOString();
  const conflitos = linhasConflitos(curadoria, stats, FONTE_UCDP(arquivo, coletadoEm));

  if (!opcoes.seco) {
    // Conflitos primeiro: eventos.conflito_slug referencia conflitos(slug).
    const c = await db.from("conflitos").upsert(conflitos, { onConflict: "slug" });
    if (c.error) throw new Error(`gravação em conflitos: ${c.error.message}`);
    // Versão candidata é revisada todo mês: atualiza em vez de ignorar.
    for (let i = 0; i < eventos.length; i += 500) {
      const r = await db.from("eventos").upsert(eventos.slice(i, i + 500), { onConflict: "hash" });
      if (r.error) throw new Error(`gravação em eventos: ${r.error.message}`);
    }
  }

  return {
    resultado: { itensNovos: eventos.length, itensIgnorados: ignorados, caracteresTraduzidos: 0, motores: {}, erro: null },
    eventos,
    stats,
  };
}
