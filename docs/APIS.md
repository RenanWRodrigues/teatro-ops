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

- **Raiz XML obrigatória (16/11/2026)**: com `tag_handling=xml`, um texto que começa com termo travado (`<keep>OTAN</keep>'s Black Sea…`) tinha o `<keep>` lido como raiz do documento, e o DeepL devolvia só "OTAN". Todo texto vai agora dentro de `<t>…</t>` (`envolverParaDeepL` em `lib/traducao/deepl.ts`). Proteção extra: tradução com menos de 40% do tamanho do original (originais ≥ 30 caracteres) fica pendente e não entra no cache. Conferido no banco: nenhum título truncado tinha sido gravado.
- **Modo seco** (`--seco`): lê o cache, mas não chama o DeepL nem grava no cache; a amostra mostra "(tradução pendente)" para o que não estiver em cache. `--seco --traduzir` chama o DeepL mesmo assim (gasta cota).

## 5. Infraestrutura gratuita

| Serviço | Uso | Atenção |
|---|---|---|
| GitHub (repositório + Actions) | Código e ingestão agendada | Repositórios públicos têm minutos ilimitados; privados têm cota mensal grátis |
| Supabase (plano gratuito) | Postgres + API | Projetos grátis pausam após inatividade — a ingestão agendada mantém ativo. Confira o limite de armazenamento atual |
| Supabase Storage (plano gratuito) | Bucket público `fotos`: cópia de 960 px de cada foto do Commons (`lib/imagens/espelho.ts`), servida ao navegador | 1 GB de arquivos e cota mensal de tráfego no plano grátis; 80 fotos ≈ 10–20 MB. Sem redimensionamento (é recurso pago), por isso um tamanho só. O Wikimedia limita por IP as miniaturas fora do cache (HTTP 429), então o site não as carrega direto de lá |
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
| `fast-xml-parser` | Leitura dos feeds RSS/Atom dos governos (só na ingestão) | MIT |
| `@electric-sql/pglite` | Postgres em memória para testar migrações e RLS (só desenvolvimento) | Apache-2.0 |
| Supabase CLI | `pnpm db:migrate` (`supabase db push`) | MIT; gratuito |

## 7. GDELT: API DOC × arquivos GKG (14/11/2026)

- **API DOC 2.0** (`gdelt-doc`): respondeu HTTP 429 ("limit requests to one every 5 seconds") de forma contínua, tanto da rede local quanto do GitHub Actions, mesmo após 10+ min sem chamadas. Status `quebrada`; o adaptador fica pronto para quando voltar.
- **Arquivos GKG 2.0** (`gdelt-gkg`): `https://data.gdeltproject.org/gdeltv2/lastupdate.txt` aponta o arquivo mais recente; um arquivo por 15 min (~3 MB compactado, ~800 notícias, todas com `<PAGE_TITLE>`). Sem chave e sem limite de requisições; usamos 1 req/s por educação. Mesma licença do GDELT (uso livre com citação).
- **Filtro de relevância** (em `config/fontes.yaml`, ajustável sem código): termo das `consultas` no título **e** ao menos um dos `temas_gdelt` marcados pelo GDELT, menos as `excluir`. Medido em 2 h de dados: 39 → 14 notícias, removendo esportes ("offensive line"), entretenimento ("war movie"), economia ("trade war") e história ("Civil War").
- O fluxo principal do GKG é de veículos em inglês; o fluxo traduzido (`*.translation.gkg.csv.zip`) pode ser somado depois.
- **Cron atrasado (16/11/2026)**: o agendamento gratuito do GitHub Actions rodou a cada 4–8 h em vez de 30 min, e a janela fixa de 2 h (teto de 12 arquivos) perdia o intervalo. Agora os jobs `noticias` e `governos` coletam desde o início da última execução sem erro da fonte, menos 30 min de sobreposição, com teto de 24 h (96 arquivos GKG); ver `lib/ingestao/janela.ts`. Cada arquivo é filtrado ao ser lido, para não acumular linhas brutas. Teste em modo seco: janela de 8,5 h, 110 notícias novas, 48 s.

## 8. Fase 5: fontes de conflitos (15/11/2026)

