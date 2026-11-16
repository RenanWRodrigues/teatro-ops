// Endereço público e metadados comuns (SEO e Open Graph em pt-BR; Fase 10, item 2).
import type { Metadata } from "next";

export const NOME_SITE = "TEATRO//OPS";

/**
 * URL pública do site, sem barra final. Ordem: NEXT_PUBLIC_SITE_URL (domínio próprio) →
 * VERCEL_PROJECT_PRODUCTION_URL (definida pela Vercel, sem protocolo) → localhost.
 */
export function urlDoSite(): string {
  const explicita = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicita) return explicita.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

type Opcoes = {
  titulo: string;
  descricao: string;
  /** Caminho canônico da página ("/arsenal"). */
  caminho: string;
  tipo?: "website" | "article";
  /** Páginas de resultado (busca) não entram no índice dos buscadores. */
  indexar?: boolean;
};

/** Imagem de compartilhamento padrão (app/opengraph-image.tsx). O openGraph de cada página substitui o do
 * layout inteiro, inclusive a imagem, então ela é repetida aqui. */
const IMAGEM_PADRAO = { url: "/opengraph-image", width: 1200, height: 630, alt: `${NOME_SITE} — conflitos, arsenal, táticas e tecnologia militar` };

/** Metadados de uma página: título, descrição, URL canônica e Open Graph/Twitter coerentes. */
export function metadados({ titulo, descricao, caminho, tipo = "website", indexar = true }: Opcoes): Metadata {
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: {
      type: tipo,
      locale: "pt_BR",
      siteName: NOME_SITE,
      title: `${titulo} · ${NOME_SITE}`,
      description: descricao,
      url: caminho,
      images: [IMAGEM_PADRAO],
    },
    twitter: { card: "summary_large_image", title: `${titulo} · ${NOME_SITE}`, description: descricao, images: [IMAGEM_PADRAO.url] },
    ...(indexar ? {} : { robots: { index: false, follow: true } }),
  };
}
