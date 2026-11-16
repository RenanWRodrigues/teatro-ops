import type { ReactNode } from "react";

/** Faixa exibida enquanto a página usa fixtures [EXEMPLO] em vez de dados das fontes. */
export function AvisoExemplo({ children }: { children?: ReactNode }) {
  return (
    <div role="note" className="border-b border-accent bg-surface-accent">
      <p className="container-ops py-2.5 font-mono text-xs tracking-[0.06em] text-text-2">
        <strong className="font-medium text-accent">[EXEMPLO]</strong>{" "}
        {children ?? "Dados de demonstração: o conteúdo desta página ainda não vem das fontes reais e não deve ser citado."}
      </p>
    </div>
  );
}
