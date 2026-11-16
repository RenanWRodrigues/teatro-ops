import Link from "next/link";
import { AvisoExemplo } from "@/components/AvisoExemplo";
import { BarraComparacao } from "@/components/BarraComparacao";
import { BotaoPrimario } from "@/components/BotaoPrimario";
import { BotaoSecundario } from "@/components/BotaoSecundario";
import { Cabecalho } from "@/components/Cabecalho";
import { CarimboAtualizacao } from "@/components/CarimboAtualizacao";
import { CardConflito } from "@/components/CardConflito";
import { CardNoticia } from "@/components/CardNoticia";
import { hrefEquipamento } from "@/components/CardEquipamento";
import { DiagramaTatica } from "@/components/DiagramaTatica";
import { FormBoletim } from "@/components/FormBoletim";
import { LinhaDoTempo } from "@/components/LinhaDoTempo";
import { MapaConflitos } from "@/components/MapaConflitos";
import { PainelRadar } from "@/components/PainelRadar";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TituloSecao } from "@/components/TituloSecao";
import { obterConflitosEmFoco, obterEquipamentos, obterManchetes, obterMonitor, obterLinhaDoTempoArquivo, obterNoticiasConflito, obterTaticas } from "@/lib/dados";
import { melhorParComparavel } from "@/lib/arsenal/comparar";
import {
  EIXOS,
  FRENTES_TECNOLOGIA,
} from "@/lib/fixtures/home";
import type { Categoria } from "@/lib/tipos";

const LINK_SECAO = "inline-flex min-h-11 items-center font-mono text-[13px] tracking-[0.1em] text-accent hover:text-accent-hover";

const CATEGORIAS_HOME: { categoria: Categoria; rotulo: string; titulo: string }[] = [
  { categoria: "tanques", rotulo: "Tanques", titulo: "Blindados e carros de combate" },
  { categoria: "embarcacoes", rotulo: "Embarcações", titulo: "Porta-aviões, fragatas, submarinos" },
  { categoria: "avioes", rotulo: "Aviões", titulo: "Bombardeiros e transporte" },
  { categoria: "armamento", rotulo: "Armamento", titulo: "Mísseis, artilharia, armas leves" },
];

// Equipamento do card grande da home (cai para o primeiro da lista se não existir).
const SLUG_DESTAQUE = "f-35a-lightning-ii";

