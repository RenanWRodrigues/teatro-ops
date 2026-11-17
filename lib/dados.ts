// Dados das páginas: banco primeiro, fixtures [EXEMPLO] como reserva (banco sem configuração, com erro ou vazio).
// Revalidação conforme docs/ARQUITETURA.md. Nunca chama APIs externas: só o Supabase.
import { readFileSync } from "node:fs";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import {
  buscarEquipamentoBanco,
  buscarGlobal,
  listarConflitos,
  listarCoberturaMidia,
  listarDecisoes,
  listarEquipamentos,
  listarEventosAgregados,
  listarEventosPublicos,
  listarManchetes,
  listarMidias,
  listarNoticiasPorTermos,
  listarNoticiasPorPaises,
  listarNoticiasPorTema,
  listarNoticiasPorTemasETermos,
  listarSemanas,
  listarTemasNoticias,
  ultimaAtualizacao,
} from "@/lib/db/consultas";
import type { ResultadoBusca } from "@/lib/db/esquemas";
import { paraConflito, paraConflitoDetalhe, paraDecisao, paraEquipamento, paraEventoPublico, paraManchete, type LinhaMidia } from "@/lib/db/esquemas";
import { lerListaArsenal } from "@/lib/arsenal/cadastro";
import { classificar } from "@/lib/fontes/gdelt-doc/classificacao";
import { lerEntradasFontes } from "@/lib/fontes/registro";
import { lerCuradoria } from "@/lib/fontes/ucdp-candidato/curadoria";
import { contextoVisivel, lerContexto } from "@/lib/conflitos/contexto";
import { lerSeriesUcdp, type SeriesArquivo } from "@/lib/arquivo/series";
import { TATICAS, type TipoDiagrama } from "@/lib/taticas/taticas";
import { lerDossie, type Dossie } from "@/lib/tecnologia/dossie";
import { lerHumanoNoCircuito, type HumanoNoCircuito } from "@/lib/tecnologia/humano-no-circuito";
import { lerLinhaDoTempo, type LinhaDoTempoComFontes } from "@/lib/tecnologia/linha-do-tempo";
import { FILTROS_TOPICO, type IdTopico } from "@/lib/tecnologia/topicos";
import { agregarVolumeSemanal, TEMAS_VOLUME, type VolumeSemanal } from "@/lib/tecnologia/volume";
import { buscarEquipamento as buscarEquipamentoExemplo, EQUIPAMENTOS_EXEMPLO } from "@/lib/fixtures/equipamentos";
import { CONFLITOS_EXEMPLO, MANCHETES_EXEMPLO, MONITOR_EXEMPLO } from "@/lib/fixtures/home";
import type { Conflito, ConflitoDetalhe, Decisao, Equipamento, EventoPublico, FeedTopico, Fonte, Manchete, PontoMapa, SemanaEventos } from "@/lib/tipos";

/** `exemplo: true` quando os dados vieram das fixtures; a página então exibe o AvisoExemplo. */
export type ComOrigem<T> = { dados: T; exemplo: boolean };

const QUINZE_MINUTOS = { stale: 300, revalidate: 900, expire: 86_400 };

/**
 * Perfil da reserva: banco sem configuração, com erro ou vazio. Chamado no caminho de reserva
 * de cada função com "use cache" — quando cacheLife é chamado duas vezes, vale o menor tempo.
 * Sem isso, uma falha no build deixava as fixtures [EXEMPLO] no ar por dias (17/11/2026).
 * `expire` ≥ 5 min para não virar buraco dinâmico no prerender (docs do cacheLife no Next 16).
 */
const RESERVA = { stale: 60, revalidate: 300, expire: 3_600 };
const cacheReserva = () => cacheLife(RESERVA);

export async function obterEquipamentos(): Promise<ComOrigem<Equipamento[]>> {
  "use cache";
  cacheLife("days");
  cacheTag("equipamentos");
  const [r, m] = await Promise.all([listarEquipamentos(), listarMidias()]);
  // Fichas sem fotos (consulta das mídias falhou) também se corrigem em minutos.
  if (!m.ok) cacheReserva();
  if (r.ok && r.dados.length > 0) {
    // Só a 1ª foto de cada equipamento vai para o card (capa); a galeria completa fica na ficha.
    const capas = new Map<string, LinhaMidia>();
    for (const midia of m.ok ? m.dados : []) if (midia.equipamento_slug && !capas.has(midia.equipamento_slug)) capas.set(midia.equipamento_slug, midia);
    return { dados: r.dados.map((l) => paraEquipamento(l, capas.has(l.slug) ? [capas.get(l.slug)!] : [])), exemplo: false };
  }
  cacheReserva();
  return { dados: EQUIPAMENTOS_EXEMPLO, exemplo: true };
}

