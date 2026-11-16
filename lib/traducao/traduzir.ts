// Cadeia de tradução (skill traducao-ptbr):
// português → usa direto · cache · glossário (trava termos) · DeepL Free (se houver cota) · LibreTranslate · pendente.
// Nunca lança erro por falha de motor: o item fica pendente e a ingestão segue.
import { sha256 } from "@/lib/fontes/_base/url";
import type { ClienteDeepL } from "./deepl";
import { RESERVA_MINIMA_DEEPL } from "./deepl";
import type { Travador } from "./glossario";

export type Motor = "original" | "cache" | "deepl" | "argos";

export type ItemTraducao = {
  texto: string;
  /** ISO 639-1 ou null (desconhecido: o motor detecta). */
  idioma: string | null;
};

export type SaidaTraducao = { textoPt: string | null; motor: Motor | null };

export type CacheTraducao = {
  ler(hashes: string[]): Promise<Map<string, string>>;
  gravar(linhas: { hash: string; texto_original: string; texto_pt: string; motor: Exclude<Motor, "original" | "cache"> }[]): Promise<void>;
};

export type DependenciasTraducao = {
  cache: CacheTraducao;
  travador: Travador;
  deepl?: ClienteDeepL | null;
  glossarioIdDeepL?: string | null;
  libre?: { traduzir(textos: string[], idiomaOrigem?: string): Promise<string[]> } | null;
  log?: (mensagem: string) => void;
};

export type ResultadoTraducao = {
  saidas: SaidaTraducao[];
  /** Caracteres enviados ao DeepL (contam na cota mensal). */
  caracteresDeepL: number;
  motores: Partial<Record<Motor | "pendente", number>>;
};

export const chaveCache = (texto: string, idioma: string | null) => sha256(`${texto}\u0000${idioma ?? "auto"}`);

/**
 * Tradução que perdeu boa parte do texto (ex.: "OTAN" para uma manchete de 65 caracteres). Traduções para o
 * português costumam ser do mesmo tamanho ou maiores; abaixo de 40% do original, o item fica pendente
 * e não entra no cache, para ser tentado de novo.
 */
export const traducaoTruncada = (original: string, pt: string) => original.trim().length >= 30 && pt.length < original.trim().length * 0.4;
export const ehPortugues = (idioma: string | null) => idioma === "pt";

/**
 * Dependências para o modo seco (--seco): lê o cache, mas não chama o DeepL (que gasta cota mesmo sem
 * gravar nada) e não grava no cache. LibreTranslate, se configurado, continua: é auto-hospedado, sem cota.
 * Títulos fora do cache aparecem como "(tradução pendente)" na amostra.
 */
export const paraModoSeco = (t: DependenciasTraducao): DependenciasTraducao => ({
  ...t,
  deepl: null,
  cache: { ...t.cache, gravar: async () => {} },
});

