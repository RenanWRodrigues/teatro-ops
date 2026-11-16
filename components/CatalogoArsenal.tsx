"use client";

import { useMemo, useState, type ReactNode } from "react";
import { formatarNumero } from "@/lib/format";
import { CATEGORIAS, type Categoria, type Equipamento } from "@/lib/tipos";
import { CardEquipamento } from "./CardEquipamento";

type Ordem = "relevancia" | "nome" | "pais";
type Status = "todos" | "em_servico" | "fora_servico";

const ORDENS: Record<Ordem, string> = {
  relevancia: "Ordenar por relevância",
  nome: "Nome (A–Z)",
  pais: "País de origem",
};

const STATUS: Record<Status, string> = {
  todos: "Qualquer status",
  em_servico: "Em serviço",
  fora_servico: "Fora de serviço ou sem data de entrada",
};

/** Itens por página: 4 linhas de 3 no desktop. */
export const POR_PAGINA = 12;

const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
const comparar = new Intl.Collator("pt-BR", { sensitivity: "base" }).compare;

type Props = {
  equipamentos: Equipamento[];
  categorias: Categoria[];
  categoriaInicial?: Categoria | "todos";
  /** Rótulo e título do hero (renderizados no servidor). */
  children: ReactNode;
};

const CAMPO = "h-14 border border-line-field bg-surface-3 px-4 font-mono text-sm text-text";