/** `dados: null` → 404. Com o banco preenchido, nunca cai para a fixture (evita misturar real e exemplo). */
export async function obterEquipamento(categoria: string, slug: string): Promise<ComOrigem<Equipamento | null>> {
  "use cache";
  cacheLife("days");
  cacheTag("equipamentos", `equipamento:${slug}`);
  const lista = await obterEquipamentos();
  if (lista.exemplo) {
    cacheReserva();
    return { dados: buscarEquipamentoExemplo(categoria, slug) ?? null, exemplo: true };
  }
  const r = await buscarEquipamentoBanco(categoria, slug);
  if (!r.ok) {
    cacheReserva();
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
  cacheReserva();
  return { dados: CONFLITOS_EXEMPLO, exemplo: true };
}

export async function obterManchetes(limite = 10): Promise<ComOrigem<Manchete[]>> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("noticias");
  const r = await listarManchetes(limite);
  if (r.ok && r.dados.length > 0) return { dados: r.dados.map(paraManchete), exemplo: false };
  cacheReserva();
  return { dados: MANCHETES_EXEMPLO, exemplo: true };
}

export type NoticiaConflito = Manchete & { resumo: string | null };

/** Últimas notícias com o tema "conflitos" (GDELT). Lista vazia = sem dados; a home mostra os placeholders. */
export async function obterNoticiasConflito(limite = 4): Promise<NoticiaConflito[]> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("noticias");
  const r = await listarNoticiasPorTema("conflitos", limite);
  if (!r.ok) cacheReserva();
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
  if (!conflitos.ok || !atualizacao.ok) cacheReserva();
  if (ativos.length === 0) {
    cacheReserva();
    return { dados: { ...MONITOR_EXEMPLO, atualizadoEm, fonte: null }, exemplo: true };
  }
  return {
    dados: {
      altaIntensidade: ativos.filter((c) => c.intensidade === "alta").length,
      emMonitoramento: ativos.filter((c) => c.intensidade !== "alta").length,
      atualizadoEm,
      // Números do UCDP; a regra de intensidade está descrita em /conflitos ("Como classificamos").
      fonte: (() => {
        const f = conflitos.ok ? conflitos.dados[0]?.fontes[0] : undefined;
        return f ? { ...f, nome: `${f.nome}, classificação do TEATRO//OPS` } : { nome: "classificação TEATRO//OPS", url: null };
      })(),
    },
    exemplo: false,
  };
}

// ───────────────────────────── Conflitos (Fase 5) ─────────────────────────────

/** Curadoria aprovada (config/conflitos.yaml), usada enquanto a coleta do UCDP não gravou números. */
function curadoriaSemDados(): ConflitoDetalhe[] {
  const yaml = readFileSync(path.join(process.cwd(), "config/conflitos.yaml"), "utf8");
  return lerCuradoria(yaml).map((c) => ({
    slug: c.slug,
    nome: c.nome,
    regiao: c.regiao,
    paises: c.paises,
    intensidade: null,
    resumo: null,
    fontes: [],
    periodoInicio: null,
    periodoFim: null,
    eventos: 0,
    mortes: 0,
    mortesMin: 0,
    mortesMax: 0,
    semDados: true,
  }));
}

/** Todos os conflitos curados, com os números do período (mais mortes estimadas primeiro). */
export async function obterConflitos(): Promise<ConflitoDetalhe[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("conflitos");
  const r = await listarConflitos();
  if (r.ok && r.dados.length > 0) return r.dados.map(paraConflitoDetalhe);
  cacheReserva();
  return curadoriaSemDados();
}

export async function obterConflito(slug: string): Promise<ConflitoDetalhe | null> {
  const todos = await obterConflitos();
  return todos.find((c) => c.slug === slug) ?? null;
}

export type CamadasMapa = { eventos: PontoMapa[]; cobertura: PontoMapa[] };

const fmtMapa = new Intl.NumberFormat("pt-BR", { useGrouping: "always" });

