import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { CarimboAtualizacao } from "@/components/CarimboAtualizacao";
import { CardDecisao } from "@/components/CardDecisao";
import { CardNoticia } from "@/components/CardNoticia";
import { GraficoSemanal } from "@/components/GraficoSemanal";
import { ListaEventos } from "@/components/ListaEventos";
import { ListaFontes } from "@/components/ListaFontes";
import { MapaConflitos } from "@/components/MapaConflitos";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { SeloIntensidade } from "@/components/SeloIntensidade";
import { CorpoDossie } from "@/components/CorpoDossie";
import {
  DIAS_GOVERNOS,
  obterCamadasMapa,
  obterConflito,
  obterConflitos,
  obterContextoConflito,
  obterDecisoesRelacionadas,
  obterDetalheConflito,
} from "@/lib/dados";
import type { Dossie } from "@/lib/tecnologia/dossie";
import { formatarData, formatarNumero } from "@/lib/format";
import type { ConflitoDetalhe, Decisao } from "@/lib/tipos";

type Params = PageProps<"/conflitos/[slug]">["params"];

export async function generateStaticParams() {
  const conflitos = await obterConflitos();
  return conflitos.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const c = await obterConflito(slug);
  if (!c) return {};
  return metadados({ titulo: `${c.nome} — conflito`, descricao: c.resumo ?? `Eventos, números e notícias sobre ${c.nome}.`, caminho: `/conflitos/${c.slug}` });
}

// `params` é aguardado fora de <Suspense> para que slugs inexistentes devolvam 404 real (ver next.config.ts).
export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const c = await obterConflito(slug);
  if (!c) notFound();
  const [detalhe, camadas, decisoes] = await Promise.all([
    obterDetalheConflito(c.slug, c.paises),
    obterCamadasMapa(c.slug),
    obterDecisoesRelacionadas(c.paises),
  ]);
  return <Conteudo c={c} detalhe={detalhe} camadas={camadas} decisoes={decisoes} contexto={obterContextoConflito(c.slug)} />;
}

const n = (v: number) => formatarNumero(v, { casas: 0 });

