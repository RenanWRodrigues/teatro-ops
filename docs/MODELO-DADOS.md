# Modelo de dados (Supabase / Postgres)

> **A fonte da verdade agora é `supabase/migrations/`.** O SQL abaixo foi a base da `0001_inicial.sql` e fica como referência histórica. Mudanças de esquema entram em migrações novas (`0002_…sql`), nunca editando as já aplicadas.

## O que a 0001 acrescentou ao modelo original

| Onde | O quê | Por quê |
|---|---|---|
| `fontes` | coluna `pais` | fontes de governo por país (ex.: `kremlin` → `RU`) |
| `noticias` | `resumo_automatico`; `fonte_id` obrigatório | rótulo "Resumo automático"; toda notícia tem fonte |
| `conflitos` | `lon`, `lat` (ponto agregado do teatro) e `fontes jsonb` | mapa da home; fonte em todo dado (CLAUDE.md §1.3) |
| `equipamentos` | `classe`, `descricao`, `variantes jsonb`, `fontes jsonb` | campos usados pelo card e pela ficha |
| `equipamentos.specs` | cada campo é `{valor, unidade, …}` ou `{texto, …}`, sempre com `fonte`, `url`, `licenca`, `coletado_em` | ficha com fonte por valor |
| `midias` | `licenca_url`, `coletado_em`; `equipamento_slug` obrigatório | crédito completo da foto |
| todas | RLS ligado; leitura pública só em `fontes`, `noticias`, `decisoes_governo`, `conflitos`, `equipamentos`, `midias`; escrita revogada para `anon`/`authenticated` | escrita só com `service_role` (GitHub Actions) |
| `eventos_publicos` (view) | atraso mínimo de 24 h e coordenadas com 1 casa decimal (~11 km) | CLAUDE.md §1.6: nada de posição em tempo real |
| `atualizacoes_publicas` (view) | última execução sem erro por job/fonte, sem a mensagem de erro | carimbo "Atualizado em …" |

**Privilégios explícitos:** o Supabase atual não concede mais acesso automático às tabelas para `anon`, `authenticated` e `service_role`. A migração faz os `grant` (leitura só nas tabelas publicáveis; tudo para `service_role`) e os `revoke` de escrita, então funciona igual em projetos novos e antigos.

**Testes:**
- `pnpm test` → `supabase/migracoes.test.ts` aplica as migrações num Postgres em memória (PGlite) e verifica esquema, privilégios, RLS e as duas views (`TESTE_PRIVILEGIOS_PADRAO=amplos` simula projetos antigos).
- `pnpm test:db` → com `supabase start` rodando, `lib/db/integracao.test.ts` grava linhas `[TESTE]` com service_role, lê com a chave anon pelas funções reais de `lib/db/consultas.ts` (via PostgREST) e apaga tudo no fim. O script recusa qualquer URL que não seja local.
- Para economizar memória localmente: `supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor` (o Auth precisa ficar, senão o CLI não expõe as chaves).

## Como aplicar no projeto remoto

1. Crie o projeto no Supabase (plano gratuito) e preencha `.env.local` a partir de `.env.example`.
2. `supabase login` e `supabase link --project-ref <ref-do-projeto>` (pede a senha do banco; rode você mesmo no terminal).
3. `pnpm db:migrate` — regenera `supabase/seed.sql` a partir de `config/fontes.yaml` e roda `supabase db push --include-seed`.

O seed é idempotente (`on conflict (id) do update`): rodar de novo só sincroniza a tabela `fontes` com o YAML.

## SQL original (referência)