export default async function Home() {
  const [equipamentos, conflitos, manchetes, monitor, noticiasConflito] = await Promise.all([
    obterEquipamentos(),
    obterConflitosEmFoco(),
    obterManchetes(),
    obterMonitor(),
    obterNoticiasConflito(),
  ]);
  const destaque = equipamentos.dados.find((e) => e.slug === SLUG_DESTAQUE) ?? equipamentos.dados[0];
  const chamadas = destaque?.chamadas ?? (destaque?.destaque ? [destaque.destaque] : []);

  const [principal, ...demais] = CATEGORIAS_HOME;
  // Comparador da vitrine: só com fichas reais (sem banco, a seção mostra o convite para /arsenal/comparar).
  const par = equipamentos.exemplo ? null : melhorParComparavel(equipamentos.dados);
  // O aviso [EXEMPLO] só aparece se algum bloco ainda vier das fixtures (banco ausente ou vazio).
  const temExemplo = conflitos.exemplo || manchetes.exemplo || equipamentos.exemplo || monitor.exemplo;

  return (
    <>
      <Cabecalho comAcoes ticker={manchetes.dados} />
      {temExemplo ? <AvisoExemplo /> : null}
      <main id="conteudo" tabIndex={-1}>
        {/* HERO */}
        <section className="malha-tatica border-b border-line">
          <div className="container-ops flex flex-wrap items-center gap-14 pt-16 pb-14 md:pt-24 md:pb-[88px]">
            <div className="min-w-0 flex-[1_1_560px]">
              <RotuloSecao className="mb-7">Inteligência de defesa em linguagem clara</RotuloSecao>
              <TituloSecao como="h1" tamanho="hero">
                O mundo
                <br />
                em conflito,
                <br />
                <span className="text-accent">decodificado.</span>
              </TituloSecao>
              <p className="mt-8 max-w-[560px] text-[19px] leading-relaxed text-text-3">
                Mapas de conflitos ativos, fichas técnicas de caças, tanques e navios, análises de táticas militares e a nova
                frente da guerra: inteligência artificial e drones.
              </p>
              <div className="mt-10 flex flex-wrap gap-3.5">
                <BotaoPrimario href="/conflitos" seta>
                  Abrir mapa de conflitos
                </BotaoPrimario>
                <BotaoSecundario href="/arsenal">Explorar arsenal</BotaoSecundario>
              </div>
            </div>
            <PainelRadar {...monitor.dados} />
          </div>
        </section>

        {/* 4 EIXOS */}
        <nav aria-label="Seções do portal" className="border-b border-line">
          <ul className="container-ops grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] px-0!">
            {EIXOS.map((eixo) => (
              <li key={eixo.numero} className="border-b border-line sm:border-r sm:last:border-r-0">
                <Link href={eixo.href} className="group flex h-full flex-col gap-2.5 px-4 py-9 text-text md:px-10">
                  <span className="font-mono text-[13px] text-accent">{eixo.numero}</span>
                  <span className="font-display text-3xl font-bold uppercase group-hover:text-accent">{eixo.titulo}</span>
                  <span className="text-[15px] leading-normal text-muted">{eixo.texto}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* CONFLITOS */}
        <section id="conflitos" aria-labelledby="titulo-conflitos" className="scroll-mt-4 border-b border-line">
          <div className="container-ops py-16 md:py-24">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <RotuloSecao numero="01">Situação atual</RotuloSecao>
                <TituloSecao id="titulo-conflitos" className="mt-3.5">
                  Conflitos em foco
                </TituloSecao>
                <CarimboAtualizacao data={monitor.dados.atualizadoEm} className="mt-4" />
              </div>
              <Link href="/conflitos" className={LINK_SECAO}>
                VER TODOS OS CONFLITOS →
              </Link>
            </div>
            <div className="flex flex-wrap gap-6">
              <MapaConflitos conflitos={conflitos.exemplo ? [] : conflitos.dados} prefixoLink="/conflitos/" className="h-[360px] flex-[2_1_640px] md:h-[520px]" />
              <div className="flex min-w-0 flex-[1_1_340px] flex-col border border-line">
                {/* Conflitos curados (Fase 5) › notícias reais do tema "conflitos" › placeholders [EXEMPLO]. */}
                {!conflitos.exemplo || noticiasConflito.length === 0
                  ? conflitos.dados.map((c) => <CardConflito key={c.slug} conflito={c} href={conflitos.exemplo ? undefined : `/conflitos/${c.slug}`} />)
                  : noticiasConflito.map((n) => <CardNoticia key={n.url} noticia={n} />)}
              </div>
            </div>
            <p className="mt-4 font-mono text-xs text-muted">
              Estimativas sujeitas a revisão — números e classificações podem mudar. Eventos exibidos com atraso mínimo de 24 h.
            </p>
          </div>
        </section>

        {/* ARSENAL */}
        <section id="arsenal" aria-labelledby="titulo-arsenal" className="border-b border-line bg-surface">
          <div className="container-ops py-16 md:py-24">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <RotuloSecao numero="02">Arsenal</RotuloSecao>
                <TituloSecao id="titulo-arsenal" className="mt-3.5">
                  Máquinas de guerra
                </TituloSecao>
              </div>
              <Link href="/arsenal" className={LINK_SECAO}>
                CATÁLOGO COMPLETO →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {destaque ? (
                <Link
                  href={hrefEquipamento(destaque)}
                  className="placeholder-listrado group relative flex min-h-[380px] flex-col justify-end border border-line p-6 text-text md:col-span-2 md:min-h-[460px] md:p-8"
                >
                  <span aria-hidden="true" className="absolute top-6 left-6 font-mono text-xs tracking-[0.1em] text-muted md:left-8">
                    [FOTO EM DESTAQUE — CAÇA EM VOO]
                  </span>
                  <span className="font-mono text-xs tracking-[0.14em] text-accent uppercase">{destaque.classe}</span>
                  <span className="mt-2.5 font-display text-[48px] leading-[0.9] font-extrabold uppercase group-hover:text-accent md:text-[72px]">
                    {destaque.nome}
                  </span>
                  {chamadas.length > 0 ? (
                    <span className="mt-[18px] flex flex-wrap gap-x-7 gap-y-1 font-mono text-[13px] text-text-3">
                      {chamadas.map((c) => (
                        <span key={c}>{c}</span>
                      ))}
                    </span>
                  ) : null}
                </Link>
              ) : null}
              {principal ? <CardCategoria {...principal} alto /> : null}
              {demais.map((c) => (
                <CardCategoria key={c.categoria} {...c} />
              ))}
            </div>

            {/* Comparador */}
            <div className="mt-5 flex flex-wrap border border-line bg-bg">
              <div className="flex-[1_1_320px] border-b border-line p-6 md:border-r md:border-b-0 md:p-10">
                <p className="font-mono text-xs tracking-[0.14em] text-accent">COMPARADOR</p>
                {par ? (
                  <p className="mt-3 font-display text-[44px] leading-[0.95] font-extrabold uppercase [overflow-wrap:anywhere]">
                    {par.a.nome} <span className="text-muted" aria-hidden="true">×</span><span className="sr-only">versus</span> {par.b.nome}
                  </p>
                ) : null}
                <p className="mt-4 text-[15px] leading-relaxed text-text-2">
                  Escolha dois equipamentos e compare lado a lado. Valores aproximados de fontes abertas, com a fonte de cada
                  número na ficha.
                </p>
                <Link href={par ? `/arsenal/comparar?a=${par.a.slug}&b=${par.b.slug}` : "/arsenal/comparar"} className={`mt-4 ${LINK_SECAO}`}>
                  {par ? "VER A COMPARAÇÃO COMPLETA →" : "ABRIR O COMPARADOR →"}
                </Link>
              </div>
              {par ? (
                <div className="min-w-0 flex-[2_1_520px] p-6 md:p-10">
                  <BarraComparacao rotuloA={par.a.nome} rotuloB={par.b.nome} linhas={par.linhas} />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* TÁTICAS */}
        <section id="taticas" aria-labelledby="titulo-taticas" className="scroll-mt-4 border-b border-line">
          <div className="container-ops py-16 md:py-24">
            <RotuloSecao numero="03">Doutrina</RotuloSecao>
            <TituloSecao id="titulo-taticas" className="mt-3.5 mb-12">
              Táticas explicadas
            </TituloSecao>
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-px border border-line bg-line">
              {obterTaticas()
                .slice(0, 4)
                .map((t) => (
                  <li key={t.id} className="relative flex flex-col gap-4 bg-bg p-6 md:p-8">
                    <DiagramaTatica tipo={t.diagrama} />
                    <h3 className="font-display text-[28px] leading-none font-bold uppercase">
                      <Link href={`/taticas/${t.id}`} className="after:absolute after:inset-0 hover:text-accent">
                        {t.titulo}
                      </Link>
                    </h3>
                    <p className="text-[15px] leading-[1.55] text-text-2">{t.resumo}</p>
                  </li>
                ))}
            </ul>
            <p className="mt-4 font-mono text-xs text-muted">Cada texto traz as fontes numeradas no rodapé.</p>
            <Link href="/taticas" className={`mt-2 ${LINK_SECAO}`}>
              VER TODAS AS TÁTICAS →
            </Link>
          </div>
        </section>

        {/* FAIXA TECNOLOGIA */}
        <section aria-labelledby="titulo-tech" className="faixa-acento bg-accent text-bg">
          <div className="container-ops flex flex-wrap items-center gap-14 py-16 md:py-24">
            <div className="min-w-0 flex-[1_1_520px]">
              <RotuloSecao numero="04" tom="tinta">
                A nova frente
              </RotuloSecao>
              <h2
                id="titulo-tech"
                className="mt-4 font-display text-[clamp(48px,7vw,104px)] leading-[0.88] font-extrabold uppercase [overflow-wrap:anywhere]"
              >
                A guerra dos algoritmos
              </h2>
              <p className="mt-7 max-w-[520px] text-lg leading-relaxed text-accent-ink">
                Drones FPV de baixo custo, enxames autônomos, IA na identificação de alvos e guerra eletrônica estão mudando
                a forma de combater — e o debate ético sobre autonomia letal.
              </p>
              <BotaoPrimario href="/tecnologia" tom="invertido" className="mt-9">
                Entrar no dossiê
              </BotaoPrimario>
            </div>
            <ol className="grid min-w-0 flex-[1_1_420px] grid-cols-2 gap-0.5 border-2 border-bg bg-bg">
              {FRENTES_TECNOLOGIA.map((f, i) => (
                <li key={f} className="bg-accent p-5 md:p-7">
                  <span className="font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mt-2.5 block font-display text-[24px] leading-none font-bold uppercase md:text-[28px]">{f}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ARQUIVO */}
        <section id="arquivo" aria-labelledby="titulo-arquivo" className="scroll-mt-4 border-b border-line">
          <div className="container-ops py-16 md:py-24">
            <RotuloSecao>Arquivo histórico</RotuloSecao>
            <TituloSecao id="titulo-arquivo" className="mt-3.5 mb-14">
              Um século de guerra
            </TituloSecao>
            <LinhaDoTempo
              eventos={(obterLinhaDoTempoArquivo()?.eventos ?? [])
                .filter((e) => ["1914", "1939", "1962", "1991", "2022", "2025"].includes(e.marco))
                .map((e) => ({ ...e, fontes: undefined }))}
            />
            <p className="mt-8 font-mono text-xs text-muted">Fontes de cada marco na página do arquivo.</p>
            <Link href="/arquivo" className={`mt-2 ${LINK_SECAO}`}>
              VER O ARQUIVO COMPLETO →
            </Link>
          </div>
        </section>

        {/* BRIEFING */}
        <section id="boletim" aria-labelledby="titulo-boletim" className="scroll-mt-4 border-b border-line">
          <div className="container-ops flex flex-wrap items-center justify-between gap-10 py-16 md:py-20">
            <div className="flex-[1_1_420px]">
              <h2 id="titulo-boletim" className="font-display text-[40px] leading-[0.95] font-extrabold uppercase md:text-[52px]">
                Boletim diário, às 6h
              </h2>
              <p className="mt-3.5 text-base text-muted">
                Cinco minutos de leitura, às 6h (horário de Brasília). O que mudou nas frentes, no arsenal e na tecnologia.
              </p>
            </div>
            <FormBoletim />
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}

function CardCategoria({ categoria, rotulo, titulo, alto }: { categoria: Categoria; rotulo: string; titulo: string; alto?: boolean }) {
  return (
    <Link
      href={`/arsenal/${categoria}`}
      className={`placeholder-listrado group relative flex flex-col justify-end border border-line p-6 text-text md:p-7 ${
        alto ? "min-h-[300px] md:min-h-[460px]" : "min-h-[300px]"
      }`}
    >
      <span aria-hidden="true" className="absolute top-6 left-6 font-mono text-xs tracking-[0.1em] text-muted md:left-7">
        [FOTO]
      </span>
      <span className="font-mono text-xs tracking-[0.14em] text-accent uppercase">{rotulo}</span>
      <span
        className={`mt-2 font-display leading-[0.9] font-extrabold uppercase group-hover:text-accent ${alto ? "text-[40px] md:text-[44px]" : "text-[40px]"}`}
      >
        {titulo}
      </span>
    </Link>
  );
}
