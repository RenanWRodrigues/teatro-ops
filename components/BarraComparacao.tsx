import { formatarEspecificacao } from "@/lib/especificacao";
import type { Especificacao } from "@/lib/tipos";
import { ListaFontes } from "./ListaFontes";

type Linha = { rotulo: string; a: Especificacao; b: Especificacao };

type Props = {
  rotuloA: string;
  rotuloB: string;
  linhas: Linha[];
};

const texto = formatarEspecificacao;

/** Barras proporcionais ao maior valor de cada linha (skill ficha-equipamento). Inclui tabela para leitores de tela. */
export function BarraComparacao({ rotuloA, rotuloB, linhas }: Props) {
  return (
    <div className="flex flex-col gap-[22px] font-mono text-[13px]">
      <table className="sr-only">
        <caption>
          Comparação entre {rotuloA} e {rotuloB}
        </caption>
        <thead>
          <tr>
            <th scope="col">Característica</th>
            <th scope="col">{rotuloA}</th>
            <th scope="col">{rotuloB}</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.rotulo}>
              <th scope="row">{l.rotulo}</th>
              <td>{texto(l.a)}</td>
              <td>{texto(l.b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {linhas.map((l) => {
        const maior = Math.max(l.a.valor, l.b.valor) || 1;
        return (
          <div key={l.rotulo} aria-hidden="true">
            <div className="mb-2 flex flex-wrap justify-between gap-x-3 text-muted">
              <span className="uppercase">{l.rotulo}</span>
              <span>
                <span className="text-accent">{texto(l.a)}</span> / <span className="text-text">{texto(l.b)}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-2 bg-accent" style={{ width: `${(l.a.valor / maior) * 100}%` }} />
              <div className="h-2 bg-neutral-bar" style={{ width: `${(l.b.valor / maior) * 100}%` }} />
            </div>
          </div>
        );
      })}
      <div aria-hidden="true" className="flex gap-5 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="inline-block size-2.5 bg-accent" /> {rotuloA}
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block size-2.5 bg-neutral-bar" /> {rotuloB}
        </span>
      </div>
      <ListaFontes fontes={linhas.flatMap((l) => [l.a.fonte, l.b.fonte])} />
    </div>
  );
}