```sql
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Registro de fontes (espelha config/fontes.yaml)
create table fontes (
  id text primary key,                 -- 'gdelt', 'acled', 'fr-eua', 'rss-kremlin'...
  nome text not null,
  url_base text not null,
  licenca text not null,
  tipo text not null check (tipo in ('api','rss','dataset','scrape')),
  categoria text not null check (categoria in ('estatal','oficial','imprensa','pesquisa','humanitaria','enciclopedia')),
  status text not null default 'a_verificar' check (status in ('ativa','a_verificar','quebrada','desativada')),
  ultima_verificacao timestamptz
);

-- Notícias e análises (de imprensa e GDELT)
create table noticias (
  id bigserial primary key,
  hash text unique not null,           -- sha256(url normalizada)
  fonte_id text references fontes(id),
  url text not null,
  titulo_original text not null,
  idioma_original text,
  titulo_pt text,
  resumo_pt text,                      -- máx. 2 frases, escrito por nós
  imagem_url text,                     -- só se a licença permitir
  paises text[] default '{}',          -- ISO-3166 alfa-2
  temas text[] default '{}',           -- 'drones','ia','guerra-eletronica','naval','aereo','terrestre','nuclear','diplomacia'
  regiao text,
  publicado_em timestamptz not null,
  coletado_em timestamptz default now(),
  busca tsvector generated always as (to_tsvector('portuguese', coalesce(titulo_pt,'') || ' ' || coalesce(resumo_pt,''))) stored
);
create index on noticias using gin (busca);
create index on noticias (publicado_em desc);
create index on noticias using gin (temas);

-- Decisões e comunicados de governos
create table decisoes_governo (
  id bigserial primary key,
  hash text unique not null,
  fonte_id text references fontes(id),
  pais text not null,                  -- 'US','CN','RU','IR','IL','UA','DE'
  orgao text not null,                 -- 'Presidência','Ministério da Defesa','Congresso'...
  tipo text not null check (tipo in ('ordem_executiva','lei','sancao','comunicado','acordo','exercicio_militar','orcamento','outro')),
  titulo_original text not null,
  titulo_pt text,
  resumo_pt text,
  url_oficial text not null,
  publicado_em timestamptz not null,
  coletado_em timestamptz default now()
);
create index on decisoes_governo (pais, publicado_em desc);

-- Conflitos (curadoria editorial) e eventos (ACLED/UCDP)
create table conflitos (
  slug text primary key,
  nome_pt text not null,
  paises text[] not null,
  regiao text not null,
  intensidade text check (intensidade in ('alta','tensao','cessar_fogo','encerrado')),
  inicio date,
  resumo_pt text,
  atualizado_em timestamptz default now()
);

create table eventos (
  id bigserial primary key,
  hash text unique not null,
  fonte_id text references fontes(id),
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
  coletado_em timestamptz default now()
);
create index on eventos (pais, data desc);

-- Equipamentos
create table equipamentos (
  slug text primary key,               -- 'f-35a-lightning-ii'
  nome text not null,
  categoria text not null check (categoria in ('cacas','tanques','embarcacoes','avioes','helicopteros','armamento','drones','defesa-aerea')),
  pais_origem text[] not null,
  fabricante text,
  wikidata_id text unique,
  wikipedia_pt text,                   -- título do artigo em pt.wikipedia
  resumo_pt text,
  em_servico boolean,
  specs jsonb not null default '{}',   -- { "velocidade_max": { "valor": 1.6, "unidade": "mach", "fonte": "...", "url": "..." } }
  operadores text[] default '{}',
  atualizado_em timestamptz default now()
);

create table midias (
  id bigserial primary key,
  equipamento_slug text references equipamentos(slug) on delete cascade,
  url text not null,
  miniatura_url text,
  legenda_pt text,
  autor text,
  licenca text not null,               -- 'Domínio público', 'CC BY-SA 4.0'...
  fonte_url text not null,
  largura int, altura int
);

-- Cache de tradução e log de execuções
create table traducoes_cache (
  hash text primary key,               -- sha256(texto_original + idioma_origem)
  texto_original text not null,
  texto_pt text not null,
  motor text not null,                 -- 'deepl','argos','gemini','manual'
  criado_em timestamptz default now()
);

create table execucoes_ingestao (
  id bigserial primary key,
  job text not null,
  fonte_id text,
  iniciado_em timestamptz default now(),
  terminado_em timestamptz,
  itens_novos int default 0,
  itens_ignorados int default 0,
  caracteres_traduzidos int default 0,
  erro text
);

-- RLS: leitura pública, escrita só com service_role (usada no GitHub Actions)
alter table noticias enable row level security;
create policy leitura_publica on noticias for select using (true);
-- repita para todas as tabelas de conteúdo
```
