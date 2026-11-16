# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# TEATRO//OPS

Portal de informação sobre conflitos armados, arsenal militar, táticas, guerra tecnológica (IA, drones, guerra eletrônica) e decisões de governos. **Todo o conteúdo voltado ao usuário é em Português do Brasil.** **Todo o projeto roda em serviços gratuitos.**

Leia este arquivo inteiro antes de qualquer tarefa. Ele vale mais que qualquer suposição sua.

---

## 1. Regras inegociáveis

1. **Idioma**: toda interface, texto, rótulo, mensagem de erro, data e número exibido ao usuário é em pt-BR (`lang="pt-BR"`, `Intl` com `pt-BR`, datas `dd/mm/aaaa`, separador decimal vírgula, milhar ponto). Código, nomes de variáveis e commits podem ser em inglês; comentários em português.
2. **Custo zero**: só use serviços com plano gratuito. Antes de adicionar qualquer dependência ou serviço externo, confirme que é gratuito e registre em `docs/APIS.md`. Se algo exigir cartão de crédito ou cobrar acima de um limite, **pare e pergunte**.
3. **Toda informação tem fonte**: cada notícia, evento, decisão, especificação técnica e imagem guarda `fonte_nome`, `fonte_url`, `licenca` e `coletado_em`. Nenhum dado aparece na tela sem a fonte visível ou a um clique.
4. **Direitos autorais**: de veículos de imprensa guardamos **apenas** título, link, data e um resumo curto escrito por nós (máx. 2 frases). Nunca copie o corpo de artigos. Imagens só de domínio público (DVIDS/governo dos EUA) ou licença livre (Wikimedia Commons, com autor e licença exibidos).
5. **Neutralidade editorial**: descreva fatos e atribua afirmações ("segundo o Ministério da Defesa da Rússia…", "segundo a ACLED…"). Nunca tome lado. Números de baixas e danos sempre com fonte e a ressalva de que são estimativas.
6. **Sem conteúdo operacional**: o site explica *o que* é e *como funciona em linhas gerais*. Nunca publique instruções de fabricação, modificação, aquisição ou emprego de armas, drones ou explosivos, nem detalhes de alvos, vulnerabilidades ou localização de tropas em tempo real que possam pôr pessoas em risco.
7. **Segredos**: chaves ficam só em `.env.local` (local) e nos *secrets* do GitHub/Vercel. Nunca escreva chaves em código, logs, commits ou no cliente. Chaves que precisam de servidor nunca vão em variáveis `NEXT_PUBLIC_*`.
8. **Uso não comercial**: ACLED (nível aberto), DeepL Free e Vercel Hobby têm restrições de uso comercial. Se o usuário quiser monetizar (anúncios, assinatura paga), avise antes e proponha alternativas.

---

## 2. Stack

| Camada | Escolha | Observação |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript estrito + Tailwind CSS | Renderização estática/ISR sempre que possível |
| Mapas | MapLibre GL JS + tiles do OpenFreeMap | Sem chave, sem custo |
| Gráficos | Recharts (ou SVG à mão para gráficos simples) | |
| Banco | Supabase (Postgres, plano gratuito) | Busca textual com dicionário `portuguese` |
| Ingestão | Scripts TypeScript (`tsx`) rodando em GitHub Actions agendado | Ver `.github/workflows/ingestao.yml` |
| Tradução | DeepL API Free → fallback LibreTranslate/Argos (auto-hospedado) | Cache obrigatório; ver skill `traducao-ptbr` |
| Resumo por IA (opcional) | Gemini Flash no plano gratuito | Limites mudam com frequência; o site precisa funcionar sem isso |
| Hospedagem | Vercel Hobby (não comercial) ou Cloudflare Pages | |
| Validação | Zod em toda fronteira com dado externo | |
| Testes | Vitest (unidade) + Playwright (e2e, smoke) | |

Gerenciador de pacotes: **pnpm**. Node LTS.

---

## 3. Estrutura de pastas