- **UCDP Candidate GED** (`ucdp-candidato`, **ativa**): a API (`ucdpapi.pcr.uu.se`) responde HTTP 401 sem token; os arquivos CSV mensais da página de downloads (`https://ucdp.uu.se/downloads/`) não exigem chave. Arquivo atual: `GEDEvent_v26_01_26_09.csv` (16.633 eventos, jul–set/2026). Licença CC BY 4.0. Dados **preliminares**: o UCDP revisa todo mês, por isso os eventos são atualizados (`upsert` por `hash`) em vez de ignorados. Job `eventos` (diário). A intensidade de cada conflito de `config/conflitos.yaml` é recalculada a cada coleta (alta ≥ 250 mortes estimadas no trimestre; tensão 25–249).
- **UCDP API** (`ucdp`): só com `UCDP_ACCESS_TOKEN` (pedido por e-mail ao UCDP). Fica `a_verificar`; o CSV cobre a necessidade atual.
- **GDELT GEO 2.0** (`gdelt-geo`, **quebrada**): `/api/v2/geo/geo` responde HTTP 404. A camada "cobertura de mídia" do mapa usa a coordenada do principal local citado nas notícias do `gdelt-gkg` (arredondada a 1 casa, agregada em células de 1° na view `cobertura_midia`).
- **ReliefWeb** (`reliefweb`): responde HTTP 400 "Missing appname parameter" sem appname aprovado. Pedido em <https://apidoc.reliefweb.int/parameters#appname>; depois, preencher `RELIEFWEB_APPNAME` e rodar `/nova-fonte reliefweb`.
- **ACLED** (`acled`): exige conta myACLED (`ACLED_EMAIL`/`ACLED_PASSWORD`). Sem credenciais em 15/11/2026.
- **NASA FIRMS** (`nasa-firms`, opcional): sem `NASA_FIRMS_MAP_KEY`; não integrada.

## 9. Fase 6: canais oficiais de governos (15/11/2026)

Descoberta feita com uma visita a cada página (link `rel="alternate"`, `/rss`, `/feed`) e checagem do `robots.txt`. Todos os feeds ativos guardam só título, link, data e descrição truncada a 300 caracteres (só para o filtro; nunca exibida nem gravada).

| País | Órgão | Feed / acesso | Funciona? |
|---|---|---|---|
| EUA | Federal Register (`fr-eua`) | API JSON sem chave; consultas `type=PRESDOCU` e órgãos `defense-department`, `state-department`, `foreign-assets-control-office` | **ativa** — domínio público |
| EUA | Congress.gov (`congress-eua`) | API com chave grátis do api.data.gov | aguardando `CONGRESS_GOV_API_KEY` (vazia) |
| EUA | Departamento de Defesa (`defesa-eua`) | `https://www.war.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=9&Site=945&max=50` (o site passou a ser war.gov) | **ativa** |
| EUA | Departamento de Estado (`estado-eua`) | HTTP 403 para robôs (página e feeds) | quebrada — atos do Estado chegam pelo Federal Register |
| Rússia | Kremlin (`kremlin`) | `http://en.kremlin.ru/events/president/news/feed` (Atom; CC BY 4.0) | **ativa** |
| Rússia | Governo (`governo-russia`) | `http://government.ru/en/all/rss/` (CC BY 4.0) | **ativa** |
| Rússia | MRE (`mre-russia`) | feed existe (`/en/rss.php`), mas o `robots.txt` proíbe `/*rss` | desativada |
| China | MRE (`mre-china`) e Ministério da Defesa (`defesa-china`) | sem RSS; o GDELT não indexa esses domínios (0 itens em 24 h) | quebrada |
| China | Xinhua (`xinhua`, mídia estatal) | feed RSS parado em 2018; usamos os arquivos GKG do GDELT filtrados por `news.cn`/`xinhuanet.com` (~90 itens/dia antes do filtro) — **aprovado em 15/11/2026** | **ativa** |
| Irã | Presidência (`presidencia-ira`) | `https://president.ir/en/rss/all` (datas sem fuso: `fuso: "+03:30"`) | **ativa** |
| Irã | IRNA (`irna`, mídia estatal) | `https://en.irna.ir/rss` | **ativa** |
| Israel | Gabinete do PM (`pm-israel`) e IDF (`idf`) | HTTP 403 / proteção anti-robô; sem RSS; GDELT sem itens | quebrada |
| Ucrânia | Presidência (`presidencia-ua`) e Ministério da Defesa (`defesa-ua`) | HTTP 403 para robôs; GDELT sem itens | quebrada |
| Alemanha | Governo Federal (`governo-de`) | `https://www.bundesregierung.de/service/rss/breg-de/1151244/feed.xml` (comunicados, em alemão) | **ativa** |
| Alemanha | Ministério da Defesa (`defesa-de`) | `https://www.bmvg.de/service/rss/de/17680/feed` (em alemão) | **ativa** |

