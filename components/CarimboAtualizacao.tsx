import { formatarCarimbo } from "@/lib/format";
import { AvisoDefasagem } from "./AvisoDefasagem";

type Props = {
  /** ISO 8601 vindo de execucoes_ingestao. `null` = ainda sem coleta. */
  data: string | null;
  className?: string;
  /**
   * Horas sem coleta a partir das quais a página avisa "Fonte temporariamente indisponível — exibindo dados de …".
   * Padrão: 12 h (notícias e governos rodam a cada 30–60 min, mas o agendador gratuito atrasa horas).
   */
  limiteHoras?: number;
};

/** "Atualizado em 14/11/2026 às 11h20" (horário de Brasília). */
export function CarimboAtualizacao({ data, className = "", limiteHoras = 12 }: Props) {
  return (
    <p className={`font-mono text-xs tracking-[0.06em] text-muted ${className}`}>
      {data ? (
        <>
          Atualizado em <time dateTime={data}>{formatarCarimbo(data)}</time>{" "}
          <span className="sr-only">(horário de Brasília)</span>
          <AvisoDefasagem data={data} limiteHoras={limiteHoras} />
        </>
      ) : (
        "Sem atualização registrada ainda"
      )}
    </p>
  );
}
