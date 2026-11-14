# Catálogo de fontes de dados — TEATRO//OPS

Todas gratuitas. Situação verificada em **novembro de 2026**. Limites e regras mudam: rode `/verificar-fontes` antes de cada fase e atualize esta tabela.

Legenda de autenticação: **nenhuma** · **chave** (cadastro grátis) · **conta** (cadastro + aprovação).

## 1. Conflitos e eventos

| Fonte | O que entrega | Auth | Limites / regras | Licença / uso | Uso no site |
|---|---|---|---|---|---|
| **GDELT DOC 2.0 API** — `https://api.gdeltproject.org/api/v2/doc/doc` | Busca em notícias do mundo todo (65 idiomas, janela móvel de ~3 meses), listas de artigos, linha do tempo de volume e tom | nenhuma | ~1 requisição a cada 5 s | Livre para qualquer uso, com citação e link para o GDELT | Feed de manchetes por região/tema, tendências, ticker "ao vivo" |
| **GDELT GEO 2.0 API** | Pontos geográficos de cobertura jornalística | nenhuma | idem | idem | Camada "cobertura de mídia" no mapa |
| **ACLED API** — `https://acleddata.com/api/` | Eventos de violência política e protestos geolocalizados (6 tipos) | conta (myACLED, OAuth com token Bearer) | Conta com e-mail genérico (gmail) recebe o nível **Open**, com dados mais limitados/defasados; o acesso à API pode exigir ativação manual | Termos de uso + EULA + política de atribuição. **Leia o EULA antes de redistribuir** | Mapa de eventos, contagens por país/semana |
| **UCDP** (Uppsala) — `https://ucdpapi.pcr.uu.se/` | Eventos georreferenciados (GED), conflitos, mortes estimadas, histórico desde 1989 | verificar (pode exigir token solicitado por e-mail) | Ver documentação atual | CC BY 4.0 | Arquivo histórico, séries longas, fichas de conflito |
| **ReliefWeb API v2** (ONU/OCHA) — `https://api.reliefweb.int/v2/` | Relatórios humanitários, crises, por país | **appname pré-aprovado** em toda requisição (obrigatório desde 1º/11/2025) | Use só a v2 | Conteúdo pertence às fontes originais — título + link + resumo próprio | Impacto humanitário em cada página de conflito |
| **NASA FIRMS** | Focos de calor/incêndio por satélite | chave (MAP_KEY grátis) | Limite de transações por chave | Domínio público (NASA) | Camada opcional do mapa (com ressalva: foco de calor ≠ ataque confirmado) |

## 2. Decisões de governos

Prioridade: fonte oficial do governo → agência estatal (marcada como tal) → GDELT filtrado por domínio.

| País | Fonte oficial | Formato | Auth |
|---|---|---|---|
| EUA | **Federal Register API** — `https://www.federalregister.gov/api/v1/documents.json` (ordens executivas, regras, avisos; desde 1994) | JSON | nenhuma |
| EUA | **Congress.gov API** (projetos de lei, ex.: NDAA) | JSON | chave grátis (api.data.gov) |
| EUA | Departamento de Defesa / Departamento de Estado — feeds RSS de notas oficiais | RSS | nenhuma |
| Rússia | Presidência (en.kremlin.ru — conteúdo em CC BY 4.0) e Governo (`http://government.ru/en/all/rss/`) | RSS | nenhuma |
| China | Ministério das Relações Exteriores (fmprc.gov.cn/eng), Ministério da Defesa (eng.mod.gov.cn), Xinhua (agência estatal) | RSS/HTML | nenhuma |
| Irã | Presidência (president.ir/en), IRNA (agência estatal, en.irna.ir) | RSS/HTML | nenhuma |
| Israel | Gabinete do Primeiro-Ministro (gov.il), IDF (idf.il) | RSS/HTML | nenhuma |
| Ucrânia | Presidência (president.gov.ua/en), Ministério da Defesa (mod.gov.ua/en) | RSS/HTML | nenhuma |
| Alemanha | Governo Federal (bundesregierung.de, há versão em inglês), Ministério da Defesa (bmvg.de) | RSS | nenhuma |

> As URLs exatas de RSS ficam em `config/fontes.yaml` com `status: a_verificar` até um teste real confirmar. Sites sem RSS: use o GDELT com `domain:<site>` antes de pensar em raspagem; raspagem só com robots.txt permitindo e taxa baixa.

## 3. Arsenal, drones e IA

