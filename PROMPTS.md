# Roteiro de prompts para o Claude Code — TEATRO//OPS

Como usar: abra o terminal na pasta do projeto, rode `claude` e cole **um prompt por vez**, na ordem. Só passe para a fase seguinte quando a anterior estiver funcionando e commitada. Cada prompt já manda o Claude Code ler as Skills certas.

Dica: comece cada sessão nova com `/clear` e o prompt da fase. O `CLAUDE.md` é carregado sozinho.

---

## Fase 0 — Cadastros (você faz, uma vez só)

Todos gratuitos. Guarde as chaves para colocar no `.env.local` e depois nos *secrets* do GitHub.

1. **GitHub**: crie o repositório (público = minutos de Actions ilimitados).
2. **Supabase**: crie um projeto no plano gratuito; copie URL, `anon key` e `service_role key`.
3. **ACLED**: crie sua conta myACLED. Com e-mail pessoal você recebe o nível Open; se a API não responder, peça a ativação ao suporte da ACLED.
4. **ReliefWeb**: solicite um *appname* (obrigatório desde 1º/11/2025).
5. **DeepL API Free**: crie a conta e copie a chave (termina em `:fx`).
6. **Congress.gov / api.data.gov**: gere a chave gratuita.
7. **DVIDS**: crie a conta e gere a chave pública (fica presa ao seu domínio).
8. *(Opcional)* **UCDP** (veja se exige token), **NASA FIRMS** (MAP_KEY) e **Google AI Studio** (chave do Gemini).
9. **Vercel** (Hobby) ou **Cloudflare Pages**: conecte o repositório na Fase 11.

---

## Fase 1 — Esqueleto do projeto

```
Leia o CLAUDE.md, docs/ARQUITETURA.md e docs/APIS.md.

Crie o esqueleto do projeto TEATRO//OPS na pasta atual, sem apagar os arquivos que já existem (.claude/, docs/, config/, .github/, CLAUDE.md, PROMPTS.md, .env.example):
- Next.js com App Router, TypeScript estrito, Tailwind CSS, ESLint, pnpm, src NÃO (use app/, components/, lib/ na raiz).
- Vitest e Playwright configurados, com um teste de exemplo cada.
- tsx para os scripts de ingestão.
- Scripts no package.json: dev, build, lint, typecheck, test, test:e2e, ingest:all, db:migrate, fontes:verificar.
- lib/format/ com funções formatarData, formatarDataHora (America/Sao_Paulo), formatarNumero e formatarUnidade, todas em pt-BR, com testes.
- <html lang="pt-BR"> e metadados padrão em português.
- .gitignore cobrindo .env.local.

Não crie páginas ainda além de uma home provisória. Rode lint, typecheck e test e me mostre a árvore final.
```

## Fase 2 — Design system e páginas estáticas

```
Leia .claude/skills/design-system-teatro-ops/SKILL.md e as 4 telas de referência em docs/design/referencia/ (Main, Arsenal, Ficha, Tech).

1. Configure os tokens de cor, as fontes (Barlow Condensed, JetBrains Mono e Inter via next/font) e os utilitários de fundo (malha tática, placeholder listrado) no Tailwind.
2. Crie os componentes listados na skill, um por arquivo em components/, com tipagem das props.
3. Monte as rotas /, /arsenal, /arsenal/cacas/f-35a-lightning-ii e /tecnologia reproduzindo fielmente as referências, alimentadas por fixtures locais em lib/fixtures/ marcadas como [EXEMPLO] (sem banco ainda).
4. As abas de /tecnologia e os filtros de /arsenal precisam funcionar (client components mínimos).
5. Respeite prefers-reduced-motion e deixe tudo funcionando em 375 px.

No final, rode /revisar-pagina para cada uma das 4 rotas e corrija os bloqueantes.
```

## Fase 3 — Banco de dados

```
Leia docs/MODELO-DADOS.md.

1. Crie supabase/migrations/0001_inicial.sql a partir do modelo, completando as políticas RLS de leitura pública em todas as tabelas de conteúdo.
2. Crie lib/db/ com o cliente Supabase (anon no navegador e no servidor; service_role só nos scripts de ingestão) e funções de consulta tipadas para cada tabela.
3. Crie supabase/seed.sql inserindo as fontes de config/fontes.yaml na tabela fontes (gere o seed a partir do YAML com um script).
4. Configure pnpm db:migrate. Peça minha confirmação antes de aplicar no projeto remoto.
5. Troque as fixtures da Fase 2 por consultas ao banco, mantendo as fixtures como fallback quando o banco estiver vazio.
```