/** Camadas agregadas do mapa: eventos (UCDP, 3 meses, grade de 1°) e cobertura de mídia (GDELT, 7 dias). */
export async function obterCamadasMapa(slug?: string): Promise<CamadasMapa> {
  "use cache";
  cacheLife("hours");
  cacheTag("eventos", "noticias");
  const [ev, cob] = await Promise.all([listarEventosAgregados(), listarCoberturaMidia()]);
  if (!ev.ok || !cob.ok) cacheReserva();
  // Uma célula pode ter eventos de mais de um conflito: soma por célula.
  const celulas = new Map<string, { lat: number; lon: number; eventos: number; mortes: number }>();
  for (const e of ev.ok ? ev.dados : []) {
    if (slug && e.conflito_slug !== slug) continue;
    const k = `${e.lat},${e.lon}`;
    const c = celulas.get(k) ?? { lat: e.lat, lon: e.lon, eventos: 0, mortes: 0 };
    c.eventos += e.eventos;
    c.mortes += e.mortes_estimadas;
    celulas.set(k, c);
  }
  return {
    eventos: [...celulas.values()].map((c) => ({
      lat: c.lat,
      lon: c.lon,
      valor: c.eventos,
      rotulo: `${fmtMapa.format(c.eventos)} eventos · cerca de ${fmtMapa.format(c.mortes)} mortes estimadas`,
    })),
    cobertura: slug
      ? []
      : (cob.ok ? cob.dados : []).map((c) => ({
          lat: c.lat,
          lon: c.lon,
          valor: c.noticias,
          rotulo: `${fmtMapa.format(c.noticias)} ${c.noticias === 1 ? "notícia" : "notícias"} em 7 dias`,
        })),
  };
}

export type DetalheConflito = {
  semanas: SemanaEventos[];
  eventosRecentes: EventoPublico[];
  noticias: NoticiaConflito[];
  atualizadoEm: string | null;
};

export async function obterDetalheConflito(slug: string, paises: string[]): Promise<DetalheConflito> {
  "use cache";
  cacheLife("hours");
  cacheTag("eventos", "noticias", `conflito:${slug}`);
  const [semanas, eventos, noticias, atualizacao] = await Promise.all([
    listarSemanas(slug),
    listarEventosPublicos({ conflito: slug, limite: 15 }),
    listarNoticiasPorPaises(paises, 6),
    ultimaAtualizacao(["eventos", "noticias"]),
  ]);
  if (!semanas.ok || !eventos.ok || !noticias.ok || !atualizacao.ok) cacheReserva();
  return {
    semanas: semanas.ok ? semanas.dados.map((s) => ({ semana: s.semana, eventos: s.eventos, mortes: s.mortes_estimadas })) : [],
    eventosRecentes: eventos.ok ? eventos.dados.map(paraEventoPublico) : [],
    noticias: noticias.ok ? noticias.dados.map((l) => ({ ...paraManchete(l), resumo: l.resumo_pt })) : [],
    atualizadoEm: atualizacao.ok ? atualizacao.dados : null,
  };
}

/** Carimbo da página de conflitos: última coleta de eventos ou notícias. */
export async function obterAtualizacaoConflitos(): Promise<string | null> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("execucoes");
  const r = await ultimaAtualizacao(["eventos", "noticias"]);
  if (!r.ok) cacheReserva();
  return r.ok ? r.dados : null;
}

// ───────────────────────────── Governos (Fase 6) ─────────────────────────────

/** Janela das páginas de governos: 90 dias (linha do tempo, filtros e comparação por semana). */
export const DIAS_GOVERNOS = 90;

/** Todas as decisões dos últimos 90 dias (todos os países), mais recentes primeiro. */
export async function obterDecisoes(): Promise<Decisao[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("decisoes");
  const desde = new Date(Date.now() - DIAS_GOVERNOS * 86_400_000).toISOString();
  const r = await listarDecisoes({ desde, limite: 1000 });
  if (!r.ok) cacheReserva();
  return r.ok ? r.dados.map(paraDecisao) : [];
}

export type StatusFonteGoverno = "coletando" | "em_verificacao" | "sem_acesso";

export type FonteGoverno = {
  id: string;
  nome: string;
  pais: string;
  pagina: string | null;
  estatal: boolean;
  status: StatusFonteGoverno;
};

/** Canais oficiais monitorados por país, do registro config/fontes.yaml (inclusive os sem acesso automático). */
export function fontesDeGoverno(): FonteGoverno[] {
  const yaml = readFileSync(path.join(process.cwd(), "config/fontes.yaml"), "utf8");
  return [...lerEntradasFontes(yaml).values()]
    .filter((f) => f.job === "governos" && f.pais)
    .map((f) => ({
      id: f.id,
      nome: f.nome.replace(/\s*\(mídia estatal\)\s*$/i, ""),
      pais: f.pais!,
      pagina: f.pagina ?? f.url ?? null, // `pagina` é a página para pessoas; `url` pode ser o endpoint da API
      estatal: f.categoria === "estatal",
      status: f.status === "ativa" ? "coletando" : f.status === "a_verificar" ? "em_verificacao" : "sem_acesso",
    }));
}

