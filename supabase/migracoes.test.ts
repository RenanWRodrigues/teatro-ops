// Aplica as migrações num Postgres em memória (PGlite) e verifica esquema e RLS.
// Simula os papéis e privilégios padrão do Supabase (anon, authenticated, service_role).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PASTA = path.join(import.meta.dirname, "migrations");
let db: PGlite;

async function comoAnon<T>(fn: () => Promise<T>): Promise<T> {
  await db.exec("set role anon");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

// Projetos Supabase antigos concediam tudo aos papéis da API; os atuais não concedem nada.
// A migração precisa funcionar igual nos dois casos: o teste roda com cada um.
const PRIVILEGIOS_PADRAO = process.env.TESTE_PRIVILEGIOS_PADRAO ?? "nenhum";

beforeAll(async () => {
  db = await PGlite.create({ extensions: { pg_trgm, unaccent } });
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
  `);
  if (PRIVILEGIOS_PADRAO === "amplos") {
    await db.exec(`
      grant usage on schema public to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    `);
  }
  for (const arquivo of readdirSync(PASTA).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(PASTA, arquivo), "utf8"));
  }
  const seed = path.join(import.meta.dirname, "seed.sql");
  await db.exec(readFileSync(seed, "utf8"));
  await db.exec(`
    insert into conflitos (slug, nome_pt, paises, regiao, intensidade) values ('teste', '[TESTE]', '{XX}', 'Teste', 'alta');
    insert into eventos (hash, fonte_id, data, pais, lat, lon) values
      ('h-hoje',  'acled', (now() at time zone 'utc')::date,     'XX', 10.123456, 20.987654),
      ('h-ontem', 'acled', (now() at time zone 'utc')::date - 1, 'XX', 10.123456, 20.987654);
    insert into execucoes_ingestao (job, fonte_id, terminado_em, erro) values
      ('noticias', 'gdelt-doc', now() - interval '1 hour', null),
      ('noticias', 'gdelt-doc', now(), 'falha interna com detalhe sensível');
  `);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("migração 0001", () => {
  it("cria todas as tabelas do modelo", async () => {
    const { rows } = await db.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    expect(rows.map((r) => r.tablename)).toEqual([
      "conflitos",
      "decisoes_governo",
      "equipamentos",
      "eventos",
      "execucoes_ingestao",
      "fontes",
      "midias",
      "noticias",
      "traducoes_cache",
    ]);
  });

  it("liga RLS em todas as tabelas", async () => {
    const { rows } = await db.query<{ relname: string }>(
      "select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity",
    );
    expect(rows).toEqual([]);
  });

  it("busca textual usa o dicionário portuguese", async () => {
    await db.exec(`
      insert into noticias (hash, fonte_id, url, titulo_original, titulo_pt, publicado_em)
      values ('n1', 'gdelt-doc', 'https://exemplo.org/1', 'Drones attack', 'Ataques com drones', now())
    `);
    const { rows } = await db.query("select hash from noticias where busca @@ plainto_tsquery('portuguese', 'ataque')");
    expect(rows).toHaveLength(1);
  });
});

describe("papel service_role (ingestão)", () => {
  it("lê e escreve em todas as tabelas", async () => {
    await db.exec("set role service_role");
    try {
      await db.query("insert into conflitos (slug, nome_pt, paises, regiao) values ('sr', '[TESTE]', '{}', 'x')");
      await db.query("insert into execucoes_ingestao (job) values ('teste')");
      const { rows } = await db.query("select count(*)::int as n from traducoes_cache");
      expect(rows).toEqual([{ n: 0 }]);
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("RLS para o papel anon", () => {
  it("lê conteúdo publicável", async () => {
    const { rows } = await comoAnon(() => db.query("select id from fontes"));
    expect(rows.length).toBeGreaterThan(0);
  });

  it("não lê eventos brutos, cache de tradução nem log de execuções", async () => {
    for (const tabela of ["eventos", "traducoes_cache", "execucoes_ingestao"]) {
      await expect(comoAnon(() => db.query(`select * from ${tabela}`)), tabela).rejects.toThrow(/permission denied/);
    }
  });

  it("não escreve em nenhuma tabela", async () => {
    await expect(
      comoAnon(() => db.query("insert into conflitos (slug, nome_pt, paises, regiao) values ('x', 'x', '{}', 'x')")),
    ).rejects.toThrow(/permission denied/);
    await expect(comoAnon(() => db.query("delete from fontes"))).rejects.toThrow(/permission denied/);
  });

  it("eventos_publicos aplica atraso de 24 h e agrega coordenadas", async () => {
    const { rows } = await comoAnon(() =>
      db.query<{ lat: number; lon: number }>("select lat, lon from eventos_publicos"),
    );
    expect(rows).toEqual([{ lat: 10.1, lon: 21 }]);
  });

  it("agregados do mapa respeitam o atraso de 24 h e agregam em grade de 1°", async () => {
    const { rows } = await comoAnon(() =>
      db.query<{ lat: number; lon: number; eventos: number }>("select lat, lon, eventos from eventos_agregados"),
    );
    expect(rows).toEqual([{ lat: 10, lon: 21, eventos: 1 }]);
    const semanas = await comoAnon(() => db.query<{ eventos: number }>("select eventos from eventos_semanais"));
    expect(semanas.rows).toEqual([]); // eventos de teste não têm conflito_slug
  });

  it("atualizacoes_publicas mostra só execuções sem erro e não expõe a mensagem", async () => {
    const { rows, fields } = await comoAnon(() => db.query("select * from atualizacoes_publicas"));
    expect(rows).toHaveLength(1);
    expect(fields.map((f) => f.name)).toEqual(["job", "fonte_id", "atualizado_em"]);
  });
});

describe("migração 0003 (decisões de governo)", () => {
  it("grava temas e idioma e o anon lê a decisão", async () => {
    await db.exec(`
      insert into decisoes_governo (hash, fonte_id, pais, orgao, tipo, titulo_original, url_oficial, publicado_em, temas, idioma_original)
      values ('d-1', 'fr-eua', 'US', '[TESTE]', 'sancao', '[TESTE]', 'https://exemplo.invalid/1', now(), '{sancoes}', 'en');
    `);
    const { rows } = await comoAnon(() =>
      db.query<{ temas: string[]; idioma_original: string }>("select temas, idioma_original from decisoes_governo where hash = 'd-1'"),
    );
    expect(rows).toEqual([{ temas: ["sancoes"], idioma_original: "en" }]);
  });

  it("temas tem padrão vazio", async () => {
    await db.exec(`
      insert into decisoes_governo (hash, fonte_id, pais, orgao, tipo, titulo_original, url_oficial, publicado_em)
      values ('d-2', 'fr-eua', 'US', '[TESTE]', 'outro', '[TESTE]', 'https://exemplo.invalid/2', now());
    `);
    const { rows } = await db.query<{ temas: string[] }>("select temas from decisoes_governo where hash = 'd-2'");
    expect(rows[0]!.temas).toEqual([]);
  });
});

describe("migração 0004 (busca global)", () => {
  beforeAll(async () => {
    await db.exec(`
      insert into equipamentos (slug, nome, categoria, pais_origem, descricao)
        values ('mig-29', 'MiG-29', 'cacas', '{RU}', 'Caça de superioridade aérea soviético');
      insert into conflitos (slug, nome_pt, paises, regiao, resumo_pt)
        values ('guerra-teste', 'Guerra na Região Teste', '{XX}', 'Ásia', 'Combates com mísseis e drones');
      insert into noticias (hash, fonte_id, url, titulo_original, titulo_pt, publicado_em)
        values ('h-busca-1', 'gdelt-doc', 'https://exemplo.org/missil', 'Missile strike', 'Ataque com míssil atinge porto', now());
      insert into decisoes_governo (hash, fonte_id, pais, orgao, tipo, titulo_original, titulo_pt, url_oficial, publicado_em)
        values ('h-busca-2', 'gdelt-doc', 'US', 'Departamento de Defesa', 'sancao', 'New sanctions on drones', 'Novas sanções sobre drones', 'https://exemplo.gov/s', now());
    `);
  });

  it("acha pelos quatro tipos, sem depender de acento nem de plural regular", async () => {
    // Sem acento acha com acento ("missil" → "míssil"); "mísseis" é plural irregular e casa por "mísseis".
    const r = await comoAnon(() => db.query<{ tipo: string; chave: string }>("select tipo, chave from buscar('missil')"));
    expect(r.rows.map((x) => x.chave)).toContain("https://exemplo.org/missil");
    const plural = await comoAnon(() => db.query<{ chave: string }>("select chave from buscar('misseis')"));
    expect(plural.rows.map((x) => x.chave)).toContain("guerra-teste");
    const drones = await comoAnon(() => db.query<{ tipo: string }>("select tipo from buscar('drone')"));
    expect(drones.rows.map((x) => x.tipo)).toEqual(expect.arrayContaining(["conflito", "decisao", "noticia"]));
    const cacas = await comoAnon(() => db.query<{ chave: string }>("select chave from buscar('caça soviético')"));
    expect(cacas.rows.map((x) => x.chave)).toContain("mig-29");
  });

  it("marca título sem tradução e informa o idioma original", async () => {
    await db.exec(`
      insert into noticias (hash, fonte_id, url, titulo_original, idioma_original, publicado_em)
        values ('h-busca-3', 'gdelt-doc', 'https://exemplo.org/pendente', 'Ракетный удар по порту', 'ru', now());
    `);
    const r = await comoAnon(() => db.query<{ chave: string; pendente: boolean; idioma: string | null }>("select chave, pendente, idioma from buscar('Ракетный')"));
    expect(r.rows).toContainEqual({ chave: "https://exemplo.org/pendente", pendente: true, idioma: "ru" });
    const traduzida = await comoAnon(() => db.query<{ pendente: boolean }>("select pendente from buscar('porto')"));
    expect(traduzida.rows.every((x) => x.pendente === false)).toBe(true);
  });

  it("termo vazio ou só pontuação devolve nada (sem erro)", async () => {
    const vazio = await comoAnon(() => db.query("select * from buscar('')"));
    expect(vazio.rows).toHaveLength(0);
    const sinais = await comoAnon(() => db.query("select * from buscar('!!! ---')"));
    expect(sinais.rows).toHaveLength(0);
  });

  it("limita a quantidade por tipo", async () => {
    const r = await comoAnon(() => db.query("select * from buscar('drones', 1)"));
    const porTipo = new Map<string, number>();
    for (const x of r.rows as { tipo: string }[]) porTipo.set(x.tipo, (porTipo.get(x.tipo) ?? 0) + 1);
    for (const n of porTipo.values()) expect(n).toBe(1);
  });
});
