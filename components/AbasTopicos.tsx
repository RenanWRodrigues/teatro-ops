"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { TopicoTecnologia } from "@/lib/tipos";
import { ListaFontes } from "./ListaFontes";
import { Placeholder } from "./Placeholder";

type Props = { topicos: TopicoTecnologia[] };

/** Abas acessíveis (padrão WAI-ARIA: setas, Home e End movem o foco e ativam a aba). */
export function AbasTopicos({ topicos }: Props) {
  const [ativo, setAtivo] = useState(0);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const atual = topicos[ativo];

  function selecionar(i: number) {
    const n = topicos.length;
    const alvo = ((i % n) + n) % n;
    setAtivo(alvo);
    botoes.current[alvo]?.focus();
  }

  function aoTeclar(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const mapa: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: topicos.length - 1 };
    const destino = mapa[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    selecionar(destino);
  }

  if (!atual) return null;

  return (
    <div>
      <div role="tablist" aria-label="Tópicos" className="mt-6 flex flex-wrap border-b border-line">
        {topicos.map((t, i) => {
          const sel = i === ativo;
          return (
            <button
              key={t.id}
              ref={(el) => {
                botoes.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-aba-${t.id}`}
              aria-selected={sel}
              aria-controls={`${base}-painel`}
              tabIndex={sel ? 0 : -1}
              onClick={() => setAtivo(i)}
              onKeyDown={(e) => aoTeclar(e, i)}
              className={`-mb-px min-h-14 border-b-[3px] px-4 font-display text-[22px] font-bold tracking-[0.04em] uppercase sm:px-6 ${
                sel ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"
              }`}
            >
              <span className="mr-2.5 font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
              {t.rotulo}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${base}-painel`}
        aria-labelledby={`${base}-aba-${atual.id}`}
        tabIndex={0}
        className="flex flex-wrap gap-12 pt-12"
      >
        <div className="min-w-0 flex-[1_1_520px]">
          <h2 className="font-display text-[48px] leading-[0.9] font-extrabold uppercase [overflow-wrap:anywhere] sm:text-[72px]">
            {atual.titulo}
          </h2>
          <p className="mt-6 max-w-[620px] text-[19px] leading-[1.65] text-text-2">{atual.texto}</p>
          <dl className="mt-9 flex flex-col gap-px border border-line bg-line">
            {atual.pontos.map((p) => (
              <div key={p.chave} className="flex flex-wrap items-baseline gap-x-5 gap-y-1 bg-surface px-6 py-5">
                <dt className="font-mono text-xs text-accent">{p.chave}</dt>
                <dd className="text-base leading-normal">{p.valor}</dd>
              </div>
            ))}
          </dl>
          <ListaFontes fontes={atual.fontes} className="mt-4" />
        </div>
        <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-5">
          <Placeholder rotulo={`INFOGRÁFICO · ${atual.titulo}`} className="h-[320px] border border-line" />
          <aside className="border border-accent bg-surface-accent p-6" aria-label="Debate">
            <p className="font-mono text-xs tracking-[0.14em] text-accent">DEBATE</p>
            <p className="mt-2.5 text-base leading-relaxed">{atual.debate}</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
