"use client";

import { useMemo, useState } from "react";
import { formatarNumero } from "@/lib/format";
import { ROTULO_TIPO, TIPOS_DECISAO, type TipoDecisao } from "@/lib/governos/classificacao";
import { diaBrasilia, diaParaBr } from "@/lib/governos/semanas";
import type { Decisao } from "@/lib/tipos";
import { CardDecisao } from "./CardDecisao";

const PERIODOS = { 7: "Últimos 7 dias", 30: "Últimos 30 dias", 90: "Últimos 90 dias" } as const;
type Periodo = keyof typeof PERIODOS;

type Props = { decisoes: Decisao[] };

/** Linha do tempo de um país, agrupada por dia, com filtro por tipo e por período. */
export function LinhaDoTempoDecisoes({ decisoes }: Props) {
  const [tipo, setTipo] = useState<TipoDecisao | "todos">("todos");
  const [periodo, setPeriodo] = useState<Periodo>(90);
  // Instante de corte, calculado no evento de mudança (o relógio não entra na renderização).
  // 90 dias = tudo o que o servidor enviou: corte nulo, sem divergência na hidratação.
  const [corte, setCorte] = useState<number | null>(null);
  const mudarPeriodo = (p: Periodo) => {
    setPeriodo(p);
    setCorte(p === 90 ? null : Date.now() - p * 86_400_000);
  };

  // Só os tipos que aparecem nos dados (botões vazios confundem).
  const tipos = useMemo(() => TIPOS_DECISAO.filter((t) => decisoes.some((d) => d.tipo === t)), [decisoes]);

  const dias = useMemo(() => {
    const filtradas = decisoes.filter((d) => (tipo === "todos" || d.tipo === tipo) && (corte === null || Date.parse(d.publicadoEm) >= corte));
    const grupos = new Map<string, Decisao[]>();
    for (const d of filtradas) {
      const dia = diaBrasilia(d.publicadoEm);
      grupos.set(dia, [...(grupos.get(dia) ?? []), d]);
    }
    return [...grupos.entries()];
  }, [decisoes, tipo, corte]);

  const total = dias.reduce((n, [, itens]) => n + itens.length, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2.5">
          {(["todos", ...tipos] as const).map((t) => {
            const sel = t === tipo;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={sel}
                onClick={() => setTipo(t)}
                className={`h-11 border px-4 font-mono text-[12px] tracking-[0.08em] uppercase ${
                  sel ? "border-accent bg-accent text-bg" : "border-line-strong text-text-2 hover:border-accent hover:text-accent"
                }`}
              >
                {t === "todos" ? "Todos" : ROTULO_TIPO[t]}
              </button>
            );
          })}
        </div>
        <label htmlFor="periodo" className="sr-only">
          Período
        </label>
        <select
          id="periodo"
          value={periodo}
          onChange={(e) => mudarPeriodo(Number(e.target.value) as Periodo)}
          className="h-11 border border-line-field bg-surface-3 px-3 font-mono text-[13px] text-text"
        >
          {(Object.keys(PERIODOS) as unknown as Periodo[]).map((p) => (
            <option key={p} value={p}>
              {PERIODOS[p]}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-5 font-mono text-[13px] tracking-[0.06em] text-muted uppercase" aria-live="polite">
        {formatarNumero(total, { casas: 0 })} {total === 1 ? "item" : "itens"} · {tipo === "todos" ? "todos os tipos" : ROTULO_TIPO[tipo]} ·{" "}
        {PERIODOS[periodo].toLowerCase()}
      </p>

      {dias.length > 0 ? (
        <ol className="flex flex-col gap-8">
          {dias.map(([dia, itens]) => (
            <li key={dia}>
              <h3 className="mb-3 font-mono text-sm tracking-[0.12em] text-accent">
                <time dateTime={dia}>{diaParaBr(dia)}</time>
              </h3>
              <div className="border border-line">
                {itens.map((d) => (
                  <CardDecisao key={d.id} decisao={d} semPais nivel="h4" />
                ))}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="border border-line p-6 text-sm text-muted">Nenhum item para este filtro. Escolha outro tipo ou um período maior.</p>
      )}
    </div>
  );
}