/** Carimbo das páginas de governos: última coleta sem erro do job "governos". */
export async function obterAtualizacaoGovernos(): Promise<string | null> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("execucoes");
  const r = await ultimaAtualizacao(["governos"]);
  if (!r.ok) cacheReserva();
  return r.ok ? r.dados : null;
}

/** Decisões que citam no título algum dos países do conflito (página /conflitos/[slug]). */
export async function obterDecisoesRelacionadas(paises: string[], limite = 6): Promise<Decisao[]> {
  const alvo = new Set(paises);
  const todas = await obterDecisoes();
  return todas.filter((d) => classificar(d.titulo).paises.some((p) => alvo.has(p))).slice(0, limite);
}

// ───────────────────────────── Tecnologia (Fase 8) ─────────────────────────────

/** Notícias recentes de cada aba de /tecnologia. Banco indisponível = listas vazias (a aba explica). */
export async function obterFeedsTecnologia(limite = 6): Promise<Record<IdTopico, FeedTopico>> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("noticias");
  const ids = Object.keys(FILTROS_TOPICO) as IdTopico[];
  const resultados = await Promise.all(ids.map((id) => listarNoticiasPorTemasETermos(FILTROS_TOPICO[id], limite)));
  if (resultados.some((r) => !r.ok)) cacheReserva();
  return Object.fromEntries(
    ids.map((id, i) => {
      const r = resultados[i]!;
      const noticias = r.ok ? r.dados.map((l) => ({ ...paraManchete(l), resumo: l.resumo_pt })) : [];
      return [id, { criterio: FILTROS_TOPICO[id].criterio, noticias }];
    }),
  ) as Record<IdTopico, FeedTopico>;
}

/**
 * Textos explicativos das abas (content/tecnologia/<id>.mdx), na ordem de FILTROS_TOPICO.
 * Só entram os aprovados (`status: publicado`); arquivo ausente ou rascunho = aba sem texto.
 * Erro de formato quebra o build de propósito: texto com fonte faltando não pode ir ao ar.
 */
export function obterDossiesTecnologia(): Partial<Record<IdTopico, Dossie>> {
  const pasta = path.join(process.cwd(), "content/tecnologia");
  const dossies: Partial<Record<IdTopico, Dossie>> = {};
  for (const id of Object.keys(FILTROS_TOPICO) as IdTopico[]) {
    const arquivo = path.join(pasta, `${id}.mdx`);
    let conteudo: string;
    try {
      conteudo = readFileSync(arquivo, "utf8");
    } catch {
      continue;
    }
    const d = lerDossie(conteudo, `content/tecnologia/${id}.mdx`);
    if (d.id !== id) throw new Error(`content/tecnologia/${id}.mdx: id "${d.id}" difere do nome do arquivo`);
    if (d.status === "publicado") dossies[id] = d;
  }
  return dossies;
}

/** Linha do tempo dos drones; `null` enquanto o arquivo estiver em rascunho (a seção some da página). */
export function obterLinhaDoTempoDrones(): LinhaDoTempoComFontes | null {
  const arquivo = "content/tecnologia/linha-do-tempo.yaml";
  const linha = lerLinhaDoTempo(readFileSync(path.join(process.cwd(), arquivo), "utf8"), arquivo);
  return linha.status === "publicado" ? linha : null;
}

/** "Humano no circuito?" aprovado; `null` enquanto em rascunho (a seção some da página). */
export function obterHumanoNoCircuito(): HumanoNoCircuito | null {
  const arquivo = "content/tecnologia/humano-no-circuito.yaml";
  const dados = lerHumanoNoCircuito(readFileSync(path.join(process.cwd(), arquivo), "utf8"), arquivo);
  return dados.status === "publicado" ? dados : null;
}

/**
 * Notícias por semana e tema nas últimas 12 semanas (contagem da tabela `noticias`).
 * `null` = banco indisponível (a página explica, sem gráfico vazio nem número inventado).
 */
export async function obterVolumeSemanalTecnologia(): Promise<VolumeSemanal | null> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("noticias");
  const agora = new Date();
  const desde = new Date(agora.getTime() - 12 * 7 * 86_400_000).toISOString();
  const r = await listarTemasNoticias(
    TEMAS_VOLUME.map((t) => t.tema),
    desde,
  );
  if (!r.ok) cacheReserva();
  return r.ok ? agregarVolumeSemanal(r.dados, agora) : null;
}

