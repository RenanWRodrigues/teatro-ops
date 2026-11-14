// Executa as fontes de um job (ou uma fonte específica) e registra cada execução.
import type { SupabaseClient } from "@supabase/supabase-js";
import { configFontes } from "@/lib/fontes/_base/config";
import { limparErro, registrarExecucao } from "@/lib/fontes/_base/execucao";
import type { AdaptadorFonte, NoticiaNormalizada, ResultadoExecucao } from "@/lib/fontes/_base/tipos";
import { criarAdaptadorGdelt } from "@/lib/fontes/gdelt-doc";
import type { FonteYaml } from "@/lib/fontes/registro";
import type { DependenciasTraducao } from "@/lib/traducao/traduzir";
import { processarNoticias, retraduzirPendentes, type LinhaNoticia } from "./noticias";

export const JOBS = ["noticias", "governos", "eventos", "arsenal", "manutencao"] as const;
export type Job = (typeof JOBS)[number];

/** Janela padrão de cada job: um pouco maior que o intervalo do cron, para sobrepor (a deduplicação cuida do resto). */
export const JANELA_PADRAO_HORAS: Record<Job, number> = { noticias: 2, governos: 3, eventos: 48, arsenal: 24 * 8, manutencao: 24 };

type FabricaNoticias = (config: FonteYaml) => AdaptadorFonte<unknown, NoticiaNormalizada>;

/** Adaptadores implementados. Fontes do YAML sem adaptador aqui são puladas com aviso. */
export const ADAPTADORES_NOTICIAS: Record<string, FabricaNoticias> = {
  "gdelt-doc": (c) => criarAdaptadorGdelt(c) as AdaptadorFonte<unknown, NoticiaNormalizada>,
};

export type ExecucaoFonte = { fonteId: string; resultado: ResultadoExecucao; linhas: LinhaNoticia[] };

export type OpcoesExecucao = {
  job?: Job | "todos";
  fonte?: string;
  horas?: number;
  seco?: boolean;
  log?: (m: string) => void;
};

/** Escolhe as fontes: `fonte` explícita (qualquer status) ou as ativas do job. */
export function selecionarFontes(config: Map<string, FonteYaml>, opcoes: Pick<OpcoesExecucao, "job" | "fonte">): FonteYaml[] {
  if (opcoes.fonte) {
    const f = config.get(opcoes.fonte);
    if (!f) throw new Error(`Fonte "${opcoes.fonte}" não está em config/fontes.yaml`);
    return [f];
  }
  return [...config.values()].filter((f) => f.status === "ativa" && (opcoes.job === "todos" || f.job === opcoes.job));
}

export async function executarIngestao(
  db: SupabaseClient,
  traducao: DependenciasTraducao,
  opcoes: OpcoesExecucao,
): Promise<ExecucaoFonte[]> {
  const log = opcoes.log ?? console.log;
  const fontes = selecionarFontes(configFontes(), opcoes);
  if (fontes.length === 0) log(`[ingestao] nenhuma fonte ativa para o job "${opcoes.job}".`);

  const saidas: ExecucaoFonte[] = [];
  for (const fonte of fontes) {
    const fabrica = ADAPTADORES_NOTICIAS[fonte.id];
    if (!fabrica) {
      log(`[ingestao] ${fonte.id}: adaptador ainda não implementado — pulando.`);
      continue;
    }
    const job = (fonte.job ?? opcoes.job ?? "noticias") as Job;
    const horas = opcoes.horas ?? JANELA_PADRAO_HORAS[job] ?? 2;
    const desde = new Date(Date.now() - horas * 3_600_000);
    const inicio = new Date();
    let saida: ExecucaoFonte;
    try {
      const r = await processarNoticias(db, fabrica(fonte), desde, traducao, { seco: opcoes.seco, log });
      // Aproveita a execução para traduzir títulos que ficaram pendentes em coletas anteriores.
      const re = await retraduzirPendentes(db, traducao, { seco: opcoes.seco });
      if (re.traduzidos > 0) log(`[${fonte.id}] ${re.traduzidos} título(s) pendente(s) traduzido(s) agora`);
      r.resultado.caracteresTraduzidos += re.caracteresDeepL;
      saida = { fonteId: fonte.id, ...r };
    } catch (e) {
      const erro = limparErro(e);
      log(`[ingestao] ${fonte.id}: ERRO — ${erro}`);
      saida = {
        fonteId: fonte.id,
        linhas: [],
        resultado: { itensNovos: 0, itensIgnorados: 0, caracteresTraduzidos: 0, motores: {}, erro },
      };
    }
    if (!opcoes.seco) await registrarExecucao(db, job, fonte.id, inicio, saida.resultado);
    saidas.push(saida);
  }
  return saidas;
}