- **Licenças dos canais ativos** (iguais às de `config/fontes.yaml`): Federal Register e war.gov, domínio público (governo dos EUA); Kremlin e government.ru, CC BY 4.0 (a interface linka a licença e indica que o título foi traduzido, com o original a um clique); Presidência do Irã, IRNA, Governo Federal e BMVg da Alemanha, "direitos do órgão; exibimos só título e link"; Xinhua, idem, **coletada via GDELT** (citação e link ao GDELT exibidos em cada item).
- **GDELT com `domain:`**: medido em 24 arquivos GKG (1 por hora): 0 itens de `state.gov`, `mid.ru`, `fmprc.gov.cn`, `mod.gov.cn`, `gov.il`, `idf.il`, `president.gov.ua`, `mod.gov.ua`; só `news.cn` (Xinhua) aparece. Alternativas medidas e **não aprovadas**: Ukrinform (agência estatal da Ucrânia, RSS ok) e Global Times (RSS ok).
- **Filtro de relevância** (`lib/governos/termos.ts`): termos em inglês e nos idiomas originais; o nome do próprio órgão ("Department of War", "Secretary of Defense") não conta. No Federal Register, documentos não presidenciais precisam de um tema além de "defesa" e avisos administrativos (coleta de informações, comitês, estudos ambientais) saem. Medido em 30 dias: 113 → 43 documentos do Federal Register; 50 → 24 notas do Departamento de Defesa.
- **Datas**: o Federal Register lista na véspera documentos programados para o dia seguinte; eles só entram na data de publicação.
- **Custo**: primeira carga (30 dias, 9 fontes) gastou ~9.700 caracteres do DeepL; no ritmo do job de 1 h, a estimativa é de poucos milhares por dia.

## 10. Fase 7: arsenal (15/11/2026)

| Fonte | Uso | Acesso | Licença | Status |
|---|---|---|---|---|
| **Wikidata** (`wikidata`) | Especificações (SPARQL), países, operadores, variantes, categoria do Commons | sem chave; `User-Agent` de `WIKIMEDIA_USER_AGENT`; 1 consulta/s | CC0 | **ativa** |
| **Wikipedia** (`wikipedia-pt`) | Resumo (API REST `page/summary`), pt; sem artigo em pt, o inglês traduzido e marcado | idem | CC BY-SA 4.0 (link do artigo e da licença na ficha) | **ativa** |
| **Wikimedia Commons** (`commons`) | Até 6 fotos por item, só domínio público/CC0/CC BY/CC BY-SA, com autor e licença | idem | por arquivo | **ativa** |
| **DVIDS** (`dvids`) | Fotos do DoD | chave grátis (`DVIDS_API_KEY`, vazia) | geralmente domínio público | a_verificar |
| **SIPRI Arms Transfers** (`sipri-at`) | /arsenal/comercio (agregados TIV) | download manual em armstransfers.sipri.org (sem CSV oficial do registro) | uso não comercial com citação; >10% da base exige autorização; uso comercial exige licença | aguardando arquivo |

- **Regras do cadastro** (`lib/arsenal/cadastro.ts`, `lib/fontes/wikidata/specs.ts`): cada campo com URL da declaração; o dado do item vem primeiro e, se faltar, o da **família declarada à mão** em `config/arsenal.yaml` (citada como "dado da família …"); declarações da família qualificadas para outra variante (P518) não valem; valores divergentes viram intervalo; sem dado, campo vazio.
- **Consulta SPARQL**: o QID precisa ficar dentro de cada ramo do `UNION` (com `VALUES` de fora, o Blazegraph varreu todos os P279 e estourou o tempo).
- **Fotos**: escolha prioriza o equipamento (voo, navegação, disparo) e descarta bastidores com pessoas (manutenção, cerimônias); exibida a miniatura de 960 px (`thumb.wikimedia.org`), não o original.
- **Carga inicial**: 15 fichas, 80 fotos, ~6 mil caracteres do DeepL (descrições, variantes, legendas). Atualização semanal no job `arsenal`.

## 11. Fase 8: notícias de IA e drones (16/11/2026)

