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
/**
 * Teto de arquivos por execução (96 × 15 min = 24 h; ~3 MB cada). A janela normal é curta, mas o cron
 * gratuito do GitHub atrasa horas: a execução seguinte recupera o intervalo perdido (lib/ingestao/janela.ts).
 */
export const MAX_ARQUIVOS = 96;

/** Colunas do GKG 2.1 usadas (índices a partir de 0). */
export const COL = { data: 1, colecao: 2, dominio: 3, url: 4, temas: 7, locais: 9, extras: 26 } as const;

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

/** Especificidade do tipo de local do GKG: 3/4 = cidade, 2/5 = estado/província, 1 = país. */
const ESPECIFICIDADE: Record<string, number> = { "3": 3, "4": 3, "2": 2, "5": 2, "1": 1 };

/**
 * Principal local da notícia: o país mais citado nos locais do GKG e, dentro dele, o local mais
 * específico (cidade › província › país). Coordenada arredondada a 1 casa (~11 km).
 */
export function localPrincipal(l: LinhaGkg): { lat: number; lon: number } | null {
  const locais = (l[COL.locais] ?? "")
    .split(";")
    .map((s) => s.split("#"))
    .filter((p) => p.length >= 6 && p[4] !== "" && p[5] !== "")
    .map(([tipo, , pais, , lat, lon]) => ({ tipo: tipo!, pais: pais!, lat: Number(lat), lon: Number(lon) }))
    .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon) && Math.abs(x.lat) <= 90 && Math.abs(x.lon) <= 180);
  if (locais.length === 0) return null;
  const contagem = new Map<string, number>();
  for (const x of locais) contagem.set(x.pais, (contagem.get(x.pais) ?? 0) + 1);
  // Empate: vale o país citado primeiro (Map preserva a ordem de inserção).
  const pais = [...contagem.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const melhor = locais
    .filter((x) => x.pais === pais)
    .reduce((a, b) => ((ESPECIFICIDADE[b.tipo] ?? 0) > (ESPECIFICIDADE[a.tipo] ?? 0) ? b : a));
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { lat: r1(melhor.lat), lon: r1(melhor.lon) };
}

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
  const local = localPrincipal(l);
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
    lat: local?.lat ?? null,
    lon: local?.lon ?? null,
  };
}

export function criarAdaptadorGkg(config: FonteYaml, fetchImpl: typeof fetch = fetch): AdaptadorFonte<LinhaGkg, NoticiaNormalizada> {
  const consultas = compilarConsultas(config);
  const aguardar = rateLimiter(ID, config.limite);

  return {
    id: ID,
    // Só as linhas que passam pelas consultas ficam na memória (o pipeline normaliza de novo, é barato).
    buscar: (desde) => baixarGkg(desde, aguardar, fetchImpl, (l) => normalizarLinha(l, consultas) !== null),
    normalizar: (l) => normalizarLinha(l, consultas),
    hash: (n) => n.hash,
  };
}

/**
 * Baixa e lê os arquivos GKG de 15 min desde `desde` (também usado pela fonte xinhua, filtrada por domínio).
 * `manter` filtra cada arquivo assim que é lido: com até 96 arquivos (~800 linhas cada), guardar todas as
 * linhas brutas pesaria na memória do runner.
 */
export async function baixarGkg(
  desde: Date,
  aguardar: () => Promise<void>,
  fetchImpl: typeof fetch = fetch,
  manter: (l: LinhaGkg) => boolean = () => true,
): Promise<LinhaGkg[]> {
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
      for (const conteudo of Object.values(arquivos)) {
        for (const l of lerTsv(strFromU8(conteudo))) if (manter(l)) linhas.push(l);
      }
    } catch (e) {
      erros.push(`${c}: ${(e as Error).message}`);
    }
  }
  if (erros.length === carimbos.length) throw new Error(`nenhum arquivo GKG baixado — ${erros.slice(0, 3).join(" | ")}`);
  for (const e of erros) console.warn(`[${ID}] arquivo pulado: ${e}`);
  return linhas;
}