## Fase 4 — Núcleo de ingestão, GDELT e tradução

```
Leia .claude/skills/integrar-fonte-dados/SKILL.md e .claude/skills/traducao-ptbr/SKILL.md.

1. Implemente lib/fontes/_base/ (tipos, fetchComRetry, rateLimiter lendo config/fontes.yaml, normalizarUrl, hash, registrarExecucao).
2. Implemente scripts/ingestao/run.ts --job <nome>, que roda todos os adaptadores ativos daquele job.
3. Implemente lib/traducao/ com a cadeia cache → glossário → DeepL Free (checando /v2/usage) → LibreTranslate → pendente. Carregue config/glossario-militar.csv e crie o glossário no DeepL.
4. Integre o GDELT DOC (fonte gdelt-doc) usando as consultas do YAML, com classificação de temas e região, gravando em noticias com título e resumo em pt-BR.
5. Ligue o ticker "AO VIVO" e a seção de conflitos da home aos dados reais.
6. Rode pnpm ingest:gdelt-doc localmente e me mostre 10 manchetes traduzidas e quantos caracteres do DeepL foram gastos.
```

## Fase 5 — Conflitos e mapa

```
Use /nova-fonte para integrar, uma de cada vez: acled, ucdp, reliefweb (e nasa-firms se eu tiver a chave).

Depois:
1. Crie a curadoria inicial da tabela conflitos (o seed só pode ter conflitos ativos que você confirmar nas fontes, com intensidade justificada pelos dados; me mostre a lista para aprovação antes de gravar).
2. Construa /conflitos com MapaConflitos (MapLibre + OpenFreeMap, carregado só no cliente): camadas de eventos (atraso mínimo de 24 h e agregação geográfica, como manda a skill conteudo-editorial-seguro), cobertura de mídia (GDELT GEO) e impacto humanitário (ReliefWeb). Inclua legenda, atribuição do mapa e uma alternativa em tabela.
3. Construa /conflitos/[slug] com: resumo, linha do tempo de eventos, gráfico semanal de eventos, notícias recentes, decisões de governos relacionadas e relatórios humanitários, tudo com fonte e carimbo de atualização.
4. Atualize os números do painel de radar da home com contagens reais e fonte.
```

## Fase 6 — Monitor de governos

```
Leia .claude/skills/monitor-governos/SKILL.md.

1. Integre fr-eua (Federal Register) e congress-eua com /nova-fonte.
2. Para cada fonte do grupo governos em config/fontes.yaml com feed: null, abra a "pagina", descubra o feed RSS oficial (link rel="alternate", /rss, /feed) e me mostre uma tabela país · órgão · feed encontrado · funciona?. Para os sites sem RSS, proponha GDELT com domain: e espere minha aprovação.
3. Implemente o adaptador RSS genérico, o filtro de relevância (lib/governos/termos.ts) e a classificação de tipo.
4. Construa /governos (visão geral com os 7 países: EUA, China, Rússia, Irã, Israel, Ucrânia, Alemanha) e /governos/[pais] (linha do tempo, filtros e comparação entre dois países), com selo "Mídia estatal" e link para o documento oficial em cada item.
5. Chame revisor-ptbr para conferir a neutralidade de todos os textos gerados.
```

## Fase 7 — Arsenal, fichas técnicas e comparador

```
Leia .claude/skills/ficha-equipamento/SKILL.md.

1. Integre wikidata, wikipedia-pt, commons e dvids com /nova-fonte.
2. Rode /novo-equipamento para cada item da "Lista inicial" da skill (comece pelo F-35A e me mostre a ficha antes de seguir com os demais).
3. Construa /arsenal (filtros por categoria, país e status; busca em português; paginação), /arsenal/[categoria] e /arsenal/[categoria]/[slug] seguindo a referência Ficha.dc.html: dados-chave, planta esquemática genérica, variantes, galeria com crédito, ficha <dl> com fonte por campo, operadores, notícias relacionadas.
4. Construa /arsenal/comparar?a=&b= com barras proporcionais, comparando só campos com fonte nos dois.
5. Crie a página /arsenal/comercio com os dados do SIPRI (importação manual de CSV; me diga como baixar).
```