```
app/                    rotas Next.js (pt-BR nas URLs: /conflitos, /arsenal, /taticas, /tecnologia, /governos, /arquivo)
components/             componentes de UI (ver skill design-system-teatro-ops)
lib/
  fontes/<fonte>/       um adaptador por fonte externa (ver skill integrar-fonte-dados)
  traducao/             pipeline de tradução + glossário
  db/                   cliente Supabase, queries tipadas
  format/               datas, números, unidades em pt-BR
scripts/ingestao/       entrypoints chamados pelo GitHub Actions
supabase/migrations/    SQL versionado
config/fontes.yaml      registro de todas as fontes (URL, auth, limite, licença, status)
config/glossario-militar.csv  termos EN→PT-BR fixos
docs/                   APIS.md, ARQUITETURA.md, MODELO-DADOS.md, design/
```

---

### Estado atual e roteiro

A construção segue `PROMPTS.md` fase por fase (1 esqueleto → 2 design system → 3 banco → 4 ingestão + GDELT + tradução → … → 11 publicação). Antes de criar algo, confira em que fase o projeto está e não pule etapas. Não use `src/`: `app/`, `components/` e `lib/` ficam na raiz. Não apague os arquivos que já existem.

- **Fase 11 — publicação e monitoramento (em andamento, 16/11/2026)**: guia em `docs/PUBLICACAO.md` (Vercel Hobby só com `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` e, opcional, `NEXT_PUBLIC_SITE_URL`; secrets do Actions). Job `manutencao` implementado (`lib/manutencao/`, chamado por `run.ts --job manutencao [--seco]`): saúde da coleta por fonte ativa (prazo por job em `LIMITE_HORAS_SEM_COLETA`), GET no endereço de cada fonte (campo `verificar` do YAML quando a URL principal não serve), limpeza (notícias > 180 dias, execuções > 90 dias), uso do DeepL e issue de alerta no GitHub (comenta na aberta de mesmo título); o workflow tem `permissions: issues: write`. `pnpm fontes:verificar` agora funciona (só relata; não altera o YAML). **Pendentes do usuário**: `git push` (o Actions ainda roda o código da Fase 4), secret `DEEPL_API_KEY`, `pnpm db:migrate` (migração 0004), deploy na Vercel.
- **Fase 10 — busca, SEO, desempenho e acessibilidade (concluída em 16/11/2026, salvo aplicar a migração 0004)**: busca em `/busca` pela função SQL `buscar` (migração **`0004_busca.sql`, ainda não aplicada no banco remoto** — a CLI do Supabase foi bloqueada pelo Windows nesta máquina; até lá a página mostra "Busca temporariamente indisponível"). SEO: `metadados()` em `lib/site.ts` (título, canônico, Open Graph/Twitter em pt-BR e imagem `app/opengraph-image.tsx`) em todas as páginas; `app/sitemap.ts`, `app/robots.ts` (bloqueia `/busca`); JSON-LD `Dataset` em `/arquivo` e `Article` em `/taticas/[slug]` (`components/DadosEstruturados.tsx`). URL pública: `NEXT_PUBLIC_SITE_URL` › `VERCEL_PROJECT_PRODUCTION_URL` › localhost. Desempenho: LCP < 2,5 s em 4G lenta + CPU 4× em todas as rotas (`node scripts/desempenho/lcp.mjs` contra `pnpm start -p 3200`); fontes só com subconjunto `latin`, Inter com `display: optional`, JetBrains sem pré-carga. Erros: `app/error.tsx`, `app/not-found.tsx`, `app/global-error.tsx`; o carimbo "Atualizado em" mostra "Fonte temporariamente indisponível — exibindo dados de dd/mm às hh:mm" quando a última coleta passa de `limiteHoras` (12 h; conflitos 48 h), calculado no navegador (`AvisoDefasagem`). Acessibilidade (`revisor-acessibilidade`): 5 bloqueantes corrigidos — link dentro de link no `CardConflito`, sublinhado nos links do ticker, borda de campos com `--line-field` (≥ 3:1), marcadores do mapa com nome e fora do Tab, animações decorativas finitas (≤ 5 s; só o ticker é contínuo e tem pausa). Importantes também resolvidos: fontes editoriais com `idioma` (títulos em inglês com `lang="en"`), busca e "Mais recente" de `/governos` com idioma e "TRADUÇÃO PENDENTE" (a função `buscar` devolve `pendente` e `idioma`), os cinco painéis das abas de `/tecnologia` no HTML (inativos com `hidden`), ticker parado ou com movimento reduzido vira lista vertical (3 itens + "Mostrar todas").
- **Fase 9 — táticas, arquivo e transparência (em andamento, 16/11/2026)**: item 1 feito — `/taticas` e `/taticas/[slug]` com 6 textos em `content/taticas/<id>.mdx` (mesmo leitor validado de `lib/tecnologia/dossie.ts`; ordem e diagrama em `lib/taticas/taticas.ts`, carregados por `obterTaticas` em `lib/dados.ts`) e diagramas SVG em `components/DiagramaTatica.tsx` (`animado` usa `anim-tracado`, desligada com `prefers-reduced-motion`). O texto "Movimento de pinça" foi aprovado pelo editor; os outros cinco seguem o formato aprovado. Item 2 feito — `/arquivo` com a linha do tempo 1914 → hoje (`content/arquivo/linha-do-tempo.yaml`, mesmo leitor da linha do tempo de drones) e as séries anuais do UCDP (fonte `ucdp-series`: conflitos com participação de Estado desde 1946, mortes em combate desde 1989), geradas por `pnpm arquivo:ucdp` em `content/arquivo/ucdp-series.json` — rode de novo quando o UCDP publicar a versão anual (hoje 26.1) e atualize os marcos 1946 e 2025. Item 3 feito — `/fontes` gerada de `config/fontes.yaml` (`lib/fontes/publico.ts`; mostra todas as fontes, inclusive em verificação e fora do ar) e `/metodologia` (texto fixo em `app/metodologia/page.tsx`: ao mudar coleta, tradução, limiares ou fontes, atualize a página e a data `ATUALIZADO_EM`); links no `Rodape`. Item 4 feito (16/11/2026) — `revisor-ptbr` e `revisor-fontes` rodados; erros corrigidos (crédito do resumo das fichas sem artigo em português, URL do FPRI, plurais, "Wikipédia", licença CC BY-SA/CC BY com link nas fontes editoriais — exigida pelo validador para fontes da Wikipédia —, GDELT como "via" com link, fotos CC BY sem autor descartadas). Linha do tempo do arquivo aprovada; a home mostra o aviso [EXEMPLO] só quando algum bloco vem das fixtures e o comparador usa o par real com mais especificações comparáveis (`melhorParComparavel`); fotos CC BY sem autor no banco: 0 (conferido com `scripts/manutencao/fotos-sem-autor.ts`). Sugestões não aplicadas: frases explicativas sem [n] nos textos aprovados de `content/tecnologia` e troca da Wikipédia por fontes primárias. **Fase 9 concluída.**
- **Fase 8 — IA e drones (concluída em 16/11/2026, salvo imprensa especializada)**: item 1 feito — cada aba de `/tecnologia` mostra notícias reais de `noticias`, filtradas por tema + termos (`lib/tecnologia/topicos.ts`, `obterFeedsTecnologia` em `lib/dados.ts`), com critério e carimbo visíveis. Item 2 feito (aprovado em 16/11/2026) — o texto de cada aba vem de `content/tecnologia/<id>.mdx`, lido sem dependência de MDX por `lib/tecnologia/dossie.ts` (subconjunto de Markdown; JSX, links e fontes não citadas quebram o build de propósito); só `status: publicado` vai ao ar. Item 3 feito (aprovado em 16/11/2026) — linha do tempo dos drones em `content/tecnologia/linha-do-tempo.yaml` (`lib/tecnologia/linha-do-tempo.ts`), cada marco com fonte `[n]`. Item 4 feito (aprovado em 16/11/2026) — "Humano no circuito?" em `content/tecnologia/humano-no-circuito.yaml` (`lib/tecnologia/humano-no-circuito.ts`), com o andamento na ONU até a abertura da 7ª Conferência de Revisão da CCW (16–20/11/2026); **atualizar com o resultado da conferência** (e `situacao_em`). Item 5 feito — "Notícias por semana" conta a tabela `noticias` por tema (drones, ia, guerra-eletronica) nas últimas 12 semanas (`lib/tecnologia/volume.ts`, `listarTemasNoticias`), no lugar do GDELT TimelineVol (`gdelt-doc` `quebrada`). `/tecnologia` não usa mais fixtures. **Fase 8 concluída**, salvo a imprensa especializada. Imprensa especializada ainda não integrada. Ver `docs/APIS.md` §11.
- **Fase 7 — arsenal (em andamento, 15/11/2026)**: `wikidata`, `wikipedia-pt` e `commons` ativas; 15 fichas de `config/arsenal.yaml` gravadas por `pnpm arsenal:cadastrar --todos --gravar` e atualizadas no job semanal `arsenal`; `/arsenal` com filtros (categoria, país, status), busca e paginação; ficha com foto creditada, planta (aeronave ou casco), variantes, galeria e notícias relacionadas; `/arsenal/comparar?a=&b=`. **Pendentes**: `/arsenal/comercio` aguarda o arquivo do SIPRI baixado à mão; `dvids` aguarda `DVIDS_API_KEY`. Ver `docs/APIS.md` §10.
- **Fase 6 — governos (concluída, salvo Congress.gov)**: job `governos` (1 h) com `fr-eua` (Federal Register), 7 feeds RSS/Atom oficiais pelo adaptador genérico `lib/fontes/rss` e `xinhua` pelos arquivos GKG filtrados por domínio. Relevância em `lib/governos/termos.ts`, tipo em `lib/governos/classificacao.ts`. `/governos` e `/governos/[pais]` (7 países); decisões relacionadas em `/conflitos/[slug]`. Israel e Ucrânia sem canal oficial acessível (403); `congress-eua` aguarda `CONGRESS_GOV_API_KEY`. Ver `docs/APIS.md` §9.
- **Fase 5 — conflitos (quase concluída)**: `ucdp-candidato` ativa no job `eventos` (CSV mensal do UCDP Candidate GED, sem chave); curadoria em `config/conflitos.yaml` (aprovada em 14/11/2026), intensidade recalculada a cada coleta; `/conflitos` e `/conflitos/[slug]` com mapa agregado, tabela, série semanal e linha do tempo; radar da home com contagens do UCDP. **Pendentes por credencial**: `acled` (conta myACLED), `reliefweb` (appname aprovado), `nasa-firms` (opcional). `gdelt-geo` `quebrada` (HTTP 404) — a cobertura de mídia usa as coordenadas do `gdelt-gkg`. Ver `docs/APIS.md` §8.
- **Fase 4 — ingestão (concluída)**: `gdelt-gkg` ativa no GitHub Actions a cada 30 min (repositório público `RenanWRodrigues/teatro-ops`); `gdelt-doc` `quebrada` por HTTP 429 contínuo (`docs/APIS.md` §7). Títulos sem motor de tradução ficam "Tradução pendente" e são retraduzidos nas execuções seguintes. Para o DeepL valer no Actions, o secret `DEEPL_API_KEY` precisa ser enviado com `pnpm secrets:sincronizar`.
- **Fases 1–3 (concluídas)**: Next.js 16 + Tailwind 4 + Vitest + Playwright; design system em `app/globals.css` e `components/`; banco Supabase no projeto remoto `teatro-ops` (ref `upwjywuaehpaamvhvsyu`, us-west-2, já linkado no CLI). Migrações `0001`–`0003` aplicadas; a próxima mudança de esquema vai numa `0004`.

