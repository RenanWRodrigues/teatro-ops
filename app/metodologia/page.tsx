import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import Link from "next/link";
import type { ReactNode } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TituloSecao } from "@/components/TituloSecao";
import { formatarNumero } from "@/lib/format";
import { LIMIAR_ALTA, LIMIAR_TENSAO } from "@/lib/fontes/ucdp-candidato/curadoria";

export const metadata: Metadata = metadados({
  titulo: "Metodologia",
  descricao: "De onde vêm os dados do TEATRO//OPS, com que frequência são atualizados, como traduzimos e classificamos, quais são os limites e como pedir correções.",
  caminho: "/metodologia",
});

const ATUALIZADO_EM = "16/11/2026";
const REPOSITORIO = "https://github.com/RenanWRodrigues/teatro-ops";
const LINK = "underline underline-offset-2 hover:text-accent";

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-4 border-t border-line pt-10">
      <h2 id={id} className="font-display text-[30px] leading-none font-extrabold uppercase md:text-[40px]">
        {titulo}
      </h2>
      <div className="mt-5 flex flex-col gap-4 text-[17px] leading-[1.7] text-text-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-text [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
        {children}
      </div>
    </section>
  );
}

const SUMARIO: [string, string][] = [
  ["origem", "De onde vêm os dados"],
  ["frequencia", "Frequência de atualização"],
  ["traducao", "Como traduzimos"],
  ["classificacao", "Como classificamos"],
  ["seguranca", "Segurança das informações"],
  ["limites", "Limitações"],
  ["editorial", "Textos editoriais e uso de IA"],
  ["correcoes", "Correções e contato"],
];

