// Linha do tempo "A ascensão dos drones" (content/tecnologia/linha-do-tempo.yaml, Fase 8, item 3).
import { parse } from "yaml";
import { z } from "zod";
import type { EventoLinhaDoTempo } from "@/lib/tipos";
import { esquemaFonteDossie, validarChamadas, type FonteDossie } from "./dossie";

const esquema = z.object({
  status: z.enum(["rascunho", "publicado"]),
  revisao: z.string().trim().min(1),
  atualizado_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  marcos: z
    .array(
      z.object({
        marco: z.string().trim().min(1),
        descricao: z.string().trim().min(1),
        atual: z.boolean().optional(),
        fontes: z.array(z.number().int().positive()).min(1),
      }),
    )
    .min(1),
  fontes: z.array(esquemaFonteDossie).min(1),
});

export type LinhaDoTempoComFontes = {
  status: "rascunho" | "publicado";
  revisao: string;
  atualizadoEm: string;
  eventos: EventoLinhaDoTempo[];
  fontes: FonteDossie[];
};

export function lerLinhaDoTempo(textoYaml: string, arquivo: string): LinhaDoTempoComFontes {
  const d = esquema.parse(parse(textoYaml));
  validarChamadas(d.fontes, d.marcos.flatMap((m) => m.fontes), arquivo);
  const marcos = new Set<string>();
  for (const m of d.marcos) {
    if (marcos.has(m.marco)) throw new Error(`${arquivo}: marco "${m.marco}" repetido`);
    marcos.add(m.marco);
  }
  if (d.marcos.filter((m) => m.atual).length > 1) throw new Error(`${arquivo}: só um marco pode ser "atual"`);
  return {
    status: d.status,
    revisao: d.revisao,
    atualizadoEm: d.atualizado_em,
    eventos: d.marcos.map((m) => ({ marco: m.marco, descricao: m.descricao, atual: m.atual, fontes: m.fontes })),
    fontes: d.fontes,
  };
}