// ───────────────────────────── Arquivo (Fase 9) ─────────────────────────────

/** Séries anuais do UCDP (content/arquivo/ucdp-series.json). Arquivo inválido quebra o build de propósito. */
export function obterSeriesArquivo(): SeriesArquivo {
  return lerSeriesUcdp(JSON.parse(readFileSync(path.join(process.cwd(), "content/arquivo/ucdp-series.json"), "utf8")));
}

/** Linha do tempo histórica 1914 → hoje; `null` enquanto em rascunho. */
export function obterLinhaDoTempoArquivo(): LinhaDoTempoComFontes | null {
  const arquivo = "content/arquivo/linha-do-tempo.yaml";
  const linha = lerLinhaDoTempo(readFileSync(path.join(process.cwd(), arquivo), "utf8"), arquivo);
  return linha.status === "publicado" ? linha : null;
}

/** Texto de contexto do conflito (content/conflitos/<slug>.mdx); null se não existe ou ainda é rascunho em produção. */
export function obterContextoConflito(slug: string): Dossie | null {
  let conteudo: string;
  try {
    conteudo = readFileSync(path.join(process.cwd(), "content/conflitos", `${slug}.mdx`), "utf8");
  } catch {
    return null;
  }
  const d = lerContexto(conteudo, slug);
  return contextoVisivel(d) ? d : null;
}

// ───────────────────────────── Táticas (Fase 9) ─────────────────────────────

export type Tatica = Dossie & { diagrama: TipoDiagrama };

/** Táticas aprovadas (`status: publicado`) de content/taticas, na ordem de TATICAS. Erro de formato quebra o build. */
export function obterTaticas(): Tatica[] {
  const lista: Tatica[] = [];
  for (const { id, diagrama } of TATICAS) {
    let conteudo: string;
    try {
      conteudo = readFileSync(path.join(process.cwd(), "content/taticas", `${id}.mdx`), "utf8");
    } catch {
      continue;
    }
    const d = lerDossie(conteudo, `content/taticas/${id}.mdx`);
    if (d.id !== id) throw new Error(`content/taticas/${id}.mdx: id "${d.id}" difere do nome do arquivo`);
    if (d.status === "publicado") lista.push({ ...d, diagrama });
  }
  return lista;
}

export const obterTatica = (id: string): Tatica | null => obterTaticas().find((t) => t.id === id) ?? null;

/** Carimbo da última coleta de notícias (job `noticias`). */
export async function obterAtualizacaoNoticias(): Promise<string | null> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("execucoes");
  const r = await ultimaAtualizacao(["noticias"]);
  if (!r.ok) cacheReserva();
  return r.ok ? r.dados : null;
}

// ───────────────────────────── Arsenal (Fase 7) ─────────────────────────────

/** Notícias recentes cujo título cita o equipamento (termos de config/arsenal.yaml). */
export async function obterNoticiasEquipamento(slug: string, limite = 5): Promise<(Manchete & { resumo: string | null })[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("noticias", `equipamento:${slug}`);
  const lista = lerListaArsenal(readFileSync(path.join(process.cwd(), "config/arsenal.yaml"), "utf8"));
  const termos = lista.find((e) => e.slug === slug)?.termos ?? [];
  const r = await listarNoticiasPorTermos(termos, limite);
  if (!r.ok) cacheReserva();
  return r.ok ? r.dados.map((l) => ({ ...paraManchete(l), resumo: l.resumo_pt })) : [];
}

// ───────────────────────────── Busca (Fase 10) ─────────────────────────────

export type RespostaBusca =
  | { ok: true; resultados: ResultadoBusca[] }
  | { ok: false; motivo: "sem-config" | "erro" };

/** Normaliza o termo digitado: espaços colapsados, no máximo 100 caracteres. */
export const normalizarTermo = (q: string | string[] | undefined) =>
  ((Array.isArray(q) ? q[0] : q) ?? "").replace(/\s+/g, " ").trim().slice(0, 100);

/** Busca global em notícias, decisões, conflitos e equipamentos (até 10 por tipo). */
export async function obterBusca(termo: string): Promise<RespostaBusca> {
  "use cache";
  cacheLife(QUINZE_MINUTOS);
  cacheTag("noticias", "busca");
  if (termo.length < 2) return { ok: true, resultados: [] };
  const r = await buscarGlobal(termo, 10);
  if (!r.ok) cacheReserva();
  return r.ok ? { ok: true, resultados: r.dados } : { ok: false, motivo: r.motivo };
}
