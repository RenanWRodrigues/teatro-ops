// Xinhua (mídia estatal da China) pelos arquivos GKG do GDELT, filtrados pelo domínio de origem.
// O feed RSS público da Xinhua parou em 2018 (verificado em 15/11/2026); a alternativa foi aprovada em 15/11/2026.
import { rateLimiter } from "@/lib/fontes/_base/limitador";
import type { AdaptadorFonte } from "@/lib/fontes/_base/tipos";
import { normalizarUrl, sha256 } from "@/lib/fontes/_base/url";
import { baixarGkg, COL, dataGkg, limparTitulo, tituloDaLinha, type LinhaGkg } from "@/lib/fontes/gdelt-gkg";
import type { FonteYaml } from "@/lib/fontes/registro";
import type { DecisaoNormalizada } from "@/lib/governos/tipos";

const doDominio = (dominio: string, aceitos: string[]) => aceitos.some((d) => dominio === d || dominio.endsWith(`.${d}`));

export function normalizarLinhaXinhua(
  l: LinhaGkg,
  fonte: Pick<FonteYaml, "id" | "nome" | "orgao" | "pais" | "dominios" | "categoria">,
): DecisaoNormalizada | null {
  const dominio = (l[COL.dominio] ?? "").toLowerCase();
  if (!fonte.pais || !doDominio(dominio, fonte.dominios ?? [])) return null;
  const bruto = tituloDaLinha(l);
  const url = l[COL.url];
  if (!bruto || !url || !/^https?:\/\//.test(url)) return null;
  // "Título -- Xinhua", "Título - Xinhua": o nome do veículo sai (o órgão já é exibido à parte).
  const titulo = limparTitulo(bruto).replace(/\s*[-–—|]+\s*Xinhua\s*$/i, "").trim();
  if (titulo.length < 15) return null;
  const urlN = normalizarUrl(url);
  return {
    // O mesmo texto sai em URLs espelhadas (english.news.cn, xinhuanet.com…): o id é o título normalizado,
    // o que mantém a deduplicação entre execuções.
    hash: sha256(`xinhua:${titulo.toLowerCase().replace(/\s+/g, " ")}`),
    fonteId: fonte.id,
    pais: fonte.pais,
    orgao: fonte.orgao ?? fonte.nome,
    tituloOriginal: titulo,
    idiomaOriginal: "en",
    descricao: null,
    urlOficial: urlN,
    publicadoEm: dataGkg(l[COL.data]!),
    origem: "rss",
    estatal: fonte.categoria === "estatal",
  };
}

export function criarAdaptadorXinhua(fonte: FonteYaml, fetchImpl?: typeof fetch): AdaptadorFonte<LinhaGkg, DecisaoNormalizada> {
  if (!fonte.dominios?.length) throw new Error(`${fonte.id}: sem dominios em config/fontes.yaml`);
  // Mesmo servidor do gdelt-gkg: compartilha o limitador para não somar requisições.
  const aguardar = rateLimiter("gdelt-gkg", fonte.limite);
  return {
    id: fonte.id,
    buscar: (desde) => baixarGkg(desde, aguardar, fetchImpl, (l) => normalizarLinhaXinhua(l, fonte) !== null),
    normalizar: (l) => normalizarLinhaXinhua(l, fonte),
    hash: (n) => n.hash,
  };
}