| Fonte | O que entrega | Auth | Licença | Uso |
|---|---|---|---|---|
| **Wikidata** (SPARQL `https://query.wikidata.org/sparql`) | Dados estruturados de equipamentos: fabricante, país, primeiro voo, operadores, dimensões | nenhuma (envie User-Agent identificável) | CC0 | Base das fichas técnicas |
| **Wikipedia em português** — REST `https://pt.wikipedia.org/api/rest_v1/page/summary/{título}` | Resumo já em pt-BR | nenhuma | CC BY-SA 4.0 (atribuição + link) | Texto introdutório da ficha (citado como Wikipedia) |
| **Wikimedia Commons API** | Fotos com licença livre | nenhuma | Varia por arquivo (exibir autor + licença) | Galerias |
| **DVIDS API** — `https://api.dvidshub.net/` | Fotos e vídeos oficiais do Departamento de Defesa dos EUA | chave pública grátis (presa ao domínio) | Em geral domínio público; conferir o campo de copyright de cada item; crédito solicitado | Fotos de equipamentos dos EUA/OTAN |
| **SIPRI Arms Transfers Database** | Transferências internacionais de armas | download (sem API) | Uso com citação | Página "comércio de armas" (importar CSV manualmente, 1×/ano) |
| **Feeds RSS de imprensa especializada em defesa** | Manchetes sobre drones, IA, guerra eletrônica | nenhuma | Conteúdo protegido: **só título + link + resumo próprio** | Seção IA & Drones |
| **GDELT** com temas/termos (`drone`, `UAV`, `loitering munition`, `artificial intelligence military`, `electronic warfare`) | Notícias globais sobre guerra tecnológica | nenhuma | idem GDELT | Feed da seção IA & Drones |

## 4. Tradução e resumo para pt-BR

| Serviço | Gratuito | Uso | Observação |
|---|---|---|---|
| **DeepL API Free** (`https://api-free.deepl.com`) | 500 mil caracteres/mês; chave termina em `:fx` | Títulos e resumos (`target_lang=PT-BR`), com glossário militar | Ao bater o limite, as chamadas são recusadas até o mês seguinte → cair no fallback |
| **LibreTranslate / Argos Translate** auto-hospedado | 100% grátis (código aberto) | Fallback e volume alto | Roda dentro do GitHub Actions (Argos, offline) |
| **Gemini Flash (plano gratuito)** | Sim, com limites baixos e que mudam com frequência | Opcional: resumo de 2 frases em pt-BR a partir de título + descrição | Requisições do plano grátis podem ser usadas pelo Google para melhorar produtos; só envie texto público |
| **Wikipedia PT** | — | Conteúdo já em português | Prefira sempre que existir |

Orçamento de tradução: ~6.000 títulos/mês cabem no DeepL Free (≈80 caracteres cada). Cache por hash do texto é obrigatório (`traducoes_cache`).

## 5. Infraestrutura gratuita

| Serviço | Uso | Atenção |
|---|---|---|
| GitHub (repositório + Actions) | Código e ingestão agendada | Repositórios públicos têm minutos ilimitados; privados têm cota mensal grátis |
| Supabase (plano gratuito) | Postgres + API | Projetos grátis pausam após inatividade — a ingestão agendada mantém ativo. Confira o limite de armazenamento atual |
| Vercel Hobby | Hospedagem do Next.js | Uso não comercial |
| Cloudflare Pages | Alternativa de hospedagem | Permite uso comercial; Next.js via adaptador OpenNext |
| OpenFreeMap | Tiles de mapa | Sem chave |

O estilo usado é `https://tiles.openfreemap.org/styles/dark` (verificado em 14/11/2026: HTTP 200). A atribuição OpenFreeMap/OpenMapTiles/OpenStreetMap vem no próprio estilo e aparece no canto do mapa.

## 6. Bibliotecas e recursos de front-end (todos gratuitos, sem chave)

| Pacote / recurso | Uso | Licença |
|---|---|---|
| `maplibre-gl` | Renderização do mapa de conflitos (só no cliente, sob demanda) | BSD-3-Clause |
| Google Fonts via `next/font` (Barlow Condensed, JetBrains Mono, Inter) | Tipografia; baixadas no build e servidas pelo próprio site, sem chamada ao Google no navegador | SIL Open Font License 1.1 |
| `@axe-core/playwright` | Testes automáticos de acessibilidade (só desenvolvimento) | MPL-2.0 |
| `@supabase/supabase-js` | Leitura do banco (chave anon) e escrita na ingestão (service_role) | MIT |
| `zod` | Validação de toda fronteira com dado externo (YAML de fontes, linhas do banco) | MIT |
| `yaml` | Leitura de `config/fontes.yaml` para gerar o seed | ISC |
| `@electric-sql/pglite` | Postgres em memória para testar migrações e RLS (só desenvolvimento) | Apache-2.0 |
| Supabase CLI | `pnpm db:migrate` (`supabase db push`) | MIT; gratuito |
