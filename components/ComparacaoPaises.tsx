"use client";

import { useId, useMemo, useState } from "react";
import { formatarNumero } from "@/lib/format";
import { contarPorRotulo } from "@/lib/governos/classificacao";
import { PAISES_MONITORADOS } from "@/lib/governos/paises";
import { diaParaBr, fimSemana, inicioSemana } from "@/lib/governos/semanas";
import type { Decisao } from "@/lib/tipos";
import { Bandeira } from "./Bandeira";
import { CardDecisao } from "./CardDecisao";

type Props = {
  /** Decisões de todos os países (janela do servidor). */
  decisoes: Decisao[];
  paisInicial: string;
};

const n = (v: number) => formatarNumero(v, { casas: 0 });

type PropsSeletor = { id: string; valor: string; aoMudar: (v: string) => void; rotulo: string };

function Seletor({ id, valor, aoMudar, rotulo }: PropsSeletor) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="h-11 min-w-[200px] border border-line-field bg-surface-3 px-3 font-mono text-[13px] text-text"
      >
        {PAISES_MONITORADOS.map((p) => (
          <option key={p.codigo} value={p.codigo}>
            {p.nome}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Comparação lado a lado de dois países na mesma semana: mesma estrutura e destaque para os dois. */
export function ComparacaoPaises({ decisoes, paisInicial }: Props) {
  const id = useId();
  const semanas = useMemo(() => [...new Set(decisoes.map((d) => inicioSemana(d.publicadoEm)))].sort().reverse(), [decisoes]);
  const comDados = useMemo(() => new Set(decisoes.map((d) => d.pais)), [decisoes]);
  const segundoPadrao = PAISES_MONITORADOS.find((p) => p.codigo !== paisInicial && comDados.has(p.codigo))?.codigo ?? PAISES_MONITORADOS.find((p) => p.codigo !== paisInicial)!.codigo;

  const [a, setA] = useState<string>(paisInicial);
  const [b, setB] = useState<string>(segundoPadrao);
  const [semana, setSemana] = useState(semanas[0] ?? "");

  if (semanas.length === 0) {
    return <p className="border border-line p-6 text-sm text-muted">Ainda não há itens coletados para comparar.</p>;
  }

  const daSemana = decisoes.filter((d) => inicioSemana(d.publicadoEm) === semana);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end gap-4">
        <Seletor id={`${id}-a`} valor={a} aoMudar={setA} rotulo="País A" />
        <Seletor id={`${id}-b`} valor={b} aoMudar={setB} rotulo="País B" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-semana`} className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
            Semana
          </label>
          <select
            id={`${id}-semana`}
            value={semana}
            onChange={(e) => setSemana(e.target.value)}
            className="h-11 border border-line-field bg-surface-3 px-3 font-mono text-[13px] text-text"
          >
            {semanas.map((s) => (
              <option key={s} value={s}>
                {diaParaBr(s)} a {diaParaBr(fimSemana(s))}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6" aria-live="polite">
        {[a, b].map((codigo, i) => {
          const pais = PAISES_MONITORADOS.find((p) => p.codigo === codigo)!;
          const itens = daSemana.filter((d) => d.pais === codigo);
          const porTipo = contarPorRotulo(itens);
          return (
            <section key={`${i}-${codigo}`} aria-labelledby={`${id}-col-${i}`} className="flex min-w-0 flex-col border border-line">
              <header className="border-b border-line p-5">
                <h3 id={`${id}-col-${i}`} className="flex items-center gap-3 font-display text-[28px] leading-none font-extrabold uppercase">
                  <Bandeira pais={codigo} />
                  {pais.nome}
                </h3>
                <p className="mt-3 font-mono text-xs text-text-2">
                  {n(itens.length)} {itens.length === 1 ? "item" : "itens"} na semana
                  {porTipo.length > 0 ? ` · ${porTipo.map(([rotulo, q]) => `${rotulo}: ${n(q)}`).join(" · ")}` : ""}
                </p>
              </header>
              {itens.length > 0 ? (
                itens.map((d) => <CardDecisao key={d.id} decisao={d} semPais nivel="h4" />)
              ) : (
                <p className="p-5 text-sm text-muted">Nenhum item coletado {pais.doPais} nesta semana.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
