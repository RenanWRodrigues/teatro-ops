// Adaptador GDELT GKG 2.0 (fonte "gdelt-gkg"): arquivos brutos publicados a cada 15 min em
// https://data.gdeltproject.org/gdeltv2/ — sem API e sem limite de requisições (a API DOC responde 429).
// Usamos só URL, data, domínio e o título da página (<PAGE_TITLE>); nunca o texto do artigo.
import { unzipSync, strFromU8 } from "fflate";
import { fetchComRetry } from "../_base/http";
import { rateLimiter } from "../_base/limitador";
import { dominioDe, hashUrl, normalizarUrl } from "../_base/url";
import type { AdaptadorFonte, NoticiaNormalizada } from "../_base/tipos";
import { classificar } from "../gdelt-doc/classificacao";
import type { FonteYaml } from "../registro";
import { casa, compilarConsulta, type Consulta } from "./consultas";

export const ID = "gdelt-gkg";
const BASE = "https://data.gdeltproject.org/gdeltv2";
/** Teto de arquivos por execução (12 × 15 min = 3 h; ~3 MB cada). */
const MAX_ARQUIVOS = 12;

/** Colunas do GKG 2.1 usadas (índices a partir de 0). */
const COL = { data: 1, colecao: 2, dominio: 3, url: 4, temas: 7, extras: 26 } as const;

const TEMA_DA_CONSULTA: Record<string, string> = {
  conflitos: "conflitos",
  drones: "drones",
  ia: "ia",
  guerra_eletronica: "guerra-eletronica",
};

/** Item cru: uma linha do GKG (colunas separadas por tabulação). */
export type LinhaGkg = string[];

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodificarEntidades(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, nome: string) => ENTIDADES[nome.toLowerCase()] ?? m);
}

/** Remove o nome do site no fim ("Título - Site", "Título | Site") ou no início ("Site | Título"), se curto. */
export function limparTitulo(bruto: string): string {
  let t = decodificarEntidades(bruto).replace(/\s+/g, " ").trim();
  const fim = /^(.*\S)\s+[-|–—]\s+([^-|–—]{2,40})$/.exec(t);
  if (fim && fim[1]!.length >= 20) t = fim[1]!;
  const inicio = /^([^|]{2,30})\s+\|\s+(.+)$/.exec(t);
  if (inicio && inicio[2]!.length >= 20) t = inicio[2]!;
  return t;
}

export const tituloDaLinha = (l: LinhaGkg) => /<PAGE_TITLE>([\s\S]*?)<\/PAGE_TITLE>/.exec(l[COL.extras] ?? "")?.[1] ?? null;

/** "20261114191500" → "2026-11-14T19:15:00Z" */
export function dataGkg(d: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(d);
  if (!m) throw new Error(`data GKG inválida: ${d}`);
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}

/** Carimbos de 15 min do mais recente para trás até `desde` (inclusive), no máximo `max`. */
export function carimbosDaJanela(ultimo: string, desde: Date, max = MAX_ARQUIVOS): string[] {
  const inicio = new Date(dataGkg(ultimo)).getTime();
  const saida: string[] = [];
  for (let t = inicio; t >= desde.getTime() && saida.length < max; t -= 15 * 60_000) {
    saida.push(new Date(t).toISOString().replace(/[-:T]/g, "").slice(0, 14));
  }
  return saida;
}

/** Lê o TSV do GKG (já descompactado). */
export const lerTsv = (texto: string): LinhaGkg[] =>
  texto.split("\n").filter((l) => l.trim() !== "").map((l) => l.split("\t"));

export type ConsultasCompiladas = {
  incluir: [chave: string, consulta: Consulta][];
  excluir: Consulta | null;
  temasGdelt: Set<string> | null;
};

