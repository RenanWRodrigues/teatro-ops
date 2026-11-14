// [EXEMPLO] Fixtures da home. Conflitos e manchetes são placeholders, como na referência
// visual: nenhum nome, número ou manchete real é inventado aqui (CLAUDE.md §4).
import type { Conflito, EventoLinhaDoTempo, Fonte, Manchete } from "@/lib/tipos";

const FONTE_EXEMPLO: Fonte = { nome: "[EXEMPLO] fonte a definir", url: null };

export const MANCHETES_EXEMPLO: Manchete[] = [
  "Europa Oriental",
  "Oriente Médio",
  "Indo-Pacífico",
  "África Subsaariana",
  "Ciberespaço",
].map((regiao) => ({
  exemplo: true,
  regiao,
  titulo: "[manchete recente]",
  url: null,
  publicadoEm: null,
  fonte: FONTE_EXEMPLO,
}));

const RESUMO = "[Resumo de 2 linhas sobre a situação da frente nesta semana.]";

export const CONFLITOS_EXEMPLO: Conflito[] = [
  { exemplo: true, slug: "exemplo-1", nome: "[Nome do conflito]", regiao: "Europa", intensidade: "alta", resumo: RESUMO, fonte: FONTE_EXEMPLO },
  { exemplo: true, slug: "exemplo-2", nome: "[Nome do conflito]", regiao: "Oriente Médio", intensidade: "alta", resumo: RESUMO, fonte: FONTE_EXEMPLO },
  { exemplo: true, slug: "exemplo-3", nome: "[Nome do conflito]", regiao: "Indo-Pacífico", intensidade: "tensao", resumo: RESUMO, fonte: FONTE_EXEMPLO },
  { exemplo: true, slug: "exemplo-4", nome: "[Nome do conflito]", regiao: "África", intensidade: "tensao", resumo: RESUMO, fonte: FONTE_EXEMPLO },
];

/** Contadores do painel radar. `null` = sem dado ainda (exibe "—"). */
export const MONITOR_EXEMPLO = {
  altaIntensidade: null as number | null,
  emMonitoramento: null as number | null,
  atualizadoEm: null as string | null,
};

export const EIXOS = [
  { numero: "01", titulo: "Conflitos", texto: "Mapa vivo, cronologias e contexto geopolítico de cada frente.", href: "/#conflitos" },
  { numero: "02", titulo: "Arsenal", texto: "Fichas técnicas, galerias e comparador de equipamentos.", href: "/arsenal" },
  { numero: "03", titulo: "Táticas", texto: "Doutrinas explicadas com diagramas e casos históricos.", href: "/#taticas" },
  { numero: "04", titulo: "IA e drones", texto: "A guerra dos algoritmos: autonomia, enxames e guerra eletrônica.", href: "/tecnologia" },
] as const;

/** [EXEMPLO] Textos editoriais ainda sem referência verificada: a fonte fica visível como pendente. */
export const FONTES_TATICAS: Fonte[] = [FONTE_EXEMPLO];
export const FONTES_ARQUIVO: Fonte[] = [FONTE_EXEMPLO];

export type DiagramaTatica = "pinca" | "manobra" | "profundidade" | "combinadas";

export const TATICAS: { titulo: string; texto: string; diagrama: DiagramaTatica }[] = [
  { titulo: "Movimento de pinça", diagrama: "pinca", texto: "Duas forças atacam os flancos ao mesmo tempo para cercar o inimigo. De Canas a Stalingrado." },
  { titulo: "Guerra de manobra", diagrama: "manobra", texto: "Velocidade e concentração num ponto fraco para romper a linha e desorganizar o comando inimigo." },
  { titulo: "Defesa em profundidade", diagrama: "profundidade", texto: "Camadas sucessivas que desgastam o atacante antes que ele alcance o objetivo." },
  { titulo: "Armas combinadas", diagrama: "combinadas", texto: "Infantaria, blindados, artilharia e aviação agindo juntos, cada um cobrindo a fraqueza do outro." },
];

export const FRENTES_TECNOLOGIA = ["Drones FPV", "Enxames", "IA de alvos", "Guerra eletrônica"];

export const ARQUIVO_HISTORICO: EventoLinhaDoTempo[] = [
  { marco: "1914", descricao: "Primeira Guerra Mundial — trincheiras e metralhadoras" },
  { marco: "1939", descricao: "Segunda Guerra Mundial — guerra-relâmpago (blitzkrieg) e porta-aviões" },
  { marco: "1950", descricao: "Guerra da Coreia — primeiros combates entre jatos" },
  { marco: "1965", descricao: "Guerra do Vietnã — helicópteros e guerra de guerrilha" },
  { marco: "1991", descricao: "Guerra do Golfo — munições guiadas e furtividade" },
  { marco: "2022–hoje", descricao: "Guerra na Ucrânia — drones em massa e guerra eletrônica", atual: true },
];
