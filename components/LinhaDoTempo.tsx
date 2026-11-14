import type { EventoLinhaDoTempo } from "@/lib/tipos";

type Props = {
  eventos: EventoLinhaDoTempo[];
  /** "trilho" = marcos sobre uma linha (home); "grade" = tabela de comando (tecnologia). */
  variante?: "trilho" | "grade";
};

export function LinhaDoTempo({ eventos, variante = "trilho" }: Props) {
  if (variante === "grade") {
    return (
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-px border border-line bg-line">
        {eventos.map((ev) => (
          <li key={ev.marco} className="bg-bg p-7">
            <p className={`font-display text-5xl font-extrabold ${ev.atual ? "text-text" : "text-accent"}`}>{ev.marco}</p>
            <p className="mt-2 text-[15px] leading-normal text-text-3">{ev.descricao}</p>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute inset-x-0 top-[11px] hidden h-px bg-line-strong sm:block" />
      <ol className="relative grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-6">
        {eventos.map((ev) => (
          <li key={ev.marco} className="flex flex-col gap-3">
            <span
              aria-hidden="true"
              className={`size-[22px] border-2 ${ev.atual ? "border-alert bg-alert" : "border-accent bg-bg"}`}
            />
            <span className={`font-display text-[44px] leading-none font-extrabold ${ev.atual ? "text-text" : "text-accent"}`}>
              {ev.marco}
            </span>
            <span className="text-[15px] text-text-3">{ev.descricao}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
