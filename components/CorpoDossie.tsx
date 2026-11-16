import { formatarData } from "@/lib/format";
import type { Dossie } from "@/lib/tecnologia/dossie";
import { FontesNumeradas } from "./FontesNumeradas";
import { Trechos } from "./Trechos";

/** Corpo do texto explicativo de uma aba de /tecnologia, com as fontes numeradas no rodapé. */
export function CorpoDossie({ dossie, nivel = "h3" }: { dossie: Dossie; nivel?: "h2" | "h3" }) {
  const Titulo = nivel;
  const prefixo = `ref-${dossie.id}`;
  return (
    <div className="max-w-[680px]">
      {dossie.secoes.map((s) => (
        <section key={s.titulo} className="mt-10 first:mt-8">
          <Titulo className="font-display text-[26px] leading-[0.95] font-bold uppercase sm:text-[30px]">{s.titulo}</Titulo>
          {s.blocos.map((b, i) =>
            b.tipo === "paragrafo" ? (
              <p key={i} className="mt-4 text-[17px] leading-[1.7] text-text-2">
                <Trechos trechos={b.trechos} prefixo={prefixo} />
              </p>
            ) : (
              <ul key={i} className="mt-4 flex flex-col gap-2.5 border-l-2 border-line-strong pl-5 text-[17px] leading-[1.65] text-text-2">
                {b.itens.map((item, j) => (
                  <li key={j}>
                    <Trechos trechos={item} prefixo={prefixo} />
                  </li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}

      <footer className="mt-10 border-t border-line pt-5">
        <Titulo className="font-mono text-xs tracking-[0.14em] text-accent uppercase">Fontes</Titulo>
        <FontesNumeradas fontes={dossie.fontes} prefixo={prefixo} className="mt-3" />
        <p className="mt-4 font-mono text-xs leading-relaxed text-muted">
          Texto da redação do TEATRO//OPS, escrito a partir das fontes acima; atualizado em{" "}
          <time dateTime={dossie.atualizadoEm}>{formatarData(dossie.atualizadoEm)}</time>.
        </p>
      </footer>
    </div>
  );
}
