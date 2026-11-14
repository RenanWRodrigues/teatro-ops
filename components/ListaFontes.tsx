import { fontesUnicas } from "@/lib/especificacao";
import type { Fonte } from "@/lib/tipos";
import { DetalheFonte } from "./CreditoFonte";

type Props = {
  fontes: Fonte[];
  className?: string;
  /** "inline" = "Fontes: A · B"; "numerada" = lista com âncoras #ref-1, #ref-2… */
  variante?: "inline" | "numerada";
};

/** Fontes de um bloco de conteúdo, sempre visíveis (CLAUDE.md §1.3). */
export function ListaFontes({ fontes, className = "", variante = "inline" }: Props) {
  const lista = fontesUnicas(fontes);

  if (variante === "numerada") {
    return (
      <ol className={`flex flex-col gap-1.5 font-mono text-xs leading-relaxed text-muted ${className}`}>
        {lista.map((f, i) => (
          <li key={`${f.nome}-${i}`} id={`ref-${i + 1}`} className="scroll-mt-4">
            <span className="text-accent">[{i + 1}]</span> <DetalheFonte fonte={f} />
          </li>
        ))}
      </ol>
    );
  }

  return (
    <p className={`font-mono text-xs leading-relaxed text-muted ${className}`}>
      {lista.length === 1 ? "Fonte" : "Fontes"}:{" "}
      {lista.map((f, i) => (
        <span key={`${f.nome}-${i}`}>
          {i > 0 ? " · " : null}
          <DetalheFonte fonte={f} />
        </span>
      ))}
    </p>
  );
}
