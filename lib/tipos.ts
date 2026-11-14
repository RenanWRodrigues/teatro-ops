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
  planta?: { comprimento: Especificacao; envergadura: Especificacao };
  variantes?: Variante[];
  galeria?: Midia[];
  operadores?: string[];
  fontes?: Fonte[];
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
};

export type EventoLinhaDoTempo = { marco: string; descricao: string; atual?: boolean };

export type TopicoTecnologia = {
  id: string;
  rotulo: string;
  titulo: string;
  texto: string;
  pontos: { chave: string; valor: string }[];
  debate: string;
  fontes: Fonte[];
};
