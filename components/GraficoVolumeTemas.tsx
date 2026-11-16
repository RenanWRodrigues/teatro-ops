import { formatarData, formatarNumero } from "@/lib/format";
import { TEMAS_VOLUME, type VolumeSemanal } from "@/lib/tecnologia/volume";

type Props = { volume: VolumeSemanal | null; className?: string };

const ALTURA = 120;
const PASSO = 28;
const BARRA = 20;
/** Largura fixa de 12 semanas: com poucas semanas as barras ficam à esquerda, sem esticar. */
const SLOTS = 12;

const plural = (n: number) => `${formatarNumero(n)} ${n === 1 ? "notícia" : "notícias"}`;

/**
 * Notícias por semana em cada tema: um painel por tema (múltiplos pequenos, mesma escala),
 * com dica nativa em cada barra e a tabela equivalente para leitores de tela.
 */
export function GraficoVolumeTemas({ volume, className = "" }: Props) {
  if (!volume) {
    return (
      <p className={`border border-line bg-surface px-6 py-5 text-base leading-relaxed text-text-2 ${className}`}>
        Contagem indisponível no momento: o banco de notícias não respondeu. O gráfico volta na próxima atualização.
      </p>
    );
  }
  if (volume.semanas.length === 0) {
    return (
      <p className={`border border-line bg-surface px-6 py-5 text-base leading-relaxed text-text-2 ${className}`}>
        Ainda não há notícias coletadas nestes temas nas últimas 12 semanas.
      </p>
    );
  }

  const { semanas, series, ultimaParcial } = volume;
  const max = Math.max(1, ...TEMAS_VOLUME.flatMap(({ tema }) => series[tema]));
  const largura = SLOTS * PASSO;
  const rotuloSemana = (i: number) => `semana de ${formatarData(semanas[i]!)}${ultimaParcial && i === semanas.length - 1 ? " (parcial)" : ""}`;

  return (
    <figure className={className}>
      <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
        {TEMAS_VOLUME.map(({ tema, rotulo }) => {
          const valores = series[tema];
          const total = valores.reduce((a, b) => a + b, 0);
          return (
            <div key={tema} className="min-w-0 bg-bg p-5">
              <p className="font-mono text-xs tracking-[0.1em] text-text-2 uppercase">{rotulo}</p>
              <p className="mt-1 font-display text-4xl font-extrabold">{formatarNumero(total)}</p>
              <p className="font-mono text-xs text-muted">{total === 1 ? "notícia no período" : "notícias no período"}</p>
              <svg
                viewBox={`0 0 ${largura} ${ALTURA}`}
                className="mt-4 h-[120px] w-full border-b border-line-strong"
                preserveAspectRatio="none"
                role="img"
                aria-label={`${rotulo}: ${plural(total)} em ${semanas.length} ${semanas.length === 1 ? "semana" : "semanas"}. Valores na tabela abaixo.`}
              >
                {valores.map((v, i) => {
                  const h = v > 0 ? Math.max((v / max) * (ALTURA - 4), 3) : 0;
                  const parcial = ultimaParcial && i === valores.length - 1;
                  return (
                    <g key={semanas[i]}>
                      <title>{`${rotulo}, ${rotuloSemana(i)}: ${plural(v)}`}</title>
                      {/* Alvo de passagem do mouse maior que a barra. */}
                      <rect x={i * PASSO} y={0} width={PASSO} height={ALTURA} fill="transparent" />
                      <rect
                        x={i * PASSO + (PASSO - BARRA) / 2}
                        y={ALTURA - h}
                        width={BARRA}
                        height={h}
                        rx={2}
                        fill="var(--accent)"
                        fillOpacity={parcial ? 0.45 : 1}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 font-mono text-xs leading-relaxed text-muted">
        {semanas.length === 1
          ? `Semana de ${formatarData(semanas[0]!)}.`
          : `Uma barra por semana, da semana de ${formatarData(semanas[0]!)} à de ${formatarData(semanas.at(-1)!)}, da esquerda para a direita (passe o mouse sobre a barra para ver o valor).`}{" "}
        Mesma escala nos três painéis (máx. {plural(max)} numa semana).
        {ultimaParcial ? " A barra mais clara é a semana em andamento, ainda parcial." : null}
      </figcaption>
      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-mono text-xs text-text-2 hover:text-accent">
          Ver os valores em tabela
        </summary>
        <div className="overflow-x-auto border border-line">
          <table className="w-full font-mono text-xs">
            <caption className="sr-only">Notícias por semana e tema</caption>
            <thead className="bg-surface text-left text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Semana de
                </th>
                {TEMAS_VOLUME.map(({ tema, rotulo }) => (
                  <th key={tema} scope="col" className="px-3 py-2 text-right">
                    {rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {semanas.map((s, i) => (
                <tr key={s} className="border-t border-line-soft">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    {formatarData(s)}
                    {ultimaParcial && i === semanas.length - 1 ? " (parcial)" : ""}
                  </th>
                  {TEMAS_VOLUME.map(({ tema }) => (
                    <td key={tema} className="px-3 py-1.5 text-right">
                      {formatarNumero(series[tema][i]!)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