export async function traduzirLote(itens: ItemTraducao[], deps: DependenciasTraducao): Promise<ResultadoTraducao> {
  const log = deps.log ?? (() => {});
  const saidas: SaidaTraducao[] = itens.map(() => ({ textoPt: null, motor: null }));
  const motores: ResultadoTraducao["motores"] = {};
  const contar = (m: Motor | "pendente") => (motores[m] = (motores[m] ?? 0) + 1);
  let caracteresDeepL = 0;

  // 1. Já em português.
  const restantes: number[] = [];
  itens.forEach((item, i) => {
    if (ehPortugues(item.idioma)) {
      saidas[i] = { textoPt: item.texto, motor: "original" };
      contar("original");
    } else restantes.push(i);
  });

  // 2. Cache (sha256(texto + idioma)).
  const chaves = itens.map((it) => chaveCache(it.texto, it.idioma));
  let emCache = new Map<string, string>();
  try {
    emCache = await deps.cache.ler(restantes.map((i) => chaves[i]!));
  } catch (e) {
    log(`cache indisponível: ${(e as Error).message}`);
  }
  let pendentes = restantes.filter((i) => {
    const pt = emCache.get(chaves[i]!);
    if (pt === undefined) return true;
    saidas[i] = { textoPt: pt, motor: "cache" };
    contar("cache");
    return false;
  });

  const novasNoCache: Parameters<CacheTraducao["gravar"]>[0] = [];

  // 3–4. Glossário + DeepL, se houver cota suficiente.
  if (pendentes.length > 0 && deps.deepl) {
    const travados = new Map(pendentes.map((i) => [i, deps.travador.travar(itens[i]!.texto)]));
    const total = [...travados.values()].reduce((s, t) => s + t.length, 0);
    let podeUsar = false;
    try {
      const restante = await deps.deepl.restante();
      podeUsar = restante - total >= RESERVA_MINIMA_DEEPL;
      if (!podeUsar) log(`DeepL: restam ${restante} caracteres no mês; reserva de ${RESERVA_MINIMA_DEEPL} preservada, pulando`);
    } catch (e) {
      log(`DeepL /usage falhou: ${(e as Error).message}`);
    }

    if (podeUsar) {
      // Inglês vai com source_lang=EN e o glossário; os demais idiomas, com detecção automática.
      const grupos = new Map<string, number[]>();
      for (const i of pendentes) {
        const chave = itens[i]!.idioma === "en" ? "en" : "auto";
        grupos.set(chave, [...(grupos.get(chave) ?? []), i]);
      }
      for (const [grupo, indices] of grupos) {
        const textos = indices.map((i) => travados.get(i)!);
        try {
          let traducoes;
          try {
            traducoes = await deps.deepl.traduzir(textos, {
              idiomaOrigem: grupo === "en" ? "en" : undefined,
              glossarioId: grupo === "en" ? (deps.glossarioIdDeepL ?? undefined) : undefined,
            });
          } catch (e) {
            if (grupo !== "en" || !deps.glossarioIdDeepL) throw e;
            log(`DeepL com glossário falhou (${(e as Error).message}); repetindo sem glossário`);
            traducoes = await deps.deepl.traduzir(textos, { idiomaOrigem: "en" });
          }
          caracteresDeepL += textos.reduce((s, t) => s + t.length, 0);
          indices.forEach((i, k) => {
            const pt = deps.travador.destravar(traducoes[k]!.texto).trim();
            if (traducaoTruncada(itens[i]!.texto, pt)) {
              log(`DeepL devolveu tradução truncada ("${pt}"); item fica pendente`);
              return;
            }
            saidas[i] = { textoPt: pt, motor: "deepl" };
            contar("deepl");
            novasNoCache.push({ hash: chaves[i]!, texto_original: itens[i]!.texto, texto_pt: pt, motor: "deepl" });
          });
        } catch (e) {
          log(`DeepL falhou para ${indices.length} item(ns): ${(e as Error).message}`);
        }
      }
      pendentes = pendentes.filter((i) => saidas[i]!.textoPt === null);
    }
  }

  // 5. LibreTranslate / Argos.
  if (pendentes.length > 0 && deps.libre) {
    try {
      const textos = pendentes.map((i) => deps.travador.travar(itens[i]!.texto));
      const traducoes = await deps.libre.traduzir(textos);
      pendentes.forEach((i, k) => {
        const bruto = traducoes[k];
        if (!bruto) return;
        const pt = deps.travador.destravar(bruto).trim();
        if (traducaoTruncada(itens[i]!.texto, pt)) return;
        saidas[i] = { textoPt: pt, motor: "argos" };
        contar("argos");
        novasNoCache.push({ hash: chaves[i]!, texto_original: itens[i]!.texto, texto_pt: pt, motor: "argos" });
      });
    } catch (e) {
      log(`LibreTranslate falhou: ${(e as Error).message}`);
    }
    pendentes = pendentes.filter((i) => saidas[i]!.textoPt === null);
  }

  // 6. Pendente: o site mostra o original com o selo "Tradução pendente".
  pendentes.forEach(() => contar("pendente"));

  if (novasNoCache.length > 0) {
    try {
      await deps.cache.gravar(novasNoCache);
    } catch (e) {
      log(`não foi possível gravar no cache: ${(e as Error).message}`);
    }
  }

  return { saidas, caracteresDeepL, motores };
}
