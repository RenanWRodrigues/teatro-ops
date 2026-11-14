import type { Metadata } from "next";
import { AbasTopicos } from "@/components/AbasTopicos";
import { AvisoExemplo } from "@/components/AvisoExemplo";
import { Cabecalho } from "@/components/Cabecalho";
import { LinhaDoTempo } from "@/components/LinhaDoTempo";
import { ListaFontes } from "@/components/ListaFontes";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TituloSecao } from "@/components/TituloSecao";
import { FONTES_ETICA, FONTES_LINHA_DRONES, LINHA_DRONES, NIVEIS_CONTROLE, TOPICOS_TECNOLOGIA } from "@/lib/fixtures/tecnologia";

export const metadata: Metadata = {
  title: "IA e drones — guerra tecnológica",
  description: "Como inteligência artificial, drones e guerra eletrônica mudaram o custo, a velocidade e a ética do combate moderno.",
};

export default function Page() {
  return (
    <>
      <Cabecalho ativo="tecnologia" />
      <AvisoExemplo />
      <main id="conteudo" tabIndex={-1}>
        {/* HUD */}
        <section className="border-b border-line">
          <div className="placeholder-listrado relative flex min-h-[560px] flex-col justify-end overflow-hidden md:min-h-[640px]">
            <span className="absolute top-16 right-[72px] hidden font-mono text-xs tracking-[0.1em] text-muted md:block">
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
            <AbasTopicos topicos={TOPICOS_TECNOLOGIA} />
          </div>
        </section>

        {/* LINHA DO TEMPO */}
        <section aria-labelledby="titulo-linha" className="border-b border-line bg-surface">
          <div className="container-ops py-16 md:py-[88px]">
            <RotuloSecao>Linha do tempo</RotuloSecao>
            <TituloSecao id="titulo-linha" className="mt-3.5 mb-12">
              A ascensão dos drones
            </TituloSecao>
            <LinhaDoTempo eventos={LINHA_DRONES} variante="grade" />
            <ListaFontes fontes={FONTES_LINHA_DRONES} className="mt-4" />
          </div>
        </section>

        {/* ÉTICA */}
        <section aria-labelledby="titulo-etica">
          <div className="container-ops flex flex-wrap items-center gap-12 py-16 md:py-[88px]">
            <div className="min-w-0 flex-[1_1_520px]">
              <RotuloSecao>Ética e direito</RotuloSecao>
              <TituloSecao id="titulo-etica" className="mt-3.5">
                Humano no circuito?
              </TituloSecao>
              <p className="mt-5 max-w-[620px] text-lg leading-[1.65] text-text-2">
                Na ONU, países discutem há anos regras para sistemas de armas autônomas letais. A pergunta central: quanto
                controle humano deve existir sobre a decisão de usar força?
              </p>
              <ListaFontes fontes={FONTES_ETICA} className="mt-4" />
            </div>
            <dl className="flex min-w-0 flex-[1_1_400px] flex-col gap-3 font-mono text-sm">
              {NIVEIS_CONTROLE.map((n) => (
                <div
                  key={n.sigla}
                  className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 border px-[22px] py-[18px] ${n.alerta ? "border-alert" : "border-line-strong"}`}
                >
                  <dt className={n.alerta ? "text-alert-text" : "text-accent"}>{n.sigla}</dt>
                  <dd>{n.texto}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}
