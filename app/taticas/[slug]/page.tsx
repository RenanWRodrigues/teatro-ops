import type { Metadata } from "next";
import { metadados, NOME_SITE, urlDoSite } from "@/lib/site";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { CorpoDossie } from "@/components/CorpoDossie";
import { DadosEstruturados } from "@/components/DadosEstruturados";
import { DESCRICOES_DIAGRAMA, DiagramaTatica } from "@/components/DiagramaTatica";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TituloSecao } from "@/components/TituloSecao";
import { obterTatica, obterTaticas } from "@/lib/dados";

type Params = PageProps<"/taticas/[slug]">["params"];

export function generateStaticParams() {
  return obterTaticas().map((t) => ({ slug: t.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const t = obterTatica(slug);
  return t ? metadados({ titulo: `${t.titulo} — táticas`, descricao: t.resumo, caminho: `/taticas/${t.id}`, tipo: "article" }) : {};
}

// `params` é aguardado fora de <Suspense> para que slugs inexistentes devolvam 404 real (ver next.config.ts).
export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const t = obterTatica(slug);
  if (!t) notFound();
  const outras = obterTaticas().filter((o) => o.id !== t.id);

  return (
    <>
      <DadosEstruturados
        dados={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: t.titulo,
          description: t.resumo,
          inLanguage: "pt-BR",
          dateModified: t.atualizadoEm,
          url: `${urlDoSite()}/taticas/${t.id}`,
          publisher: { "@type": "Organization", name: NOME_SITE, url: urlDoSite() },
          citation: t.fontes.map((f) => ({ "@type": "CreativeWork", name: f.titulo, url: f.url, publisher: f.nome })),
        }}
      />
      <Cabecalho ativo="taticas" trilha={[{ rotulo: "Táticas", href: "/taticas" }, { rotulo: t.titulo }]} />
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops flex flex-wrap items-end gap-10 pt-14 pb-12 md:pt-[72px]">
            <div className="min-w-0 flex-[1_1_520px]">
              <RotuloSecao>Doutrina</RotuloSecao>
              <TituloSecao como="h1" tamanho="hero" className="mt-3.5">
                {t.titulo}
              </TituloSecao>
              <p className="mt-6 max-w-[680px] text-lg leading-relaxed text-text-2">{t.resumo}</p>
            </div>
            <figure className="min-w-0 flex-[1_1_360px] border border-line bg-bg p-5">
              <DiagramaTatica tipo={t.diagrama} animado className="h-auto w-full" />
              <figcaption className="mt-3 font-mono text-xs leading-relaxed text-muted">
                {DESCRICOES_DIAGRAMA[t.diagrama]} Sem escala.
              </figcaption>
            </figure>
          </div>
        </section>

        <article className="border-b border-line">
          <div className="container-ops pb-16 md:pb-[88px]">
            <CorpoDossie dossie={t} nivel="h2" />
          </div>
        </article>

        {outras.length > 0 ? (
          <nav aria-label="Outras táticas">
            <div className="container-ops py-12">
              <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">Outras táticas</p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                {outras.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/taticas/${o.id}`}
                      className="inline-flex min-h-11 items-center text-base text-text-2 underline underline-offset-4 hover:text-accent"
                    >
                      {o.titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        ) : null}
      </main>
      <Rodape />
    </>
  );
}
