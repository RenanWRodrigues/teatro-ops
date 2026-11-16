// Tipos de domínio compartilhados pelas páginas. Espelham docs/MODELO-DADOS.md.
import type { Unidade } from "@/lib/format";

/** Atribuição obrigatória de todo dado exibido (CLAUDE.md §1.3). */
export type Fonte = {
  nome: string;
  url: string | null;
  /** Ex.: "CC BY-SA 4.0", "Domínio público". Obrigatória para dados reais (Fase 3 valida com Zod). */
  licenca?: string;
  licencaUrl?: string;
  /** ISO 8601 — quando coletamos o dado (`coletado_em` no banco). */
  coletadoEm?: string | null;
};

/** Marca dados de demonstração. Tudo que vem de lib/fixtures tem `exemplo: true`. */
export type ComExemplo = { exemplo?: boolean };

export const CATEGORIAS = {
  cacas: "Caças",
  tanques: "Tanques",
  embarcacoes: "Embarcações",
  avioes: "Aviões",
  helicopteros: "Helicópteros",
  armamento: "Armamento",
  drones: "Drones",
  "defesa-aerea": "Defesa aérea",
} as const;

export type Categoria = keyof typeof CATEGORIAS;

export function ehCategoria(valor: string): valor is Categoria {
  return Object.hasOwn(CATEGORIAS, valor);
}

export type Especificacao = {
  valor: number;
  unidade: Unidade;
  aproximado?: boolean;
  /** Ex.: "+" em "1.090+ km". */
  sufixo?: string;
  fonte: Fonte;
};

export type ItemFicha = { rotulo: string; valor: string; fonte: Fonte };

export type Variante = { nome: string; descricao: string; atual?: boolean };

/** Sem `url` → placeholder do design system. Com foto, autor e licença são obrigatórios (CLAUDE.md §1.4). */
export type Midia =
  | { legenda: string; url: null }
  | { legenda: string; url: string; autor: string; licenca: string; licencaUrl?: string; fonteUrl: string };

export type Equipamento = ComExemplo & {
  slug: string;
  nome: string;
  categoria: Categoria;
  /** Rótulo curto exibido no selo (ex.: "Caça · 5ª geração"). */
  classe?: string;
  descricao: string;
  paises: string[];
  fabricante?: string;
  emServico?: boolean;
  /** Dado de destaque do card, já formatado em pt-BR. */
  destaque: string;
  /** Etiquetas curtas do card em destaque da home (ex.: "Motor F135"). */
  chamadas?: string[];
  resumo?: { texto: string; fonte: Fonte };
  estatisticas?: { rotulo: string; spec: Especificacao; realce?: boolean }[];
  ficha?: ItemFicha[];
  /** `envergadura` é a largura quando `forma` = "casco" (tanques, navios). */
  planta?: { forma?: "aeronave" | "casco"; comprimento: Especificacao; envergadura: Especificacao };
  variantes?: Variante[];
  galeria?: Midia[];
  operadores?: string[];
  fontes?: Fonte[];
  /** Todas as especificações numéricas com fonte, por chave (comparador). */
  numericas?: { chave: string; rotulo: string; spec: Especificacao }[];
};

export type Intensidade = "alta" | "tensao" | "cessar-fogo";

export type Conflito = ComExemplo & {
  slug: string;
  nome: string;
  regiao: string;
  intensidade: Intensidade;
  resumo: string;
  fonte: Fonte;
  /** [lon, lat], já agregado geograficamente (nunca posição de tropa). */
  coordenadas?: [number, number];
};

/** Conflito curado com os números do período que justificam a intensidade (UCDP). */
export type ConflitoDetalhe = {
  slug: string;
  nome: string;
  regiao: string;
  paises: string[];
  /** null = abaixo do limiar de 25 mortes estimadas no trimestre, ou sem dados ainda. */
  intensidade: Intensidade | null;
  resumo: string | null;
  fontes: Fonte[];
  coordenadas?: [number, number];
  periodoInicio: string | null;
  periodoFim: string | null;
  eventos: number;
  mortes: number;
  mortesMin: number;
  mortesMax: number;
  /** Curadoria existe, mas a coleta do UCDP ainda não gravou números. */
  semDados?: boolean;
};

/** Ponto agregado para as camadas do mapa (nunca posição precisa). */
export type PontoMapa = { lat: number; lon: number; valor: number; rotulo: string };

export type EventoPublico = {
  data: string;
  local: string | null;
  pais: string;
  tipo: string | null;
  atores: string[];
  mortes: number | null;
  mortesMin: number | null;
  mortesMax: number | null;
};

export type SemanaEventos = { semana: string; eventos: number; mortes: number };

export type Manchete = ComExemplo & {
  regiao: string;
  /** Título em pt-BR; com tradução pendente, o título original (ver `idiomaOriginal`). */
  titulo: string;
  traducaoPendente?: boolean;
  /** ISO 639-1 do título original, para o atributo lang quando a tradução está pendente. */
  idiomaOriginal?: string | null;
  url: string | null;
  /** ISO 8601; `null` em placeholders. */
  publicadoEm: string | null;
  fonte: Fonte;
  /** Agregador que nos entregou o link (ex.: GDELT), exibido como "via" com link e licença. */
  via?: Fonte;
};

export type EventoLinhaDoTempo = {
  marco: string;
  descricao: string;
  atual?: boolean;
  /** Chamadas [n] para a lista numerada de fontes exibida abaixo da linha do tempo. */
  fontes?: number[];
};

/** Notícias recentes de uma aba de /tecnologia e o critério que as selecionou (Fase 8). */
export type FeedTopico = {
  criterio: string;
  noticias: (Manchete & { resumo: string | null })[];
};

/** Decisão ou comunicado oficial de governo (monitor de governos, Fase 6). */
export type Decisao = {
  id: number;
  /** ISO 3166-1 alfa-2 do país que publicou. */
  pais: string;
  orgao: string;
  tipo: "ordem_executiva" | "lei" | "sancao" | "comunicado" | "acordo" | "exercicio_militar" | "orcamento" | "outro";
  /** Título em pt-BR; com tradução pendente, o título original (ver `idiomaOriginal`). */
  titulo: string;
  /** Título como a fonte publicou (exibido a um clique quando há tradução: CC BY exige indicar alterações). */
  tituloOriginal: string;
  traducaoPendente: boolean;
  idiomaOriginal: string | null;
  /** Texto próprio por regra (temas), nunca texto do documento. */
  resumo: string | null;
  urlOficial: string;
  publicadoEm: string;
  temas: string[];
  /** Publicado por agência estatal: a interface exibe o selo "Mídia estatal". */
  estatal: boolean;
  fonte: Fonte;
  /** Canal intermediário de coleta que exige crédito (ex.: GDELT para a Xinhua). */
  via?: Fonte;
};
