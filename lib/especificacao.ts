import { formatarNumero, formatarUnidade } from "@/lib/format";
import type { Especificacao, Fonte } from "@/lib/tipos";

const NBSP = " ";

/**
 * Texto de uma especificação em pt-BR: "~Mach 2", "1.090+ km", "15,7 m".
 * O sufixo ("+") fica colado ao número, antes da unidade.
 */
export function formatarEspecificacao(s: Especificacao): string {
  const aprox = s.aproximado ? "~" : "";
  if (!s.sufixo) return `${aprox}${formatarUnidade(s.valor, s.unidade)}`;
  const base = formatarUnidade(s.valor, s.unidade);
  const numero = formatarNumero(s.valor);
  // Insere o sufixo logo depois do número, preservando a posição da unidade (inclusive "Mach 1,6").
  return `${aprox}${base.replace(numero, `${numero}${s.sufixo}`)}`;
}

/** Lista de fontes sem repetição (mesmo nome + URL), na ordem em que aparecem. */
export function fontesUnicas(fontes: Fonte[]): Fonte[] {
  const vistas = new Map<string, Fonte>();
  for (const f of fontes) {
    const chave = `${f.nome}|${f.url ?? ""}`;
    if (!vistas.has(chave)) vistas.set(chave, f);
  }
  return [...vistas.values()];
}

export const chaveFonte = (f: Fonte) => `${f.nome}|${f.url ?? ""}`;

export { NBSP };
