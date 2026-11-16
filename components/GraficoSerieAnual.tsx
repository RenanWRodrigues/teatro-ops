import type { ReactNode } from "react";
import { formatarNumero } from "@/lib/format";

type Coluna<T> = { rotulo: string; valor: (linha: T) => number };

type Props<T extends { ano: number }> = {
  /** Nome da série, usado no rótulo acessível e na legenda da tabela. */
  titulo: string;
  dados: T[];
  /** Valor desenhado em cada barra. */
  valor: (linha: T) => number;
  /** Unidade no singular e no plural, para dicas e rótulos ("conflito"/"conflitos"). */
  unidade: [string, string];
  /** Colunas da tabela equivalente (a primeira coluna, o ano, é automática). */
  colunas: Coluna<T>[];
  /** Ano a destacar (ex.: o último da série). */
  destaque?: number;
  nota?: ReactNode;
};

const ALTURA = 160;
const DECADAS = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

/** Barras por ano (SVG simples, uma série), com dica em cada barra e tabela equivalente para leitores de tela. */
export function GraficoSerieAnual<T extends { ano: number }>({ titulo, dados, valor, unidade, colunas, destaque, nota }: Props<T>) {
  if (dados.length === 0) return <p className="border border-line p-6 text-sm text-muted">Série indisponível.</p>;
  const n = dados.length;
  const max = Math.max(1, ...dados.map(valor));
  const pico = dados.reduce((a, b) => (valor(b) > valor(a) ? b : a));
  const primeiro = dados[0]!.ano;
  const ultimo = dados.at(-1)!.ano;
  const fmt = (v: number) => `${formatarNumero(v)} ${v === 1 ? unidade[0] : unidade[1]}`;
  // Rótulos de década longe das pontas, para não colidir com o primeiro e o último ano.
  const folga = Math.max(5, Math.ceil(n / 12));
  const marcas = DECADAS.filter((d) => d >= primeiro + folga && d <= ultimo - folga);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${n * 10} ${ALTURA}`}
        preserveAspectRatio="none"
        className="h-40 w-full border-b border-line-strong"
        role="img"
        aria-label={`${titulo}, de ${primeiro} a ${ultimo}. Pico de ${fmt(valor(pico))} em ${pico.ano}; em ${ultimo}, ${fmt(valor(dados.at(-1)!))}. Valores na tabela abaixo.`}
      >
        {dados.map((d, i) => {
          const v = valor(d);
          const h = v > 0 ? Math.max((v / max) * (ALTURA - 4), 2) : 0;
          return (
            <g key={d.ano}>
              <title>{`${d.ano}: ${fmt(v)}`}</title>
              <rect x={i * 10} y={0} width={10} height={ALTURA} fill="transparent" />
              <rect
                x={i * 10 + 1.5}
                y={ALTURA - h}
                width={7}
                height={h}
                fill={d.ano === destaque ? "var(--text)" : "var(--accent)"}
              />
            </g>
          );
        })}
      </svg>
      <div aria-hidden="true" className="relative mt-1.5 h-4 font-mono text-[11px] text-muted">
        <span className="absolute left-0">{primeiro}</span>
        {marcas.map((d) => (
          <span key={d} className="absolute -translate-x-1/2 max-sm:hidden" style={{ left: `${((d - primeiro + 0.5) / n) * 100}%` }}>
            {d}
          </span>
        ))}
        <span className="absolute right-0">{ultimo}</span>
      </div>
      <figcaption className="mt-3 font-mono text-xs leading-relaxed text-muted">
        Uma barra por ano; passe o mouse para ver o valor. Máximo da série: {fmt(valor(pico))} em {pico.ano}.
        {destaque ? ` A barra clara corresponde a ${destaque}.` : null} {nota}
      </figcaption>
      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-mono text-xs text-text-2 hover:text-accent">
          Ver os valores em tabela
        </summary>
        <div className="max-h-80 overflow-auto border border-line">
          <table className="w-full font-mono text-xs">
            <caption className="sr-only">{titulo}</caption>
            <thead className="sticky top-0 bg-surface text-left text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Ano
                </th>
                {colunas.map((c) => (
                  <th key={c.rotulo} scope="col" className="px-3 py-2 text-right">
                    {c.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...dados].reverse().map((d) => (
                <tr key={d.ano} className="border-t border-line-soft">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    {d.ano}
                  </th>
                  {colunas.map((c) => (
                    <td key={c.rotulo} className="px-3 py-1.5 text-right">
                      {formatarNumero(c.valor(d))}
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
