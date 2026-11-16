// Países do monitor de governos (skill monitor-governos). Mesma estrutura e destaque para todos.

export type PaisMonitorado = {
  /** ISO 3166-1 alfa-2, igual a `decisoes_governo.pais` e `fontes.pais`. */
  codigo: "US" | "CN" | "RU" | "IR" | "IL" | "UA" | "DE";
  /** Segmento da URL em pt-BR: /governos/<slug>. */
  slug: string;
  nome: string;
  /** "dos Estados Unidos", "da China"… para frases. */
  doPais: string;
};

// Ordem alfabética em pt-BR: nenhum país vem "primeiro" por importância.
export const PAISES_MONITORADOS: PaisMonitorado[] = [
  { codigo: "DE", slug: "alemanha", nome: "Alemanha", doPais: "da Alemanha" },
  { codigo: "CN", slug: "china", nome: "China", doPais: "da China" },
  { codigo: "US", slug: "eua", nome: "Estados Unidos", doPais: "dos Estados Unidos" },
  { codigo: "IR", slug: "ira", nome: "Irã", doPais: "do Irã" },
  { codigo: "IL", slug: "israel", nome: "Israel", doPais: "de Israel" },
  { codigo: "RU", slug: "russia", nome: "Rússia", doPais: "da Rússia" },
  { codigo: "UA", slug: "ucrania", nome: "Ucrânia", doPais: "da Ucrânia" },
];

export const paisPorSlug = (slug: string) => PAISES_MONITORADOS.find((p) => p.slug === slug) ?? null;
export const paisPorCodigo = (codigo: string) => PAISES_MONITORADOS.find((p) => p.codigo === codigo) ?? null;
