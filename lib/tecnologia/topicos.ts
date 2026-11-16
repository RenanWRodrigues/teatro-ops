// Abas de /tecnologia e o filtro de notícias de cada uma (Fase 8, item 1).
// Os temas vêm da classificação da ingestão (`noticias.temas`); os termos restringem pelo título
// (original ou traduzido, sem diferenciar maiúsculas, por trecho: "intercept" pega "intercepted").
// Uma notícia entra na aba se tiver TODOS os temas e, havendo termos, ao menos UM deles no título.

export type FiltroTopico = {
  /** Rótulo da aba. A ordem das chaves de FILTROS_TOPICO é a ordem das abas; o texto vem de content/tecnologia/<id>.mdx. */
  rotulo: string;
  temas: string[];
  termos?: string[];
  /** Critério em pt-BR, exibido na aba para o leitor saber por que a notícia está ali. */
  criterio: string;
};

export const FILTROS_TOPICO = {
  "drones-fpv": {
    rotulo: "Drones FPV",
    temas: ["drones"],
    termos: ["FPV", "first-person view", "fiber-optic", "fibre-optic", "fibra óptica"],
    criterio: "Notícias classificadas no tema drones cujo título cita FPV, visão em primeira pessoa ou drones guiados por fibra óptica.",
  },
  enxames: {
    rotulo: "Enxames",
    temas: ["drones"],
    termos: ["swarm", "enxame"],
    criterio: "Notícias classificadas no tema drones cujo título cita enxames (swarm).",
  },
  "ia-alvos": {
    rotulo: "IA de alvos",
    temas: ["ia"],
    criterio: "Notícias classificadas no tema inteligência artificial em contexto militar ou de defesa.",
  },
  "guerra-eletronica": {
    rotulo: "Guerra eletrônica",
    temas: ["guerra-eletronica"],
    criterio: "Notícias classificadas no tema guerra eletrônica (interferência, bloqueio e falsificação de sinais).",
  },
  "defesa-antidrone": {
    rotulo: "Defesa antidrone",
    temas: ["drones"],
    termos: [
      "counter-drone",
      "anti-drone",
      "antidrone",
      "counter-UAS",
      "C-UAS",
      "intercept",
      "shot down",
      "downed",
      "air defense",
      "air defence",
      "defesa aérea",
      "abatid",
      "derrubad",
    ],
    criterio: "Notícias classificadas no tema drones cujo título cita defesa antidrone, interceptação, abate ou defesa aérea.",
  },
} satisfies Record<string, FiltroTopico>;

export type IdTopico = keyof typeof FILTROS_TOPICO;

/** Termos sem duplicatas e sem os caracteres que quebrariam o filtro `or` do PostgREST. */
export function termosLimpos(termos: string[] = []): string[] {
  const limpos = termos.map((t) => t.replace(/["*,()\\]/g, "").trim()).filter((t) => t.length >= 2);
  return [...new Set(limpos)];
}
