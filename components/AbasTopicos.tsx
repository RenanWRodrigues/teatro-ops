"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { FeedTopico } from "@/lib/tipos";
import { CardNoticia } from "./CardNoticia";
import { CarimboAtualizacao } from "./CarimboAtualizacao";
import { Placeholder } from "./Placeholder";

export type AbaTopico = {
  id: string;
  rotulo: string;
  titulo: string;
  /** Linha fina do texto explicativo; `null` enquanto o texto não foi aprovado. */
  resumo: string | null;
  /** Corpo já renderizado no servidor (CorpoDossie), com as fontes numeradas. */
  corpo: ReactNode | null;
};

type Props = {
  topicos: AbaTopico[];
  /** Notícias reais por id de tópico (lib/tecnologia/topicos.ts). Sem a chave, a aba não mostra o bloco. */
  feeds?: Partial<Record<string, FeedTopico>>;
  /** Última coleta de notícias (execucoes_ingestao). */
  atualizadoEm?: string | null;
};

/**
 * Abas acessíveis (padrão WAI-ARIA: setas, Home e End movem o foco e ativam a aba). Os cinco painéis vão no
 * HTML e os inativos ficam com `hidden`: o conteúdo existe sem JavaScript e aparece na busca do navegador.
 */
export function AbasTopicos({
  topicos,
  feeds = {},
  atualizadoEm = null,
}: Props) {
  const [ativo, setAtivo] = useState(0);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const atual = topicos[ativo];

  function selecionar(i: number) {
    const n = topicos.length;
    const alvo = ((i % n) + n) % n;
    setAtivo(alvo);
    botoes.current[alvo]?.focus();
  }

  function aoTeclar(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const mapa: Record<string, number> = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: topicos.length - 1,
    };
    const destino = mapa[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    selecionar(destino);
  }

  if (!atual) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Tópicos"
        className="mt-6 flex flex-wrap border-b border-line"
      >
        {topicos.map((t, i) => {
          const sel = i === ativo;
          return (
            <button
              key={t.id}
              ref={(el) => {
                botoes.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-aba-${t.id}`}
              aria-selected={sel}
              aria-controls={`${base}-painel-${t.id}`}
              tabIndex={sel ? 0 : -1}
              onClick={() => setAtivo(i)}
              onKeyDown={(e) => aoTeclar(e, i)}
              className={`-mb-px min-h-14 border-b-[3px] px-4 font-display text-[22px] font-bold tracking-[0.04em] uppercase sm:px-6 ${
                sel
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              <span className="mr-2.5 font-mono text-xs">
                {String(i + 1).padStart(2, "0")}
              </span>
              {t.rotulo}
            </button>
          );
        })}
      </div>
      {topicos.map((atual, i) => {
        const feed = feeds[atual.id];
        return (
          <div
            key={atual.id}
            role="tabpanel"
            id={`${base}-painel-${atual.id}`}
            aria-labelledby={`${base}-aba-${atual.id}`}
            hidden={i !== ativo}
            tabIndex={0}
            className="flex flex-wrap gap-12 pt-12"
          >
            <div className="min-w-0 flex-[1_1_520px]">
              <h2 className="font-display text-[48px] leading-[0.9] font-extrabold uppercase [overflow-wrap:anywhere] sm:text-[72px]">
                {atual.titulo}
              </h2>
              {atual.resumo ? (
                <p className="mt-6 max-w-[680px] text-[19px] leading-[1.65] text-text">
                  {atual.resumo}
                </p>
              ) : null}
              {atual.corpo ?? (
                <p className="mt-6 max-w-[620px] border border-line bg-surface px-6 py-5 text-base leading-relaxed text-text-2">
                  Texto explicativo em preparação.
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-5">
              <Placeholder
                rotulo={`INFOGRÁFICO · ${atual.titulo}`}
                className="h-[320px] border border-line"
              />
            </div>
            {feed ? (
              <section
                aria-labelledby={`${base}-noticias-${atual.id}`}
                className="w-full min-w-0"
              >
                <h3
                  id={`${base}-noticias-${atual.id}`}
                  className="font-display text-[28px] leading-[0.95] font-bold uppercase sm:text-[36px]"
                >
                  Notícias recentes · {atual.rotulo}
                </h3>
                <p className="mt-3 max-w-[720px] text-sm leading-relaxed text-text-2">
                  {feed.criterio} Seleção automática por palavras-chave; títulos
                  em inglês traduzidos automaticamente.
                </p>
                {feed.noticias.length > 0 ? (
                  <div className="mt-6 border border-line bg-surface">
                    {feed.noticias.map((n) => (
                      <CardNoticia key={n.url} noticia={n} nivel="h4" />
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 border border-line bg-surface px-6 py-5 text-base leading-relaxed text-text-2">
                    Nenhuma notícia recente coletada para este tópico. A coleta
                    do GDELT roda a cada 30 minutos.
                  </p>
                )}
                <CarimboAtualizacao data={atualizadoEm} className="mt-4" />
              </section>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
