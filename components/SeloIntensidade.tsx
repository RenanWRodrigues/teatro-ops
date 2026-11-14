import type { Intensidade } from "@/lib/tipos";

export const ROTULOS_INTENSIDADE: Record<Intensidade, string> = {
  alta: "Alta intensidade",
  tensao: "Tensão",
  "cessar-fogo": "Cessar-fogo",
};

const TEXTO: Record<Intensidade, string> = {
  alta: "text-alert-text",
  tensao: "text-accent",
  "cessar-fogo": "text-text-3",
};

const BORDA: Record<Intensidade, string> = {
  alta: "border-alert",
  tensao: "border-accent",
  "cessar-fogo": "border-line-strong",
};

type Props = {
  intensidade: Intensidade;
  /** Acrescenta " · REGIÃO" no modo texto. */
  regiao?: string;
  /** "texto" = rótulo em linha; "chip" = legenda com borda. */
  variante?: "texto" | "chip";
};

export function SeloIntensidade({ intensidade, regiao, variante = "texto" }: Props) {
  const rotulo = ROTULOS_INTENSIDADE[intensidade];
  if (variante === "chip") {
    return (
      <span className={`inline-flex items-center gap-2 border bg-bg px-3 py-2 font-mono text-xs ${BORDA[intensidade]} ${TEXTO[intensidade]}`}>
        <span aria-hidden="true">●</span>
        {rotulo}
      </span>
    );
  }
  return (
    <span className={`font-mono text-[11px] tracking-[0.12em] uppercase ${TEXTO[intensidade]}`}>
      <span aria-hidden="true">● </span>
      {rotulo}
      {regiao ? ` · ${regiao}` : null}
    </span>
  );
}
