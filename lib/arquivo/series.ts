// Leitura e validação de content/arquivo/ucdp-series.json (gerado por pnpm arquivo:ucdp; Fase 9, item 2).
import { z } from "zod";

const inteiro = z.number().int().min(0);

export const esquemaSeriesUcdp = z.object({
  versao: z.string().regex(/^\d+\.\d+$/),
  coletado_em: z.iso.datetime(),
  arquivos: z.object({ acd: z.url(), brd: z.url() }),
  conflitos: z
    .array(
      z.object({
        ano: z.number().int(),
        total: inteiro,
        guerras: inteiro,
        extrassistemico: inteiro,
        interestatal: inteiro,
        intraestatal: inteiro,
        internacionalizado: inteiro,
      }),
    )
    .min(1),
  mortes: z.array(z.object({ ano: z.number().int(), estimativa: inteiro, minimo: inteiro, maximo: inteiro })).min(1),
  ignoradas: inteiro,
});

export type SeriesArquivo = z.infer<typeof esquemaSeriesUcdp>;

/** Valida o JSON e confere a consistência: anos contínuos e soma dos tipos igual ao total. */
export function lerSeriesUcdp(json: unknown): SeriesArquivo {
  const s = esquemaSeriesUcdp.parse(json);
  const continuo = (anos: number[]) => anos.every((a, i) => i === 0 || a === anos[i - 1]! + 1);
  if (!continuo(s.conflitos.map((c) => c.ano)) || !continuo(s.mortes.map((m) => m.ano))) throw new Error("ucdp-series.json: anos com lacunas");
  for (const c of s.conflitos) {
    if (c.extrassistemico + c.interestatal + c.intraestatal + c.internacionalizado !== c.total || c.guerras > c.total) {
      throw new Error(`ucdp-series.json: contagens inconsistentes em ${c.ano}`);
    }
  }
  return s;
}
