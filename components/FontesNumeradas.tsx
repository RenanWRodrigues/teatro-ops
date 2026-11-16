import { formatarDataFonte, type FonteDossie } from "@/lib/tecnologia/dossie";

const LINK = "text-text-2 underline underline-offset-2 hover:text-accent";

/** Lista de fontes numeradas de um texto editorial; cada item tem a âncora #<prefixo>-n das chamadas [n]. */
export function FontesNumeradas({ fontes, prefixo, className = "" }: { fontes: FonteDossie[]; prefixo: string; className?: string }) {
  return (
    <ol className={`flex flex-col gap-2 font-mono text-xs leading-relaxed text-muted ${className}`}>
      {fontes.map((f) => (
        <li key={f.n} id={`${prefixo}-${f.n}`} className="scroll-mt-4">
          <span className="text-accent">[{f.n}]</span> {f.nome}.{" "}
          <a href={f.url} lang={f.idioma} className={LINK} rel="noopener noreferrer" target="_blank">
            {f.titulo}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
          {" · "}
          {formatarDataFonte(f.data)}
          {f.licenca ? (
            <>
              {" · "}
              {f.licenca_url ? (
                <a href={f.licenca_url} className={LINK} rel="noopener noreferrer license" target="_blank">
                  {f.licenca}
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              ) : (
                f.licenca
              )}
            </>
          ) : null}
          {" · "}
          {f.verificacao}
        </li>
      ))}
    </ol>
  );
}
