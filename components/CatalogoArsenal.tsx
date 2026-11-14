"use client";

import { useMemo, useState, type ReactNode } from "react";
import { formatarNumero } from "@/lib/format";
import { CATEGORIAS, type Categoria, type Equipamento } from "@/lib/tipos";
import { CardEquipamento } from "./CardEquipamento";

type Ordem = "relevancia" | "nome" | "pais";

const ORDENS: Record<Ordem, string> = {
  relevancia: "Ordenar por relevância",
  nome: "Nome (A–Z)",
  pais: "País de origem",
};

const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
const comparar = new Intl.Collator("pt-BR", { sensitivity: "base" }).compare;

type Props = {
  equipamentos: Equipamento[];
  categorias: Categoria[];
  categoriaInicial?: Categoria | "todos";
  /** Rótulo e título do hero (renderizados no servidor). */
  children: ReactNode;
};

export function CatalogoArsenal({ equipamentos, categorias, categoriaInicial = "todos", children }: Props) {
  const [categoria, setCategoria] = useState<Categoria | "todos">(categoriaInicial);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("relevancia");

  const itens = useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtrados = equipamentos.filter((e) => {
      if (categoria !== "todos" && e.categoria !== categoria) return false;
      if (!termo) return true;
      return normalizar([e.nome, e.descricao, e.fabricante ?? "", ...e.paises].join(" ")).includes(termo);
    });
    if (ordem === "nome") return [...filtrados].sort((a, b) => comparar(a.nome, b.nome));
    if (ordem === "pais") return [...filtrados].sort((a, b) => comparar(a.paises[0] ?? "", b.paises[0] ?? ""));
    return filtrados;
  }, [equipamentos, categoria, busca, ordem]);

  const rotuloCategoria = categoria === "todos" ? "Todos" : CATEGORIAS[categoria];
  const qtd = itens.length;

  return (
    <>
      <section className="malha-tatica border-b border-line">
        <div className="container-ops pt-14 pb-14 md:pt-[72px]">
          {children}
      <div className="mt-9 flex max-w-[880px] flex-wrap gap-3">
        <label htmlFor="busca" className="sr-only">
          Buscar equipamento
        </label>
        <input
          id="busca"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, país ou fabricante…"
          className="h-14 min-w-0 flex-[1_1_360px] border border-line-strong bg-surface-3 px-5 font-mono text-[15px] text-text placeholder:text-muted"
        />
        <label htmlFor="ordem" className="sr-only">
          Ordenar
        </label>
        <select
          id="ordem"
          value={ordem}
          onChange={(e) => setOrdem(e.target.value as Ordem)}
          className="h-14 border border-line-strong bg-surface-3 px-4 font-mono text-sm text-text"
        >
          {(Object.keys(ORDENS) as Ordem[]).map((o) => (
            <option key={o} value={o}>
              {ORDENS[o]}
            </option>
          ))}
        </select>
      </div>
        </div>
      </section>

      <section aria-label="Equipamentos" className="container-ops pt-10 pb-24">

      <div role="group" aria-label="Filtrar por categoria" className="mb-8 flex flex-wrap gap-2.5">
        {(["todos", ...categorias] as const).map((c) => {
          const sel = c === categoria;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={sel}
              onClick={() => setCategoria(c)}
              className={`h-11 border px-[18px] font-mono text-[13px] tracking-[0.08em] uppercase ${
                sel ? "border-accent bg-accent text-bg" : "border-line-strong text-text-2 hover:border-accent hover:text-accent"
              }`}
            >
              {c === "todos" ? "Todos" : CATEGORIAS[c]}
            </button>
          );
        })}
      </div>

      <p className="mb-5 font-mono text-[13px] tracking-[0.06em] text-muted uppercase" aria-live="polite">
        {formatarNumero(qtd, { casas: 0 })} {qtd === 1 ? "equipamento" : "equipamentos"} · {rotuloCategoria}
      </p>

      {qtd > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
          {itens.map((e) => (
            <li key={e.slug} className="flex">
              <CardEquipamento equipamento={e} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-line p-8 text-muted">Nenhum equipamento encontrado. Tente outro termo ou categoria.</p>
      )}
      </section>
    </>
  );
}
