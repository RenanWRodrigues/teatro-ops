import type { Metadata } from "next";
import { metadados, NOME_SITE, urlDoSite } from "@/lib/site";
import { Cabecalho } from "@/components/Cabecalho";
import { DadosEstruturados } from "@/components/DadosEstruturados";
import { FontesNumeradas } from "@/components/FontesNumeradas";
import { GraficoSerieAnual } from "@/components/GraficoSerieAnual";
import { LinhaDoTempo } from "@/components/LinhaDoTempo";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TituloSecao } from "@/components/TituloSecao";
import { obterLinhaDoTempoArquivo, obterSeriesArquivo } from "@/lib/dados";
import { formatarData, formatarNumero } from "@/lib/format";

export const metadata: Metadata = metadados({
  titulo: "Arquivo histórico — um século de guerra",
  descricao: "Linha do tempo dos conflitos de 1914 a hoje e séries anuais do UCDP: conflitos com participação de Estado desde 1946 e mortes em combate desde 1989.",
  caminho: "/arquivo",
});

const LINK = "text-text-2 underline underline-offset-2 hover:text-accent";

export default function Page() {
  const linha = obterLinhaDoTempoArquivo();
  const series = obterSeriesArquivo();
  const ultimo = series.conflitos.at(-1)!;
  const ultimoMortes = series.mortes.at(-1)!;

  return (
    <>
      <DadosEstruturados
        dados={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Conflitos armados com participação de Estado e mortes em combate por ano",
          description: `Contagem anual de conflitos (${series.conflitos[0]!.ano}–${ultimo.ano}) e soma anual das mortes em combate estimadas (${series.mortes[0]!.ano}–${ultimoMortes.ano}), calculadas pelo ${NOME_SITE} a partir do UCDP/PRIO Armed Conflict Dataset e do UCDP Battle-Related Deaths Dataset, versão ${series.versao}.`,
          url: `${urlDoSite()}/arquivo`,
          inLanguage: "pt-BR",
          license: "https://creativecommons.org/licenses/by/4.0/",
          temporalCoverage: `${series.conflitos[0]!.ano}/${ultimo.ano}`,
          dateModified: series.coletado_em,
          isBasedOn: [series.arquivos.acd, series.arquivos.brd],
          creator: { "@type": "Organization", name: "Uppsala Conflict Data Program (UCDP)", url: "https://ucdp.uu.se/" },
          publisher: { "@type": "Organization", name: NOME_SITE, url: urlDoSite() },
          variableMeasured: ["Conflitos ativos por ano", "Conflitos com 1.000 ou mais mortes em combate", "Mortes em combate (estimativa, mínimo e máximo)"],
        }}
      />
      <Cabecalho ativo="arquivo" />
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops pt-14 pb-12 md:pt-[72px]">
            <RotuloSecao>Arquivo histórico</RotuloSecao>
            <TituloSecao como="h1" tamanho="hero" className="mt-3.5">
              Um século de guerra
            </TituloSecao>
            <p className="mt-6 max-w-[680px] text-lg leading-relaxed text-text-2">
              Marcos dos conflitos armados de 1914 a hoje e as séries de longo prazo do Uppsala Conflict Data Program (UCDP),
              da Universidade de Uppsala, na Suécia.
            </p>
          </div>
        </section>

        {linha ? (
          <section aria-labelledby="titulo-linha" className="border-b border-line bg-surface">
            <div className="container-ops py-16 md:py-[88px]">
              <RotuloSecao>Linha do tempo</RotuloSecao>
              <TituloSecao id="titulo-linha" className="mt-3.5 mb-12">
                De 1914 a hoje
              </TituloSecao>
              <LinhaDoTempo eventos={linha.eventos} variante="grade" prefixoRef="ref-arquivo" />
              <p className="mt-4 font-mono text-xs leading-relaxed text-muted">
                Números de mortos são estimativas das fontes citadas e variam entre pesquisadores.
              </p>
              <h3 className="mt-8 font-mono text-xs tracking-[0.14em] text-accent uppercase">Fontes</h3>
              <FontesNumeradas fontes={linha.fontes} prefixo="ref-arquivo" className="mt-3" />
            </div>
          </section>
        ) : null}

        <section aria-labelledby="titulo-series" className="border-b border-line">
          <div className="container-ops py-16 md:py-[88px]">
            <RotuloSecao>Séries de longo prazo</RotuloSecao>
            <TituloSecao id="titulo-series" className="mt-3.5">
              Conflitos e mortes em combate
            </TituloSecao>
            <p className="mt-5 max-w-[720px] text-base leading-relaxed text-text-2">
              Para o UCDP, um conflito armado com participação de Estado é uma disputa sobre governo ou território em que ao
              menos uma das partes é o governo de um Estado e que causa 25 ou mais mortes em combate num ano; com mil ou mais
              mortes no ano, o conflito é classificado como guerra. As séries não incluem violência entre grupos não estatais
              nem violência unilateral contra civis.
            </p>

            <div className="mt-12 grid gap-14 lg:grid-cols-2">
              <div className="min-w-0">
                <h3 className="font-display text-[26px] leading-[0.95] font-bold uppercase sm:text-[30px]">Conflitos ativos por ano</h3>
                <p className="mt-2 mb-6 font-mono text-xs text-muted">
                  {series.conflitos[0]!.ano}–{ultimo.ano} · {formatarNumero(ultimo.total)} em {ultimo.ano}, dos quais{" "}
                  {formatarNumero(ultimo.guerras)} com mil ou mais mortes
                </p>
                <GraficoSerieAnual
                  titulo="Conflitos armados com participação de Estado por ano"
                  dados={series.conflitos}
                  valor={(c) => c.total}
                  unidade={["conflito", "conflitos"]}
                  destaque={ultimo.ano}
                  colunas={[
                    { rotulo: "Total", valor: (c) => c.total },
                    { rotulo: "Guerras (1.000 mortes ou mais)", valor: (c) => c.guerras },
                    { rotulo: "Intraestatais", valor: (c) => c.intraestatal },
                    { rotulo: "Intraestatais internacionalizados", valor: (c) => c.internacionalizado },
                    { rotulo: "Interestatais", valor: (c) => c.interestatal },
                    { rotulo: "Extrassistêmicos (coloniais)", valor: (c) => c.extrassistemico },
                  ]}
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-[26px] leading-[0.95] font-bold uppercase sm:text-[30px]">Mortes em combate por ano</h3>
                <p className="mt-2 mb-6 font-mono text-xs text-muted">
                  {series.mortes[0]!.ano}–{ultimoMortes.ano} · estimativa de {formatarNumero(ultimoMortes.estimativa)} em{" "}
                  {ultimoMortes.ano}
                </p>
                <GraficoSerieAnual
                  titulo="Mortes em combate em conflitos com participação de Estado por ano (estimativa do UCDP)"
                  dados={series.mortes}
                  valor={(m) => m.estimativa}
                  unidade={["morte", "mortes"]}
                  destaque={ultimoMortes.ano}
                  nota="São estimativas: a tabela traz também o mínimo e o máximo do UCDP. Não incluem a violência unilateral contra civis."
                  colunas={[
                    { rotulo: "Estimativa", valor: (m) => m.estimativa },
                    { rotulo: "Mínimo", valor: (m) => m.minimo },
                    { rotulo: "Máximo", valor: (m) => m.maximo },
                  ]}
                />
              </div>
            </div>

            <div className="mt-12 border-t border-line pt-5 font-mono text-xs leading-relaxed text-muted">
              <p>
                Fonte:{" "}
                <a href="https://ucdp.uu.se/downloads/" className={LINK} rel="noopener noreferrer" target="_blank">
                  Uppsala Conflict Data Program (UCDP)
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>{" "}
                — <span lang="en">UCDP/PRIO Armed Conflict Dataset</span> e <span lang="en">UCDP Battle-Related Deaths Dataset</span>,
                versão {series.versao} ·{" "}
                <a href="https://creativecommons.org/licenses/by/4.0/deed.pt_BR" className={LINK} rel="noopener noreferrer license" target="_blank">
                  CC BY 4.0
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>{" "}
                · coletado em <time dateTime={series.coletado_em}>{formatarData(series.coletado_em)}</time>. Contagens anuais
                calculadas pelo TEATRO//OPS a partir dos arquivos do UCDP.
              </p>
              <p className="mt-2">
                Referências pedidas pelo UCDP: Davies, Shawn; Pettersson, Therése; Öberg, Magnus.{" "}
                <span lang="en">
                  “Organized violence 1989–2025, and violent political protests”. <i>Journal of Peace Research</i>
                </span>
                , 2026 · Gleditsch, Nils Petter et al.{" "}
                <span lang="en">
                  “Armed Conflict 1946–2001: A New Dataset”. <i>Journal of Peace Research</i>
                </span>{" "}
                39(5), 2002.
              </p>
              <p className="mt-2">
                Definições:{" "}
                <a
                  href="https://www.uu.se/en/department/peace-and-conflict-research/research/ucdp/ucdp-definitions"
                  className={LINK}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Definições do UCDP (em inglês)
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}
