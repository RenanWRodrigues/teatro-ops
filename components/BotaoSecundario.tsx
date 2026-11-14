import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  tamanho?: "lg" | "md";
  className?: string;
};

const TAMANHOS = { lg: "h-14 px-7 text-xl", md: "h-12 px-5 text-lg" };

export function BotaoSecundario({ href, children, tamanho = "lg", className = "" }: Props) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center border border-line-strong font-display font-bold tracking-[0.06em] text-text uppercase transition-colors hover:border-accent hover:text-accent ${TAMANHOS[tamanho]} ${className}`}
    >
      {children}
    </Link>
  );
}
