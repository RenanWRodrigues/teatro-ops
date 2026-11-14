-- TEATRO//OPS — migração inicial (base: docs/MODELO-DADOS.md).
-- Nunca edite esta migração depois de aplicada: mudanças entram em migrações novas.
--
-- Convenção de fontes (CLAUDE.md §1.3): todo dado exibido guarda nome, URL, licença e data de coleta.
-- Onde há uma fonte por linha, isso vem de `fonte_id` → `fontes` + `coletado_em`.
-- Onde há várias, uma coluna jsonb `fontes` guarda uma lista de
--   { "nome": text, "url": text|null, "licenca": text, "coletado_em": timestamptz }.

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- ───────────────────────────── Fontes ─────────────────────────────
-- Espelha config/fontes.yaml (gerado por scripts/gerar-seed-fontes.ts → supabase/seed.sql).
create table fontes (
  id text primary key,                 -- 'gdelt-doc', 'acled', 'fr-eua', 'kremlin'...
  nome text not null,
  url_base text not null,
  licenca text not null,
  tipo text not null check (tipo in ('api','rss','dataset','scrape')),
  categoria text not null check (categoria in ('estatal','oficial','imprensa','pesquisa','humanitaria','enciclopedia')),
  pais text,                           -- ISO-3166 alfa-2, para fontes de governo
  status text not null default 'a_verificar' check (status in ('ativa','a_verificar','quebrada','desativada')),
  ultima_verificacao timestamptz
);

-- ───────────────────────────── Notícias ─────────────────────────────
-- Imprensa e GDELT: só título, link, data e resumo próprio (CLAUDE.md §1.4).
create table noticias (
  id bigserial primary key,
  hash text unique not null,           -- sha256(url normalizada)
  fonte_id text not null references fontes(id),
  url text not null,
  titulo_original text not null,
  idioma_original text,
  titulo_pt text,
  resumo_pt text,                      -- máx. 2 frases, escrito por nós
  resumo_automatico boolean not null default false, -- exibe o rótulo "Resumo automático"
  imagem_url text,                     -- só se a licença permitir
  paises text[] not null default '{}', -- ISO-3166 alfa-2
  temas text[] not null default '{}',  -- 'drones','ia','guerra-eletronica','naval','aereo','terrestre','nuclear','diplomacia'
  regiao text,
  publicado_em timestamptz not null,
  coletado_em timestamptz not null default now(),
  busca tsvector generated always as (
    to_tsvector('portuguese', coalesce(titulo_pt, '') || ' ' || coalesce(resumo_pt, ''))
  ) stored
);
create index noticias_busca_idx on noticias using gin (busca);
create index noticias_publicado_idx on noticias (publicado_em desc);
create index noticias_temas_idx on noticias using gin (temas);

-- ───────────────────────────── Governos ─────────────────────────────
create table decisoes_governo (
  id bigserial primary key,
  hash text unique not null,
  fonte_id text not null references fontes(id),
  pais text not null,                  -- 'US','CN','RU','IR','IL','UA','DE'
  orgao text not null,                 -- 'Presidência','Ministério da Defesa','Congresso'...
  tipo text not null check (tipo in ('ordem_executiva','lei','sancao','comunicado','acordo','exercicio_militar','orcamento','outro')),
  titulo_original text not null,
  titulo_pt text,
  resumo_pt text,
  url_oficial text not null,
  publicado_em timestamptz not null,
  coletado_em timestamptz not null default now()
);
create index decisoes_pais_idx on decisoes_governo (pais, publicado_em desc);

-- ───────────────────────────── Conflitos ─────────────────────────────
-- Curadoria editorial. `lon`/`lat` = ponto de referência agregado do teatro (nunca posição de tropa).
create table conflitos (
  slug text primary key,
  nome_pt text not null,
  paises text[] not null,
  regiao text not null,
  intensidade text check (intensidade in ('alta','tensao','cessar_fogo','encerrado')),
  inicio date,
  resumo_pt text,
  lon double precision check (lon between -180 and 180),
  lat double precision check (lat between -90 and 90),
  fontes jsonb not null default '[]' check (jsonb_typeof(fontes) = 'array'),
  atualizado_em timestamptz not null default now()
);

create table eventos (
  id bigserial primary key,
  hash text unique not null,
  fonte_id text not null references fontes(id),
  id_externo text,
  conflito_slug text references conflitos(slug),
  data date not null,
  pais text not null,
  lat double precision,
  lon double precision,
  tipo_evento text,                    -- traduzido para pt-BR
  atores text[],
  mortes_estimadas int,                -- sempre exibido como estimativa + fonte
  notas_pt text,
  coletado_em timestamptz not null default now()
);
create index eventos_pais_idx on eventos (pais, data desc);
create index eventos_conflito_idx on eventos (conflito_slug, data desc);