Convenções transversais:

- **Leitura de dados**: as páginas leem via `lib/dados.ts` — banco primeiro, fixtures `[EXEMPLO]` de `lib/fixtures/` como reserva quando o banco não está configurado, falha ou está vazio.
- **Atribuição na UI**: toda fonte exibida passa por `CreditoFonte`/`ListaFontes`; na ficha, cada valor tem um `RefFonte` `[n]` que leva a `#ref-n`.
- **Cache do Next 16**: `cacheComponents: true` em `next.config.ts` — a revalidação usa `"use cache"`/`cacheLife`, não `export const revalidate`. Leia `node_modules/next/dist/docs/` antes de usar APIs de cache (ver `AGENTS.md`). `partialPrefetching` está desligado de propósito (ver comentário em `next.config.ts`).

### Arquitetura de dados (visão geral; detalhes em `docs/ARQUITETURA.md`)

- **O navegador nunca chama APIs externas** (exceto os tiles do mapa). Toda coleta acontece na ingestão (GitHub Actions); o site só lê do Supabase via Server Components/ISR.
- **Pipeline da ingestão**: adaptador por fonte → normalizar e validar (Zod) → deduplicar (`hash` = sha256 da URL normalizada, `on conflict (hash) do nothing`, portanto idempotente) → traduzir (`traducoes_cache` → DeepL → Argos) → classificar (país · tema · tipo) → Postgres.
- **Ponto de entrada único**: `scripts/ingestao/run.ts --job <nome>` (orquestrado por `lib/ingestao/executar.ts`, com a lógica de cada job em `lib/ingestao/<job>.ts`) roda todos os adaptadores com `status: ativa` cujo `job` em `config/fontes.yaml` bate com o nome; `--fonte <id>` roda um só. Um adaptador novo só roda depois de mapeado pelo `id` em `lib/ingestao/executar.ts`; `lib/fontes/registro.ts` valida o `config/fontes.yaml` com Zod. Jobs: `noticias` (30 min), `governos` (1 h), `eventos` (diário), `arsenal` (semanal), `manutencao` (diário). O cron gratuito do GitHub atrasa horas, então `noticias` e `governos` não usam janela fixa: coletam desde a última execução sem erro da fonte (teto de 24 h; `lib/ingestao/janela.ts`); `--horas N` força uma janela fixa. Os crons em `.github/workflows/ingestao.yml` são mapeados para os jobs por string literal no passo "Escolher job": ao mudar um cron, mude os dois lugares.
- **`lib/fontes/_base/`** concentra `fetchComRetry`, `rateLimiter` (lê `limite` do YAML), `normalizarUrl`, `hash` e `registrarExecucao`. Cada execução grava em `execucoes_ingestao` (erros, motor de tradução, `caracteres_traduzidos`); daí saem o carimbo "Atualizado em …" do site e os números do `/auditar-custos`.
- **Variáveis de ambiente**: novas chaves entram em `.env.example`, em `env:` do workflow e no secret do GitHub. `.claude/settings.json` bloqueia a leitura de `.env*.local`, então não tente lê-los.
- **Migrações**: `docs/MODELO-DADOS.md` é a base da `0001_inicial.sql`. Mudanças de esquema vão sempre em migração nova; nunca edite uma antiga.

