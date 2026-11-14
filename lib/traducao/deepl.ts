// DeepL API Free (https://developers.deepl.com). 500 mil caracteres/mês; a chave termina em ":fx".
import { z } from "zod";
import { fetchComRetry } from "@/lib/fontes/_base/http";
import { sha256 } from "@/lib/fontes/_base/url";

export const DEEPL_BASE = "https://api-free.deepl.com/v2";
/** Abaixo disto, a cadeia pula o DeepL (skill traducao-ptbr). */
export const RESERVA_MINIMA_DEEPL = 20_000;
/** A API aceita até 50 textos por requisição. */
const LOTE_MAXIMO = 50;

const esquemaUso = z.object({ character_count: z.number(), character_limit: z.number() });
const esquemaTraducao = z.object({
  translations: z.array(z.object({ detected_source_language: z.string(), text: z.string() })),
});
const esquemaPares = z.object({
  supported_languages: z.array(z.object({ source_lang: z.string(), target_lang: z.string() })),
});
const esquemaGlossarios = z.object({ glossaries: z.array(z.object({ glossary_id: z.string(), name: z.string() })) });
const esquemaGlossarioCriado = z.object({ glossary_id: z.string() });

/**
 * Com tag_handling=xml o texto precisa ser XML válido: escapa &, < e > fora das marcas <keep>…</keep>
 * (um "&" solto em "TV & Radio" derrubava o lote inteiro com HTTP 400).
 */
export function escaparParaXml(texto: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return texto
    .split(/(<keep>[\s\S]*?<\/keep>)/g)
    .map((parte) => {
      const m = /^<keep>([\s\S]*)<\/keep>$/.exec(parte);
      return m ? `<keep>${esc(m[1]!)}</keep>` : esc(parte);
    })
    .join("");
}

/** Desfaz as entidades XML que o DeepL devolve no modo tag_handling=xml. */
export function desescaparXml(texto: string): string {
  return texto
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

export type ClienteDeepL = ReturnType<typeof criarClienteDeepL>;

export function criarClienteDeepL(chave: string, fetchImpl: typeof fetch = fetch) {
  const cabecalhos = { Authorization: `DeepL-Auth-Key ${chave}`, "Content-Type": "application/json" };
  const chamar = async <T>(caminho: string, esquema: z.ZodType<T>, init: RequestInit = {}) => {
    const r = await fetchComRetry(`${DEEPL_BASE}${caminho}`, { ...init, headers: cabecalhos, fetchImpl, esperaBaseMs: 1_000 });
    return esquema.parse(await r.json());
  };

  return {
    /** Caracteres restantes no mês. */
    async restante(): Promise<number> {
      const u = await chamar("/usage", esquemaUso);
      return u.character_limit - u.character_count;
    },

    /**
     * Traduz para PT-BR. `idiomaOrigem` (ISO 639-1) é opcional: sem ele, o DeepL detecta.
     * Usa tag_handling=xml para preservar <keep>…</keep>.
     */
    async traduzir(textos: string[], opcoes: { idiomaOrigem?: string; glossarioId?: string } = {}) {
      const saida: { texto: string; idiomaDetectado: string }[] = [];
      for (let i = 0; i < textos.length; i += LOTE_MAXIMO) {
        const lote = textos.slice(i, i + LOTE_MAXIMO);
        const corpo: Record<string, unknown> = {
          text: lote.map(escaparParaXml),
          target_lang: "PT-BR",
          tag_handling: "xml",
          ignore_tags: ["keep"],
        };
        if (opcoes.idiomaOrigem) corpo.source_lang = opcoes.idiomaOrigem.toUpperCase();
        if (opcoes.glossarioId && opcoes.idiomaOrigem) corpo.glossary_id = opcoes.glossarioId;
        const r = await chamar("/translate", esquemaTraducao, { method: "POST", body: JSON.stringify(corpo) });
        saida.push(
          ...r.translations.map((t) => ({ texto: desescaparXml(t.text), idiomaDetectado: t.detected_source_language.toLowerCase() })),
        );
      }
      return saida;
    },

    /**
     * Garante um glossário EN→PT com o conteúdo atual do CSV e devolve o id.
     * O nome leva o hash do conteúdo: mudou o CSV, cria um novo (glossários do DeepL são imutáveis).
     * Devolve `null` se o par EN→PT não for suportado.
     */
    async garantirGlossario(tsv: string): Promise<string | null> {
      if (!tsv.trim()) return null;
      const pares = await chamar("/glossary-language-pairs", esquemaPares);
      if (!pares.supported_languages.some((p) => p.source_lang === "en" && p.target_lang === "pt")) return null;
      const nome = `teatro-ops-militar-${sha256(tsv).slice(0, 12)}`;
      const existentes = await chamar("/glossaries", esquemaGlossarios);
      const atual = existentes.glossaries.find((g) => g.name === nome);
      if (atual) return atual.glossary_id;
      const criado = await chamar("/glossaries", esquemaGlossarioCriado, {
        method: "POST",
        body: JSON.stringify({ name: nome, source_lang: "en", target_lang: "pt", entries: tsv, entries_format: "tsv" }),
      });
      return criado.glossary_id;
    },
  };
}
