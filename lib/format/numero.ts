// Números em pt-BR: vírgula decimal e ponto de milhar.

export type OpcoesNumero = {
  /** Máximo de casas decimais (padrão: 2). */
  casas?: number;
  /** Mínimo de casas decimais (padrão: 0). */
  casasMinimas?: number;
};

const cache = new Map<string, Intl.NumberFormat>();

function formatador(casasMinimas: number, casas: number): Intl.NumberFormat {
  const chave = `${casasMinimas}:${casas}`;
  let f = cache.get(chave);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: casasMinimas,
      maximumFractionDigits: casas,
      // O CLDR do pt-BR não agrupa números de 4 dígitos ("1090");
      // o padrão do site é sempre com ponto ("1.090").
      useGrouping: "always",
    });
    cache.set(chave, f);
  }
  return f;
}

/** Ex.: 1234.5 → "1.234,5". Valores não finitos viram "—". */
export function formatarNumero(valor: number, opcoes: OpcoesNumero = {}): string {
  if (!Number.isFinite(valor)) return "—";
  const casas = opcoes.casas ?? 2;
  const casasMinimas = Math.min(opcoes.casasMinimas ?? 0, casas);
  return formatador(casasMinimas, casas).format(valor);
}