## 4. Como trabalhar neste repositório

- **Antes de codar**: leia a skill relevante em `.claude/skills/`. Integração de fonte → `integrar-fonte-dados`. Qualquer tela → `design-system-teatro-ops`. Texto traduzido → `traducao-ptbr`. Equipamento → `ficha-equipamento`. Governos → `monitor-governos`. Qualquer texto publicado → `conteudo-editorial-seguro`.
- **Verifique antes de afirmar**: URLs de feeds e APIs mudam. Antes de integrar uma fonte, faça uma requisição real e salve uma amostra em `lib/fontes/<fonte>/__fixtures__/`. Se o endpoint não responder como documentado, marque `status: quebrada` (valores válidos: `ativa | a_verificar | quebrada | desativada`; toda fonte nova começa `a_verificar`) em `config/fontes.yaml` e avise.
- **Respeite limites**: GDELT ~1 requisição a cada 5 s; DeepL Free 500 mil caracteres/mês; demais fontes conforme `config/fontes.yaml`. Todo adaptador usa o `rateLimiter` e o `fetchComRetry` de `lib/fontes/_base`.
- **Falha graciosa**: se uma fonte cair, o site mostra o último dado válido com o carimbo "Atualizado em …" — nunca uma tela vazia ou erro cru.
- **Passos pequenos**: um PR/commit por fonte ou por página. Rode `pnpm lint && pnpm typecheck && pnpm test` antes de dar uma tarefa por concluída.
- **Não invente dados**: nada de números, nomes de conflitos ou citações fictícias em código de produção. Para desenvolvimento use fixtures reais salvas ou marque claramente `[EXEMPLO]`.

