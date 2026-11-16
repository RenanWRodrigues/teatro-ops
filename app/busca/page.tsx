import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TituloSecao } from "@/components/TituloSecao";
import { normalizarTermo, obterBusca } from "@/lib/dados";
import type { ResultadoBusca } from "@/lib/db/esquemas";
import { formatarData } from "@/lib/format";
import { paisPorCodigo } from "@/lib/governos/paises";
import { CATEGORIAS, type Categoria } from "@/lib/tipos";

export const metadata: Metadata = metadados({
  titulo: "Busca",
  descricao: "Busque em notícias, decisões de governos, conflitos e equipamentos do TEATRO//OPS.",
  caminho: "/busca", indexar: false,
});

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const GRUPOS: { tipo: ResultadoBusca["tipo"]; titulo: string }[] = [
  { tipo: "equipamento", titulo: "Equipamentos" },
  { tipo: "conflito", titulo: "Conflitos" },
  { tipo: "decisao", titulo: "Decisões de governos" },
  { tipo: "noticia", titulo: "Notícias" },
];

const LINK = "underline underline-offset-2 hover:text-accent";

function Item({ r }: { r: ResultadoBusca }) {
  const interno =
    r.tipo === "equipamento" ? `/arsenal/${r.extra}/${r.chave}` : r.tipo === "conflito" ? `/conflitos/${r.chave}` : null;
  const detalhe =
    r.tipo === "equipamento"
      ? (CATEGORIAS[r.extra as Categoria] ?? r.extra)
      : r.tipo === "conflito"
        ? r.extra
        : r.tipo === "decisao"
          ? [r.extra ? (paisPorCodigo(r.extra)?.nome ?? r.extra) : null, r.resumo].filter(Boolean).join(" · ")
          : r.extra;
  return (
    <li className="flex flex-col gap-1.5 bg-bg px-5 py-4">
      <h3 className="text-base leading-snug font-semibold">
        {interno ? (
          <Link href={interno} className={LINK}>
            {r.titulo}
          </Link>
        ) : r.url ? (
          <a href={r.url} lang={r.pendente ? (r.idioma ?? undefined) : undefined} className={LINK} rel="noopener noreferrer" target="_blank">
            {r.titulo}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        ) : (
          r.titulo
        )}
      </h3>
      {r.pendente ? <p className="font-mono text-[11px] text-text-2">TRADUÇÃO PENDENTE — título no idioma original</p> : null}
      {r.tipo !== "decisao" && r.resumo ? <p className="text-sm leading-relaxed text-text-2">{r.resumo}</p> : null}
      <p className="font-mono text-xs text-muted">
        {detalhe}
        {r.data && (r.tipo === "noticia" || r.tipo === "decisao") ? (
          <>
            {detalhe ? " · " : null}
            <time dateTime={r.data}>{formatarData(r.data)}</time>
          </>
        ) : null}
      </p>
    </li>
  );
}

async function Resultados({ searchParams }: Props) {
  const termo = normalizarTermo((await searchParams).q);
  if (termo.length < 2) {
    return <p className="text-base text-text-2">Digite pelo menos duas letras para buscar.</p>;
  }
  const resposta = await obterBusca(termo);
  if (!resposta.ok) {
    return (
      <p role="status" className="border border-line bg-surface px-6 py-5 text-base leading-relaxed text-text-2">
        Busca temporariamente indisponível. Tente de novo em alguns minutos ou navegue pelas seções do site.
      </p>
    );
  }
  const { resultados } = resposta;
  return (
    <div className="flex flex-col gap-10">
      <p role="status" className="font-mono text-xs text-muted">
        {resultados.length === 0
          ? `Nenhum resultado para “${termo}”.`
          : `${resultados.length} ${resultados.length === 1 ? "resultado" : "resultados"} para “${termo}”.`}
      </p>
      {resultados.length === 0 ? (
        <p className="text-base leading-relaxed text-text-2">
          Tente outra palavra, sem abreviações, ou procure por país, equipamento ou tema (por exemplo: drones, Ucrânia,
          sanções).
        </p>
      ) : null}
      {GRUPOS.map(({ tipo, titulo }) => {
        const lista = resultados.filter((r) => r.tipo === tipo);
        if (lista.length === 0) return null;
        return (
          <section key={tipo} aria-labelledby={`grupo-${tipo}`}>
            <h2 id={`grupo-${tipo}`} className="font-display text-[28px] leading-none font-extrabold uppercase md:text-[36px]">
              {titulo}
            </h2>
            <ul className="mt-5 flex flex-col gap-px border border-line bg-line">
              {lista.map((r) => (
                <Item key={`${r.tipo}-${r.chave}`} r={r} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

async function CampoBusca({ searchParams }: Props) {
  const termo = normalizarTermo((await searchParams).q);
  return <Campo valor={termo} />;
}

function Campo({ valor = "" }: { valor?: string }) {
  return (
    <form action="/busca" method="get" role="search" className="mt-8 flex max-w-[720px] flex-wrap gap-3">
      <label htmlFor="campo-busca" className="sr-only">
        Termo de busca
      </label>
      <input
        id="campo-busca"
        name="q"
        type="search"
        defaultValue={valor}
        maxLength={100}
        placeholder="Ex.: drones, Ucrânia, sanções, Rafale"
        className="min-h-12 min-w-0 flex-[1_1_280px] border border-line-field bg-surface px-4 text-base text-text placeholder:text-muted focus:border-accent"
      />
      <button
        type="submit"
        className="min-h-12 border border-accent bg-accent px-6 font-mono text-sm tracking-[0.1em] text-bg uppercase hover:bg-accent-hover"
      >
        Buscar
      </button>
    </form>
  );
}

export default function Page(props: Props) {
  return (
    <>
      <Cabecalho />
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops pt-14 pb-12 md:pt-[72px]">
            <RotuloSecao>Busca</RotuloSecao>
            <TituloSecao como="h1" tamanho="hero" className="mt-3.5">
              Buscar
            </TituloSecao>
            <p className="mt-6 max-w-[720px] text-lg leading-relaxed text-text-2">
              Notícias, decisões de governos, conflitos e equipamentos, em português e sem depender de acentos.
            </p>
            <Suspense fallback={<Campo />}>
              <CampoBusca {...props} />
            </Suspense>
          </div>
        </section>
        <section aria-label="Resultados da busca">
          <div className="container-ops py-12">
            <Suspense fallback={<p className="font-mono text-xs text-muted">Buscando…</p>}>
              <Resultados {...props} />
            </Suspense>
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}
