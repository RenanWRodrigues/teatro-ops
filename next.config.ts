import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Desligado de propósito: com Partial Prefetching, a 1ª visita a um slug inexistente
  // transmite o shell com status 200 antes do notFound(). Sem ele, as páginas com
  // generateStaticParams aguardam `params` fora do <Suspense> e devolvem 404 de verdade.
  partialPrefetching: false,
  images: {
    // Só fotos de licença livre (CLAUDE.md §1.4). Novos domínios entram junto com o adaptador da fonte.
    remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**" }],
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
