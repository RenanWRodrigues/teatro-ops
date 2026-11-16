// Volume semanal de notícias por tema em /tecnologia (Fase 8, item 5).
// O GDELT TimelineVol previsto no roteiro faz parte do `gdelt-doc`, que está `quebrada` (HTTP 429):
// a série conta as notícias que a própria ingestão gravou em `noticias` (classificadas por tema).

export const TEMAS_VOLUME = [
  { tema: "drones", rotulo: "Drones" },
  { tema: "ia", rotulo: "Inteligência artificial" },
  { tema: "guerra-eletronica", rotulo: "Guerra eletrônica" },
] as const;

export type TemaVolume = (typeof TEMAS_VOLUME)[number]["tema"];

export type VolumeSemanal = {
  /** Segundas-feiras (UTC, "aaaa-mm-dd"), da mais antiga à semana corrente. */
  semanas: string[];
  /** Contagem por tema, alinhada a `semanas`. */
  series: Record<TemaVolume, number[]>;
  /** A última semana ainda está em andamento (contagem parcial). */
  ultimaParcial: boolean;
};

const DIA = 86_400_000;

/** Segunda-feira (UTC) da semana do instante, como "aaaa-mm-dd". */
export function inicioSemana(instante: Date): string {
  const d = new Date(Date.UTC(instante.getUTCFullYear(), instante.getUTCMonth(), instante.getUTCDate()));
  const desdeSegunda = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - desdeSegunda * DIA).toISOString().slice(0, 10);
}

/**
 * Agrega as notícias por semana e tema. A série começa na semana da notícia mais antiga
 * (no máximo `maxSemanas` atrás) para não exibir semanas anteriores ao início da coleta como zero.
 */
export function agregarVolumeSemanal(
  linhas: { publicado_em: string; temas: string[] }[],
  agora: Date,
  maxSemanas = 12,
): VolumeSemanal {
  const atual = inicioSemana(agora);
  const limite = new Date(Date.parse(atual) - (maxSemanas - 1) * 7 * DIA).toISOString().slice(0, 10);
  const contagem = new Map<string, Map<string, number>>();
  let maisAntiga: string | null = null;

  for (const l of linhas) {
    const t = Date.parse(l.publicado_em);
    if (Number.isNaN(t) || t > agora.getTime()) continue;
    const semana = inicioSemana(new Date(t));
    if (semana < limite) continue;
    if (!maisAntiga || semana < maisAntiga) maisAntiga = semana;
    const porTema = contagem.get(semana) ?? new Map<string, number>();
    for (const tema of new Set(l.temas)) porTema.set(tema, (porTema.get(tema) ?? 0) + 1);
    contagem.set(semana, porTema);
  }

  const semanas: string[] = [];
  if (maisAntiga) for (let s = Date.parse(maisAntiga); s <= Date.parse(atual); s += 7 * DIA) semanas.push(new Date(s).toISOString().slice(0, 10));

  const series = Object.fromEntries(
    TEMAS_VOLUME.map(({ tema }) => [tema, semanas.map((s) => contagem.get(s)?.get(tema) ?? 0)]),
  ) as Record<TemaVolume, number[]>;
  return { semanas, series, ultimaParcial: semanas.length > 0 };
}
