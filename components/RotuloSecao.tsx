import type { ReactNode } from "react";

type Props = {
  /** "01" → "// 01 — TÍTULO". Sem número → "// TÍTULO". */
  numero?: string;
  children: ReactNode;
  /** "tinta" para uso sobre fundo âmbar. */
  tom?: "acento" | "tinta" | "neutro";
  className?: string;
};

const TONS = { acento: "text-accent", tinta: "text-bg font-medium", neutro: "text-muted" };

export function RotuloSecao({ numero, children, tom = "acento", className = "" }: Props) {
  return (
    <p className={`font-mono text-[13px] tracking-[0.16em] uppercase ${TONS[tom]} ${className}`}>
      <span aria-hidden="true">{"// "}</span>
      {numero ? `${numero} — ` : null}
      {children}
    </p>
  );
}
