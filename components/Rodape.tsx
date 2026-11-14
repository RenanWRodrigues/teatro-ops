import type { ReactNode } from "react";

type Props = {
  /** Nota específica da página (ex.: aviso sobre especificações aproximadas). */
  nota?: ReactNode;
};

export function Rodape({ nota }: Props) {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="container-ops flex flex-wrap justify-between gap-5 py-10 font-mono text-xs tracking-[0.06em] text-muted">
        <p>
          {nota ?? "TEATRO//OPS · conteúdo informativo baseado em inteligência de fontes abertas (OSINT)"}
        </p>
        {/* Links "Metodologia" e "Fontes" voltam quando /metodologia e /fontes existirem (Fase 9). */}
      </div>
    </footer>
  );
}