- **Sem fonte nova**: as abas de `/tecnologia` leem a tabela `noticias` (coletada pelo `gdelt-gkg`). Filtro de cada aba em `lib/tecnologia/topicos.ts`: tema da ingestão (`drones`, `ia`, `guerra-eletronica`) e, para FPV, enxames e defesa antidrone, termos no título. O critério aparece na própria aba.
- **Consultas do `gdelt-gkg` ampliadas**: os termos casam a palavra inteira, então "drone" não pegava "drones". A consulta `drones` passou a incluir `drones`, `UAVs`, `FPV`, `loitering munitions`, `counter-UAS` e `C-UAS`; `guerra_eletronica` ganhou `jammer`/`jammers`. Vale só para as coletas novas; o que já estava no banco não é reprocessado.
- **Volume medido em 16/11/2026** (~2 dias de coleta): defesa antidrone 6 notícias, IA 1, FPV/enxames/guerra eletrônica 0 — as abas vazias mostram aviso e carimbo, sem tela vazia.
- **Imprensa especializada** (Breaking Defense, The War Zone etc., linha 45 da §3): ainda não integrada; entra como fonte própria via `/nova-fonte` (RSS, só título + link + resumo próprio).
- **Textos explicativos (item 2, aprovados em 16/11/2026)**: `content/tecnologia/<id>.mdx`, lidos no servidor por `lib/tecnologia/dossie.ts` com `yaml` + Zod, que já são dependências. **Nenhuma biblioteca de MDX foi adicionada** (custo zero, nada a registrar). O leitor aceita só `## seção`, parágrafos, `- listas`, `**negrito**`, `*itálico*` e chamadas `[n]`; recusa JSX, links no corpo, fonte listada e não citada e chamada sem fonte. As fontes ficam no frontmatter (nome, título, URL https, data, como foi verificada) e aparecem numeradas no rodapé de cada aba (`#ref-<id>-n`). Só `status: publicado` vai ao ar.
- **Linha do tempo dos drones (item 3, aprovada em 16/11/2026)**: `content/tecnologia/linha-do-tempo.yaml`, mesmo esquema de fontes dos textos; cada marco cita ao menos uma fonte e o build falha se faltar. Sem dependência nova.
- **"Humano no circuito?" (item 4, aprovado em 16/11/2026)**: `content/tecnologia/humano-no-circuito.yaml`, mesmo esquema de fontes; todo trecho (introdução, níveis, andamento, posições) precisa citar fonte e o andamento precisa estar em ordem cronológica, senão o build falha. Situação registrada em 16/11/2026, primeiro dia da 7ª Conferência de Revisão da CCW; atualizar quando o resultado sair. Sem dependência nova.
- **Indicadores (item 5)**: o roteiro previa o GDELT TimelineVol, que faz parte do `gdelt-doc` (`quebrada`, HTTP 429). No lugar, "Notícias por semana" conta as notícias já gravadas em `noticias` por tema (`drones`, `ia`, `guerra-eletronica`), semanas de segunda a domingo em UTC, últimas 12 semanas, começando na semana da notícia mais antiga. Sem chamada externa nem fonte nova; a página cita o GDELT (licença livre com citação) e avisa que o número mede a cobertura captada pela coleta, não a atividade militar.

## 12. Fase 9: arquivo histórico (16/11/2026)

- **`ucdp-series` (ativa)**: UCDP/PRIO Armed Conflict Dataset e UCDP Battle-Related Deaths Dataset (nível de conflito), baixados de https://ucdp.uu.se/downloads/ sem chave, licença CC BY 4.0. Gratuito. O UCDP pede citar Davies, Pettersson & Öberg (2026), "Organized violence 1989–2025, and violent political protests", *Journal of Peace Research*, e Gleditsch et al. (2002), *Journal of Peace Research* 39(5); as duas referências aparecem em `/arquivo`.
- **Sem job agendado**: os conjuntos são anuais (versão 26.1 cobre conflitos de 1946 a 2025 e mortes de 1989 a 2025). `pnpm arquivo:ucdp` acha a versão mais recente na página de downloads, baixa os dois zips (≈ 85 KB) e grava as contagens por ano em `content/arquivo/ucdp-series.json`, validado por `lib/arquivo/series.ts` no build. Amostras reais em `lib/fontes/ucdp-series/__fixtures__/`.
- **Leitura dos números**: contamos conflitos ativos por ano (uma linha do ACD por conflito-ano), por tipo e com 1.000+ mortes ("guerra" na definição do UCDP), e somamos as mortes em combate (estimativa, mínimo e máximo). As séries não cobrem conflitos entre grupos não estatais nem violência unilateral contra civis. Versão 26.1: 65 conflitos em 2025, o maior número desde 1946.
- **Linha do tempo 1914 → hoje**: `content/arquivo/linha-do-tempo.yaml`; fontes: Office of the Historian (Departamento de Estado dos EUA), Wikipédia em inglês (CC BY-SA) e o próprio UCDP.

## 13. Fase 11: publicação e monitoramento (16/11/2026)

- **Sem serviço novo.** Site na Vercel Hobby (gratuita, não comercial) e coleta no GitHub Actions (repositório público: minutos gratuitos). Passo a passo e variáveis em `docs/PUBLICACAO.md`.
- **Job `manutencao` (diário)**: verificação das fontes (`lib/manutencao/saude.ts`), limpeza (notícias > 180 dias, execuções > 90 dias), uso do DeepL (`GET /v2/usage`) e alertas como issues do GitHub, com o `GITHUB_TOKEN` do próprio workflow (`issues: write`). Campo novo `verificar` em `config/fontes.yaml`: URL leve para o teste diário (usado no `gdelt-gkg`, no `xinhua` — pasta do GDELT dá 404 — e no `wikidata` — SPARQL sem consulta não responde).
- **DeepL**: em 16/11/2026, `/v2/usage` informou limite de 1.000.000 caracteres/mês nesta conta (a documentação pública do plano Free fala em 500.000); o alerta usa o limite informado pela API. Uso do mês: 63.854 (6,4%).
