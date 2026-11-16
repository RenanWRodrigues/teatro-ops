// sitemap.xml (Fase 10, item 2): páginas estáticas e dinâmicas. A busca fica de fora (resultado de pesquisa).
import type { MetadataRoute } from "next";
import { obterConflitos, obterEquipamentos, obterTaticas } from "@/lib/dados";
import { categoriasComItens } from "@/lib/fixtures/equipamentos";
import { PAISES_MONITORADOS } from "@/lib/governos/paises";
import { urlDoSite } from "@/lib/site";

type Entrada = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlDoSite();
  const url = (caminho: string, freq: Entrada["changeFrequency"], prioridade: number): Entrada => ({
    url: `${base}${caminho}`,
    changeFrequency: freq,
    priority: prioridade,
  });

  const [conflitos, equipamentos] = await Promise.all([obterConflitos(), obterEquipamentos()]);
  // Fixtures [EXEMPLO] não entram no sitemap: só o que vem do banco ou de content/.
  const fichas = equipamentos.exemplo ? [] : equipamentos.dados;

  return [
    url("/", "hourly", 1),
    url("/conflitos", "daily", 0.9),
    url("/governos", "hourly", 0.8),
    url("/arsenal", "weekly", 0.8),
    url("/arsenal/comparar", "weekly", 0.4),
    url("/tecnologia", "daily", 0.8),
    url("/taticas", "monthly", 0.7),
    url("/arquivo", "yearly", 0.6),
    url("/fontes", "weekly", 0.4),
    url("/metodologia", "monthly", 0.4),
    ...conflitos.map((c) => url(`/conflitos/${c.slug}`, "daily", 0.7)),
    ...PAISES_MONITORADOS.map((p) => url(`/governos/${p.slug}`, "hourly", 0.6)),
    ...categoriasComItens(fichas).map((c) => url(`/arsenal/${c}`, "weekly", 0.6)),
    ...fichas.map((e) => url(`/arsenal/${e.categoria}/${e.slug}`, "monthly", 0.6)),
    ...obterTaticas().map((t) => ({ ...url(`/taticas/${t.id}`, "monthly", 0.6), lastModified: t.atualizadoEm })),
  ];
}
