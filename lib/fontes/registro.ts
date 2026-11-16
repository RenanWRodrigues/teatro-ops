// Leitura e validação de config/fontes.yaml (registro de todas as fontes).
import { parse } from "yaml";
import { z } from "zod";

/** Seções do YAML que são fontes de dados exibidos no site (vão para a tabela `fontes`). */
export const SECOES_DE_DADOS = ["conflitos", "governos", "arsenal", "imprensa_defesa"] as const;
/** Seções de serviços internos (tradução etc.): não são fontes exibidas. */
export const SECOES_DE_SERVICO = ["traducao"] as const;

export const STATUS_FONTE = ["ativa", "a_verificar", "quebrada", "desativada"] as const;

const urlOuNulo = z.union([z.string().min(1), z.null()]).optional();

export const esquemaFonteYaml = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "id deve ser minúsculo, com hífens"),
  nome: z.string().min(1),
  url: urlOuNulo,
  pagina: urlOuNulo,
  feed: urlOuNulo,
  /** URL leve para a verificação diária, quando `feed`/`url` não servem para um GET simples (ex.: pasta, SPARQL). */
  verificar: urlOuNulo,
  tipo: z.enum(["api", "rss", "dataset", "scrape"]),
  categoria: z.enum(["estatal", "oficial", "imprensa", "pesquisa", "humanitaria", "enciclopedia"]),
  licenca: z.string().min(1),
  pais: z.string().length(2).optional(),
  status: z.enum(STATUS_FONTE),
  job: z.string().optional(),
  limite: z.string().optional(),
  auth: z.string().optional(),
  env: z.array(z.string()).optional(),
  opcional: z.boolean().optional(),
  consultas: z.record(z.string(), z.string()).optional(),
  /** Consulta no mesmo formato: títulos que casam são descartados. */
  excluir: z.string().optional(),
  /** GKG: temas do GDELT exigidos (ao menos um) além do termo no título. */
  temas_gdelt: z.array(z.string()).optional(),
  /** Governos: nome do órgão exibido em cada item (padrão: `nome`). */
  orgao: z.string().optional(),
  /** Idioma do feed (ISO 639-1); padrão "en". */
  idioma: z.string().length(2).optional(),
  /** Fuso para datas sem fuso no feed (ex.: "+03:30"); padrão UTC. */
  fuso: z.string().regex(/^[+-]\d{2}:\d{2}$/).optional(),
  /** GDELT GKG: só itens publicados nestes domínios (ex.: ["news.cn"]). */
  dominios: z.array(z.string()).optional(),
});

export type FonteYaml = z.infer<typeof esquemaFonteYaml>;

export type LinhaFonte = {
  id: string;
  nome: string;
  url_base: string;
  licenca: string;
  tipo: FonteYaml["tipo"];
  categoria: FonteYaml["categoria"];
  pais: string | null;
  status: FonteYaml["status"];
};

export type ResultadoRegistro = {
  fontes: LinhaFonte[];
  /** Entradas válidas que não puderam virar linha (ex.: sem URL ainda). */
  ignoradas: { id: string; motivo: string }[];
};

/** Lê o YAML e devolve as linhas da tabela `fontes`. Lança erro com o id da entrada inválida. */
export function lerRegistroFontes(textoYaml: string): ResultadoRegistro {
  const bruto = z.record(z.string(), z.array(z.unknown())).parse(parse(textoYaml));
  const desconhecidas = Object.keys(bruto).filter(
    (s) => !(SECOES_DE_DADOS as readonly string[]).includes(s) && !(SECOES_DE_SERVICO as readonly string[]).includes(s),
  );
  if (desconhecidas.length > 0) {
    throw new Error(`Seções desconhecidas em config/fontes.yaml: ${desconhecidas.join(", ")}`);
  }

  const fontes: LinhaFonte[] = [];
  const ignoradas: ResultadoRegistro["ignoradas"] = [];
  const ids = new Set<string>();

  for (const secao of SECOES_DE_DADOS) {
    for (const item of bruto[secao] ?? []) {
      const r = esquemaFonteYaml.safeParse(item);
      if (!r.success) {
        const id = (item as { id?: unknown })?.id ?? "?";
        throw new Error(`Fonte inválida em ${secao} (id: ${String(id)}): ${z.prettifyError(r.error)}`);
      }
      const f = r.data;
      if (ids.has(f.id)) throw new Error(`id de fonte duplicado: ${f.id}`);
      ids.add(f.id);

      if (f.nome.includes("[preencher]")) {
        ignoradas.push({ id: f.id, motivo: "placeholder [preencher]" });
        continue;
      }
      const urlBase = f.url ?? f.feed ?? f.pagina;
      if (!urlBase) {
        ignoradas.push({ id: f.id, motivo: "sem url, feed ou pagina" });
        continue;
      }
      fontes.push({
        id: f.id,
        nome: f.nome,
        url_base: urlBase,
        licenca: f.licenca,
        tipo: f.tipo,
        categoria: f.categoria,
        pais: f.pais ?? null,
        status: f.status,
      });
    }
  }
  return { fontes, ignoradas };
}

const sql = (v: string | null) => (v === null ? "null" : `'${v.replaceAll("'", "''")}'`);

/** SQL idempotente: insere ou atualiza cada fonte (o YAML é a fonte da verdade). */
export function gerarSeedSql(fontes: LinhaFonte[]): string {
  const valores = fontes
    .map((f) =>
      `  (${[f.id, f.nome, f.url_base, f.licenca, f.tipo, f.categoria, f.pais, f.status].map(sql).join(", ")})`,
    )
    .join(",\n");
  return [
    "-- GERADO por scripts/gerar-seed-fontes.ts a partir de config/fontes.yaml. Não edite à mão.",
    "insert into fontes (id, nome, url_base, licenca, tipo, categoria, pais, status) values",
    `${valores}`,
    "on conflict (id) do update set",
    "  nome = excluded.nome, url_base = excluded.url_base, licenca = excluded.licenca, tipo = excluded.tipo,",
    "  categoria = excluded.categoria, pais = excluded.pais, status = excluded.status;",
    "",
  ].join("\n");
}

/** Entradas completas (com limite, consultas, job…) das seções de dados, por id. */
export function lerEntradasFontes(textoYaml: string): Map<string, FonteYaml> {
  const bruto = z.record(z.string(), z.array(z.unknown())).parse(parse(textoYaml));
  const mapa = new Map<string, FonteYaml>();
  for (const secao of SECOES_DE_DADOS) {
    for (const item of bruto[secao] ?? []) {
      const f = esquemaFonteYaml.parse(item);
      mapa.set(f.id, f);
    }
  }
  return mapa;
}
