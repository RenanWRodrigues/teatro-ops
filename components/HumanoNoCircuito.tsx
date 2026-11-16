import { formatarData } from "@/lib/format";
import type { HumanoNoCircuito as Dados } from "@/lib/tecnologia/humano-no-circuito";
import { FontesNumeradas } from "./FontesNumeradas";
import { RotuloSecao } from "./RotuloSecao";
import { TituloSecao } from "./TituloSecao";
import { Trechos } from "./Trechos";

const PREFIXO = "ref-onu";

/** "Humano no circuito?": níveis de controle humano e andamento das discussões na ONU (Fase 8, item 4). */
export function HumanoNoCircuito({ dados }: { dados: Dados }) {
  return (
    <section aria-labelledby="titulo-etica">
      <div className="container-ops py-16 md:py-[88px]">
        <div className="flex flex-wrap items-start gap-12">
          <div className="min-w-0 flex-[1_1_520px]">
            <RotuloSecao>Ética e direito</RotuloSecao>
            <TituloSecao id="titulo-etica" className="mt-3.5">
              Humano no circuito?
            </TituloSecao>
            <p className="mt-5 max-w-[680px] text-lg leading-[1.65] text-text-2">
              <Trechos trechos={dados.introducao} prefixo={PREFIXO} />
            </p>
          </div>
          <div className="min-w-0 flex-[1_1_400px]">
            <dl className="flex flex-col gap-3 font-mono text-sm">
              {dados.niveis.map((n) => (
                <div
                  key={n.sigla}
                  className={`flex flex-col gap-1.5 border px-[22px] py-[18px] ${n.alerta ? "border-alert" : "border-line-strong"}`}
                >
                  <dt className={n.alerta ? "text-alert-text" : "text-accent"}>{n.sigla}</dt>
                  <dd className="font-sans text-[15px] leading-normal text-text-2">
                    <Trechos trechos={n.texto} prefixo={PREFIXO} />
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 font-mono text-xs leading-relaxed text-muted">
              <Trechos trechos={dados.notaNiveis} prefixo={PREFIXO} />
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap gap-12">
          <div className="min-w-0 flex-[1_1_520px]">
            <h3 className="font-display text-[26px] leading-[0.95] font-bold uppercase sm:text-[30px]">Andamento na ONU</h3>
            <p className="mt-2 font-mono text-xs text-muted">
              Situação em <time dateTime={dados.situacaoEm}>{formatarData(dados.situacaoEm)}</time>
            </p>
            <ol className="mt-6 flex flex-col border-l-2 border-line-strong">
              {dados.andamento.map((a) => (
                <li key={a.data} className="relative pb-6 pl-6 last:pb-0">
                  <span
                    aria-hidden="true"
                    className={`absolute top-1.5 -left-[7px] size-3 border-2 ${a.atual ? "border-alert bg-alert" : "border-accent bg-bg"}`}
                  />
                  <p className={`font-mono text-sm ${a.atual ? "text-text" : "text-accent"}`}>
                    <time dateTime={a.data}>{formatarData(a.data)}</time>
                    {a.atual ? <span className="ml-2 text-alert-text">· em andamento</span> : null}
                  </p>
                  <p className="mt-1.5 text-[16px] leading-[1.65] text-text-2">
                    <Trechos trechos={a.texto} prefixo={PREFIXO} />
                  </p>
                </li>
              ))}
            </ol>
          </div>
          <div className="min-w-0 flex-[1_1_400px]">
            <h3 className="font-display text-[26px] leading-[0.95] font-bold uppercase sm:text-[30px]">Posições em jogo</h3>
            <ul className="mt-6 flex flex-col gap-3">
              {dados.posicoes.map((p, i) => (
                <li key={i} className="border border-line bg-surface px-5 py-4 text-[16px] leading-[1.6] text-text-2">
                  <Trechos trechos={p} prefixo={PREFIXO} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="mt-12 border-t border-line pt-5">
          <h3 className="font-mono text-xs tracking-[0.14em] text-accent uppercase">Fontes</h3>
          <FontesNumeradas fontes={dados.fontes} prefixo={PREFIXO} className="mt-3" />
          <p className="mt-4 font-mono text-xs leading-relaxed text-muted">
            Texto da redação do TEATRO//OPS, escrito a partir das fontes acima; atualizado em{" "}
            <time dateTime={dados.atualizadoEm}>{formatarData(dados.atualizadoEm)}</time>.
          </p>
        </footer>
      </div>
    </section>
  );
}
