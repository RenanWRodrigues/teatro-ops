import type { DiagramaTatica as Tipo } from "@/lib/fixtures/home";

const ROTULOS: Record<Tipo, string> = {
  pinca: "Diagrama de pinça envolvendo uma posição",
  manobra: "Diagrama de ruptura em ponto concentrado",
  profundidade: "Diagrama de linhas defensivas sucessivas",
  combinadas: "Diagrama de armas combinadas",
};

/** Diagramas esquemáticos de doutrina (nível conceitual, sem detalhe operacional). */
export function DiagramaTatica({ tipo }: { tipo: Tipo }) {
  return (
    <svg viewBox="0 0 200 110" className="h-[110px] w-full" role="img" aria-label={ROTULOS[tipo]}>
      {tipo === "pinca" ? (
        <>
          <rect x="80" y="40" width="40" height="30" fill="none" stroke="var(--line-strong)" />
          <g fill="none" stroke="var(--accent)" strokeWidth="2.5">
            <path d="M10 20 C60 0 140 0 150 40" />
            <path d="M10 90 C60 110 140 110 150 70" />
            <path d="M144 34l6 6 2-8M144 76l6-6 2 8" />
          </g>
        </>
      ) : null}
      {tipo === "manobra" ? (
        <>
          <path d="M100 0v110" stroke="var(--line-strong)" strokeWidth="2" />
          <g fill="none" stroke="var(--accent)" strokeWidth="2.5">
            <path d="M10 55h150" />
            <path d="M150 45l12 10-12 10" />
            <path d="M30 30l60 22M30 80l60-22" />
          </g>
        </>
      ) : null}
      {tipo === "profundidade" ? (
        <>
          <path d="M40 10v90" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
          <path d="M90 10v90M140 10v90" fill="none" stroke="var(--neutral-bar)" strokeWidth="2" strokeDasharray="6 6" />
          <path d="M180 55h-30" stroke="var(--alert)" strokeWidth="2.5" />
        </>
      ) : null}
      {tipo === "combinadas" ? (
        <>
          <g fill="none" stroke="var(--accent)" strokeWidth="2.5">
            <circle cx="50" cy="55" r="18" />
            <rect x="86" y="37" width="36" height="36" />
            <path d="M150 73l18-36 18 36z" />
          </g>
          <path d="M68 55h18M122 55h28" stroke="var(--line-strong)" strokeWidth="2" />
        </>
      ) : null}
    </svg>
  );
}
