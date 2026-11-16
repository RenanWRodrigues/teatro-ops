// Bandeiras em SVG simplificado (sem emoji), proporção 3:2. Decorativas: o nome do país vem sempre ao lado.

type Props = { pais: string; className?: string };

const estrela = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raio = i % 2 === 0 ? r : r * 0.4;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + raio * Math.cos(ang)).toFixed(2)},${(cy + raio * Math.sin(ang)).toFixed(2)}`);
  }
  return pts.join(" ");
};

function Desenho({ pais }: { pais: string }) {
  switch (pais) {
    case "US":
      return (
        <>
          <rect width="30" height="20" fill="#B22234" />
          {[1, 3, 5, 7, 9, 11].map((i) => (
            <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#FFFFFF" />
          ))}
          <rect width="12" height={(7 * 20) / 13} fill="#3C3B6E" />
          {[0, 1, 2].flatMap((l) =>
            [0, 1, 2, 3].map((c) => <circle key={`${l}-${c}`} cx={1.8 + c * 2.8} cy={1.7 + l * 3.4} r="0.55" fill="#FFFFFF" />),
          )}
        </>
      );
    case "CN":
      return (
        <>
          <rect width="30" height="20" fill="#EE1C25" />
          <polygon points={estrela(5, 5, 3)} fill="#FFFF00" />
          <polygon points={estrela(10, 2, 1)} fill="#FFFF00" />
          <polygon points={estrela(12, 4, 1)} fill="#FFFF00" />
          <polygon points={estrela(12, 7, 1)} fill="#FFFF00" />
          <polygon points={estrela(10, 9, 1)} fill="#FFFF00" />
        </>
      );
    case "RU":
      return (
        <>
          <rect width="30" height="20" fill="#FFFFFF" />
          <rect y="6.67" width="30" height="6.67" fill="#0039A6" />
          <rect y="13.33" width="30" height="6.67" fill="#D52B1E" />
        </>
      );
    case "IR":
      return (
        <>
          <rect width="30" height="20" fill="#FFFFFF" />
          <rect width="30" height="6.67" fill="#239F40" />
          <rect y="13.33" width="30" height="6.67" fill="#DA0000" />
          {/* Emblema central simplificado. */}
          <path d="M15 7.6c-1.6 0.6-2.1 2.4-1 3.7 0.4 0.5 0.6 0.9 0.6 1.3h0.8c0-0.4 0.2-0.8 0.6-1.3 1.1-1.3 0.6-3.1-1-3.7z" fill="#DA0000" />
        </>
      );
    case "IL":
      return (
        <>
          <rect width="30" height="20" fill="#FFFFFF" />
          <rect y="1.6" width="30" height="2.4" fill="#0038B8" />
          <rect y="16" width="30" height="2.4" fill="#0038B8" />
          <g fill="none" stroke="#0038B8" strokeWidth="0.7">
            <polygon points="15,6.4 18.1,11.8 11.9,11.8" />
            <polygon points="15,13.6 11.9,8.2 18.1,8.2" />
          </g>
        </>
      );
    case "UA":
      return (
        <>
          <rect width="30" height="10" fill="#0057B7" />
          <rect y="10" width="30" height="10" fill="#FFD700" />
        </>
      );
    case "DE":
      return (
        <>
          <rect width="30" height="6.67" fill="#000000" />
          <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
          <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
        </>
      );
    default:
      return <rect width="30" height="20" fill="var(--surface-2)" />;
  }
}

export function Bandeira({ pais, className = "h-5 w-[30px]" }: Props) {
  return (
    <svg viewBox="0 0 30 20" className={`shrink-0 outline outline-1 outline-line-strong ${className}`} aria-hidden="true" focusable="false">
      <Desenho pais={pais} />
    </svg>
  );
}
