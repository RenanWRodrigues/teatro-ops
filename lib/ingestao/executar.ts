// Executa as fontes de um job (ou uma fonte específica) e registra cada execução.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { configFontes } from "@/lib/fontes/_base/config";
import { limparErro, registrarExecucao } from "@/lib/fontes/_base/execucao";
import type { AdaptadorFonte, NoticiaNormalizada, ResultadoExecucao } from "@/lib/fontes/_base/tipos";
import { criarAdaptadorGdelt } from "@/lib/fontes/gdelt-doc";
import { lerListaArsenal, montarEquipamento } from "@/lib/arsenal/cadastro";
import { gravarEquipamento } from "@/lib/arsenal/gravar";
import { criarClienteCommons } from "@/lib/fontes/commons";
import { criarAdaptadorFr } from "@/lib/fontes/fr-eua";
import { criarClienteWikidata } from "@/lib/fontes/wikidata";
import { criarClienteWikipedia } from "@/lib/fontes/wikipedia";
import { criarAdaptadorGkg } from "@/lib/fontes/gdelt-gkg";
import { criarAdaptadorRss } from "@/lib/fontes/rss";
import { criarAdaptadorXinhua } from "@/lib/fontes/xinhua";
import { lerRegistroFontes, type FonteYaml } from "@/lib/fontes/registro";
import type { DecisaoNormalizada } from "@/lib/governos/tipos";
import { paraModoSeco, traduzirLote, type DependenciasTraducao, type ItemTraducao } from "@/lib/traducao/traduzir";
import { processarUcdp } from "./eventos";
import { calcularDesde, ultimoSucesso } from "./janela";
import { processarDecisoes, retraduzirDecisoesPendentes } from "./governos";
import { processarNoticias, retraduzirPendentes, type LinhaNoticia } from "./noticias";

export const JOBS = ["noticias", "governos", "eventos", "arsenal", "manutencao"] as const;
export type Job = (typeof JOBS)[number];

/** Janela padrão de cada job: um pouco maior que o intervalo do cron, para sobrepor (a deduplicação cuida do resto). */
export const JANELA_PADRAO_HORAS: Record<Job, number> = { noticias: 2, governos: 3, eventos: 48, arsenal: 24 * 8, manutencao: 24 };

/** Até quantas horas o job recupera quando o cron atrasa (lib/ingestao/janela.ts); `null` = janela fixa. */
export const TETO_RECUPERACAO_HORAS: Record<Job, number | null> = { noticias: 24, governos: 24, eventos: null, arsenal: null, manutencao: null };

type Contexto = { desde: Date; traducao: DependenciasTraducao; seco?: boolean; log: (m: string) => void };
/** `amostra`: linhas prontas para exibir no terminal (--amostra N). */
type Saida = { resultado: ResultadoExecucao; linhas: LinhaNoticia[]; amostra: string[] };
type Processador = (db: SupabaseClient, fonte: FonteYaml, ctx: Contexto) => Promise<Saida>;

/** Notícias: coleta pelo adaptador e aproveita para traduzir títulos que ficaram pendentes antes. */
const noticias =
  (fabrica: (c: FonteYaml) => AdaptadorFonte<unknown, NoticiaNormalizada>): Processador =>
  async (db, fonte, ctx) => {
    const r = await processarNoticias(db, fabrica(fonte), ctx.desde, ctx.traducao, { seco: ctx.seco, log: ctx.log });
    const re = await retraduzirPendentes(db, ctx.traducao, { seco: ctx.seco });
    if (re.traduzidos > 0) ctx.log(`[${fonte.id}] ${re.traduzidos} título(s) pendente(s) traduzido(s) agora`);
    r.resultado.caracteresTraduzidos += re.caracteresDeepL;
    const amostra = r.linhas.map((l) => `[${l.regiao ?? "—"}] ${l.titulo_pt ?? `(tradução pendente) ${l.titulo_original}`}  — ${new URL(l.url).hostname}`);
    return { ...r, amostra };
  };

