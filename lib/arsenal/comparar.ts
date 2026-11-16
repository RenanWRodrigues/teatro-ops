// Comparador do arsenal (skill ficha-equipamento): só campos que os DOIS itens têm, com fonte, na mesma unidade.
import type { Equipamento, Especificacao } from "@/lib/tipos";

export type LinhaComparacao = { chave: string; rotulo: string; a: Especificacao; b: Especificacao };

export function linhasComparaveis(a: Equipamento, b: Equipamento): { linhas: LinhaComparacao[]; soDeUm: string[] } {
  const deB = new Map((b.numericas ?? []).map((n) => [n.chave, n]));
  const linhas: LinhaComparacao[] = [];
  const soDeUm: string[] = [];
  for (const n of a.numericas ?? []) {
    const m = deB.get(n.chave);
    // Unidades diferentes (Mach × km/h, t × kg) não viram barra: comparar exigiria conversão sem fonte comum.
    if (m && m.spec.unidade === n.spec.unidade) linhas.push({ chave: n.chave, rotulo: n.rotulo, a: n.spec, b: m.spec });
    else soDeUm.push(n.rotulo);
  }
  const chavesA = new Set((a.numericas ?? []).map((n) => n.chave));
  for (const m of b.numericas ?? []) if (!chavesA.has(m.chave)) soDeUm.push(m.rotulo);
  return { linhas, soDeUm: [...new Set(soDeUm)] };
}

/** Par da mesma categoria com mais especificações comparáveis (com fonte e na mesma unidade), para a vitrine da home. */
export function melhorParComparavel(lista: Equipamento[]): { a: Equipamento; b: Equipamento; linhas: LinhaComparacao[] } | null {
  let melhor: { a: Equipamento; b: Equipamento; linhas: LinhaComparacao[] } | null = null;
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const a = lista[i]!;
      const b = lista[j]!;
      if (a.categoria !== b.categoria) continue;
      const { linhas } = linhasComparaveis(a, b);
      if (linhas.length >= 2 && (!melhor || linhas.length > melhor.linhas.length)) melhor = { a, b, linhas };
    }
  }
  return melhor;
}
