import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import { Cabecalho } from "@/components/Cabecalho";
import { CarimboAtualizacao } from "@/components/CarimboAtualizacao";
import { ListaFontes } from "@/components/ListaFontes";
import { MapaConflitos } from "@/components/MapaConflitos";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TabelaConflitos } from "@/components/TabelaConflitos";
import { TituloSecao } from "@/components/TituloSecao";
import { obterAtualizacaoConflitos, obterCamadasMapa, obterConflitos } from "@/lib/dados";
import { fontesUnicas } from "@/lib/especificacao";
import type { Fonte } from "@/lib/tipos";

export const metadata: Metadata = metadados({
  titulo: "Conflitos — mapa e situação atual",
  descricao: "Conflitos armados ativos no mundo, com eventos, mortes estimadas e cobertura de mídia — sempre com fonte e data.",
  caminho: "/conflitos",
});

const FONTE_GDELT: Fonte = {
  nome: "GDELT GKG 2.0",
  url: "https://www.gdeltproject.org/",
  licenca: "uso livre com citação",
};

export default async function Page() {
  const [conflitos, camadas, atualizadoEm] = await Promise.all([obterConflitos(), obterCamadasMapa(), obterAtualizacaoConflitos()]);
  const semDados = conflitos.every((c) => c.semDados);
  const alta = conflitos.filter((c) => c.intensidade === "alta").length;
  const tensao = conflitos.filter((c) => c.intensidade === "tensao").length;
  const fontes = fontesUnicas([...conflitos.flatMap((c) => c.fontes), ...(camadas.cobertura.length ? [FONTE_GDELT] : [])]);

  return (
    <>
      <Cabecalho ativo="conflitos" />
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops pt-14 pb-12 md:pt-[72px]">
            <RotuloSecao>Situação atual</RotuloSecao>
            <TituloSecao como="h1" tamanho="hero" className="mt-3.5">
              Conflitos no mundo
            </TituloSecao>
            <p className="mt-6 max-w-[720px] text-lg leading-relaxed text-text-2">
              {semDados
                ? "Lista de conflitos acompanhados. Os números do UCDP ainda não foram coletados."
                : `${alta} ${alta === 1 ? "conflito" : "conflitos"} de alta intensidade e ${tensao} em tensão, segundo os dados mais recentes do UCDP. Números de mortes são estimativas preliminares e podem mudar.`}
            </p>
            <CarimboAtualizacao data={atualizadoEm} className="mt-4" limiteHoras={48} />
          </div>
        </section>

        <section aria-labelledby="titulo-mapa" className="border-b border-line">
          <div className="container-ops py-12">
            <h2 id="titulo-mapa" className="sr-only">
              Mapa
            </h2>
            <MapaConflitos
              conflitos={conflitos}
              camadas={camadas}
              controles
              prefixoLink="/conflitos/"
              className="h-[460px] md:h-[600px]"
            />
            <p className="mt-3 font-mono text-xs leading-relaxed text-muted">
              Pontos agregados (células de cerca de 110 km) e eventos com atraso mínimo de 24 h: o mapa não mostra posições de tropas nem
              movimentos em tempo real. Marcadores: ponto de referência de cada conflito (mediana dos eventos do período).
            </p>
          </div>
        </section>

        <section aria-labelledby="titulo-tabela" className="border-b border-line">
          <div className="container-ops py-12">
            <RotuloSecao>Tabela</RotuloSecao>
            <TituloSecao id="titulo-tabela" className="mt-3.5 mb-8">
              Todos os conflitos
            </TituloSecao>
            <TabelaConflitos conflitos={conflitos} />
          </div>
        </section>

        <section aria-labelledby="titulo-criterio">
          <div className="container-ops py-12">
            <h2 id="titulo-criterio" className="font-mono text-xs tracking-[0.14em] text-accent">
              COMO CLASSIFICAMOS
            </h2>
            <p className="mt-3 max-w-[760px] text-sm leading-relaxed text-text-2">
              A intensidade é calculada automaticamente sobre os últimos três meses com dados do UCDP: <strong>alta intensidade</strong>{" "}
              a partir de 250 mortes estimadas no período (ritmo equivalente a 1.000 por ano, o limiar de &ldquo;guerra&rdquo; do UCDP) e{" "}
              <strong>tensão</strong> de 25 a 249 (piso de &ldquo;conflito armado&rdquo; do UCDP). Países em que a violência registrada é
              quase toda entre grupos criminosos não entram na lista.
            </p>
            {fontes.length > 0 ? <ListaFontes fontes={fontes} className="mt-4" /> : null}
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}