export function compilarConsultas(config: Pick<FonteYaml, "consultas" | "excluir" | "temas_gdelt">): ConsultasCompiladas {
  const c = Object.entries(config.consultas ?? {});
  if (c.length === 0) throw new Error(`${ID}: nenhuma consulta em config/fontes.yaml`);
  return {
    incluir: c.map(([chave, texto]) => [chave, compilarConsulta(texto)]),
    excluir: config.excluir ? compilarConsulta(config.excluir) : null,
    temasGdelt: config.temas_gdelt?.length ? new Set(config.temas_gdelt) : null,
  };
}

/** Temas V1 do GKG ("ARMEDCONFLICT;KILL;TAX_WEAPONS_DRONE;…"), sem os deslocamentos. */
export const temasDaLinha = (l: LinhaGkg) => (l[COL.temas] ?? "").split(";").map((t) => t.split(",")[0]!).filter(Boolean);

/** `null` = descartar: sem título, título curto, URL inválida ou fora de todas as consultas. */
export function normalizarLinha(l: LinhaGkg, consultas: ConsultasCompiladas): NoticiaNormalizada | null {
  if (l.length <= COL.extras || l[COL.colecao] !== "1") return null; // 1 = web
  const bruto = tituloDaLinha(l);
  if (!bruto) return null;
  const titulo = limparTitulo(bruto);
  if (titulo.length < 12) return null;
  const temasConsulta = consultas.incluir.filter(([, c]) => casa(c, titulo)).map(([chave]) => TEMA_DA_CONSULTA[chave] ?? chave);
  if (temasConsulta.length === 0) return null;
  if (consultas.excluir && casa(consultas.excluir, titulo)) return null;
  if (consultas.temasGdelt && !temasDaLinha(l).some((t) => consultas.temasGdelt!.has(t))) return null;
  let url: string;
  try {
    url = normalizarUrl(l[COL.url]!);
  } catch {
    return null;
  }
  const c = classificar(titulo, temasConsulta);
  return {
    hash: hashUrl(url),
    url,
    tituloOriginal: titulo,
    // O fluxo principal do GKG é de veículos em inglês (o fluxo traduzido é outro conjunto de arquivos).
    idiomaOriginal: "en",
    dominio: dominioDe(url),
    paises: c.paises,
    temas: c.temas,
    regiao: c.regiao,
    publicadoEm: dataGkg(l[COL.data]!),
  };
}

export function criarAdaptadorGkg(config: FonteYaml, fetchImpl: typeof fetch = fetch): AdaptadorFonte<LinhaGkg, NoticiaNormalizada> {
  const consultas = compilarConsultas(config);
  const aguardar = rateLimiter(ID, config.limite);

  return {
    id: ID,
    async buscar(desde) {
      await aguardar();
      const indice = await (await fetchComRetry(`${BASE}/lastupdate.txt`, { fetchImpl })).text();
      const ultimo = /\/(\d{14})\.gkg\.csv\.zip/.exec(indice)?.[1];
      if (!ultimo) throw new Error(`lastupdate.txt sem arquivo GKG: ${indice.slice(0, 200)}`);

      const linhas: LinhaGkg[] = [];
      const erros: string[] = [];
      const carimbos = carimbosDaJanela(ultimo, desde);
      for (const c of carimbos) {
        await aguardar();
        try {
          const r = await fetchComRetry(`${BASE}/${c}.gkg.csv.zip`, { fetchImpl, tentativas: 2 });
          const arquivos = unzipSync(new Uint8Array(await r.arrayBuffer()));
          for (const conteudo of Object.values(arquivos)) linhas.push(...lerTsv(strFromU8(conteudo)));
        } catch (e) {
          erros.push(`${c}: ${(e as Error).message}`);
        }
      }
      if (erros.length === carimbos.length) throw new Error(`nenhum arquivo GKG baixado — ${erros.slice(0, 3).join(" | ")}`);
      for (const e of erros) console.warn(`[${ID}] arquivo pulado: ${e}`);
      return linhas;
    },
    normalizar: (l) => normalizarLinha(l, consultas),
    hash: (n) => n.hash,
  };
}
