// Cópia das fotos do Commons no Supabase Storage (bucket público "fotos").
//
// Por quê: o Wikimedia limita por IP a geração de miniaturas que não estão no cache dele
// (HTTP 429 "Too many requests", retry-after 120 s, conferido em 17/11/2026). Uma página do
// arsenal com vários cards estourava o limite no navegador do leitor e as fotos sumiam.
// Aqui a ingestão baixa UMA vez a miniatura de 960 px (com o User-Agent identificado que a
// política da Wikimedia pede) e o site passa a servir a cópia. Autor, licença e link do
// arquivo continuam na tabela `midias` e aparecem no crédito (CLAUDE.md §1.3 e §1.4).
//
// Só roda em scripts/GitHub Actions (usa o cliente service_role).
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchComRetry } from "@/lib/fontes/_base/http";
import { userAgentWikimedia } from "@/lib/fontes/wikidata";
import { CAMINHO_PUBLICO_FOTOS, LARGURA_ESPELHO, miniaturaWikimedia } from "./carregador";

export const BUCKET_FOTOS = "fotos";
const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
/** Miniaturas de 960 px ficam entre 50 e 500 KB; acima disso algo está errado. */
const LIMITE_BYTES = 5 * 1024 * 1024;

/** true se a URL já é uma cópia no Storage do projeto. */
export const ehEspelho = (url: string | null | undefined): boolean => !!url && url.includes(CAMINHO_PUBLICO_FOTOS);

/** Nome estável do objeto: o mesmo arquivo do Commons sempre cai no mesmo caminho (reprocessar não duplica). */
export function caminhoEspelho(urlCommons: string, extensao: string): string {
  const miniatura = new URL(miniaturaWikimedia(urlCommons, LARGURA_ESPELHO));
  const hash = createHash("sha256").update(decodeURIComponent(miniatura.pathname)).digest("hex").slice(0, 32);
  return `commons/${hash}-${LARGURA_ESPELHO}.${extensao}`;
}

/** Cria o bucket público, se ainda não existir (só imagens, até 5 MB). */
export async function garantirBucketFotos(db: SupabaseClient): Promise<void> {
  const r = await db.storage.getBucket(BUCKET_FOTOS);
  if (r.data) return;
  const c = await db.storage.createBucket(BUCKET_FOTOS, {
    public: true,
    allowedMimeTypes: Object.keys(TIPOS),
    fileSizeLimit: LIMITE_BYTES,
  });
  if (c.error && !/already exists/i.test(c.error.message)) throw new Error(`storage (criar bucket ${BUCKET_FOTOS}): ${c.error.message}`);
}

/**
 * Baixa a miniatura de 960 px do Commons e grava no Storage. Devolve a URL pública da cópia.
 * `urlCommons` pode ser o original ou qualquer miniatura do mesmo arquivo.
 */
export async function espelharFoto(db: SupabaseClient, urlCommons: string, opcoes: { fetchImpl?: typeof fetch } = {}): Promise<string> {
  const origem = miniaturaWikimedia(urlCommons, LARGURA_ESPELHO);
  const resp = await fetchComRetry(origem, { fetchImpl: opcoes.fetchImpl, headers: { "User-Agent": userAgentWikimedia() } });
  const tipo = (resp.headers.get("content-type") ?? "").split(";")[0]!.trim();
  const extensao = TIPOS[tipo];
  if (!extensao) throw new Error(`miniatura com tipo inesperado (${tipo || "sem content-type"}): ${origem}`);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > LIMITE_BYTES) throw new Error(`miniatura com ${bytes.byteLength} bytes: ${origem}`);

  const caminho = caminhoEspelho(urlCommons, extensao);
  const up = await db.storage.from(BUCKET_FOTOS).upload(caminho, bytes, { contentType: tipo, upsert: true, cacheControl: "31536000" });
  if (up.error) throw new Error(`storage (${caminho}): ${up.error.message}`);
  return db.storage.from(BUCKET_FOTOS).getPublicUrl(caminho).data.publicUrl;
}