export function CatalogoArsenal({ equipamentos, categorias, categoriaInicial = "todos", children }: Props) {
  const [categoria, setCategoria] = useState<Categoria | "todos">(categoriaInicial);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("relevancia");
  const [pais, setPais] = useState("todos");
  const [status, setStatus] = useState<Status>("todos");
  const [pagina, setPagina] = useState(1);

  const paises = useMemo(() => [...new Set(equipamentos.flatMap((e) => e.paises))].sort(comparar), [equipamentos]);

  const itens = useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtrados = equipamentos.filter((e) => {
      if (categoria !== "todos" && e.categoria !== categoria) return false;
      if (pais !== "todos" && !e.paises.includes(pais)) return false;
      if (status === "em_servico" && e.emServico !== true) return false;
      if (status === "fora_servico" && e.emServico === true) return false;
      if (!termo) return true;
      // Busca em português sem acento: nome, descrição, fabricante, países, classe e categoria.
      return normalizar([e.nome, e.descricao, e.fabricante ?? "", e.classe ?? "", CATEGORIAS[e.categoria], ...e.paises].join(" ")).includes(termo);
    });
    if (ordem === "nome") return [...filtrados].sort((a, b) => comparar(a.nome, b.nome));
    if (ordem === "pais") return [...filtrados].sort((a, b) => comparar(a.paises[0] ?? "", b.paises[0] ?? ""));
    return filtrados;
  }, [equipamentos, categoria, busca, ordem, pais, status]);

  const totalPaginas = Math.max(1, Math.ceil(itens.length / POR_PAGINA));
  const atual = Math.min(pagina, totalPaginas);
  const daPagina = itens.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);

  // Qualquer mudança de filtro volta à 1ª página.
  const filtrar =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPagina(1);
    };

  const rotuloCategoria = categoria === "todos" ? "Todos" : CATEGORIAS[categoria];
  const qtd = itens.length;

  // Ao trocar de página, o foco vai para o contador acima da lista (WCAG 2.4.3): o botão clicado pode ficar
  // desabilitado e o foco cairia no <body>.
  const irPara = (p: number) => {
    setPagina(p);
    const contador = document.getElementById("contador-equipamentos");
    contador?.scrollIntoView({ block: "start" });
    contador?.focus({ preventScroll: true });
  };

  return (
    <>
      <section className="malha-tatica border-b border-line">
        <div className="container-ops pt-14 pb-14 md:pt-[72px]">
          {children}
          <div className="mt-9 flex max-w-[1100px] flex-wrap gap-3">
            <label htmlFor="busca" className="sr-only">
              Buscar equipamento
            </label>
            <input
              id="busca"
              type="search"
              value={busca}
              onChange={(e) => filtrar(setBusca)(e.target.value)}
              placeholder="Buscar por nome, país ou fabricante…"
              className={`${CAMPO} min-w-0 flex-[1_1_360px] px-5 text-[15px] placeholder:text-muted`}
            />
            <label htmlFor="pais" className="sr-only">
              País de origem
            </label>
            <select id="pais" value={pais} onChange={(e) => filtrar(setPais)(e.target.value)} className={`${CAMPO} min-w-0 flex-[1_1_200px]`}>
              <option value="todos">Todos os países</option>
              {paises.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <label htmlFor="status" className="sr-only">
              Status
            </label>
            <select id="status" value={status} onChange={(e) => filtrar(setStatus)(e.target.value as Status)} className={`${CAMPO} min-w-0 flex-[1_1_200px]`}>
              {(Object.keys(STATUS) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS[s]}
                </option>
              ))}
            </select>
            <label htmlFor="ordem" className="sr-only">
              Ordenar
            </label>
            <select id="ordem" value={ordem} onChange={(e) => filtrar(setOrdem)(e.target.value as Ordem)} className={`${CAMPO} min-w-0 flex-[1_1_200px]`}>
              {(Object.keys(ORDENS) as Ordem[]).map((o) => (
                <option key={o} value={o}>
                  {ORDENS[o]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section id="lista-equipamentos" aria-label="Equipamentos" className="container-ops scroll-mt-4 pt-10 pb-24">
        <div role="group" aria-label="Filtrar por categoria" className="mb-8 flex flex-wrap gap-2.5">
          {(["todos", ...categorias] as const).map((c) => {
            const sel = c === categoria;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={sel}
                onClick={() => filtrar(setCategoria)(c)}
                className={`h-11 border px-[18px] font-mono text-[13px] tracking-[0.08em] uppercase ${
                  sel ? "border-accent bg-accent text-bg" : "border-line-strong text-text-2 hover:border-accent hover:text-accent"
                }`}
              >
                {c === "todos" ? "Todos" : CATEGORIAS[c]}
              </button>
            );
          })}
        </div>

        <p
          id="contador-equipamentos"
          tabIndex={-1}
          className="mb-5 scroll-mt-4 font-mono text-[13px] tracking-[0.06em] text-muted uppercase"
          aria-live="polite"
        >
          {formatarNumero(qtd, { casas: 0 })} {qtd === 1 ? "equipamento" : "equipamentos"} · {rotuloCategoria}
          {totalPaginas > 1 ? ` · página ${atual} de ${totalPaginas}` : ""}
        </p>

        {qtd > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            {daPagina.map((e) => (
              <li key={e.slug} className="flex">
                <CardEquipamento equipamento={e} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="border border-line p-8 text-muted">Nenhum equipamento encontrado. Tente outro termo, país, status ou categoria.</p>
        )}

        {totalPaginas > 1 ? (
          <nav aria-label="Paginação" className="mt-10 flex flex-wrap items-center gap-2.5 font-mono text-[13px]">
            <button
              type="button"
              onClick={() => irPara(atual - 1)}
              disabled={atual === 1}
              className="h-11 border border-line-strong px-4 text-text-2 uppercase hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => irPara(p)}
                aria-current={p === atual ? "page" : undefined}
                aria-label={`Página ${p}`}
                className={`size-11 border ${p === atual ? "border-accent bg-accent text-bg" : "border-line-strong text-text-2 hover:border-accent hover:text-accent"}`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => irPara(atual + 1)}
              disabled={atual === totalPaginas}
              className="h-11 border border-line-strong px-4 text-text-2 uppercase hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima →
            </button>
          </nav>
        ) : null}
      </section>
    </>
  );
}
