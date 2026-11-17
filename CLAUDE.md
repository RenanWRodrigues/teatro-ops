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
| Gráficos | SVG à mão (Recharts não está instalado; só adicione se um gráfico realmente exigir) | |
| Banco | Supabase (Postgres, plano gratuito) | Busca textual com dicionário `portuguese` |
| Ingestão | Scripts TypeScript (`tsx`) rodando em GitHub Actions agendado | Ver `.github/workflows/ingestao.yml` |
| Tradução | DeepL API Free → fallback LibreTranslate/Argos (auto-hospedado) | Cache obrigatório; ver skill `traducao-ptbr` |
| Resumo por IA (opcional) | Gemini Flash no plano gratuito | Limites mudam com frequência; o site precisa funcionar sem isso |
| Hospedagem | Vercel Hobby (não comercial) ou Cloudflare Pages | |
| Validação | Zod em toda fronteira com dado externo | |
| Testes | Vitest (unidade) + Playwright (e2e, smoke) | |

Gerenciador de pacotes: **pnpm** (10). Node **24+** (`engines` no `package.json`). Versões atuais: Next 16.4, React 19.3, Tailwind 4, Zod 4, Vitest 5. O pacote é ESM (`"type": "module"`) e o alias `@/` aponta para a raiz do repositório.

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

Histórico detalhado de cada fase (arquivos, decisões, revisões): `docs/ROTEIRO.md`. Ao concluir algo, registre lá e atualize este resumo.

**Fase atual: 11 — publicação e monitoramento.** Fases 1–10 concluídas, com as pendências abaixo.

| Fase | Entregue |
|---|---|
| 1–3 | Esqueleto Next 16 + Tailwind 4 + Vitest + Playwright; design system (`app/globals.css`, `components/`); Supabase remoto `teatro-ops` (ref `upwjywuaehpaamvhvsyu`, us-west-2, linkado no CLI) |
| 4 | Ingestão no GitHub Actions (repositório público `RenanWRodrigues/teatro-ops`), `gdelt-gkg` a cada 30 min, tradução com "Tradução pendente" retraduzida depois |
| 5 | `/conflitos` com `ucdp-candidato` (job `eventos`) e curadoria em `config/conflitos.yaml` |
| 6 | `/governos` com `fr-eua`, 7 feeds RSS/Atom (`lib/fontes/rss`) e `xinhua` via GKG; relevância em `lib/governos/termos.ts`, tipo em `lib/governos/classificacao.ts` |
| 7 | `/arsenal`, fichas e comparador com `wikidata`, `wikipedia-pt`, `commons`; fichas em `config/arsenal.yaml` |
| 8 | `/tecnologia`: feeds por tema (`lib/tecnologia/topicos.ts`), dossiês, linha do tempo de drones, "Humano no circuito?", volume semanal a partir da tabela `noticias` |
| 9 | `/taticas` (diagramas em `components/DiagramaTatica.tsx`), `/arquivo` (linha do tempo + séries UCDP), `/fontes` (gerada do YAML), `/metodologia` |
| 10 | `/busca` (função SQL `buscar`), SEO (`metadados()` em `lib/site.ts`, sitemap, robots, JSON-LD), LCP < 2,5 s, páginas de erro, auditoria de acessibilidade |
| 11 | Job `manutencao` (`lib/manutencao/`: saúde da coleta, verificação de URLs, limpeza, uso do DeepL, issue de alerta no GitHub); guia `docs/PUBLICACAO.md` |

