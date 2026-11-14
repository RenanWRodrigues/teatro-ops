import Link from "next/link";
import type { ReactNode } from "react";
import { IconeSeta } from "./IconeSeta";

type Props = {
  href: string;
  children: ReactNode;
  seta?: boolean;
  tamanho?: "lg" | "md";
  /** "invertido" = fundo escuro e texto âmbar (para faixas âmbar). */
  tom?: "padrao" | "invertido";
  className?: string;
};

const TAMANHOS = { lg: "h-14 px-7 text-xl", md: "h-12 px-5 text-lg" };
const TONS = {
  padrao: "bg-accent text-bg hover:bg-accent-hover",
  invertido: "bg-bg text-accent hover:text-accent-hover",
};

export function BotaoPrimario({ href, children, seta, tamanho = "lg", tom = "padrao", className = "" }: Props) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-3 font-display font-bold tracking-[0.06em] uppercase transition-colors ${TAMANHOS[tamanho]} ${TONS[tom]} ${className}`}
    >
      {children}
      {seta ? <IconeSeta /> : null}
    </Link>
  );
}
