// Fotos do Wikimedia Commons com licença livre: autor, licença e link de cada arquivo (extmetadata).
// Só entram domínio público, CC0, CC BY e CC BY-SA. NC/ND, "fair use" e licença ausente ficam de fora.
import { z } from "zod";
import { fetchComRetry } from "@/lib/fontes/_base/http";
import { rateLimiter } from "@/lib/fontes/_base/limitador";
import { userAgentWikimedia } from "@/lib/fontes/wikidata";

export const API_COMMONS = "https://commons.wikimedia.org/w/api.php";

const meta = z.object({ value: z.union([z.string(), z.number()]).transform(String) }).optional();

export const esquemaPaginaArquivo = z.object({
  title: z.string(),
  imageinfo: z
    .array(
      z.object({
        url: z.string().url(),
        thumburl: z.string().url().optional(),
        descriptionurl: z.string().url(),
        width: z.number().optional(),
        height: z.number().optional(),
        mime: z.string().optional(),
        extmetadata: z
          .object({
            Artist: meta,
            Credit: meta,
            LicenseShortName: meta,
            LicenseUrl: meta,
            ImageDescription: meta,
            ObjectName: meta,
          })
          .partial()
          .default({}),
      }),
    )
    .min(1),
});

export type FotoCommons = {
  arquivo: string;
  url: string;
  miniaturaUrl: string | null;
  paginaUrl: string;
  autor: string;
  licenca: string;
  licencaUrl: string | null;
  /** Descrição em inglês (ou no idioma do arquivo), sem HTML, até 200 caracteres; traduzida depois. */
  descricao: string | null;
  largura: number | null;
  altura: number | null;
};

const semHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** Licença livre e compatível com exibição pública com crédito. */
export function licencaLivre(nome: string): boolean {
  const n = nome.toLowerCase();
  if (/\bnc\b|non-?commercial|\bnd\b|no-?deriv|fair use|copyrighted/.test(n)) return false;
  return /public domain|domínio público|pd\b|^pd-|cc0|cc[- ]by(-sa)?[- ]\d/.test(n);
}

export function normalizarArquivo(pagina: unknown): FotoCommons | null {
  const r = esquemaPaginaArquivo.safeParse(pagina);
  if (!r.success) return null;
  const info = r.data.imageinfo[0]!;
  if (info.mime && !/^image\/(jpeg|png|webp)$/.test(info.mime)) return null;
  const licenca = info.extmetadata.LicenseShortName?.value?.trim();
  if (!licenca || !licencaLivre(licenca)) return null;
  const autor = semHtml(info.extmetadata.Artist?.value ?? info.extmetadata.Credit?.value ?? "");
  const descricao = semHtml(info.extmetadata.ImageDescription?.value ?? info.extmetadata.ObjectName?.value ?? "");
  // CC BY e CC BY-SA exigem atribuição: sem autor identificável, a foto não entra (domínio público e CC0 podem).
  if (!autor && !/public domain|domínio público|pd|^pd-|cc0/i.test(licenca)) return null;
  return {
    arquivo: r.data.title.replace(/^File:/, ""),
    url: info.url,
    miniaturaUrl: info.thumburl ?? null,
    paginaUrl: info.descriptionurl,
    // Sem autor identificável, o crédito diz isso em vez de inventar.
    autor: autor ? autor.slice(0, 120) : "autor não identificado (ver página do arquivo)",
    licenca,
    licencaUrl: info.extmetadata.LicenseUrl?.value ?? null,
    descricao: descricao ? descricao.slice(0, 200) : null,
    largura: info.width ?? null,
    altura: info.height ?? null,
  };
}

const PARAMS_INFO = "prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=960&iiextmetadatafilter=Artist|Credit|LicenseShortName|LicenseUrl|ImageDescription|ObjectName&iiextmetadatalanguage=en";