**Pendentes do usuário (bloqueiam partes do site):**
- Variável `WIKIMEDIA_USER_AGENT` no GitHub (sem ela o job `arsenal` falha; issue #1) e secret `DEEPL_API_KEY` (`pnpm secrets:sincronizar`).
- `pnpm db:migrate` para aplicar `0004_busca.sql` no remoto (a CLI do Supabase foi bloqueada pelo Windows nesta máquina); até lá `/busca` mostra "Busca temporariamente indisponível".
- Deploy na Vercel pelo painel (`docs/PUBLICACAO.md`).
- Credenciais: `acled` (myACLED), `reliefweb` (appname), `nasa-firms` (opcional), `congress-eua` (`CONGRESS_GOV_API_KEY`), `dvids` (`DVIDS_API_KEY`).
- `/arsenal/comercio` aguarda o arquivo do SIPRI baixado à mão. Imprensa especializada de tecnologia ainda não integrada.

**Fontes quebradas** (não tente reativar sem testar de novo): `gdelt-doc` (HTTP 429), `gdelt-geo` (HTTP 404; o mapa usa coordenadas do `gdelt-gkg`), `defesa-de` (HTTP 444 nos IPs do GitHub). Israel e Ucrânia sem canal oficial acessível (403).

**Manutenção periódica de conteúdo:**
- `content/tecnologia/humano-no-circuito.yaml`: atualizar com o resultado da 7ª Conferência de Revisão da CCW (16–20/11/2026) e o campo `situacao_em`.
- `pnpm arquivo:ucdp` quando o UCDP publicar a versão anual (hoje 26.1); depois atualize os marcos 1946 e 2025 de `content/arquivo/linha-do-tempo.yaml`.
- `/metodologia` (`app/metodologia/page.tsx`) é texto fixo: ao mudar coleta, tradução, limiares ou fontes, atualize a página e a constante `ATUALIZADO_EM`.

**Padrões que não são óbvios pelo código:**
- Textos editoriais ficam em `content/` (`.mdx`/`.yaml`) e são lidos sem MDX por `lib/tecnologia/dossie.ts`, que aceita só um subconjunto de Markdown. JSX, links soltos e fontes não citadas quebram o build de propósito; só `status: publicado` vai ao ar. `/taticas` e `/arquivo` usam os mesmos leitores. O contexto de cada conflito fica em `content/conflitos/<slug>.mdx` (`lib/conflitos/contexto.ts`, cinco seções fixas); ali os rascunhos aparecem no `pnpm dev`, com aviso, para revisão do editor.
- Defasagem: `AvisoDefasagem` (no navegador) troca o carimbo por "Fonte temporariamente indisponível — exibindo dados de dd/mm às hh:mm" quando a última coleta passa de `limiteHoras` (12 h; conflitos 48 h).
- Títulos em inglês recebem `lang="en"` e o selo "TRADUÇÃO PENDENTE"; a função `buscar` devolve `pendente` e `idioma` para isso.
- Animações decorativas são finitas (≤ 5 s) e respeitam `prefers-reduced-motion`; só o ticker é contínuo, tem pausa e vira lista vertical com movimento reduzido.
- URL pública: `NEXT_PUBLIC_SITE_URL` › `VERCEL_PROJECT_PRODUCTION_URL` › localhost.
- Migrações `0001`–`0004` existem (a `0004` ainda não foi aplicada no remoto); a próxima mudança de esquema vai numa `0005`.

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
pnpm build && pnpm start build de produção local
pnpm lint | typecheck | test | test:watch | test:e2e
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

`pnpm typecheck` roda `next typegen` antes do `tsc` (gera os tipos das rotas). Os testes de unidade ficam ao lado do código (`*.test.ts[x]` em `lib/`, `scripts/`, `components/`, `app/`, `supabase/`); os e2e ficam em `e2e/`. `supabase/migracoes.test.ts` aplica as migrações num Postgres em memória (PGlite) dentro do `pnpm test`, sem precisar do Supabase local. `pnpm db:migrate`, `supabase *`, `vercel *` e `git push` pedem confirmação (`.claude/settings.json`).

Comandos do Claude Code disponíveis: `/nova-fonte`, `/novo-equipamento`, `/verificar-fontes`, `/auditar-custos`, `/revisar-pagina`.

## 6. Definição de pronto

Uma tarefa só está pronta quando: textos em pt-BR revisados; fonte e licença visíveis; funciona em 375 px de largura; contraste AA; sem chave exposta; testes passando; `docs/APIS.md` e `config/fontes.yaml` atualizados se uma fonte mudou.
