"use client";

import { useState } from "react";
import { formatarData } from "@/lib/format";
import type { Manchete } from "@/lib/tipos";

type Props = { manchetes: Manchete[] };

function Itens({ manchetes, oculto, className = "" }: Props & { oculto?: boolean; className?: string }) {
  return (
    <ul className={`flex ${className}`} aria-hidden={oculto || undefined}>
      {manchetes.map((m, i) => (
        <li key={`${m.regiao}-${i}`}>
          <span className="text-accent uppercase">{m.regiao}</span> ·{" "}
          {m.traducaoPendente ? <span className="mr-1.5 border border-line-strong px-1 text-[10px] text-text-2">TRADUÇÃO PENDENTE</span> : null}
          {m.url && !oculto ? (
            <a
              href={m.url}
              lang={m.traducaoPendente ? (m.idiomaOriginal ?? undefined) : undefined}
              className="text-text-3 underline underline-offset-2 hover:text-accent"
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
            {m.via ? `, via ${m.via.nome}` : null}
            {m.publicadoEm ? `, ${formatarData(m.publicadoEm)}` : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Faixa "AO VIVO" com rolagem horizontal. Pode ser pausada (WCAG 2.2.2) e respeita reduced-motion. */
/** Quantas manchetes a lista vertical mostra antes de "Mostrar todas". */
const NA_LISTA = 3;

export function TickerAoVivo({ manchetes }: Props) {
  const [pausado, setPausado] = useState(false);
  const [todas, setTodas] = useState(false);
  const naLista = todas ? manchetes : manchetes.slice(0, NA_LISTA);

  return (
    <section
      aria-label="Manchetes ao vivo"
      data-pausado={pausado}
      className="ticker flex items-stretch overflow-hidden border-t border-line bg-surface-3"
    >
      <div className="z-10 flex flex-none items-center gap-2 bg-alert px-4 py-2.5 font-mono text-xs font-medium tracking-[0.1em] text-bg">
        <span aria-hidden="true" className={`size-2 rounded-full bg-bg ${pausado ? "" : "anim-blip"}`} />
        AO VIVO
      </div>
      {/* Em movimento: trilho horizontal que para no hover e no foco. */}
      <div tabIndex={0} role="region" aria-label="Lista de manchetes" className="ticker-trilho group relative min-w-0 flex-1 overflow-hidden">
        <div className="anim-ticker flex w-max py-2.5 pl-6 font-mono text-xs whitespace-nowrap text-muted group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused]">
          <Itens manchetes={manchetes} className="shrink-0 gap-12 pr-12" />
          <Itens manchetes={manchetes} oculto className="ticker-copia shrink-0 gap-12 pr-12" />
        </div>
      </div>
      {/* Parado (pausa ou movimento reduzido): lista vertical com quebra de linha, legível em 375 px. */}
      <div className="ticker-lista min-w-0 flex-1 flex-col gap-2 px-4 py-2.5 font-mono text-xs leading-relaxed text-muted sm:px-6">
        <Itens manchetes={naLista} className="flex-col gap-2" />
        {manchetes.length > NA_LISTA ? (
          <button
            type="button"
            onClick={() => setTodas((t) => !t)}
            aria-expanded={todas}
            className="min-h-11 self-start text-text-2 underline underline-offset-2 hover:text-accent"
          >
            {todas ? "Mostrar menos" : `Mostrar todas (${manchetes.length})`}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setPausado((p) => !p)}
        className="z-10 flex min-h-11 min-w-11 flex-none items-center justify-center border-l border-line bg-surface-3 px-3 font-mono text-xs text-text-2 hover:text-accent"
      >
        <span className="sr-only">{pausado ? "Retomar rolagem das manchetes" : "Pausar rolagem das manchetes"}</span>
        <span aria-hidden="true">{pausado ? "▶" : "❚❚"}</span>
      </button>
    </section>
  );
}