## 5. Comandos

```
pnpm dev                 servidor local
pnpm lint | typecheck | test | test:e2e
pnpm ingest:<fonte>      roda um adaptador localmente (existem: gdelt-gkg, gdelt-doc, ucdp-candidato, fr-eua, xinhua, governos)
pnpm ingest:all          roda todos os adaptadores ativos (run.ts --job todos)
pnpm arsenal:cadastrar --todos --gravar   cadastra/atualiza as fichas de config/arsenal.yaml
node scripts/desempenho/lcp.mjs [url] [rotas]   mede o LCP com 4G lenta e CPU 4× (rode antes pnpm build && pnpm start -p 3200)
pnpm arquivo:ucdp [--seco]                regenera content/arquivo/ucdp-series.json com a versão anual mais recente do UCDP
pnpm db:migrate          regenera supabase/seed.sql e aplica migrações + seed no Supabase (projeto linkado)
pnpm db:seed:gerar       só regenera supabase/seed.sql a partir de config/fontes.yaml
pnpm test:db             testes de integração contra o Supabase LOCAL (exige `supabase start`; recusa URL não local)
pnpm ingest:gdelt-gkg --horas 2 --seco --amostra 10   coleta sem gravar e sem gastar DeepL (só cache; --traduzir chama o DeepL)
pnpm env:verificar       mostra a FORMA das variáveis do .env.local (nunca o valor)
pnpm secrets:sincronizar envia ao GitHub Actions só as variáveis preenchidas do .env.local
pnpm fontes:verificar    testa o endereço de cada fonte e há quanto tempo cada ativa não coleta (só relata)
pnpm tsx scripts/ingestao/run.ts --job manutencao --seco   verificação diária sem apagar nem abrir issue

pnpm test lib/format                 um arquivo/pasta de teste (Vitest; sem "--", o pnpm repassaria o "--" e o filtro seria ignorado)
pnpm test -t "formatarData"          testes pelo nome
pnpm test:e2e --grep "home"          um teste e2e (Playwright; faz build e sobe na porta 3100)
pnpm test:e2e --project celular-375  só o viewport de 375 px
pnpm tsx scripts/ingestao/run.ts --job noticias   um job, igual ao GitHub Actions
pnpm tsx scripts/ingestao/run.ts --fonte <id> --seco --amostra 10   uma fonte, sem gravar
```

`pnpm typecheck` roda `next typegen` antes do `tsc` (gera os tipos das rotas). `pnpm db:migrate`, `supabase *`, `vercel *` e `git push` pedem confirmação (`.claude/settings.json`).

Comandos do Claude Code disponíveis: `/nova-fonte`, `/novo-equipamento`, `/verificar-fontes`, `/auditar-custos`, `/revisar-pagina`.

## 6. Definição de pronto

Uma tarefa só está pronta quando: textos em pt-BR revisados; fonte e licença visíveis; funciona em 375 px de largura; contraste AA; sem chave exposta; testes passando; `docs/APIS.md` e `config/fontes.yaml` atualizados se uma fonte mudou.
