import { formatarData, formatarNumero } from "@/lib/format";
import type { EventoPublico } from "@/lib/tipos";

/** Linha do tempo de eventos: data, local (província), tipo, atores e mortes estimadas. Nunca coordenadas. */
export function ListaEventos({ eventos }: { eventos: EventoPublico[] }) {
  if (eventos.length === 0) {
    return <p className="border border-line p-6 text-sm text-muted">Ainda não há eventos registrados para este conflito.</p>;
  }
  return (
    <ol className="border-l border-line-strong">
      {eventos.map((e, i) => (
        <li key={`${e.data}-${i}`} className="relative pb-6 pl-6 last:pb-0">
          <span aria-hidden="true" className="absolute top-1.5 -left-[5px] size-2.5 border border-accent bg-bg" />
          <p className="font-mono text-xs text-accent">
            <time dateTime={e.data}>{formatarData(e.data)}</time>
            {e.local ? ` · ${e.local}` : null}
          </p>
          <p className="mt-1 text-sm">
            {e.tipo ?? "Evento"}
            {e.atores.length > 0 ? <span className="text-muted"> — {e.atores.join(" × ")}</span> : null}
          </p>
          {e.mortes !== null ? (
            <p className="mt-0.5 font-mono text-xs text-text-2">
              Mortes estimadas: {formatarNumero(e.mortes)}
              {e.mortesMin !== null && e.mortesMax !== null && (e.mortesMin !== e.mortes || e.mortesMax !== e.mortes)
                ? ` (entre ${formatarNumero(e.mortesMin)} e ${formatarNumero(e.mortesMax)})`
                : null}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
