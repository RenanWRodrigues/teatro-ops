import Link from "next/link";
import type { ReactNode } from "react";

/** Corpo comum das telas de erro e de página não encontrada (pt-BR, sem detalhe técnico para o leitor). */
export function TelaErro({ codigo, titulo, texto, acao }: { codigo: string; titulo: string; texto: ReactNode; acao?: ReactNode }) {
  return (
    <main id="conteudo" tabIndex={-1} className="flex-1">
      <section className="malha-tatica border-b border-line">
        <div className="container-ops pt-16 pb-16 md:pt-24">
          <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">{codigo}</p>
          <h1 className="mt-3.5 font-display text-[clamp(44px,8vw,96px)] leading-[0.9] font-extrabold uppercase [overflow-wrap:anywhere]">
            {titulo}
          </h1>
          <div className="mt-6 max-w-[640px] text-lg leading-relaxed text-text-2">{texto}</div>
          <div className="mt-8 flex flex-wrap gap-4">
            {acao}
            <Link
              href="/"
              className="inline-flex min-h-12 items-center border border-line-strong px-6 font-mono text-sm tracking-[0.1em] uppercase hover:border-accent hover:text-accent"
            >
              Ir para a página inicial
            </Link>
            <Link
              href="/busca"
              className="inline-flex min-h-12 items-center border border-line-strong px-6 font-mono text-sm tracking-[0.1em] uppercase hover:border-accent hover:text-accent"
            >
              Buscar no site
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