export default function Page() {
  return (
    <>
      <Cabecalho />
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops pt-14 pb-12 md:pt-[72px]">
            <RotuloSecao>Transparência</RotuloSecao>
            <TituloSecao como="h1" tamanho="hero" className="mt-3.5">
              Metodologia
            </TituloSecao>
            <p className="mt-6 max-w-[720px] text-lg leading-relaxed text-text-2">
              Como o TEATRO//OPS coleta, traduz, classifica e publica informações sobre conflitos, arsenais, tecnologia militar
              e decisões de governos — e o que esses dados não conseguem mostrar.
            </p>
            <p className="mt-4 font-mono text-xs text-muted">Atualizada em {ATUALIZADO_EM}.</p>
          </div>
        </section>

        <div className="container-ops grid gap-12 py-14 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Nesta página" className="lg:sticky lg:top-6 lg:self-start">
            <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">Nesta página</p>
            <ul className="mt-3 flex flex-col">
              {SUMARIO.map(([id, rotulo]) => (
                <li key={id}>
                  <a href={`#${id}`} className="inline-flex min-h-11 items-center text-sm text-text-2 hover:text-accent">
                    {rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex max-w-[760px] min-w-0 flex-col gap-12">
            <Secao id="origem" titulo="De onde vêm os dados">
              <p>
                Usamos só fontes abertas e gratuitas. A lista completa, com licença e situação de cada uma, está em{" "}
                <Link href="/fontes" className={LINK}>
                  Fontes de dados
                </Link>
                .
              </p>
              <ul>
                <li>
                  <strong>Notícias</strong>: arquivos do Projeto GDELT, que indexa a imprensa do mundo inteiro e publica um
                  arquivo a cada 15 minutos. Guardamos apenas título, link, data e um resumo próprio — nunca o texto do artigo.
                </li>
                <li>
                  <strong>Eventos de conflito</strong>: UCDP Candidate GED, versão preliminar mensal do Uppsala Conflict Data
                  Program, da Universidade de Uppsala, na Suécia.
                </li>
                <li>
                  <strong>Decisões de governos</strong>: Federal Register (diário oficial dos EUA) e canais RSS oficiais de governos. Veículos estatais
                  aparecem com o selo “Mídia estatal”.
                </li>
                <li>
                  <strong>Arsenal</strong>: Wikidata, Wikipédia em português e Wikimedia Commons; fotos só com licença livre e
                  autor creditado.
                </li>
                <li>
                  <strong>Arquivo histórico</strong>: séries anuais do UCDP — conflitos com participação de Estado desde 1946 e
                  mortes em combate desde 1989.
                </li>
              </ul>
              <p>
                Com exceção dos mapas de fundo, o navegador de quem visita o site não chama essas fontes: a coleta roda em
                servidores agendados, e o site lê só a nossa base de dados.
              </p>
            </Secao>

            <Secao id="frequencia" titulo="Frequência de atualização">
              <ul>
                <li>Notícias: a cada 30 minutos.</li>
                <li>Decisões de governos: a cada hora.</li>
                <li>Eventos de conflito: uma vez por dia (o UCDP publica uma nova versão por mês).</li>
                <li>Fichas do arsenal: uma vez por semana.</li>
                <li>Séries do arquivo histórico: uma vez por ano, quando o UCDP lança a nova versão.</li>
              </ul>
              <p>
                O agendador gratuito que usamos pode atrasar horas. Quando isso acontece, a coleta seguinte recupera o período
                perdido (até 24 horas). Cada seção mostra o carimbo “Atualizado em”, e, se uma fonte cair, o site continua
                exibindo o último dado válido com esse carimbo.
              </p>
            </Secao>

            <Secao id="traducao" titulo="Como traduzimos">
              <p>
                Títulos em outros idiomas são traduzidos automaticamente para o português do Brasil. Primeiro consultamos um
                cache de traduções já feitas; depois, o DeepL (plano gratuito); como reserva, um tradutor de código aberto
                (LibreTranslate/Argos). Um glossário fixo garante termos militares consistentes, como “OTAN” para “NATO”.
              </p>
              <p>
                Quando nenhum tradutor está disponível, o título aparece no idioma original com o aviso “Tradução pendente” e é
                traduzido numa coleta seguinte. Nas decisões de governo, o título original fica a um clique.
              </p>
              <p>
                O resumo das notícias, marcado como “Resumo automático”, é montado por regra a partir de dados da própria coleta —
                veículo, data, região e temas. Ele não reproduz o texto da reportagem nem acrescenta fatos.
              </p>
            </Secao>

            <Secao id="classificacao" titulo="Como classificamos">
              <ul>
                <li>
                  <strong>Temas e regiões das notícias</strong> (drones, inteligência artificial, guerra eletrônica, naval e
                  outros) são atribuídos por palavras-chave no título. É uma classificação automática e pode errar.
                </li>
                <li>
                  <strong>Decisões de governos</strong> entram quando o título ou a descrição cita termos de defesa, sanções,
                  conflitos, armamentos, IA militar, orçamento de defesa, exercícios militares ou acordos, em inglês ou no
                  idioma original; o tipo (lei, sanção, comunicado etc.) também é atribuído por regras.
                </li>
                <li>
                  <strong>Intensidade dos conflitos</strong>: a lista de conflitos acompanhados é feita à mão. A intensidade é
                  recalculada a cada coleta com os eventos do UCDP dos últimos três meses com dados: “alta” com{" "}
                  {formatarNumero(LIMIAR_ALTA)} ou mais mortes estimadas no período — ritmo equivalente a mil por ano, o limiar
                  que o UCDP usa para “guerra” — e “tensão” com {formatarNumero(LIMIAR_TENSAO)} ou mais, o piso do UCDP para
                  conflito armado.
                </li>
              </ul>
            </Secao>

            <Secao id="seguranca" titulo="Segurança das informações">
              <p>
                O site explica conceitos, história e debates — nunca como fabricar, modificar ou empregar armas. Eventos de
                conflito só aparecem com no mínimo 24 horas de atraso, com coordenadas arredondadas (cerca de 11 km) na lista e
                agregadas em células de cerca de 110 km no mapa, para não expor posições em tempo real.
              </p>
            </Secao>

            <Secao id="limites" titulo="Limitações">
              <ul>
                <li>
                  <strong>Viés de cobertura</strong>: o GDELT reflete o que a imprensa indexada publica. Países, idiomas e
                  conflitos com mais cobertura aparecem mais; volume de notícias não mede volume de combates.
                </li>
                <li>
                  <strong>Números preliminares</strong>: os eventos do UCDP Candidate são revisados depois, e todas as mortes
                  exibidas são estimativas, com mínimo e máximo quando a fonte informa.
                </li>
                <li>
                  <strong>Fontes ainda não integradas</strong>: o ACLED (que exige conta e, no nível aberto, tem defasagem) e o
                  ReliefWeb aguardam credenciais; canais oficiais de Israel e da Ucrânia bloqueiam acesso automatizado.
                </li>
                <li>
                  <strong>Fichas incompletas</strong>: especificações vêm do Wikidata e podem faltar; nesse caso, a ficha avisa
                  que está em preparação em vez de mostrar números inventados.
                </li>
                <li>
                  <strong>Tradução e classificação automáticas</strong> podem errar nomes, termos e temas.
                </li>
              </ul>
            </Secao>

            <Secao id="editorial" titulo="Textos editoriais e uso de IA">
              <p>
                Os textos explicativos (táticas, dossiê de tecnologia, arquivo histórico) podem ser rascunhados com ajuda de
                inteligência artificial, mas cada fato precisa de uma fonte verificável, listada e numerada no rodapé do texto.
                Afirmação sem fonte sai do texto. Os textos são revisados antes da publicação e trazem a data de atualização.
              </p>
              <p>
                Notícia coletada, análise editorial e contexto histórico ficam separados. Afirmações de governos e de partes em
                conflito são sempre atribuídas (“segundo…”), com o mesmo tratamento para todos os lados.
              </p>
            </Secao>

            <Secao id="correcoes" titulo="Correções e contato">
              <p>
                Encontrou um erro, uma fonte quebrada ou uma atribuição incorreta? Abra um relato em{" "}
                <a href={`${REPOSITORIO}/issues`} className={LINK} rel="noopener noreferrer" target="_blank">
                  github.com/RenanWRodrigues/teatro-ops/issues
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
                , indicando a página e, se possível, a fonte correta. Corrigimos o dado ou o texto e atualizamos a data da página.
              </p>
              <p>O TEATRO//OPS é um projeto informativo, gratuito e sem fins comerciais.</p>
            </Secao>
          </div>
        </div>
      </main>
      <Rodape />
    </>
  );
}
