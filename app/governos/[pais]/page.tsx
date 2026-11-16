import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bandeira } from "@/components/Bandeira";
import { Cabecalho } from "@/components/Cabecalho";
import { CarimboAtualizacao } from "@/components/CarimboAtualizacao";
import { ComoFuncionaGovernos } from "@/components/ComoFuncionaGovernos";
import { ComparacaoPaises } from "@/components/ComparacaoPaises";
import { LinhaDoTempoDecisoes } from "@/components/LinhaDoTempoDecisoes";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TabelaFontesGoverno } from "@/components/TabelaFontesGoverno";
import { DIAS_GOVERNOS, fontesDeGoverno, obterAtualizacaoGovernos, obterDecisoes } from "@/lib/dados";
import { formatarNumero } from "@/lib/format";
import { contarPorRotulo } from "@/lib/governos/classificacao";
import { PAISES_MONITORADOS, paisPorSlug } from "@/lib/governos/paises";

type Params = PageProps<"/governos/[pais]">["params"];

export function generateStaticParams() {
  return PAISES_MONITORADOS.map((p) => ({ pais: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = paisPorSlug((await params).pais);
  if (!p) return {};
  return metadados({
    titulo: `${p.nome} — decisões e comunicados oficiais`,
    descricao: `Linha do tempo de decisões, sanções, leis e comunicados de defesa ${p.doPais}, com link para cada publicação original.`,
    caminho: `/governos/${p.slug}`,
  });
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

// `params` é aguardado fora de <Suspense> para que países inexistentes devolvam 404 real (ver next.config.ts).
export default async function Page({ params }: { params: Params }) {
  const pais = paisPorSlug((await params).pais);
  if (!pais) notFound();
  const [decisoes, atualizadoEm] = await Promise.all([obterDecisoes(), obterAtualizacaoGovernos()]);
  const doPais = decisoes.filter((d) => d.pais === pais.codigo);
  const fontes = fontesDeGoverno().filter((f) => f.pais === pais.codigo);
  const semColeta = fontes.every((f) => f.status !== "coletando");
  const porTipo = contarPorRotulo(doPais);

  return (
    <>
      <Cabecalho trilha={[{ rotulo: "Governos", href: "/governos" }, { rotulo: pais.nome }]} />
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops pt-14 pb-12 md:pt-[72px]">
            <RotuloSecao>Monitor de governos</RotuloSecao>
            <h1 className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 font-display text-[clamp(44px,8vw,104px)] leading-[0.9] font-extrabold uppercase">
              <Bandeira pais={pais.codigo} className="h-[0.5em] w-[0.75em]" />
              {pais.nome}
            </h1>
            <p className="mt-6 max-w-[760px] text-lg leading-relaxed text-text-2">
              {doPais.length > 0
                ? `${n(doPais.length)} ${doPais.length === 1 ? "item" : "itens"} sobre defesa e conflitos publicados por órgãos oficiais ou mídia estatal ${pais.doPais} nos últimos ${DIAS_GOVERNOS} dias.`
                : semColeta
                  ? `Nenhum canal oficial ${pais.doPais} permite coleta automática no momento: os sites bloqueiam o acesso de robôs ou não têm feed. A lista abaixo mostra cada canal e a situação da coleta.`
                  : `Nenhum item coletado ${pais.doPais} nos últimos ${DIAS_GOVERNOS} dias.`}
            </p>
            {porTipo.length > 0 ? (
              <p className="mt-4 font-mono text-xs tracking-[0.08em] text-muted uppercase">
                {porTipo.map(([rotulo, q]) => `${rotulo}: ${n(q)}`).join(" · ")}
              </p>
            ) : null}
            <CarimboAtualizacao data={atualizadoEm} className="mt-4" />
          </div>
        </section>

        <Secao id="titulo-linha" rotulo="Linha do tempo" titulo={fontes.some((f) => f.estatal && f.status === "coletando") ? `Decisões, comunicados e mídia estatal ${pais.doPais}` : `Decisões e comunicados ${pais.doPais}`}>
          {doPais.length > 0 ? (
            <LinhaDoTempoDecisoes decisoes={doPais} />
          ) : (
            <p className="border border-line p-6 text-sm text-muted">Nenhum item para mostrar.</p>
          )}
        </Secao>

        <Secao id="titulo-comparar" rotulo="Comparação" titulo="Dois países na mesma semana">
          <ComparacaoPaises decisoes={decisoes} paisInicial={pais.codigo} />
        </Secao>

        <Secao id="titulo-fontes" rotulo="Transparência" titulo={`Fontes monitoradas ${pais.doPais}`}>
          <TabelaFontesGoverno fontes={fontes} />
        </Secao>

        <ComoFuncionaGovernos />

        <div className="container-ops py-10">
          <Link href="/governos" className="inline-flex min-h-11 items-center font-mono text-[13px] tracking-[0.1em] text-accent hover:text-accent-hover">
            ← TODOS OS GOVERNOS
          </Link>
        </div>
      </main>
      <Rodape />
    </>
  );
}
