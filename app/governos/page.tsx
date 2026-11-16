import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import Link from "next/link";
import { Bandeira } from "@/components/Bandeira";
import { Cabecalho } from "@/components/Cabecalho";
import { CardDecisao } from "@/components/CardDecisao";
import { CarimboAtualizacao } from "@/components/CarimboAtualizacao";
import { ComoFuncionaGovernos } from "@/components/ComoFuncionaGovernos";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { SeloEstatal } from "@/components/SeloEstatal";
import { TabelaFontesGoverno } from "@/components/TabelaFontesGoverno";
import { TituloSecao } from "@/components/TituloSecao";
import { DIAS_GOVERNOS, fontesDeGoverno, obterAtualizacaoGovernos, obterDecisoes } from "@/lib/dados";
import { formatarNumero } from "@/lib/format";
import { contarPorRotulo } from "@/lib/governos/classificacao";
import { PAISES_MONITORADOS } from "@/lib/governos/paises";

export const metadata: Metadata = metadados({
  titulo: "Governos — decisões e comunicados oficiais",
  descricao: "Decisões, sanções, leis e comunicados de defesa de sete países, atribuídos ao órgão ou à agência estatal que os publicou, com link para o original.",
  caminho: "/governos",
});

const n = (v: number) => formatarNumero(v, { casas: 0 });

export default async function Page() {
  const [decisoes, atualizadoEm] = await Promise.all([obterDecisoes(), obterAtualizacaoGovernos()]);
  const fontes = fontesDeGoverno();
  const recentes = decisoes.slice(0, 8);

  return (
    <>
      <Cabecalho ativo="governos" />
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops pt-14 pb-12 md:pt-[72px]">
            <RotuloSecao>Monitor de governos</RotuloSecao>
            <TituloSecao como="h1" tamanho="hero" className="mt-3.5">
              Governos
            </TituloSecao>
            <p className="mt-6 max-w-[760px] text-lg leading-relaxed text-text-2">
              Decisões, sanções, leis e comunicados sobre defesa e conflitos de sete países, publicados nos últimos {DIAS_GOVERNOS} dias
              por órgãos de governo e agências estatais. Cada item é atribuído a quem o publicou e traz o link para o original.
            </p>
            <CarimboAtualizacao data={atualizadoEm} className="mt-4" />
          </div>
        </section>

        <section aria-labelledby="titulo-paises" className="border-b border-line">
          <div className="container-ops py-12">
            <RotuloSecao>Países</RotuloSecao>
            <TituloSecao id="titulo-paises" className="mt-3.5 mb-8">
              Visão geral
            </TituloSecao>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-px border border-line bg-line">
              {PAISES_MONITORADOS.map((p) => {
                const doPais = decisoes.filter((d) => d.pais === p.codigo);
                const ativas = fontes.filter((f) => f.pais === p.codigo && f.status === "coletando").length;
                const porTipo = contarPorRotulo(doPais)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);
                const ultima = doPais[0];
                return (
                  <li key={p.codigo} className="flex flex-col bg-bg">
                    <div className="flex flex-1 flex-col gap-3 p-6">
                      <h3 className="flex items-center gap-3 font-display text-[32px] leading-none font-extrabold uppercase">
                        <Bandeira pais={p.codigo} />
                        {p.nome}
                      </h3>
                      <p className="font-mono text-xs text-text-2">
                        {n(doPais.length)} {doPais.length === 1 ? "item" : "itens"} em {DIAS_GOVERNOS} dias · {n(ativas)}{" "}
                        {ativas === 1 ? "canal com coleta automática" : "canais com coleta automática"}
                      </p>
                      {porTipo.length > 0 ? (
                        <p className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
                          {porTipo.map(([rotulo, q]) => `${rotulo}: ${n(q)}`).join(" · ")}
                        </p>
                      ) : null}
                      {ultima ? (
                        <p className="text-sm leading-normal text-text-3">
                          <span className="font-mono text-[11px] text-muted uppercase">Mais recente · </span>
                          {ultima.orgao}
                          {ultima.estatal ? <SeloEstatal className="mx-1.5 align-middle" /> : null}:{" "}
                          {ultima.traducaoPendente ? (
                            <span className="mr-1.5 font-mono text-[11px] text-text-2">TRADUÇÃO PENDENTE —</span>
                          ) : null}
                          <a
                            href={ultima.urlOficial}
                            lang={ultima.traducaoPendente ? (ultima.idiomaOriginal ?? undefined) : undefined}
                            className="text-text-2 underline underline-offset-2 hover:text-accent"
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {ultima.titulo}
                            <span className="sr-only"> (abre em nova aba)</span>
                          </a>
                        </p>
                      ) : (
                        <p className="text-sm leading-normal text-muted">
                          {ativas === 0
                            ? `Nenhum canal oficial ${p.doPais} permite coleta automática no momento. Veja a lista de fontes abaixo.`
                            : "Nenhum item coletado ainda neste período."}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/governos/${p.slug}`}
                      className="flex min-h-11 items-center border-t border-line px-6 py-3 font-mono text-[13px] tracking-[0.1em] text-accent uppercase hover:text-accent-hover"
                    >
                      Linha do tempo {p.doPais} →
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section aria-labelledby="titulo-recentes" className="border-b border-line">
          <div className="container-ops py-12">
            <RotuloSecao>Últimos itens</RotuloSecao>
            <TituloSecao id="titulo-recentes" className="mt-3.5 mb-8">
              Mais recentes
            </TituloSecao>
            {recentes.length > 0 ? (
              <div className="border border-line">
                {recentes.map((d) => (
                  <CardDecisao key={d.id} decisao={d} />
                ))}
              </div>
            ) : (
              <p className="border border-line p-6 text-sm text-muted">Nenhum item coletado ainda. A coleta roda a cada hora.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="titulo-fontes" className="border-b border-line">
          <div className="container-ops py-12">
            <RotuloSecao>Transparência</RotuloSecao>
            <TituloSecao id="titulo-fontes" className="mt-3.5 mb-8">
              Fontes monitoradas
            </TituloSecao>
            <TabelaFontesGoverno fontes={fontes} />
          </div>
        </section>

        <ComoFuncionaGovernos />
      </main>
      <Rodape />
    </>
  );
}