function Secao({ id, rotulo, titulo, children }: { id: string; rotulo: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-line">
      <div className="container-ops py-12">
        <RotuloSecao>{rotulo}</RotuloSecao>
        <h2 id={id} className="mt-3 mb-8 font-display text-[36px] leading-none font-extrabold uppercase md:text-[44px]">
          {titulo}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Conteudo({
  c,
  detalhe,
  camadas,
  decisoes,
  contexto,
}: {
  c: ConflitoDetalhe;
  decisoes: Decisao[];
  contexto: Dossie | null;
  detalhe: Awaited<ReturnType<typeof obterDetalheConflito>>;
  camadas: Awaited<ReturnType<typeof obterCamadasMapa>>;
}) {
  return (
    <>
      <Cabecalho trilha={[{ rotulo: "Conflitos", href: "/conflitos" }, { rotulo: c.nome }]} />
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops pt-14 pb-12 md:pt-[72px]">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {c.intensidade ? (
                <SeloIntensidade intensidade={c.intensidade} variante="chip" />
              ) : (
                <span className="font-mono text-xs text-muted uppercase">{c.semDados ? "Ainda sem dados" : "Abaixo do limiar"}</span>
              )}
              <span className="font-mono text-xs tracking-[0.12em] text-text-2 uppercase">{c.regiao}</span>
            </p>
            <h1 className="mt-5 font-display text-[clamp(44px,8vw,104px)] leading-[0.9] font-extrabold uppercase [overflow-wrap:anywhere]">
              {c.nome}
            </h1>
            {c.resumo ? <p className="mt-6 max-w-[760px] text-lg leading-relaxed text-text-2">{c.resumo}</p> : null}
            <CarimboAtualizacao data={detalhe.atualizadoEm} className="mt-4" limiteHoras={48} />
          </div>
        </section>

        {!c.semDados ? (
          <section aria-label="Números do período" className="border-b border-line">
            <dl className="mx-auto grid max-w-[1360px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
              <div className="border-b border-line px-4 py-8 sm:border-r md:px-10">
                <dt className="font-mono text-xs tracking-[0.12em] text-muted uppercase">Mortes estimadas</dt>
                <dd className="mt-1.5 font-display text-[48px] leading-none font-extrabold text-accent">{n(c.mortes)}</dd>
                <dd className="mt-2 font-mono text-xs text-text-2">
                  Estimativa — entre {n(c.mortesMin)} e {n(c.mortesMax)}
                </dd>
              </div>
              <div className="border-b border-line px-4 py-8 sm:border-r md:px-10">
                <dt className="font-mono text-xs tracking-[0.12em] text-muted uppercase">Eventos</dt>
                <dd className="mt-1.5 font-display text-[48px] leading-none font-extrabold">{n(c.eventos)}</dd>
              </div>
              <div className="border-b border-line px-4 py-8 md:px-10">
                <dt className="font-mono text-xs tracking-[0.12em] text-muted uppercase">Período</dt>
                <dd className="mt-3 font-mono text-lg">
                  {c.periodoInicio && c.periodoFim ? `${formatarData(c.periodoInicio)} a ${formatarData(c.periodoFim)}` : "—"}
                </dd>
                <dd className="mt-2 font-mono text-xs text-text-2">Dados preliminares do UCDP</dd>
              </div>
            </dl>
            <div className="container-ops py-4">
              <ListaFontes fontes={c.fontes} />
            </div>
          </section>
        ) : null}

        {contexto ? (
          <Secao id="titulo-contexto" rotulo="Contexto" titulo="Entenda o conflito">
            {contexto.status === "rascunho" ? (
              <p role="note" className="mb-6 max-w-[680px] border border-accent bg-surface-accent px-4 py-3 font-mono text-xs tracking-[0.06em] text-text-2">
                <strong className="font-medium text-accent">[RASCUNHO]</strong> Visível só no ambiente de desenvolvimento — {contexto.revisao}.
              </p>
            ) : null}
            <p className="max-w-[680px] text-lg leading-relaxed text-text">{contexto.resumo}</p>
            <CorpoDossie dossie={contexto} />
          </Secao>
        ) : null}

        <Secao id="titulo-mapa" rotulo="Mapa" titulo="Onde ocorreram os eventos">
          <MapaConflitos conflitos={[c]} camadas={{ eventos: camadas.eventos }} className="h-[380px] md:h-[480px]" />
          <p className="mt-3 font-mono text-xs text-muted">
            Células de cerca de 110 km, com os eventos dos três meses mais recentes com dados (atraso mínimo de 24 h). Fonte: UCDP.
          </p>
        </Secao>

        <Secao id="titulo-grafico" rotulo="Série" titulo="Eventos por semana">
          <GraficoSemanal semanas={detalhe.semanas} titulo={`Eventos por semana — ${c.nome}`} />
          {detalhe.semanas.length > 0 ? <ListaFontes fontes={c.fontes} className="mt-4" /> : null}
        </Secao>

        <Secao id="titulo-linha" rotulo="Linha do tempo" titulo="Eventos recentes">
          <ListaEventos eventos={detalhe.eventosRecentes} />
          {detalhe.eventosRecentes.length > 0 ? (
            <p className="mt-6 font-mono text-xs text-muted">
              Local em nível de província/estado. Mortes são estimativas do UCDP e podem ser revisadas.
            </p>
          ) : null}
        </Secao>

        <Secao id="titulo-noticias" rotulo="Imprensa" titulo="Notícias recentes">
          {detalhe.noticias.length > 0 ? (
            <div className="border border-line">
              {detalhe.noticias.map((noticia) => (
                <CardNoticia key={noticia.url} noticia={noticia} />
              ))}
            </div>
          ) : (
            <p className="border border-line p-6 text-sm text-muted">Nenhuma notícia recente cita os países deste conflito.</p>
          )}
        </Secao>

        <Secao id="titulo-governos" rotulo="Governos" titulo="Decisões relacionadas">
          {decisoes.length > 0 ? (
            <>
              <div className="border border-line">
                {decisoes.map((d) => (
                  <CardDecisao key={d.id} decisao={d} />
                ))}
              </div>
              <p className="mt-4 font-mono text-xs text-muted">
                Itens dos últimos {DIAS_GOVERNOS} dias que citam no título algum país deste conflito. Cada um traz a versão do órgão ou da
                agência estatal que o publicou.{" "}
                <Link href="/governos" className="text-text-2 underline underline-offset-2 hover:text-accent">
                  Ver o monitor de governos
                </Link>
              </p>
            </>
          ) : (
            <p className="border border-line p-6 text-sm text-muted">
              Nenhuma decisão ou comunicado dos últimos {DIAS_GOVERNOS} dias cita os países deste conflito.{" "}
              <Link href="/governos" className="text-text-2 underline underline-offset-2 hover:text-accent">
                Ver o monitor de governos
              </Link>
            </p>
          )}
        </Secao>

        <Secao id="titulo-humanitario" rotulo="Humanitário" titulo="Relatórios humanitários">
          <p className="border border-line p-6 text-sm text-muted">
            Os relatórios do ReliefWeb (ONU/OCHA) aparecem aqui assim que o acesso à API for aprovado.
          </p>
        </Secao>

        <div className="container-ops py-10">
          <Link href="/conflitos" className="inline-flex min-h-11 items-center font-mono text-[13px] tracking-[0.1em] text-accent hover:text-accent-hover">
            ← TODOS OS CONFLITOS
          </Link>
        </div>
      </main>
      <Rodape />
    </>
  );
}
