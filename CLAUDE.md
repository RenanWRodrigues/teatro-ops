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

**Fases 1, 2 e 3 concluídas** (Fase 3: `supabase/migrations/0001_inicial.sql`, `lib/db/`, seed gerado de `config/fontes.yaml`; as páginas leem via `lib/dados.ts` — banco primeiro, fixtures `[EXEMPLO]` como reserva quando o banco não está configurado, falha ou está vazio; `0001` aplicada em 14/11/2026 no projeto remoto `teatro-ops` (ref `upwjywuaehpaamvhvsyu`, us-west-2, já linkado no CLI) — **não edite a 0001; mudanças vão numa 0002**). Antes: (esqueleto Next.js 16 + Tailwind 4 + Vitest + Playwright + `lib/format`; design system em `app/globals.css` e `components/`; rotas `/`, `/arsenal`, `/arsenal/[categoria]`, `/arsenal/[categoria]/[slug]` e `/tecnologia` alimentadas por `lib/fixtures/` marcadas `[EXEMPLO]`). Toda fonte exibida passa por `CreditoFonte`/`ListaFontes`; na ficha, cada valor tem um `RefFonte` `[n]` que leva a `#ref-n`. `partialPrefetching` está desligado de propósito (ver comentário em `next.config.ts`). `scripts/ingestao/run.ts` e `scripts/fontes-verificar.ts` ainda são esqueletos que saem com código 1. Next 16 vem com `cacheComponents: true` em `next.config.ts`: a revalidação usa `"use cache"`/`cacheLife`, não `export const revalidate`; leia `node_modules/next/dist/docs/` antes de usar APIs de cache (ver `AGENTS.md`). A construção segue `PROMPTS.md` fase por fase (Fase 1 esqueleto → 2 design system → 3 banco → 4 núcleo de ingestão + GDELT + tradução → … → 11 publicação). Antes de criar algo, confira em que fase o projeto está e não pule etapas. Na Fase 1, não use `src/`: `app/`, `components/` e `lib/` ficam na raiz. Não apague os arquivos que já existem.

### Arquitetura de dados (visão geral; detalhes em `docs/ARQUITETURA.md`)

- **O navegador nunca chama APIs externas** (exceto os tiles do mapa). Toda coleta acontece na ingestão (GitHub Actions); o site só lê do Supabase via Server Components/ISR.
- **Pipeline da ingestão**: adaptador por fonte → normalizar e validar (Zod) → deduplicar (`hash` = sha256 da URL normalizada, `on conflict (hash) do nothing`, portanto idempotente) → traduzir (`traducoes_cache` → DeepL → Argos) → classificar (país · tema · tipo) → Postgres.
- **Ponto de entrada único**: `scripts/ingestao/run.ts --job <nome>` roda todos os adaptadores com `status: ativa` cujo `job` em `config/fontes.yaml` bate com o nome. Jobs: `noticias` (30 min), `governos` (1 h), `eventos` (diário), `arsenal` (semanal), `manutencao` (diário). Os crons em `.github/workflows/ingestao.yml` são mapeados para os jobs por string literal no passo "Escolher job": ao mudar um cron, mude os dois lugares.
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
pnpm ingest:<fonte>      roda um adaptador localmente (ex.: pnpm ingest:gdelt)
pnpm ingest:all          roda todos os adaptadores ativos
pnpm db:migrate          regenera supabase/seed.sql e aplica migrações + seed no Supabase (projeto linkado)
pnpm db:seed:gerar       só regenera supabase/seed.sql a partir de config/fontes.yaml
pnpm test:db             testes de integração contra o Supabase LOCAL (exige `supabase start`; recusa URL não local)
pnpm fontes:verificar    testa todas as URLs de config/fontes.yaml

pnpm test lib/format                 um arquivo/pasta de teste (Vitest; sem "--", o pnpm repassaria o "--" e o filtro seria ignorado)
pnpm test -t "formatarData"          testes pelo nome
pnpm test:e2e --grep "home"          um teste e2e (Playwright; faz build e sobe na porta 3100)
pnpm test:e2e --project celular-375  só o viewport de 375 px
pnpm tsx scripts/ingestao/run.ts --job noticias   um job, igual ao GitHub Actions
```

`pnpm db:migrate`, `supabase *`, `vercel *` e `git push` pedem confirmação (`.claude/settings.json`). Os scripts só existem a partir da Fase 1 de `PROMPTS.md`.

Comandos do Claude Code disponíveis: `/nova-fonte`, `/novo-equipamento`, `/verificar-fontes`, `/auditar-custos`, `/revisar-pagina`.

## 6. Definição de pronto

Uma tarefa só está pronta quando: textos em pt-BR revisados; fonte e licença visíveis; funciona em 375 px de largura; contraste AA; sem chave exposta; testes passando; `docs/APIS.md` e `config/fontes.yaml` atualizados se uma fonte mudou.
