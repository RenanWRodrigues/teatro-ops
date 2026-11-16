import { formatarData } from "@/lib/format";
import type { Manchete } from "@/lib/tipos";
import { CreditoFonte } from "./CreditoFonte";

type Props = {
  noticia: Manchete & { resumo?: string | null };
  /** Nível do título; h4 quando o card fica sob um h3 (ex.: abas de /tecnologia). */
  nivel?: "h3" | "h4";
};

/** Notícia de imprensa: título (link para o veículo), data, região, resumo próprio e fonte (CLAUDE.md §1.4). */
export function CardNoticia({ noticia: n, nivel: Titulo = "h3" }: Props) {
  return (
    <article className="flex flex-col gap-2 border-b border-line p-6 last:border-b-0">
      <p className="font-mono text-[11px] tracking-[0.12em] text-accent uppercase">
        {n.regiao}
        {n.publicadoEm ? (
          <>
            {" · "}
            <time dateTime={n.publicadoEm}>{formatarData(n.publicadoEm)}</time>
          </>
        ) : null}
      </p>
      <Titulo className="text-lg leading-snug font-semibold">
        {n.url ? (
          <a
            href={n.url}
            lang={n.traducaoPendente ? (n.idiomaOriginal ?? undefined) : undefined}
            className="text-text hover:text-accent"
            rel="noopener noreferrer"
            target="_blank"
          >
            {n.titulo}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        ) : (
          n.titulo
        )}
      </Titulo>
      {n.traducaoPendente ? <p className="font-mono text-[11px] text-text-2">TRADUÇÃO PENDENTE — título no idioma original</p> : null}
      {n.resumo ? (
        <p className="text-sm leading-normal text-muted">
          <span className="font-mono text-[11px] text-text-2">Resumo automático · </span>
          {n.resumo}
        </p>
      ) : null}
      <p className="font-mono text-[11px] text-muted">
        <CreditoFonte fonte={n.fonte} className="text-[11px]" />
        {n.via ? (
          <>
            {" · via "}
            <a href={n.via.url ?? undefined} className="text-text-2 underline underline-offset-2 hover:text-accent" rel="noopener noreferrer" target="_blank">
              {n.via.nome}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
            {n.via.licenca ? ` (${n.via.licenca})` : null}
          </>
        ) : null}
      </p>
    </article>
  );
}
