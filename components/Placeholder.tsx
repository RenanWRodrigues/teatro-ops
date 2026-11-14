import type { ReactNode } from "react";

type Props = {
  /** Texto do placeholder, ex.: "FOTO · CABINE". Exibido entre colchetes. */
  rotulo: string;
  className?: string;
  children?: ReactNode;
};

/** Área de imagem sem foto livre disponível: fundo listrado do design system. */
export function Placeholder({ rotulo, className = "", children }: Props) {
  return (
    <div className={`placeholder-listrado relative flex items-center justify-center ${className}`}>
      <span aria-hidden="true" className="px-3 text-center font-mono text-xs tracking-[0.1em] text-muted">
        [{rotulo}]
      </span>
      {children}
    </div>
  );
}