-- ───────────────────────────── Equipamentos ─────────────────────────────
create table equipamentos (
  slug text primary key,               -- 'f-35a-lightning-ii'
  nome text not null,
  categoria text not null check (categoria in ('cacas','tanques','embarcacoes','avioes','helicopteros','armamento','drones','defesa-aerea')),
  classe text,                         -- 'Caça · 5ª geração'
  descricao text,                      -- 1 linha, para o card do catálogo
  pais_origem text[] not null,
  fabricante text,
  wikidata_id text unique,
  wikipedia_pt text,                   -- título do artigo em pt.wikipedia (fonte do resumo, CC BY-SA 4.0)
  resumo_pt text,
  em_servico boolean,
  -- { "velocidade_max": { "valor": 1.6, "unidade": "mach", "fonte": "Wikidata", "url": "...", "licenca": "CC0" },
  --   "motor": { "texto": "P&W F135", "fonte": "...", ... } }
  specs jsonb not null default '{}' check (jsonb_typeof(specs) = 'object'),
  variantes jsonb not null default '[]' check (jsonb_typeof(variantes) = 'array'), -- [{ "nome", "descricao" }]
  operadores text[] not null default '{}',
  fontes jsonb not null default '[]' check (jsonb_typeof(fontes) = 'array'),
  atualizado_em timestamptz not null default now()
);
create index equipamentos_categoria_idx on equipamentos (categoria);
create index equipamentos_nome_trgm_idx on equipamentos using gin (nome gin_trgm_ops);

create table midias (
  id bigserial primary key,
  equipamento_slug text not null references equipamentos(slug) on delete cascade,
  url text not null,
  miniatura_url text,
  legenda_pt text,
  autor text,
  licenca text not null,               -- 'Domínio público', 'CC BY-SA 4.0'...
  licenca_url text,
  fonte_url text not null,
  largura int,
  altura int,
  coletado_em timestamptz not null default now()
);
create index midias_equipamento_idx on midias (equipamento_slug);

-- ───────────────────── Cache de tradução e log de execuções ─────────────────────
create table traducoes_cache (
  hash text primary key,               -- sha256(texto_original + idioma_origem)
  texto_original text not null,
  texto_pt text not null,
  motor text not null check (motor in ('deepl','argos','gemini','manual')),
  criado_em timestamptz not null default now()
);

create table execucoes_ingestao (
  id bigserial primary key,
  job text not null,
  fonte_id text references fontes(id),
  iniciado_em timestamptz not null default now(),
  terminado_em timestamptz,
  itens_novos int not null default 0,
  itens_ignorados int not null default 0,
  caracteres_traduzidos int not null default 0,
  erro text
);
create index execucoes_job_idx on execucoes_ingestao (job, terminado_em desc);

-- ───────────────────────────── Segurança ─────────────────────────────
-- RLS em todas as tabelas. Leitura pública só onde o conteúdo é publicável;
-- escrita apenas com service_role (que ignora RLS), usada no GitHub Actions.
alter table fontes             enable row level security;
alter table noticias           enable row level security;
alter table decisoes_governo   enable row level security;
alter table conflitos          enable row level security;
alter table eventos            enable row level security;
alter table equipamentos       enable row level security;
alter table midias             enable row level security;
alter table traducoes_cache    enable row level security;
alter table execucoes_ingestao enable row level security;

create policy leitura_publica on fontes           for select to anon, authenticated using (true);
create policy leitura_publica on noticias         for select to anon, authenticated using (true);
create policy leitura_publica on decisoes_governo for select to anon, authenticated using (true);
create policy leitura_publica on conflitos        for select to anon, authenticated using (true);
create policy leitura_publica on equipamentos     for select to anon, authenticated using (true);
create policy leitura_publica on midias           for select to anon, authenticated using (true);
-- Sem política de leitura (acesso só via service_role ou pelas views abaixo):
--   eventos            → coordenadas exatas e dados recentes (CLAUDE.md §1.6)
--   traducoes_cache    → uso interno
--   execucoes_ingestao → mensagens de erro internas

-- Privilégios explícitos: o Supabase atual não concede mais acesso automático às tabelas
-- para os papéis da API, e projetos antigos concediam tudo. Aqui fica igual nos dois casos.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Defesa em profundidade: mesmo que uma política de escrita seja criada por engano,
-- os papéis públicos não têm privilégio de escrita, e só leem o que é publicável.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on fontes, noticias, decisoes_governo, conflitos, equipamentos, midias to anon, authenticated;

-- Eventos para o público: atraso mínimo de 24 h e coordenadas agregadas (1 casa decimal ≈ 11 km).
-- View sem security_invoker de propósito: lê a tabela com os privilégios do dono e expõe só isto.
create view eventos_publicos as
  select
    id, fonte_id, conflito_slug, data, pais,
    round(lat::numeric, 1)::double precision as lat,
    round(lon::numeric, 1)::double precision as lon,
    tipo_evento, atores, mortes_estimadas, notas_pt, coletado_em
  from eventos
  where data <= (now() at time zone 'utc')::date - 1;

-- Carimbo "Atualizado em …": última execução sem erro por job e fonte, sem expor mensagens de erro.
create view atualizacoes_publicas as
  select job, fonte_id, max(terminado_em) as atualizado_em
  from execucoes_ingestao
  where erro is null and terminado_em is not null
  group by job, fonte_id;

grant select on eventos_publicos, atualizacoes_publicas to anon, authenticated;