## Fase 8 — Guerra tecnológica: IA e drones

```
Leia .claude/skills/conteudo-editorial-seguro/SKILL.md e a referência Tech.dc.html.

1. Em /tecnologia, alimente o feed de cada aba (Drones FPV, Enxames, IA na identificação, Guerra eletrônica, Defesa antidrone) com notícias reais do GDELT e da imprensa especializada, filtradas por tema.
2. Escreva em MDX (content/tecnologia/) um texto explicativo para cada tópico: conceito, contexto histórico, debate ético e regulatório — no nível conceitual, sem nenhum detalhe operacional, com fontes verificáveis no rodapé. Mostre os rascunhos para eu aprovar.
3. Linha do tempo dos drones com marcos verificados e fonte para cada um.
4. Seção "Humano no circuito?" com o andamento real das discussões na ONU sobre sistemas de armas autônomas letais (pesquise o estado atual e cite).
5. Indicadores: volume semanal de notícias por tema (GDELT TimelineVol) em gráfico, com fonte.
```

## Fase 9 — Táticas, arquivo histórico e transparência

```
1. Crie /taticas e /taticas/[slug] em MDX com diagramas SVG animados (respeitando reduced-motion) para: movimento de pinça, guerra de manobra, defesa em profundidade, armas combinadas, guerra assimétrica, guerra naval de negação de área. Nível doutrinário e histórico, com casos reais e fontes. Mostre um texto para aprovação antes de fazer os outros.
2. Crie /arquivo com a linha do tempo histórica (1914 → hoje), usando o UCDP para as séries de longo prazo.
3. Crie /fontes (lista gerada a partir de config/fontes.yaml, com licença e status) e /metodologia (conforme a skill conteudo-editorial-seguro).
4. Rode revisor-ptbr e revisor-fontes em tudo.
```

## Fase 10 — Busca, SEO, desempenho e acessibilidade

```
1. Busca global em português (Postgres FTS com dicionário portuguese + unaccent) cobrindo notícias, decisões, conflitos e equipamentos, com página /busca.
2. SEO: metadados e Open Graph em pt-BR por página, sitemap.xml, robots.txt, dados estruturados (NewsArticle, Dataset) onde fizer sentido.
3. Desempenho: ISR com os tempos de docs/ARQUITETURA.md, imagens com next/image, MapLibre e gráficos sob demanda. Meta: LCP < 2,5 s em 4G.
4. Rode revisor-acessibilidade em todas as rotas e corrija os bloqueantes.
5. Página de erro e estados vazios em pt-BR ("Fonte temporariamente indisponível — exibindo dados de dd/mm às hh:mm").
```

## Fase 11 — Publicação e monitoramento

```
1. Prepare o deploy na Vercel Hobby (ou Cloudflare Pages via OpenNext, se eu disser que o site terá fins comerciais). Liste as variáveis de ambiente que devo criar no painel; nenhuma chave de servidor pode ter prefixo NEXT_PUBLIC_.
2. Liste os secrets que devo criar no GitHub para o workflow .github/workflows/ingestao.yml e rode o workflow manualmente (workflow_dispatch) para cada job.
3. Crie o job manutencao: verificação diária das fontes, limpeza de dados antigos e alerta (issue automática no GitHub) quando uma fonte quebrar ou quando a cota do DeepL passar de 70%.
4. Rode /auditar-custos e /verificar-fontes e me entregue o relatório final.
```

---

## Prompts de manutenção (use sempre que precisar)

- `/verificar-fontes` — semanal.
- `/auditar-custos` — mensal.
- `/nova-fonte <nome> <para quê>` — adicionar uma fonte.
- `/novo-equipamento <nome>` — adicionar ao arsenal.
- `/revisar-pagina <rota>` — antes de publicar qualquer mudança visual.
- "Adicione o país <X> ao monitor de governos seguindo a skill monitor-governos."
- "A fonte <X> quebrou. Investigue, corrija o adaptador, atualize a fixture e os testes."
