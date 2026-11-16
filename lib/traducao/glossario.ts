// Glossário militar EN → pt-BR (config/glossario-militar.csv).
// Expressões e siglas são "travadas" antes da tradução (<keep>termo pt-BR</keep>, que o DeepL não altera);
// palavras soltas ficam para o glossário oficial do DeepL, que flexiona gênero e número corretamente.

export type EntradaGlossario = { en: string; pt: string; observacao?: string };

export { lerCsv } from "@/lib/fontes/_base/csv";
import { lerCsv } from "@/lib/fontes/_base/csv";

export function lerGlossario(csv: string): EntradaGlossario[] {
  const [cabecalho, ...linhas] = lerCsv(csv);
  if (!cabecalho || cabecalho[0]?.trim() !== "en" || cabecalho[1]?.trim() !== "pt_br") {
    throw new Error("config/glossario-militar.csv: cabeçalho esperado 'en,pt_br,observacao'");
  }
  return linhas
    .map(([en = "", pt = "", observacao]) => ({ en: en.trim(), pt: pt.trim(), observacao: observacao?.trim() || undefined }))
    .filter((e) => e.en && e.pt);
}

const ehSigla = (termo: string) => /^[A-Z0-9]{2,}$/.test(termo);
/** Só expressões de várias palavras e siglas são travadas (ver comentário no topo). */
export const deveTravar = (termo: string) => termo.includes(" ") || ehSigla(termo);

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type Travador = {
  /** Substitui termos do glossário por <keep>pt-BR</keep>. */
  travar(texto: string): string;
  /** Remove as marcas <keep> (depois da tradução). */
  destravar(texto: string): string;
};

export function criarTravador(glossario: EntradaGlossario[]): Travador {
  // Termos mais longos primeiro: "drone swarm" antes de "drone".
  const regras = glossario
    .filter((e) => deveTravar(e.en))
    .sort((a, b) => b.en.length - a.en.length)
    .map((e) => ({
      re: new RegExp(`(?<![\\w-])${escaparRegex(e.en)}(?![\\w-])`, ehSigla(e.en) ? "g" : "gi"),
      pt: e.pt,
    }));

  return {
    travar(texto) {
      // Protege trechos já travados para não travar duas vezes.
      const partes = texto.split(/(<keep>.*?<\/keep>)/g);
      return partes
        .map((p) => (p.startsWith("<keep>") ? p : regras.reduce((acc, r) => acc.replace(r.re, `<keep>${r.pt}</keep>`), p)))
        .join("");
    },
    destravar(texto) {
      // O DeepL às vezes cola uma letra solta na borda do termo travado ("da e<keep>defesa aérea</keep>",
      // "<keep>Departamento de Guerra dos EUA</keep>s"). O termo travado é sempre uma expressão completa em
      // pt-BR, então até 2 letras grudadas na borda, sem espaço, são artefato e saem.
      return texto
        .replace(/(^|[\s("“'‘])\p{L}{1,2}<keep>/gu, "$1<keep>")
        .replace(/<\/keep>\p{L}{1,2}(?=$|[\s,.;:!?)"”'’])/gu, "</keep>")
        .replace(/<\/?keep>/g, "");
    },
  };
}

/** TSV no formato do DeepL (entries_format=tsv) — só palavras soltas; expressões já são travadas. */
export function glossarioParaTsv(glossario: EntradaGlossario[]): string {
  const vistos = new Set<string>();
  return glossario
    .filter((e) => !deveTravar(e.en))
    .filter((e) => (vistos.has(e.en.toLowerCase()) ? false : (vistos.add(e.en.toLowerCase()), true)))
    .map((e) => `${e.en}\t${e.pt}`)
    .join("\n");
}
