"use client";

import { useState } from "react";
import { formatarData } from "@/lib/format";
import type { Manchete } from "@/lib/tipos";

type Props = { manchetes: Manchete[] };

function Itens({ manchetes, oculto, className = "" }: Props & { oculto?: boolean; className?: string }) {
  return (
    <ul className={`flex shrink-0 gap-12 pr-12 ${className}`} aria-hidden={oculto || undefined}>
      {manchetes.map((m, i) => (
        <li key={`${m.regiao}-${i}`}>
          <span className="text-accent uppercase">{m.regiao}</span> ·{" "}
          {m.traducaoPendente ? <span className="mr-1.5 border border-line-strong px-1 text-[10px] text-text-2">TRADUÇÃO PENDENTE</span> : null}
          {m.url && !oculto ? (
            <a
              href={m.url}
              lang={m.traducaoPendente ? (m.idiomaOriginal ?? undefined) : undefined}
              className="text-text-3 hover:text-accent"
              rel="noopener noreferrer"
              target="_blank"
            >
              {m.titulo}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          ) : (
            <span lang={m.traducaoPendente ? (m.idiomaOriginal ?? undefined) : undefined}>{m.titulo}</span>
          )}
          <span className="text-muted">
            {" — "}
            {m.fonte.nome}
            {m.publicadoEm ? `, ${formatarData(m.publicadoEm)}` : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Faixa "AO VIVO" com rolagem horizontal. Pode ser pausada (WCAG 2.2.2) e respeita reduced-motion. */
export function TickerAoVivo({ manchetes }: Props) {
  const [pausado, setPausado] = useState(false);

  return (
    <section aria-label="Manchetes ao vivo" className="flex items-stretch overflow-hidden border-t border-line bg-surface-3">
      <div className="z-10 flex flex-none items-center gap-2 bg-alert px-4 py-2.5 font-mono text-xs font-medium tracking-[0.1em] text-bg">
        <span aria-hidden="true" className={`size-2 rounded-full bg-bg ${pausado ? "" : "anim-blip"}`} />
        AO VIVO
      </div>
      {/* Parado (pausa ou movimento reduzido), o trilho rola na horizontal para nenhuma manchete ficar cortada. */}
      <div
        tabIndex={0}
        aria-label="Lista de manchetes"
        className={`ticker-trilho group relative min-w-0 flex-1 ${pausado ? "overflow-x-auto" : "overflow-hidden"}`}
      >
        <div
          className={`flex w-max py-2.5 pl-6 font-mono text-xs whitespace-nowrap text-muted ${pausado ? "" : "anim-ticker group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"}`}
        >
          <Itens manchetes={manchetes} />
          <Itens manchetes={manchetes} oculto className={`ticker-copia ${pausado ? "hidden" : ""}`} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPausado((p) => !p)}
        aria-pressed={pausado}
        className="z-10 flex min-h-11 min-w-11 flex-none items-center justify-center border-l border-line bg-surface-3 px-3 font-mono text-xs text-text-2 hover:text-accent"
      >
        <span className="sr-only">{pausado ? "Retomar rolagem das manchetes" : "Pausar rolagem das manchetes"}</span>
        <span aria-hidden="true">{pausado ? "▶" : "❚❚"}</span>
      </button>
    </section>
  );
}
