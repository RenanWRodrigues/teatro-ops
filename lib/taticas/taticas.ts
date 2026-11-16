// Táticas explicadas (Fase 9, item 1). Textos em content/taticas/<id>.mdx, no mesmo formato
// validado de content/tecnologia (lib/tecnologia/dossie.ts). A ordem abaixo é a da página /taticas.

export type TipoDiagrama = "pinca" | "manobra" | "profundidade" | "combinadas" | "assimetrica" | "negacao";

export const TATICAS: readonly { id: string; diagrama: TipoDiagrama }[] = [
  { id: "movimento-de-pinca", diagrama: "pinca" },
  { id: "guerra-de-manobra", diagrama: "manobra" },
  { id: "defesa-em-profundidade", diagrama: "profundidade" },
  { id: "armas-combinadas", diagrama: "combinadas" },
  { id: "guerra-assimetrica", diagrama: "assimetrica" },
  { id: "negacao-de-area-naval", diagrama: "negacao" },
];

export const diagramaDe = (id: string): TipoDiagrama | null => TATICAS.find((t) => t.id === id)?.diagrama ?? null;