/** Governos: coleta, filtra por relevância e retraduz títulos de decisões pendentes. */
const governos =
  (fabrica: (c: FonteYaml) => AdaptadorFonte<unknown, DecisaoNormalizada>): Processador =>
  async (db, fonte, ctx) => {
    const r = await processarDecisoes(db, fabrica(fonte), ctx.desde, ctx.traducao, { seco: ctx.seco, log: ctx.log });
    const re = await retraduzirDecisoesPendentes(db, ctx.traducao, { seco: ctx.seco });
    if (re.traduzidos > 0) ctx.log(`[${fonte.id}] ${re.traduzidos} título(s) pendente(s) traduzido(s) agora`);
    r.resultado.caracteresTraduzidos += re.caracteresDeepL;
    const amostra = r.linhas.map((l) => `[${l.tipo}] ${l.titulo_pt ?? `(tradução pendente) ${l.titulo_original}`}  — ${l.orgao}`);
    return { resultado: r.resultado, linhas: [], amostra };
  };

const ehRss = (f: FonteYaml) => f.tipo === "rss" && !!f.feed;

/** Processadores implementados. Fontes do YAML sem processador aqui são puladas com aviso. */
export const PROCESSADORES: Record<string, Processador> = {
  "gdelt-doc": noticias((c) => criarAdaptadorGdelt(c) as AdaptadorFonte<unknown, NoticiaNormalizada>),
  "gdelt-gkg": noticias((c) => criarAdaptadorGkg(c) as AdaptadorFonte<unknown, NoticiaNormalizada>),
  "ucdp-candidato": async (db, fonte, ctx) => {
    const r = await processarUcdp(db, fonte, { seco: ctx.seco, log: ctx.log });
    const alta = r.stats.filter((s) => s.intensidade === "alta").length;
    const tensao = r.stats.filter((s) => s.intensidade === "tensao").length;
    ctx.log(`[${fonte.id}] conflitos: ${alta} alta intensidade · ${tensao} tensão · período ${r.stats[0]?.periodoInicio} a ${r.stats[0]?.periodoFim}`);
    return { resultado: r.resultado, linhas: [], amostra: [] };
  },
  // Arsenal (semanal): atualiza todas as fichas de config/arsenal.yaml. Wikipedia e Commons são lidas na mesma rotina.
  wikidata: async (db, fonte, ctx) => {
    const lista = lerListaArsenal(readFileSync(path.join(process.cwd(), "config/arsenal.yaml"), "utf8"));
    const deps = {
      wikidata: criarClienteWikidata({ limite: fonte.limite }),
      wikipedia: criarClienteWikipedia(),
      commons: criarClienteCommons(),
      traduzir: (itens: ItemTraducao[]) => traduzirLote(itens, ctx.traducao),
    };
    const r: ResultadoExecucao = { itensNovos: 0, itensIgnorados: 0, caracteresTraduzidos: 0, motores: {}, erro: null };
    const amostra: string[] = [];
    const erros: string[] = [];
    for (const e of lista) {
      try {
        const { linha, midias, relatorio } = await montarEquipamento(e, deps);
        if (!ctx.seco) await gravarEquipamento(db, linha, midias);
        r.itensNovos++;
        r.caracteresTraduzidos += relatorio.caracteresDeepL;
        amostra.push(`${linha.nome}: ${Object.keys(linha.specs).length} campos, ${midias.length} foto(s); vazios: ${relatorio.vazios.join(", ") || "nenhum"}`);
      } catch (err) {
        r.itensIgnorados++;
        erros.push(`${e.slug}: ${limparErro(err)}`);
      }
    }
    if (erros.length) r.erro = erros.join(" | ").slice(0, 1000);
    ctx.log(`[${fonte.id}] ${r.itensNovos} ficha(s) atualizada(s), ${r.itensIgnorados} com erro`);
    return { resultado: r, linhas: [], amostra };
  },
  // Lidas pelo processador "wikidata"; a execução própria só registra que não há coleta separada.
  "wikipedia-pt": async () => ({ resultado: { itensNovos: 0, itensIgnorados: 0, caracteresTraduzidos: 0, motores: {}, erro: null }, linhas: [], amostra: ["coletada junto com o Wikidata"] }),
  commons: async () => ({ resultado: { itensNovos: 0, itensIgnorados: 0, caracteresTraduzidos: 0, motores: {}, erro: null }, linhas: [], amostra: ["coletada junto com o Wikidata"] }),
  "fr-eua": governos((c) => criarAdaptadorFr(c)),
  xinhua: governos((c) => criarAdaptadorXinhua(c) as AdaptadorFonte<unknown, DecisaoNormalizada>),
};

