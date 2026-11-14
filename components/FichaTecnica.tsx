import type { Fonte, ItemFicha } from "@/lib/tipos";
import { RefFonte } from "./RefFonte";

type Props = {
  itens: ItemFicha[];
  titulo?: string;
  /** Número da fonte na lista de referências da página (#ref-n). */
  referencia: (fonte: Fonte) => number;
};

/** Tabela de especificações como <dl>. Cada valor leva à sua fonte com um clique. */
export function FichaTecnica({ itens, titulo = "FICHA TÉCNICA", referencia }: Props) {
  return (
    <div>
      <h2 className="border-b border-line px-[22px] py-[18px] font-mono text-xs tracking-[0.14em] text-accent">{titulo}</h2>
      {itens.length > 0 ? (
        <dl className="font-mono text-[13px]">
          {itens.map((item) => (
            <div key={item.rotulo} className="flex justify-between gap-4 border-b border-line-soft px-[22px] py-3.5 last:border-b-0">
              <dt className="text-muted">{item.rotulo}</dt>
              <dd className="text-right">
                {item.valor}
                <RefFonte numero={referencia(item.fonte)} />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="px-[22px] py-6 text-sm leading-relaxed text-muted">
          Ficha técnica em preparação. Só publicamos especificações com fonte verificada.
        </p>
      )}
    </div>
  );
}
