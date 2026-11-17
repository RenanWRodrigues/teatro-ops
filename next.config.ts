import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Desligado de propósito: com Partial Prefetching, a 1ª visita a um slug inexistente
  // transmite o shell com status 200 antes do notFound(). Sem ele, as páginas com
  // generateStaticParams aguardam `params` fora do <Suspense> e devolvem 404 de verdade.
  partialPrefetching: false,
  images: {
    // Fotos do Commons vão direto do Wikimedia ao navegador, como miniaturas no tamanho certo
    // (lib/imagens/carregador.ts). O otimizador da Vercel não serve: o Wikimedia responde 403/429
    // ao servidor dela. O carregador também recusa qualquer host fora do Commons (CLAUDE.md §1.4).
    loader: "custom",
    loaderFile: "./lib/imagens/carregador.ts",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
