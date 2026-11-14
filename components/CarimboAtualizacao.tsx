import { formatarCarimbo } from "@/lib/format";

type Props = {
  /** ISO 8601 vindo de execucoes_ingestao. `null` = ainda sem coleta. */
  data: string | null;
  className?: string;
};

/** "Atualizado em 14/11/2026 às 11h20" (horário de Brasília). */
export function CarimboAtualizacao({ data, className = "" }: Props) {
  return (
    <p className={`font-mono text-xs tracking-[0.06em] text-muted ${className}`}>
      {data ? (
        <>
          Atualizado em <time dateTime={data}>{formatarCarimbo(data)}</time>{" "}
          <span className="sr-only">(horário de Brasília)</span>
        </>
      ) : (
        "Sem atualização registrada ainda"
      )}
    </p>
  );
}