/** Processador de uma fonte: o registrado pelo id ou, para feeds RSS de governos, o adaptador genérico. */
export function processadorDe(fonte: FonteYaml): Processador | undefined {
  return PROCESSADORES[fonte.id] ?? (fonte.job === "governos" && ehRss(fonte) ? governos((c) => criarAdaptadorRss(c) as AdaptadorFonte<unknown, DecisaoNormalizada>) : undefined);
}

export type ExecucaoFonte = { fonteId: string; resultado: ResultadoExecucao; linhas: LinhaNoticia[]; amostra: string[] };

export type OpcoesExecucao = {
  job?: Job | "todos";
  fonte?: string;
  horas?: number;
  seco?: boolean;
  /** Com `seco`, chama o DeepL mesmo assim (gasta cota; o resultado não vai para o cache). */
  traduzirNoSeco?: boolean;
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

  // fonte_id referencia `fontes`: garante a linha (e o status) de cada fonte a rodar, a partir do YAML.
  if (!opcoes.seco && fontes.length > 0) await sincronizarFontes(db, fontes.map((f) => f.id));

  const saidas: ExecucaoFonte[] = [];
  for (const fonte of fontes) {
    const processar = processadorDe(fonte);
    if (!processar) {
      log(`[ingestao] ${fonte.id}: adaptador ainda não implementado — pulando.`);
      continue;
    }
    const job = (fonte.job ?? opcoes.job ?? "noticias") as Job;
    const inicio = new Date();
    let saida: ExecucaoFonte;
    try {
      // --horas explícito vale como está; sem ele, a janela recupera o que o cron atrasado deixou passar.
      const tetoHoras = opcoes.horas !== undefined ? null : (TETO_RECUPERACAO_HORAS[job] ?? null);
      const desde = calcularDesde({
        agora: inicio,
        padraoHoras: opcoes.horas ?? JANELA_PADRAO_HORAS[job] ?? 2,
        tetoHoras,
        ultimoSucesso: tetoHoras === null ? null : await ultimoSucesso(db, fonte.id),
      });
      log(`[${fonte.id}] janela: desde ${desde.toISOString()} (${((inicio.getTime() - desde.getTime()) / 3_600_000).toFixed(1)} h)`);
      const traducaoDaExecucao = opcoes.seco && !opcoes.traduzirNoSeco ? paraModoSeco(traducao) : traducao;
      const r = await processar(db, fonte, { desde, traducao: traducaoDaExecucao, seco: opcoes.seco, log });
      saida = { fonteId: fonte.id, ...r };
    } catch (e) {
      const erro = limparErro(e);
      log(`[ingestao] ${fonte.id}: ERRO — ${erro}`);
      saida = { fonteId: fonte.id, linhas: [], amostra: [], resultado: { itensNovos: 0, itensIgnorados: 0, caracteresTraduzidos: 0, motores: {}, erro } };
    }
    if (!opcoes.seco) await registrarExecucao(db, job, fonte.id, inicio, saida.resultado);
    saidas.push(saida);
  }
  return saidas;
}

/** Upsert das linhas de `fontes` a partir de config/fontes.yaml (o YAML é a fonte da verdade). */
async function sincronizarFontes(db: SupabaseClient, ids: string[]): Promise<void> {
  const { fontes } = lerRegistroFontes(readFileSync(path.join(process.cwd(), "config/fontes.yaml"), "utf8"));
  const linhas = fontes.filter((f) => ids.includes(f.id));
  if (linhas.length === 0) return;
  const { error } = await db.from("fontes").upsert(linhas, { onConflict: "id" });
  if (error) throw new Error(`sincronização de fontes: ${error.message}`);
}
