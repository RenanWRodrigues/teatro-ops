import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import { AbasTopicos, type AbaTopico } from "@/components/AbasTopicos";
import { Cabecalho } from "@/components/Cabecalho";
import { CarimboAtualizacao } from "@/components/CarimboAtualizacao";
import { CorpoDossie } from "@/components/CorpoDossie";
import { FontesNumeradas } from "@/components/FontesNumeradas";
import { GraficoVolumeTemas } from "@/components/GraficoVolumeTemas";
import { HumanoNoCircuito } from "@/components/HumanoNoCircuito";
import { LinhaDoTempo } from "@/components/LinhaDoTempo";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TituloSecao } from "@/components/TituloSecao";
import { obterAtualizacaoNoticias, obterDossiesTecnologia, obterFeedsTecnologia, obterHumanoNoCircuito, obterLinhaDoTempoDrones, obterVolumeSemanalTecnologia } from "@/lib/dados";
import { FILTROS_TOPICO, type IdTopico } from "@/lib/tecnologia/topicos";

export const metadata: Metadata = metadados({
  titulo: "IA e drones — guerra tecnológica",
  descricao: "Como inteligência artificial, drones e guerra eletrônica mudaram o custo, a velocidade e a ética do combate moderno.",
  caminho: "/tecnologia",
});

export default async function Page() {
  const [feeds, atualizadoEm, volume] = await Promise.all([obterFeedsTecnologia(), obterAtualizacaoNoticias(), obterVolumeSemanalTecnologia()]);
  const dossies = obterDossiesTecnologia();
  const linha = obterLinhaDoTempoDrones();
  const onu = obterHumanoNoCircuito();
  const topicos: AbaTopico[] = (Object.keys(FILTROS_TOPICO) as IdTopico[]).map((id) => {
    const d = dossies[id];
    return {
      id,
      rotulo: FILTROS_TOPICO[id].rotulo,
      titulo: d?.titulo ?? FILTROS_TOPICO[id].rotulo,
      resumo: d?.resumo ?? null,
      corpo: d ? <CorpoDossie dossie={d} /> : null,
    };
  });
  return (
    <>
      <Cabecalho ativo="tecnologia" />
      <main id="conteudo" tabIndex={-1}>
        {/* HUD */}
        <section className="border-b border-line">
          <div className="placeholder-listrado relative flex min-h-[560px] flex-col justify-end overflow-hidden md:min-h-[640px]">
            <span aria-hidden="true" className="absolute top-16 right-[72px] hidden font-mono text-xs tracking-[0.1em] text-muted md:block">
              [VÍDEO DE FUNDO · VISTA AÉREA DE DRONE, P&amp;B]
            </span>
            <div aria-hidden="true" className="anim-linha-hud absolute inset-x-0 top-10 h-0.5 bg-accent opacity-35" />
            <svg aria-hidden="true" viewBox="0 0 1440 640" preserveAspectRatio="none" className="absolute inset-0 size-full">
              <path
                d="M40 40h60M40 40v60M1400 40h-60M1400 40v60M40 600h60M40 600v-60M1400 600h-60M1400 600v-60"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div aria-hidden="true" className="absolute top-1/2 right-[18%] hidden size-[150px] -translate-y-1/2 border-[1.5px] border-accent lg:block">
              <div className="absolute -top-6 -bottom-6 left-1/2 w-px bg-accent" />
              <div className="absolute top-1/2 -right-6 -left-6 h-px bg-accent" />
              <div className="absolute -top-7 left-0 font-mono text-[11px] whitespace-nowrap text-accent">OBJ-01 · CLASSIFICANDO…</div>
            </div>
            <div aria-hidden="true" className="absolute top-16 left-6 font-mono text-xs leading-[1.9] tracking-[0.08em] text-text-2 md:left-[72px]">
              <div>
                <span className="anim-piscar text-alert">●</span> GRAV
              </div>
              <div>ALT [—] m</div>
              <div>VEL [—] km/h</div>
              <div>SINAL [—]</div>
            </div>
            <div className="relative">
              <div className="container-ops pt-[190px] pb-14 md:pb-[72px]">
                <RotuloSecao>Dossiê · Guerra tecnológica</RotuloSecao>
                <h1 className="mt-3.5 font-display text-[clamp(56px,10vw,150px)] leading-[0.85] font-extrabold uppercase">
                  Máquinas que
                  <br />
                  decidem<span className="text-accent">?</span>
                </h1>
                <p className="mt-6 max-w-[620px] text-[19px] leading-relaxed text-text-2">
                  Como inteligência artificial, drones e guerra eletrônica mudaram o custo, a velocidade e a ética do combate
                  moderno.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TÓPICOS */}
        <section aria-label="Explorar tópicos" className="border-b border-line">
          <div className="container-ops py-16 md:py-[88px]">
            <RotuloSecao>Explorar tópicos</RotuloSecao>
            <AbasTopicos topicos={topicos} feeds={feeds} atualizadoEm={atualizadoEm} />
          </div>
        </section>

        {/* INDICADORES */}
        <section aria-labelledby="titulo-indicadores" className="border-b border-line">
          <div className="container-ops py-16 md:py-[88px]">
            <RotuloSecao>Indicadores</RotuloSecao>
            <TituloSecao id="titulo-indicadores" className="mt-3.5">
              Notícias por semana
            </TituloSecao>
            <p className="mt-5 max-w-[720px] text-base leading-relaxed text-text-2">
              Quantas notícias coletadas pelo TEATRO//OPS foram classificadas em cada tema, por semana (de segunda a
              domingo, UTC). Mede a cobertura da imprensa captada pela coleta, não a quantidade de ataques ou de sistemas
              em uso. Uma notícia pode entrar em mais de um tema.
            </p>
            <GraficoVolumeTemas volume={volume} className="mt-10" />
            <p className="mt-6 font-mono text-xs leading-relaxed text-muted">
              Fonte:{" "}
              <a href="https://www.gdeltproject.org/" className="underline underline-offset-2 hover:text-accent" rel="noopener noreferrer" target="_blank">
                Projeto GDELT
                <span className="sr-only"> (abre em nova aba)</span>
              </a>{" "}
              (arquivos GKG; uso livre com citação), coletado e classificado pelo TEATRO//OPS. A
              coleta começou em novembro de 2026 e roda de forma irregular no plano gratuito do GitHub Actions; semanas
              com menos coletas mostram volumes menores.
            </p>
            <CarimboAtualizacao data={atualizadoEm} className="mt-2" />
          </div>
        </section>

        {/* LINHA DO TEMPO */}
        {linha ? (
          <section aria-labelledby="titulo-linha" className="border-b border-line bg-surface">
            <div className="container-ops py-16 md:py-[88px]">
              <RotuloSecao>Linha do tempo</RotuloSecao>
              <TituloSecao id="titulo-linha" className="mt-3.5 mb-12">
                A ascensão dos drones
              </TituloSecao>
              <LinhaDoTempo eventos={linha.eventos} variante="grade" prefixoRef="ref-linha" />
              <h3 className="mt-8 font-mono text-xs tracking-[0.14em] text-accent uppercase">Fontes</h3>
              <FontesNumeradas fontes={linha.fontes} prefixo="ref-linha" className="mt-3" />
            </div>
          </section>
        ) : null}

        {/* ÉTICA */}
        {onu ? <HumanoNoCircuito dados={onu} /> : null}
      </main>
      <Rodape />
    </>
  );
}
