-- Fase 6: monitor de governos. Temas (grupos do filtro de relevância) e idioma original de cada decisão,
-- para filtrar por tema e marcar o título no idioma original enquanto a tradução estiver pendente.

alter table decisoes_governo
  add column temas text[] not null default '{}',
  add column idioma_original text;

create index decisoes_tipo_idx on decisoes_governo (tipo, publicado_em desc);
create index decisoes_publicado_idx on decisoes_governo (publicado_em desc);
create index decisoes_titulo_pendente_idx on decisoes_governo (publicado_em desc) where titulo_pt is null;
