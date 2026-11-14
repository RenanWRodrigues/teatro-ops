import { formatarCarimbo, formatarNumero } from "@/lib/format";
import type { Fonte } from "@/lib/tipos";
import { Cantoneiras } from "./Cantoneiras";
import { CreditoFonte } from "./CreditoFonte";

type Props = {
  altaIntensidade: number | null;
  emMonitoramento: number | null;
  atualizadoEm: string | null;
  /** Origem dos contadores (ex.: ACLED). Exibida junto da ressalva de estimativa. */
  fonte?: Fonte | null;
};

const valor = (n: number | null) => (n === null ? "—" : formatarNumero(n, { casas: 0 }));

/** "14/11/2026 às 11h20" → "11h20". */
const horaCurta = (iso: string) => formatarCarimbo(iso).split(" às ")[1] ?? "—";

// Rótulos em 3 colunas estreitas: fonte e espaçamento menores no celular para não quebrar no meio da palavra.
const ROTULO = "text-[10px] tracking-[0.04em] text-muted sm:text-[11px] sm:tracking-[0.1em]";

/** Radar decorativo do hero. Os pontos são ilustrativos e não representam posições reais. */
export function PainelRadar({ altaIntensidade, emMonitoramento, atualizadoEm, fonte }: Props) {
  const temDados = altaIntensidade !== null || emMonitoramento !== null;
  return (
    <div className="relative w-full max-w-[520px] min-w-0 flex-[1_1_440px] border border-line-panel bg-surface">
      <div className="flex justify-between border-b border-line px-[18px] py-3.5 font-mono text-xs tracking-[0.1em] text-muted">
        <span>MONITOR GLOBAL</span>
        <span className="text-accent">
          <span aria-hidden="true">● </span>
          {atualizadoEm ? "SINCRONIZADO" : "AGUARDANDO DADOS"}
        </span>
      </div>
      <div className="flex justify-center p-6">
        <svg
          viewBox="0 0 400 400"
          className="h-auto w-full max-w-[420px]"
          role="img"
          aria-label="Radar ilustrativo. Os pontos são decorativos e não indicam posições reais."
        >
          <g fill="none" stroke="#24302A" strokeWidth="1">
            <circle cx="200" cy="200" r="190" />
            <circle cx="200" cy="200" r="140" />
            <circle cx="200" cy="200" r="90" />
            <circle cx="200" cy="200" r="40" />
            <path d="M200 10v380M10 200h380M66 66l268 268M334 66L66 334" />
          </g>
          <g className="anim-varredura">
            <path d="M200 200 L200 10 A190 190 0 0 1 334 66 Z" fill="var(--accent)" fillOpacity="0.14" />
            <path d="M200 200 L200 10" stroke="var(--accent)" strokeWidth="2" />
          </g>
          <g fill="var(--alert)">
            <circle className="anim-blip" cx="262" cy="118" r="6" />
            <circle className="anim-blip [animation-delay:.6s]" cx="128" cy="160" r="5" />
            <circle className="anim-blip [animation-delay:1.2s]" cx="290" cy="250" r="5" />
          </g>
          <g fill="var(--accent)">
            <circle cx="150" cy="282" r="4" />
            <circle cx="232" cy="300" r="4" />
          </g>
          {/* Rótulos decorativos: no celular ficariam com ~8 px, então só aparecem a partir de sm. */}
          <g fontFamily="var(--font-jetbrains), monospace" fontSize="11" fill="var(--muted)" className="hidden sm:inline">
            <text x="272" y="112">ZONA A</text>
            <text x="58" y="152">ZONA B</text>
            <text x="300" y="256">ZONA C</text>
          </g>
        </svg>
      </div>
      <dl className="grid grid-cols-3 border-t border-line font-mono">
        <div className="min-w-0 border-r border-line px-3 py-4 sm:px-[18px]">
          <dt className={ROTULO}>ALTA INTENSIDADE</dt>
          <dd className="mt-1.5 text-[26px] text-alert-text">{valor(altaIntensidade)}</dd>
        </div>
        <div className="min-w-0 border-r border-line px-3 py-4 sm:px-[18px]">
          <dt className={ROTULO}>EM MONITORAMENTO</dt>
          <dd className="mt-1.5 text-[26px] text-accent">{valor(emMonitoramento)}</dd>
        </div>
        <div className="min-w-0 px-3 py-4 sm:px-[18px]">
          <dt className={ROTULO}>ATUALIZADO</dt>
          <dd className="mt-1.5 text-[26px] text-text">
            {atualizadoEm ? (
              <>
                <time dateTime={atualizadoEm}>{horaCurta(atualizadoEm)}</time>
                <span className="sr-only"> (horário de Brasília)</span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
      {temDados && fonte ? (
        <p className="border-t border-line px-[18px] py-3">
          <CreditoFonte fonte={fonte} prefixo="Estimativa · Fonte" />
        </p>
      ) : null}
      <Cantoneiras />
    </div>
  );
}