export function criarClienteCommons(opcoes: { fetchImpl?: typeof fetch } = {}) {
  const esperar = rateLimiter("commons", "1 req / s");
  const pedir = async (params: string) => {
    await esperar();
    const resp = await fetchComRetry(`${API_COMMONS}?action=query&format=json&formatversion=2&${params}`, {
      fetchImpl: opcoes.fetchImpl,
      headers: { "User-Agent": userAgentWikimedia() },
    });
    return (await resp.json()) as { query?: { pages?: unknown[] } };
  };
  return {
    /** Arquivos de uma categoria (sem subcategorias), já filtrados por licença livre. */
    async daCategoria(categoria: string, limite = 30): Promise<{ crus: unknown[]; fotos: FotoCommons[] }> {
      const r = await pedir(`generator=categorymembers&gcmtitle=${encodeURIComponent(`Category:${categoria}`)}&gcmtype=file&gcmlimit=${limite}&${PARAMS_INFO}`);
      const crus = r.query?.pages ?? [];
      return { crus, fotos: crus.flatMap((p) => normalizarArquivo(p) ?? []) };
    },
    /** Um arquivo pelo nome (ex.: o P18 do Wikidata). */
    async arquivo(nome: string): Promise<FotoCommons | null> {
      const r = await pedir(`titles=${encodeURIComponent(`File:${nome}`)}&${PARAMS_INFO}`);
      return normalizarArquivo(r.query?.pages?.[0]);
    },
  };
}

// ───────────────────── Escolha de fotos (decisão de 15/11/2026: priorizar o equipamento) ─────────────────────

/** Fotos centradas em pessoas ou bastidores: manutenção, cerimônias, retratos, entrevistas. */
const SOBRE_PESSOAS =
  /\b(maint(ain|en)\w*|crew chiefs?|technicians?|load(ing)? (crew|competition)|tires?|ceremon\w*|change of command|award\w*|promot\w*|portraits?|interview\w*|visit\w*|speaks?|briefing|airm[ae]n|sailors?|soldiers?|marines? (prepare|conduct)|students?|graduat\w*|supplies)\b/i;

/** Indícios de que o equipamento é o assunto: voo, decolagem, navegação, disparo, exibição estática. */
const SOBRE_EQUIPAMENTO =
  /\b(fl(y|ies|ying|ight)|takes? off|take-?off|landing|lands|formation|refuel\w*|taxi\w*|underway|sails?|at sea|fires?|firing|launch\w*|static display|air show|airshow|parked|in flight|on display|rolls? out|maneuver\w*)\b/i;

/**
 * Não são fotos do equipamento: mapas de operadores, selos postais, diagramas e esquemas
 * (o S-400 vinha com 5 mapas e um selo na galeria; o Javelin, com diagramas de trajetória; 17/11/2026).
 */
const NAO_E_FOTO =
  /\b(maps?|world ?map|locator|operators?|users?[ _]map|stamps?|postage|diagrams?|schematics?|flight[ _]path|trajector\w*|cutaway|infographic|logo|emblem|insignia|patch|ranges? of|engagement (zones?|areas?)|coverage area)\b|worldmap|_operators|operators_|-operators|зон[ыа]\s*поражени|дальност/i;

/**
 * Imagens de ataque: o equipamento na mira, sendo atingido ou destruído. Não mostram o equipamento em
 * si e costumam ser divulgadas por uma das partes (neutralidade, CLAUDE.md §1.5; casos do S-400, 17/11/2026).
 */
const IMAGEM_DE_ATAQUE = /\b(targeted|in the crosshairs|explod\w*|explosion|destroy\w*|being (hit|struck)|hit by|struck by|strike on|wreck\w*|burning)\b/i;

/** Pontua uma foto: `null` = descartar (fala de pessoas/bastidores, não é foto ou é pequena demais). */
export function pontuarFoto(f: Pick<FotoCommons, "arquivo" | "descricao" | "largura">): number | null {
  const texto = `${f.arquivo} ${f.descricao ?? ""}`;
  if (SOBRE_PESSOAS.test(texto)) return null;
  if (NAO_E_FOTO.test(texto.replaceAll("_", " ")) || NAO_E_FOTO.test(f.arquivo)) return null;
  if (IMAGEM_DE_ATAQUE.test(texto.replaceAll("_", " "))) return null;
  if (f.largura !== null && f.largura < 800) return null;
  return SOBRE_EQUIPAMENTO.test(texto) ? 2 : 1;
}

/** Ordena por pontuação (estável: mantém a ordem original no empate) e descarta as recusadas. */
export function escolherFotos(fotos: FotoCommons[]): FotoCommons[] {
  return fotos
    .map((f, i) => ({ f, i, p: pontuarFoto(f) }))
    .filter((x): x is { f: FotoCommons; i: number; p: number } => x.p !== null)
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .map((x) => x.f);
}
