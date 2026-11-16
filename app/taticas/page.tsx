import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { DiagramaTatica } from "@/components/DiagramaTatica";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TituloSecao } from "@/components/TituloSecao";
import { obterTaticas } from "@/lib/dados";

export const metadata: Metadata = metadados({
  titulo: "Táticas explicadas",
  descricao: "Doutrinas militares explicadas com diagramas esquemáticos e casos históricos, no nível conceitual e sempre com fontes.",
  caminho: "/taticas",
});

export default function Page() {
  const taticas = obterTaticas();
  return (
    <>
      <Cabecalho ativo="taticas" />
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops pt-14 pb-12 md:pt-[72px]">
            <RotuloSecao>Doutrina</RotuloSecao>
            <TituloSecao como="h1" tamanho="hero" className="mt-3.5">
              Táticas explicadas
            </TituloSecao>
            <p className="mt-6 max-w-[680px] text-lg leading-relaxed text-text-2">
              Como exércitos e marinhas pensam o combate, contado pela doutrina e por casos históricos. Os textos ficam no nível
              conceitual: explicam a ideia e a história, não como executar uma operação.
            </p>
          </div>
        </section>

        <section aria-label="Lista de táticas">
          <div className="container-ops py-16 md:py-[88px]">
            {taticas.length === 0 ? (
              <p className="border border-line bg-surface px-6 py-5 text-base text-text-2">Os textos de táticas estão em preparação.</p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-px border border-line bg-line">
                {taticas.map((t) => (
                  <li key={t.id} className="relative flex flex-col gap-4 bg-bg p-6 md:p-8">
                    <DiagramaTatica tipo={t.diagrama} />
                    <h2 className="font-display text-[28px] leading-none font-bold uppercase">
                      <Link href={`/taticas/${t.id}`} className="after:absolute after:inset-0 hover:text-accent focus-visible:text-accent">
                        {t.titulo}
                      </Link>
                    </h2>
                    <p className="text-[15px] leading-[1.55] text-text-2">{t.resumo}</p>
                    <p className="mt-auto font-mono text-xs text-muted">
                      {t.fontes.length} {t.fontes.length === 1 ? "fonte" : "fontes"} · ler o texto →
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}
