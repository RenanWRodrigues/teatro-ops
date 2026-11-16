// Seção "Humano no circuito?" de /tecnologia (content/tecnologia/humano-no-circuito.yaml, Fase 8, item 4).
import { parse } from "yaml";
import { z } from "zod";
import { esquemaFonteDossie, lerTrechos, validarChamadas, type FonteDossie, type Trecho } from "./dossie";

const texto = z.string().trim().min(1);
const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const esquema = z.object({
  status: z.enum(["rascunho", "publicado"]),
  revisao: texto,
  atualizado_em: dataIso,
  situacao_em: dataIso,
  introducao: texto,
  niveis: z.array(z.object({ sigla: texto, texto, alerta: z.boolean().optional() })).min(1),
  nota_niveis: texto,
  andamento: z.array(z.object({ data: dataIso, texto, atual: z.boolean().optional() })).min(1),
  posicoes: z.array(texto).min(1),
  fontes: z.array(esquemaFonteDossie).min(1),
});

export type HumanoNoCircuito = {
  status: "rascunho" | "publicado";
  revisao: string;
  atualizadoEm: string;
  situacaoEm: string;
  introducao: Trecho[];
  niveis: { sigla: string; texto: Trecho[]; alerta: boolean }[];
  notaNiveis: Trecho[];
  andamento: { data: string; texto: Trecho[]; atual: boolean }[];
  posicoes: Trecho[][];
  fontes: FonteDossie[];
};

const resumoTrecho = (t: Trecho[]) =>
  t
    .map((x) => (x.tipo === "ref" ? "" : x.texto))
    .join("")
    .slice(0, 60);

export function lerHumanoNoCircuito(textoYaml: string, arquivo: string): HumanoNoCircuito {
  const d = esquema.parse(parse(textoYaml));
  const r: HumanoNoCircuito = {
    status: d.status,
    revisao: d.revisao,
    atualizadoEm: d.atualizado_em,
    situacaoEm: d.situacao_em,
    introducao: lerTrechos(d.introducao),
    niveis: d.niveis.map((n) => ({ sigla: n.sigla, texto: lerTrechos(n.texto), alerta: n.alerta ?? false })),
    notaNiveis: lerTrechos(d.nota_niveis),
    andamento: d.andamento.map((a) => ({ data: a.data, texto: lerTrechos(a.texto), atual: a.atual ?? false })),
    posicoes: d.posicoes.map(lerTrechos),
    fontes: d.fontes,
  };

  // Todo trecho (introdução, níveis, andamento e posições) precisa citar ao menos uma fonte.
  const itens = [r.introducao, r.notaNiveis, ...r.niveis.map((n) => n.texto), ...r.andamento.map((a) => a.texto), ...r.posicoes];
  const sem = itens.find((t) => !t.some((x) => x.tipo === "ref"));
  if (sem) throw new Error(`${arquivo}: trecho sem chamada de fonte: "${resumoTrecho(sem)}…"`);
  validarChamadas(
    r.fontes,
    itens.flat().flatMap((t) => (t.tipo === "ref" ? [t.n] : [])),
    arquivo,
  );

  for (let i = 1; i < r.andamento.length; i++) {
    if (r.andamento[i]!.data < r.andamento[i - 1]!.data) throw new Error(`${arquivo}: andamento fora de ordem cronológica`);
  }
  if (r.andamento.filter((a) => a.atual).length > 1) throw new Error(`${arquivo}: só um item do andamento pode ser "atual"`);
  return r;
}
