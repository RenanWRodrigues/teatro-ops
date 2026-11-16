// robots.txt (Fase 10, item 2): tudo liberado, exceto resultados de busca.
import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = urlDoSite();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/busca"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
