import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { verificarBancoNoBuild } from "./lib/db/verificar-build";

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

export default async function config(fase: string): Promise<NextConfig> {
  // Só no build de produção da Vercel: sem banco, o deploy falha em vez de ir ao ar com [EXEMPLO]
  // (lib/db/verificar-build.ts). Local, CI, preview e e2e seguem funcionando sem Supabase.
  if (fase === PHASE_PRODUCTION_BUILD && process.env.VERCEL_ENV === "production") {
    const r = await verificarBancoNoBuild();
    if (!r.ok) throw new Error(`[TEATRO//OPS] Build de produção sem banco: ${r.motivo}`);
    console.log("[TEATRO//OPS] Supabase acessível no build de produção.");
  }
  return nextConfig;
}
