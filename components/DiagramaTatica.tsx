import type { TipoDiagrama } from "@/lib/taticas/taticas";

/** Descrição de cada diagrama para leitores de tela (o desenho é esquemático, sem escala nem geografia real). */
export const DESCRICOES_DIAGRAMA: Record<TipoDiagrama, string> = {
  pinca: "Diagrama esquemático: duas setas contornam uma posição pelos lados e se encontram atrás dela, enquanto uma força a prende pela frente.",
  manobra: "Diagrama esquemático: uma seta passa por um ponto fraco de uma linha e avança para a retaguarda, em vez de atacar a linha inteira.",
  profundidade: "Diagrama esquemático: um ataque atravessa linhas defensivas sucessivas e perde força; uma reserva atrás das linhas contra-ataca.",
  combinadas: "Diagrama esquemático: três símbolos de armas diferentes ligados entre si, apontando para o mesmo objetivo.",
  assimetrica: "Diagrama esquemático: uma força grande e concentrada diante de vários grupos pequenos e dispersos que a cercam por caminhos indiretos.",
  negacao: "Diagrama esquemático: a partir da costa, faixas concêntricas cobrem o mar; um navio que se aproxima é detido antes de entrar nelas.",
};

type Props = {
  tipo: TipoDiagrama;
  /** Traços que se desenham em sequência (desligados com prefers-reduced-motion). */
  animado?: boolean;
  className?: string;
};

/** Diagramas esquemáticos de doutrina (nível conceitual, sem detalhe operacional). */
export function DiagramaTatica({ tipo, animado = false, className = "h-[110px] w-full" }: Props) {
  // Cada traço animado recebe um atraso para a leitura seguir a ordem da manobra.
  const a = (atraso: number) =>
    animado ? { className: "anim-tracado", pathLength: 1, style: { animationDelay: `${atraso}s` } } : {};
  return (
    <svg viewBox="0 0 200 110" className={className} role="img" aria-label={DESCRICOES_DIAGRAMA[tipo]}>
      {tipo === "pinca" ? (
        <>
          <rect x="80" y="40" width="40" height="30" fill="none" stroke="var(--line-strong)" />
          <path d="M40 55h30" stroke="var(--neutral-bar)" strokeWidth="2.5" {...a(0)} />
          <g fill="none" stroke="var(--accent)" strokeWidth="2.5">
            <path d="M10 20 C60 0 140 0 150 40" {...a(0.3)} />
            <path d="M10 90 C60 110 140 110 150 70" {...a(0.3)} />
            <path d="M144 34l6 6 2-8M144 76l6-6 2 8" {...a(1.3)} />
          </g>
        </>
      ) : null}
      {tipo === "manobra" ? (
        <>
          <path d="M100 0v45M100 65v45" stroke="var(--line-strong)" strokeWidth="2" />
          <g fill="none" stroke="var(--accent)" strokeWidth="2.5">
            <path d="M30 30l60 22M30 80l60-22" {...a(0)} />
            <path d="M10 55h150" {...a(0.6)} />
            <path d="M150 45l12 10-12 10" {...a(1.4)} />
          </g>
        </>
      ) : null}
      {tipo === "profundidade" ? (
        <>
          <path d="M40 10v90" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
          <path d="M90 10v90M140 10v90" fill="none" stroke="var(--neutral-bar)" strokeWidth="2" strokeDasharray="6 6" />
          <path d="M190 55h-30M150 55h-22" stroke="var(--alert)" strokeWidth="2.5" {...a(0)} />
          <path d="M20 85 C40 85 60 75 82 60" fill="none" stroke="var(--accent)" strokeWidth="2.5" {...a(1.2)} />
        </>
      ) : null}
      {tipo === "combinadas" ? (
        <>
          <g fill="none" stroke="var(--accent)" strokeWidth="2.5">
            <circle cx="50" cy="55" r="18" {...a(0)} />
            <rect x="86" y="37" width="36" height="36" {...a(0.4)} />
            <path d="M150 73l18-36 18 36z" {...a(0.8)} />
          </g>
          <path d="M68 55h18M122 55h28" stroke="var(--line-strong)" strokeWidth="2" {...a(1.4)} />
        </>
      ) : null}
      {tipo === "assimetrica" ? (
        <>
          <rect x="120" y="35" width="50" height="40" fill="none" stroke="var(--line-strong)" strokeWidth="2" />
          <g fill="var(--accent)">
            <circle cx="30" cy="20" r="4" />
            <circle cx="20" cy="60" r="4" />
            <circle cx="40" cy="95" r="4" />
            <circle cx="70" cy="45" r="4" />
          </g>
          <g fill="none" stroke="var(--accent)" strokeWidth="2">
            <path d="M34 20 C80 10 110 15 125 33" {...a(0)} />
            <path d="M44 95 C90 105 120 100 135 77" {...a(0.5)} />
            <path d="M74 45 C95 50 105 52 118 55" {...a(1)} />
          </g>
        </>
      ) : null}
      {tipo === "negacao" ? (
        <>
          <path d="M0 0h18v110H0z" fill="var(--line-strong)" />
          <g fill="none" stroke="var(--accent)" strokeWidth="2">
            <path d="M18 30 A25 25 0 0 1 18 80" {...a(0)} />
            <path d="M18 10 A45 45 0 0 1 18 100" {...a(0.4)} />
            <path d="M18 -10 A65 65 0 0 1 18 120" {...a(0.8)} />
          </g>
          <path d="M175 55h-50" stroke="var(--neutral-bar)" strokeWidth="2.5" {...a(1.2)} />
          <path d="M115 47l12 16M127 47l-12 16" stroke="var(--alert)" strokeWidth="2.5" {...a(2)} />
          <path d="M178 50h14l-4 10h-10z" fill="var(--neutral-bar)" />
        </>
      ) : null}
    </svg>
  );
}
