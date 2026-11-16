-- Fase 10, item 1: busca global em português (dicionário portuguese + unaccent) em notícias,
-- decisões de governo, conflitos e equipamentos, para a página /busca.
--
-- 1) Configuração de texto "pt_busca": a "portuguese" com remoção de acentos antes do radical,
--    para "míssil", "missil" e "mísseis" casarem. O esquema do dicionário unaccent varia
--    (public localmente, extensions no Supabase), então ele é descoberto em tempo de execução.
do $$
declare
  esquema text;
begin
  select n.nspname into esquema
    from pg_ts_dict d join pg_namespace n on n.oid = d.dictnamespace
   where d.dictname = 'unaccent'
   limit 1;
  if esquema is null then
    raise exception 'dicionário unaccent não encontrado (extensão unaccent ausente)';
  end if;
  if not exists (select 1 from pg_ts_config where cfgname = 'pt_busca') then
    execute 'create text search configuration public.pt_busca (copy = pg_catalog.portuguese)';
    execute format(
      'alter text search configuration public.pt_busca alter mapping for hword, hword_part, word with %I.unaccent, portuguese_stem',
      esquema
    );
  end if;
end $$;

-- 2) Índices nas tabelas que crescem (a expressão precisa ser idêntica à da função abaixo).
--    Conflitos e equipamentos são poucas dezenas de linhas: varredura simples basta.
create index if not exists noticias_busca_pt_idx on noticias using gin (
  to_tsvector('public.pt_busca'::regconfig, coalesce(titulo_pt, '') || ' ' || titulo_original || ' ' || coalesce(resumo_pt, ''))
);
create index if not exists decisoes_busca_pt_idx on decisoes_governo using gin (
  to_tsvector('public.pt_busca'::regconfig, coalesce(titulo_pt, '') || ' ' || titulo_original || ' ' || orgao)
);

-- 3) Busca: até `limite` resultados por tipo, do mais relevante ao mais recente.
--    security invoker: respeita o RLS de quem chama (o anon só lê o que já é público).
create or replace function public.buscar(termo text, limite int default 10)
returns table (
  tipo text,         -- 'noticia' | 'decisao' | 'conflito' | 'equipamento'
  chave text,        -- url (notícia/decisão) ou slug
  titulo text,
  resumo text,
  url text,          -- link externo (notícia/decisão) ou null
  data timestamptz,
  extra text,        -- fonte (notícia), país (decisão), região (conflito), categoria (equipamento)
  relevancia real,
  pendente boolean,  -- título ainda sem tradução (exibido no idioma original)
  idioma text        -- idioma original do título (ISO 639-1), para o atributo lang
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  with q as (
    select websearch_to_tsquery('public.pt_busca'::regconfig, left(coalesce(termo, ''), 200)) as consulta,
           least(greatest(coalesce(limite, 10), 1), 50) as lim
  ),
  noticias_r as (
    select 'noticia'::text, n.url, coalesce(n.titulo_pt, n.titulo_original), n.resumo_pt, n.url, n.publicado_em, f.nome,
           ts_rank(to_tsvector('public.pt_busca'::regconfig, coalesce(n.titulo_pt, '') || ' ' || n.titulo_original || ' ' || coalesce(n.resumo_pt, '')), q.consulta),
           n.titulo_pt is null, n.idioma_original
      from noticias n join fontes f on f.id = n.fonte_id, q
     where to_tsvector('public.pt_busca'::regconfig, coalesce(n.titulo_pt, '') || ' ' || n.titulo_original || ' ' || coalesce(n.resumo_pt, '')) @@ q.consulta
     order by 8 desc, 6 desc
     limit (select lim from q)
  ),
  decisoes_r as (
    select 'decisao'::text, d.url_oficial, coalesce(d.titulo_pt, d.titulo_original), d.orgao, d.url_oficial, d.publicado_em, d.pais,
           ts_rank(to_tsvector('public.pt_busca'::regconfig, coalesce(d.titulo_pt, '') || ' ' || d.titulo_original || ' ' || d.orgao), q.consulta),
           d.titulo_pt is null, d.idioma_original
      from decisoes_governo d, q
     where to_tsvector('public.pt_busca'::regconfig, coalesce(d.titulo_pt, '') || ' ' || d.titulo_original || ' ' || d.orgao) @@ q.consulta
     order by 8 desc, 6 desc
     limit (select lim from q)
  ),
  conflitos_r as (
    select 'conflito'::text, c.slug, c.nome_pt, c.resumo_pt, null::text, c.atualizado_em, c.regiao,
           ts_rank(to_tsvector('public.pt_busca'::regconfig, c.nome_pt || ' ' || c.regiao || ' ' || coalesce(c.resumo_pt, '')), q.consulta),
           false, null::text
      from conflitos c, q
     where to_tsvector('public.pt_busca'::regconfig, c.nome_pt || ' ' || c.regiao || ' ' || coalesce(c.resumo_pt, '')) @@ q.consulta
     order by 8 desc
     limit (select lim from q)
  ),
  equipamentos_r as (
    select 'equipamento'::text, e.slug, e.nome, e.descricao, null::text, e.atualizado_em, e.categoria,
           ts_rank(to_tsvector('public.pt_busca'::regconfig, e.nome || ' ' || coalesce(e.classe, '') || ' ' || coalesce(e.descricao, '') || ' ' || coalesce(e.fabricante, '') || ' ' || coalesce(e.resumo_pt, '')), q.consulta),
           false, null::text
      from equipamentos e, q
     where to_tsvector('public.pt_busca'::regconfig, e.nome || ' ' || coalesce(e.classe, '') || ' ' || coalesce(e.descricao, '') || ' ' || coalesce(e.fabricante, '') || ' ' || coalesce(e.resumo_pt, '')) @@ q.consulta
     order by 8 desc
     limit (select lim from q)
  )
  select * from equipamentos_r
  union all select * from conflitos_r
  union all select * from decisoes_r
  union all select * from noticias_r;
$$;

revoke all on function public.buscar(text, int) from public;
grant execute on function public.buscar(text, int) to anon, authenticated, service_role;
