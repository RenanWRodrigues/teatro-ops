import Link from "next/link";
import type { Manchete } from "@/lib/tipos";
import { TickerAoVivo } from "./TickerAoVivo";

export type SecaoNav = "conflitos" | "arsenal" | "taticas" | "tecnologia" | "arquivo";

// Conflitos, Táticas e Arquivo apontam para âncoras da home até as rotas próprias existirem (Fases 5 e 9).
const NAV: { id: SecaoNav; rotulo: string; href: string }[] = [
  { id: "conflitos", rotulo: "Conflitos", href: "/#conflitos" },
  { id: "arsenal", rotulo: "Arsenal", href: "/arsenal" },
  { id: "taticas", rotulo: "Táticas", href: "/#taticas" },
  { id: "tecnologia", rotulo: "IA e drones", href: "/tecnologia" },
  { id: "arquivo", rotulo: "Arquivo", href: "/#arquivo" },
];

type ItemTrilha = { rotulo: string; href?: string };

type Props = {
  ativo?: SecaoNav;
  /** Substitui a navegação principal por uma trilha (ex.: ficha técnica). */
  trilha?: ItemTrilha[];
  /** Mostra busca e "Boletim diário" (home). */
  comAcoes?: boolean;
  ticker?: Manchete[];
};

export function Logo() {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-3 text-text hover:text-text">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="var(--accent)" strokeWidth="1.6" aria-hidden="true">
        <circle cx="15" cy="15" r="10" />
        <circle cx="15" cy="15" r="3" />
        <path d="M15 1v8M15 21v8M1 15h8M21 15h8" />
      </svg>
      <span className="font-display text-[26px] font-extrabold tracking-[0.06em]">
        TEATRO<span className="text-accent">{"//"}</span>OPS
      </span>
      <span className="sr-only">— página inicial</span>
    </Link>
  );
}

export function Cabecalho({ ativo, trilha, comAcoes, ticker }: Props) {
  return (
    <header className="relative border-b border-line">
      <div className="container-ops flex flex-wrap items-center justify-between gap-x-5 gap-y-3 py-[18px]">
        <Logo />
        {trilha ? (
          <nav aria-label="Trilha de navegação" className="font-mono text-[13px] tracking-[0.08em] text-muted uppercase">
            <ol className="flex flex-wrap items-center gap-x-2.5">
              {trilha.map((item, i) => (
                <li key={item.rotulo} className="flex items-center gap-2.5">
                  {i > 0 ? <span aria-hidden="true">/</span> : null}
                  {item.href ? (
                    <Link href={item.href} className="inline-flex min-h-11 items-center text-text-2 hover:text-accent">
                      {item.rotulo}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-accent">
                      {item.rotulo}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : (
          <nav aria-label="Principal" className="font-mono text-[13px] tracking-[0.08em] uppercase">
            <ul className="flex flex-wrap gap-x-7 gap-y-1">
              {NAV.map((item) => {
                const atual = item.id === ativo;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={atual ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center border-b-2 ${
                        atual ? "border-accent text-accent" : "border-transparent text-text-2 hover:text-accent"
                      }`}
                    >
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        {comAcoes ? (
          <div className="flex items-center gap-3">
            <Link
              href="/arsenal#busca"
              aria-label="Buscar no arsenal"
              className="flex size-11 items-center justify-center border border-line-panel text-text hover:border-accent hover:text-accent"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
            </Link>
            <Link
              href="/#boletim"
              className="flex h-11 items-center bg-accent px-5 font-mono text-[13px] font-medium tracking-[0.08em] text-bg uppercase hover:bg-accent-hover"
            >
              Boletim diário
            </Link>
          </div>
        ) : null}
      </div>
      {ticker && ticker.length > 0 ? <TickerAoVivo manchetes={ticker} /> : null}
    </header>
  );
}
