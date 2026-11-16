import { formatarData, formatarNumero } from "@/lib/format";
import type { SemanaEventos } from "@/lib/tipos";

type Props = { semanas: SemanaEventos[]; titulo: string };

const ALTURA = 160;

/** Barras de eventos por semana (SVG simples) com tabela equivalente para leitores de tela. */
export function GraficoSemanal({ semanas, titulo }: Props) {
  if (semanas.length === 0) {
    return <p className="border border-line p-6 text-sm text-muted">Ainda não há eventos registrados para este conflito.</p>;
  }
  const max = Math.max(...semanas.map((s) => s.eventos), 1);
  const largura = semanas.length * 12;
  const primeira = semanas[0]!;
  const ultima = semanas.at(-1)!;
  const pico = semanas.reduce((a, b) => (b.eventos > a.eventos ? b : a));

  return (
    <figure>
      <svg
        viewBox={`0 0 ${largura} ${ALTURA + 2}`}
        preserveAspectRatio="none"
        className="h-40 w-full border-b border-line-strong"
        role="img"
        aria-label={`${titulo}: ${semanas.length} semanas, de ${formatarData(primeira.semana)} a ${formatarData(ultima.semana)}. Pico de ${formatarNumero(pico.eventos)} ${pico.eventos === 1 ? "evento" : "eventos"} na semana de ${formatarData(pico.semana)}. Tabela com os valores logo abaixo.`}
      >
        {semanas.map((s, i) => {
          const h = Math.max((s.eventos / max) * ALTURA, s.eventos > 0 ? 2 : 0);
          return <rect key={s.semana} x={i * 12 + 1} y={ALTURA - h} width={10} height={h} fill="var(--accent)" />;
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between font-mono text-xs text-muted">
        <span>{formatarData(primeira.semana)}</span>
        <span>máx. {formatarNumero(max)} eventos/semana</span>
        <span>{formatarData(ultima.semana)}</span>
      </figcaption>
      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-mono text-xs text-text-2 hover:text-accent">
          Ver os valores em tabela
        </summary>
        <div className="max-h-72 overflow-y-auto border border-line">
          <table className="w-full font-mono text-xs">
            <caption className="sr-only">{titulo}</caption>
            <thead className="sticky top-0 bg-surface text-left text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">Semana de</th>
                <th scope="col" className="px-3 py-2 text-right">Eventos</th>
                <th scope="col" className="px-3 py-2 text-right">Mortes estimadas</th>
              </tr>
            </thead>
            <tbody>
              {semanas.map((s) => (
                <tr key={s.semana} className="border-t border-line-soft">
                  <td className="px-3 py-1.5">{formatarData(s.semana)}</td>
                  <td className="px-3 py-1.5 text-right">{formatarNumero(s.eventos)}</td>
                  <td className="px-3 py-1.5 text-right">{formatarNumero(s.mortes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
