import type { ReactNode } from "react";

type Nivel = "h1" | "h2" | "h3";
type Tamanho = "hero" | "secao" | "card";

const TAMANHOS: Record<Tamanho, string> = {
  // Mínimos reduzidos em telas pequenas para palavras longas caberem em 375 px.
  hero: "text-[clamp(48px,9vw,132px)] leading-[0.88] tracking-[-0.01em]",
  secao: "text-[44px] leading-[0.95] sm:text-[64px]",
  card: "text-[28px] leading-none",
};

type Props = {
  como?: Nivel;
  tamanho?: Tamanho;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function TituloSecao({ como: Tag = "h2", tamanho = "secao", children, className = "", id }: Props) {
  return (
    <Tag id={id} className={`font-display font-extrabold uppercase [overflow-wrap:anywhere] ${TAMANHOS[tamanho]} ${className}`}>
      {children}
    </Tag>
  );
}
