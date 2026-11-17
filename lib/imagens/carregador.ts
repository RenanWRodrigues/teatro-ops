// Carregador do next/image (images.loaderFile em next.config.ts).
//
// Por que não o otimizador da Vercel: o Wikimedia recusa pedidos de servidores sem User-Agent
// identificável (403) e limita robôs genéricos (429).
//
// Caminho normal: a ingestão copia a miniatura de 960 px de cada foto para o Supabase Storage
// (lib/imagens/espelho.ts) e grava essa URL em `midias.miniatura_url`; o carregador a devolve
// como está. O Storage gratuito não redimensiona, então todas as larguras usam o mesmo arquivo.
//
// Reserva (foto ainda não copiada): a miniatura oficial do Commons, sempre em 960 px. Pedir
// larguras variadas fazia o navegador gerar miniaturas fora do cache do Wikimedia, que limita
// isso por IP (HTTP 429, conferido em 17/11/2026) — e as fotos sumiam.
//
// O Commons só gera miniaturas em degraus fixos (outros tamanhos dão HTTP 400); o original
// pode ter vários MB, por isso nunca é usado.

const HOST = "upload.wikimedia.org";
/** A API do Commons devolve as miniaturas (`thumburl`) em thumb.wikimedia.org desde 2026; os caminhos são os mesmos. */
const HOSTS_ACEITOS = new Set([HOST, "thumb.wikimedia.org"]);
const PREFIXO = "/wikipedia/commons/";
/** Degraus aceitos pelo Commons (conferidos em 17/11/2026: 640 px, por exemplo, devolve 400). */
export const DEGRAUS_WIKIMEDIA = [250, 330, 500, 960, 1280, 1920] as const;
/** Largura da cópia no Storage e da reserva do Commons (é a que a API do Commons gera na ingestão). */
export const LARGURA_ESPELHO = 960;
/** Caminho público do bucket "fotos" no Supabase Storage. */
export const CAMINHO_PUBLICO_FOTOS = "/storage/v1/object/public/fotos/";

/** Menor degrau que cobre a largura pedida; acima de 1920 px, usa 1920. */
export function degrauPara(largura: number): number {
  return DEGRAUS_WIKIMEDIA.find((d) => d >= largura) ?? DEGRAUS_WIKIMEDIA[DEGRAUS_WIKIMEDIA.length - 1]!;
}

/**
 * Converte o endereço de um arquivo do Commons (original ou miniatura) no da miniatura com a largura pedida.
 * Ex.: /wikipedia/commons/1/1e/Foto.jpg → /wikipedia/commons/thumb/1/1e/Foto.jpg/960px-Foto.jpg
 */
export function miniaturaWikimedia(src: string, largura: number): string {
  const url = new URL(src);
  if (!HOSTS_ACEITOS.has(url.hostname) || !url.pathname.startsWith(PREFIXO)) {
    // Só fotos de licença livre do Commons (CLAUDE.md §1.4); outro host é erro de dados.
    throw new Error(`Imagem fora do Wikimedia Commons: ${url.hostname}`);
  }
  let caminho = url.pathname.slice(PREFIXO.length);
  // Já é miniatura ("thumb/1/1e/Foto.jpg/250px-Foto.jpg"): volta ao caminho do original.
  if (caminho.startsWith("thumb/")) caminho = caminho.slice("thumb/".length).split("/").slice(0, 3).join("/");
  const arquivo = caminho.split("/").at(-1)!;
  // SVG vira PNG na miniatura; os demais formatos (JPG, PNG, GIF, WebP) mantêm a extensão.
  const nomeMiniatura = /\.svg$/i.test(arquivo) ? `${arquivo}.png` : arquivo;
  return `https://${HOST}${PREFIXO}thumb/${caminho}/${degrauPara(largura)}px-${nomeMiniatura}`;
}

/** Cópia no Storage do Supabase do projeto (bucket público "fotos"). */
function ehCopiaNoStorage(src: string): boolean {
  const url = new URL(src);
  return url.protocol === "https:" && url.hostname.endsWith(".supabase.co") && url.pathname.startsWith(CAMINHO_PUBLICO_FOTOS);
}

// `width` não é usado de propósito: há um único tamanho por foto (ver o topo do arquivo).
export default function carregador({ src }: { src: string; width: number; quality?: number }): string {
  // Imagens locais (/public) não passam por aqui com otimização; devolve como está.
  if (src.startsWith("/")) return src;
  if (ehCopiaNoStorage(src)) return src;
  return miniaturaWikimedia(src, LARGURA_ESPELHO);
}
