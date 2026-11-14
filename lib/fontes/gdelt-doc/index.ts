// Adaptador GDELT DOC 2.0 (fonte "gdelt-doc"): manchetes por consulta, em todos os idiomas.
// Guardamos só título, link, data e classificação — nunca o texto do artigo (CLAUDE.md §1.4).
import { fetchComRetry } from "../_base/http";
import { rateLimiter } from "../_base/limitador";
import { dominioDe, hashUrl, normalizarUrl } from "../_base/url";
import type { AdaptadorFonte, NoticiaNormalizada } from "../_base/tipos";
import type { FonteYaml } from "../registro";
import { classificar } from "./classificacao";
import { esquemaArtigoGdelt, esquemaRespostaGdelt, type ArtigoGdelt } from "./schema";

export const ID = "gdelt-doc";

/** Item cru: o artigo + a chave da consulta que o trouxe (vira tema). */
export type ItemGdelt = { artigo: unknown; consulta: string };

/** Chave da consulta em config/fontes.yaml → tema gravado em `noticias.temas`. */
const TEMA_DA_CONSULTA: Record<string, string> = {
  conflitos: "conflitos",
  drones: "drones",
  ia: "ia",
  guerra_eletronica: "guerra-eletronica",
};

const IDIOMAS: Record<string, string> = {
  English: "en", Portuguese: "pt", Spanish: "es", French: "fr", German: "de", Italian: "it", Russian: "ru",
  Ukrainian: "uk", Polish: "pl", Arabic: "ar", Hebrew: "he", Persian: "fa", Turkish: "tr", Chinese: "zh",
  Japanese: "ja", Korean: "ko", Dutch: "nl", Romanian: "ro", Greek: "el", Czech: "cs", Swedish: "sv",
  Indonesian: "id", Hindi: "hi", Urdu: "ur", Bulgarian: "bg", Hungarian: "hu", Finnish: "fi", Danish: "da",
  Norwegian: "nb", Slovak: "sk", Lithuanian: "lt", Latvian: "lv", Estonian: "et", Slovenian: "sl",
};

export const idiomaIso = (nome: string): string | null => IDIOMAS[nome] ?? null;

/** "20261114T120000Z" → "2026-11-14T12:00:00Z" */
export function dataGdelt(seendate: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(seendate);
  if (!m) throw new Error(`seendate inválida: ${seendate}`);
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}

/** Janela do GDELT a partir de `desde` (mínimo 15 min, máximo 7 dias). */
export function timespan(desde: Date, agora = new Date()): string {
  const minutos = Math.ceil((agora.getTime() - desde.getTime()) / 60_000);
  return `${Math.min(Math.max(minutos, 15), 7 * 24 * 60)}min`;
}

export function montarUrl(consulta: string, desde: Date, agora = new Date()): string {
  const p = new URLSearchParams({
    query: consulta,
    mode: "ArtList",
    format: "json",
    maxrecords: "75",
    sort: "DateDesc",
    timespan: timespan(desde, agora),
  });
  return `https://api.gdeltproject.org/api/v2/doc/doc?${p}`;
}

/** Converte o corpo da resposta. Texto puro (aviso de limite/erro de sintaxe) vira erro explícito. */
export function lerResposta(corpo: string): unknown[] {
  let json: unknown;
  try {
    json = JSON.parse(corpo);
  } catch {
    throw new Error(`GDELT respondeu texto em vez de JSON: ${corpo.trim().slice(0, 160)}`);
  }
  return esquemaRespostaGdelt.parse(json).articles ?? [];
}

export function normalizarArtigo(item: ItemGdelt): NoticiaNormalizada | null {
  const r = esquemaArtigoGdelt.safeParse(item.artigo);
  if (!r.success) return null;
  const a: ArtigoGdelt = r.data;
  const titulo = a.title.replace(/\s+/g, " ").trim();
  if (titulo.length < 8) return null;
  let url: string;
  try {
    url = normalizarUrl(a.url);
  } catch {
    return null;
  }
  const tema = TEMA_DA_CONSULTA[item.consulta];
  const c = classificar(titulo, tema ? [tema] : []);
  return {
    hash: hashUrl(url),
    url,
    tituloOriginal: titulo,
    idiomaOriginal: idiomaIso(a.language),
    dominio: dominioDe(url),
    paises: c.paises,
    temas: c.temas,
    regiao: c.regiao,
    publicadoEm: dataGdelt(a.seendate),
  };
}

/** Une itens repetidos (mesma URL em consultas diferentes), somando os temas. */
export function deduplicar(itens: NoticiaNormalizada[]): NoticiaNormalizada[] {
  const porHash = new Map<string, NoticiaNormalizada>();
  for (const n of itens) {
    const atual = porHash.get(n.hash);
    porHash.set(n.hash, atual ? { ...atual, temas: [...new Set([...atual.temas, ...n.temas])].sort() } : n);
  }
  return [...porHash.values()];
}

export function criarAdaptadorGdelt(config: FonteYaml, fetchImpl: typeof fetch = fetch): AdaptadorFonte<ItemGdelt, NoticiaNormalizada> {
  const consultas = Object.entries(config.consultas ?? {});
  if (consultas.length === 0) throw new Error("gdelt-doc: nenhuma consulta em config/fontes.yaml");
  const aguardar = rateLimiter(ID, config.limite);

  return {
    id: ID,
    async buscar(desde) {
      const itens: ItemGdelt[] = [];
      const erros: string[] = [];
      for (const [chave, consulta] of consultas) {
        await aguardar();
        try {
          // 429 do GDELT costuma durar minutos: 2 tentativas e segue para a próxima consulta.
          const r = await fetchComRetry(montarUrl(consulta, desde), { fetchImpl, tentativas: 2, esperaBaseMs: 6_000 });
          for (const artigo of lerResposta(await r.text())) itens.push({ artigo, consulta: chave });
        } catch (e) {
          erros.push(`${chave}: ${(e as Error).message}`);
        }
      }
      // Só falha a coleta se TODAS as consultas falharem; falhas parciais vão para o log.
      if (erros.length === consultas.length) throw new Error(`todas as consultas falharam — ${erros.join(" | ")}`);
      for (const e of erros) console.warn(`[gdelt-doc] consulta com falha (seguindo com as demais): ${e}`);
      return itens;
    },
    normalizar: normalizarArtigo,
    hash: (n) => n.hash,
  };
}
