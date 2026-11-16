-- Fase 5: números que justificam a intensidade de cada conflito, nome do local dos eventos
-- e coordenada agregada das notícias (camada de cobertura de mídia).

-- Números do período usado para classificar a intensidade (UCDP: último trimestre com dados).
alter table conflitos
  add column periodo_inicio date,
  add column periodo_fim date,
  add column eventos_periodo int,
  add column mortes_estimadas int,
  add column mortes_min int,
  add column mortes_max int;

-- Nome do local em nível de província/estado (nunca coordenada precisa na tela).
alter table eventos
  add column local text,
  add column mortes_min int,
  add column mortes_max int;

-- Coordenada do principal local citado na notícia, já arredondada (1 casa ≈ 11 km).
alter table noticias
  add column lat double precision check (lat between -90 and 90),
  add column lon double precision check (lon between -180 and 180);

create index noticias_publicado_coord_idx on noticias (publicado_em desc) where lat is not null;

-- A view pública de eventos passa a expor local e intervalo de mortes (mesmas regras: 24 h e ~11 km).
create or replace view eventos_publicos as
  select
    id, fonte_id, conflito_slug, data, pais,
    round(lat::numeric, 1)::double precision as lat,
    round(lon::numeric, 1)::double precision as lon,
    tipo_evento, atores, mortes_estimadas, notas_pt, coletado_em,
    local, mortes_min, mortes_max
  from eventos
  where data <= (now() at time zone 'utc')::date - 1;

grant select on eventos_publicos to anon, authenticated;

-- ───────────── Agregados públicos para o mapa e os gráficos ─────────────
-- Mesmas regras de eventos_publicos (atraso mínimo de 24 h), agregados em grade de 1° (~110 km).

-- Eventos dos últimos 3 meses com dados, por célula e conflito.
create view eventos_agregados as
  with base as (
    select * from eventos where data <= (now() at time zone 'utc')::date - 1
  ), fim as (
    select max(data) as d from base
  )
  select
    conflito_slug,
    round(lat)::int as lat,
    round(lon)::int as lon,
    count(*)::int as eventos,
    coalesce(sum(mortes_estimadas), 0)::int as mortes_estimadas,
    min(data) as de,
    max(data) as ate
  from base, fim
  where data > fim.d - interval '3 months'
  group by conflito_slug, round(lat)::int, round(lon)::int;

-- Série semanal por conflito (segunda-feira como início da semana).
create view eventos_semanais as
  select
    conflito_slug,
    date_trunc('week', data)::date as semana,
    count(*)::int as eventos,
    coalesce(sum(mortes_estimadas), 0)::int as mortes_estimadas
  from eventos
  where conflito_slug is not null and data <= (now() at time zone 'utc')::date - 1
  group by conflito_slug, date_trunc('week', data);

-- Cobertura de mídia: notícias dos últimos 7 dias por célula de 1°.
create view cobertura_midia as
  select
    round(lat)::int as lat,
    round(lon)::int as lon,
    count(*)::int as noticias,
    max(publicado_em) as ultima
  from noticias
  where lat is not null and publicado_em >= now() - interval '7 days'
  group by round(lat)::int, round(lon)::int;

grant select on eventos_agregados, eventos_semanais, cobertura_midia to anon, authenticated;
