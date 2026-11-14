// Dados das páginas: banco primeiro, fixtures [EXEMPLO] como reserva (banco sem configuração, com erro ou vazio).
// Revalidação conforme docs/ARQUITETURA.md. Nunca chama APIs externas: só o Supabase.
import { cacheLife, cacheTag } from "next/cache";
import {
  buscarEquipamentoBanco,
  listarConflitos,
  listarEquipamentos,
  listarManchetes,
  listarNoticiasPorTema,
  ultimaAtualizacao,
} from "@/lib/db/consultas";
import { paraConflito, paraEquipamento, paraManchete } from "@/lib/db/esquemas";
import { buscarEquipamento as buscarEquipamentoExemplo, EQUIPAMENTOS_EXEMPLO } from "@/lib/fixtures/equipamentos";
import { CONFLITOS_EXEMPLO, MANCHETES_EXEMPLO, MONITOR_EXEMPLO } from "@/lib/fixtures/home";
import type { Conflito, Equipamento, Fonte, Manchete } from "@/lib/tipos";

/** `exemplo: true` quando os dados vieram das fixtures; a página então exibe o AvisoExemplo. */
export type ComOrigem<T> = { dados: T; exemplo: boolean };

const QUINZE_MINUTOS = { stale: 300, revalidate: 900, expire: 86_400 };

export async function obterEquipamentos(): Promise<ComOrigem<Equipamento[]>> {
  "use cache";
  cacheLife("days");
  cacheTag("equipamentos");
  const r = await listarEquipamentos();
  if (r.ok && r.dados.length > 0) return { dados: r.dados.map((l) => paraEquipamento(l)), exemplo: false };
  return { dados: EQUIPAMENTOS_EXEMPLO, exemplo: true };
}

/** `dados: null` → 404. Com o banco preenchido, nunca cai para a fixture (evita misturar real e exemplo). */
export async function obterEquipamento(categoria: string, slug: string): Promise<ComOrigem<Equipamento | null>> {
  "use cache";
  cacheLife("days");
  cacheTag("equipamentos", `equipamento:${slug}`);
  const lista = await obterEquipamentos();
  if (lista.exemplo) return { dados: buscarEquipamentoExemplo(categoria, slug) ?? null, exemplo: true };
  const r = await buscarEquipamentoBanco(categoria, slug);
  if (!r.ok) {
    // O catálogo veio do banco, mas a ficha falhou agora: melhor a versão da lista do que um erro cru.
    const daLista = lista.dados.find((e) => e.categoria === categoria && e.slug === slug) ?? null;
    return { dados: daLista, exemplo: false };
  }
  return { dados: r.dados ? paraEquipamento(r.dados.linha, r.dados.midias) : null, exemplo: false };
}

export async function obterConflitosEmFoco(limite = 4): Promise<ComOrigem<Conflito[]>> {
  "use cache";
  cacheLife("hours");
  cacheTag("conflitos");
  const r = await listarConflitos();
  const ativos = r.ok ? r.dados.flatMap((l) => paraConflito(l) ?? []) : [];
  if (ativos.length > 0) {
    // Alta intensidade primeiro, depois tensão e cessar-fogo.
    const ordem = { alta: 0, tensao: 1, "cessar-fogo": 2 } as const;
    return { dados: ativos.sort((a, b) => ordem[a.intensidade] - ordem[b.intensidade]).slice(0, limite), exemplo: false };
  }
  return { dados: CONFLITOS_EXEMPLO, exemplo: true };
}

export async function obterManchetes(limite = 10): Promise<ComOrigem<Manchete[]>> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("noticias");
  const r = await listarManchetes(limite);
  if (r.ok && r.dados.length > 0) return { dados: r.dados.map(paraManchete), exemplo: false };
  return { dados: MANCHETES_EXEMPLO, exemplo: true };
}

export type NoticiaConflito = Manchete & { resumo: string | null };

/** Últimas notícias com o tema "conflitos" (GDELT). Lista vazia = sem dados; a home mostra os placeholders. */
export async function obterNoticiasConflito(limite = 4): Promise<NoticiaConflito[]> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("noticias");
  const r = await listarNoticiasPorTema("conflitos", limite);
  return r.ok ? r.dados.map((l) => ({ ...paraManchete(l), resumo: l.resumo_pt })) : [];
}

export type Monitor = {
  altaIntensidade: number | null;
  emMonitoramento: number | null;
  atualizadoEm: string | null;
  fonte: Fonte | null;
};

/** Contadores do painel radar a partir da classificação editorial dos conflitos. */
export async function obterMonitor(): Promise<ComOrigem<Monitor>> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("conflitos", "execucoes");
  const [conflitos, atualizacao] = await Promise.all([listarConflitos(), ultimaAtualizacao(["noticias", "eventos"])]);
  const ativos = conflitos.ok ? conflitos.dados.flatMap((l) => paraConflito(l) ?? []) : [];
  const atualizadoEm = atualizacao.ok ? atualizacao.dados : null;
  // Sem conflitos curados ainda (Fase 5): contadores ficam "—", mas o horário da última coleta é real.
  if (ativos.length === 0) return { dados: { ...MONITOR_EXEMPLO, atualizadoEm, fonte: null }, exemplo: true };
  return {
    dados: {
      altaIntensidade: ativos.filter((c) => c.intensidade === "alta").length,
      emMonitoramento: ativos.filter((c) => c.intensidade !== "alta").length,
      atualizadoEm,
      // A classificação de intensidade é editorial; a metodologia fica em /metodologia (Fase 9).
      fonte: { nome: "classificação editorial TEATRO//OPS", url: null },
    },
    exemplo: false,
  };
}
