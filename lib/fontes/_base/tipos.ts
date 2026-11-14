// Contrato comum dos adaptadores de fonte (skill integrar-fonte-dados).

export interface AdaptadorFonte<TCru, TNormalizado> {
  /** Igual ao id em config/fontes.yaml. */
  id: string;
  /** Busca itens publicados desde `desde`. Usa fetchComRetry + rateLimiter. */
  buscar(desde: Date): Promise<TCru[]>;
  /** `null` = descartar (conta como ignorado). */
  normalizar(item: TCru): TNormalizado | null;
  /** sha256 da URL normalizada (ou do id externo). */
  hash(item: TNormalizado): string;
}

/** Notícia pronta para tradução e gravação em `noticias`. */
export type NoticiaNormalizada = {
  hash: string;
  url: string;
  tituloOriginal: string;
  /** ISO 639-1 ("en", "pt", "ru"…) ou null se desconhecido. */
  idiomaOriginal: string | null;
  dominio: string;
  paises: string[];
  temas: string[];
  regiao: string | null;
  publicadoEm: string;
};

export type ResultadoExecucao = {
  itensNovos: number;
  itensIgnorados: number;
  caracteresTraduzidos: number;
  /** Motores usados nesta execução (ex.: { deepl: 40, cache: 10 }). */
  motores: Record<string, number>;
  erro: string | null;
};
