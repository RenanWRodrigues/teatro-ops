import { formatarData } from "@/lib/format";
import type { Fonte } from "@/lib/tipos";

const LINK = "text-text-2 underline underline-offset-2 hover:text-accent";

/** Nome (com link), licença (com link quando houver) e data de coleta de uma fonte. */
export function DetalheFonte({ fonte }: { fonte: Fonte }) {
  return (
    <>
      {fonte.url ? (
        <a href={fonte.url} className={LINK} rel="noopener noreferrer" target="_blank">
          {fonte.nome}
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      ) : (
        <span className="text-text-2">{fonte.nome}</span>
      )}
      {fonte.licenca ? (
        <>
          {" · "}
          {fonte.licencaUrl ? (
            <a href={fonte.licencaUrl} className={LINK} rel="noopener noreferrer license" target="_blank">
              {fonte.licenca}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          ) : (
            fonte.licenca
          )}
        </>
      ) : null}
      {fonte.coletadoEm ? (
        <>
          {" · coletado em "}
          <time dateTime={fonte.coletadoEm}>{formatarData(fonte.coletadoEm)}</time>
        </>
      ) : null}
    </>
  );
}

type Props = {
  fonte: Fonte;
  prefixo?: string;
  className?: string;
};

/** "Fonte: ACLED · CC BY 4.0 · coletado em 14/11/2026", com links quando houver URL. */
export function CreditoFonte({ fonte, prefixo = "Fonte", className = "" }: Props) {
  return (
    <span className={`font-mono text-xs text-muted ${className}`}>
      {prefixo}: <DetalheFonte fonte={fonte} />
    </span>
  );
}
