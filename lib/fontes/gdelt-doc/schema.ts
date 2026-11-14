// Resposta crua do GDELT DOC 2.0 API em mode=ArtList&format=json.
// Documentação: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
import { z } from "zod";

export const esquemaArtigoGdelt = z.object({
  url: z.url(),
  url_mobile: z.string().optional(),
  title: z.string(),
  /** "20261114T120000Z" (UTC). */
  seendate: z.string().regex(/^\d{8}T\d{6}Z$/),
  socialimage: z.string().optional(),
  domain: z.string(),
  /** Nome do idioma em inglês ("English", "Portuguese"…). */
  language: z.string(),
  /** País do veículo (não do fato noticiado). */
  sourcecountry: z.string().optional(),
});

export type ArtigoGdelt = z.infer<typeof esquemaArtigoGdelt>;

/** `{}` = nenhum resultado na janela. Itens são validados um a um depois (inválidos contam como ignorados). */
export const esquemaRespostaGdelt = z.object({ articles: z.array(z.unknown()).optional() });
