# Publicação e monitoramento (Fase 11)

Guia para colocar o TEATRO//OPS no ar no plano gratuito e mantê-lo funcionando. Atualizado em 16/11/2026.

## 1. Site na Vercel Hobby

O projeto é Next.js 16 sem configuração extra: a Vercel detecta tudo sozinha (não há `vercel.json` nem `vercel.ts`).
O plano Hobby é **gratuito e não comercial** — se o site passar a ter anúncios, assinatura paga ou patrocínio, a
alternativa prevista é a Cloudflare Pages via OpenNext (ver `CLAUDE.md` §1.8).

Passo a passo no painel (vercel.com, sem precisar da CLI):

1. **Add New → Project → Import Git Repository** e escolha `RenanWRodrigues/teatro-ops`.
2. Framework: **Next.js** (detectado). Build command, output e install ficam no padrão (o `pnpm` vem do
   `packageManager` do `package.json`; Node 24, conforme `engines`).
3. **Settings → Functions → Function Region**: escolha a mais próxima do Supabase do projeto, que fica em
   `us-west-2` (Oregon): **Portland, USA (pdx1)**. No Hobby há uma região só.
4. Crie as variáveis de ambiente abaixo (Production e Preview) e faça o deploy.

### Variáveis de ambiente do site (Vercel → Settings → Environment Variables)

| Variável | Obrigatória | O que é |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | URL do projeto Supabase (`https://<ref>.supabase.co`). Pública por natureza. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Chave *publishable*/anon. Pública por natureza: só lê o que o RLS libera para o papel `anon`. |
| `NEXT_PUBLIC_SITE_URL` | não | Domínio próprio, sem barra final. Sem ela, o site usa `VERCEL_PROJECT_PRODUCTION_URL`, que a Vercel define sozinha. |

**Nenhuma chave de servidor vai para a Vercel.** O site só lê o banco com a chave anon (`lib/db/servidor.ts`);
a chave `service_role`, a do DeepL e as das fontes ficam apenas no GitHub Actions. `clienteAdmin()` é bloqueado
em `app/` e `components/` pelo ESLint, e nenhuma chave de servidor tem prefixo `NEXT_PUBLIC_`.

**O build de produção exige o banco.** Com `VERCEL_ENV=production`, o `next.config.ts` consulta o Supabase com a
chave anon (`lib/db/verificar-build.ts`) e o build falha com uma mensagem clara se as variáveis faltarem, estiverem
mal formadas, a chave for recusada ou o projeto estiver pausado. Assim o site nunca vai ao ar só com `[EXEMPLO]`.
Preview e builds locais não fazem essa verificação. Depois de corrigir uma variável, faça Redeploy **sem**
"Use existing Build Cache".

Depois do primeiro deploy: abra `/sitemap.xml`, `/robots.txt` e `/opengraph-image` para conferir o domínio
nos links.

## 2. GitHub Actions (coleta)

O workflow `.github/workflows/ingestao.yml` roda a coleta com `scripts/ingestao/run.ts`. O repositório é
público, então os minutos do Actions em runners padrão são gratuitos e ilimitados.

### Secrets (Settings → Secrets and variables → Actions → Secrets)

Envie as do `.env.local` com `pnpm secrets:sincronizar` (só manda as preenchidas) ou crie à mão.

| Secret | Situação em 16/11/2026 | Para quê |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | criado | Endereço do banco. |
| `SUPABASE_SERVICE_ROLE_KEY` | criado | Escrita da ingestão (ignora o RLS; só existe no Actions). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | criado | Não é usado pelo workflow; pode ficar. |
| `DEEPL_API_KEY` | **falta** | Tradução dos títulos. Sem ele, os títulos ficam "Tradução pendente". |
| `CONGRESS_GOV_API_KEY` | opcional | Fonte `congress-eua` (aguardando chave). |
| `DVIDS_API_KEY` | opcional | Fotos de domínio público do DVIDS (aguardando chave). |
| `ACLED_EMAIL`, `ACLED_PASSWORD` | opcional | Fonte `acled` (aguardando conta myACLED). |
| `RELIEFWEB_APPNAME` | opcional | Fonte `reliefweb` (aguardando aprovação). |
| `UCDP_ACCESS_TOKEN`, `NASA_FIRMS_MAP_KEY` | opcional | Fontes ainda não integradas. |
| `LIBRETRANSLATE_URL` | opcional | Tradutor de reserva auto-hospedado. |
| `GEMINI_API_KEY` | opcional | Não usado hoje. |

`GITHUB_TOKEN` é criado automaticamente pelo Actions; o workflow pede `issues: write` para o job
`manutencao` abrir alertas.

### Variável (Settings → Secrets and variables → Actions → Variables)

| Variável | Para quê |
|---|---|
| `SITE_PUBLICO_URL` | Opcional. Endereço do site publicado (sem barra final) para o job `manutencao` conferir se as páginas estão no ar e sem `[EXEMPLO]`. Sem ela, essa verificação é pulada. |
| `WIKIMEDIA_USER_AGENT` | Identificação exigida pela Wikimedia no job `arsenal`. Use um contato **genérico** (ex.: a URL das issues do repositório), não um e-mail pessoal: variáveis aparecem sem máscara nos logs de um repositório público. |

### Rodar cada job manualmente

Depois de enviar o código (`git push`) e criar os secrets, rode cada job uma vez pela aba **Actions →
ingestao → Run workflow** ou pelo terminal:

```
gh workflow run ingestao.yml -f job=noticias
gh workflow run ingestao.yml -f job=governos
gh workflow run ingestao.yml -f job=eventos
gh workflow run ingestao.yml -f job=arsenal
gh workflow run ingestao.yml -f job=manutencao
gh run list --workflow ingestao.yml --limit 5     # acompanhar
```

O agendador gratuito do GitHub atrasa horas; a coleta recupera o período perdido (até 24 h) na execução seguinte.

## 3. Banco (Supabase)

Antes do deploy, aplique a migração da busca: `pnpm db:migrate` (aplica `0004_busca.sql` e regenera o seed).
O projeto gratuito pausa após dias sem uso; o job diário `manutencao` faz consultas que o mantêm ativo.

## 4. Monitoramento (job `manutencao`, diário)

`pnpm tsx scripts/ingestao/run.ts --job manutencao [--seco]` (`lib/manutencao/`):

- **Coleta**: cada fonte ativa precisa de uma execução sem erro dentro do prazo do seu job — notícias 12 h,
  governos 24 h, eventos 72 h, arsenal 9 dias.
- **Endereços**: uma requisição por fonte ativa (campo `verificar` do `config/fontes.yaml` quando o endereço
  principal não serve para um GET simples). 404, 5xx, falha de rede ou falta de resposta contam como fora do ar;
  400/401/403/429 são registrados, mas não geram alerta (a API pede parâmetros, credencial ou bloqueia robôs).
- **Limpeza**: notícias com mais de 180 dias e registros de execução com mais de 90 dias.
- **DeepL**: lê `/v2/usage`; acima de 70% da cota do mês, alerta.
- **Site publicado** (com `SITE_PUBLICO_URL`): abre `/`, `/arsenal` e `/conflitos`; página com o selo `[EXEMPLO]`
  ou erro HTTP gera alerta. Com o login da Vercel (Deployment Protection) ligado, as páginas aparecem como
  "protegida" no log, sem alerta. Para o robô passar, crie em Vercel → Settings → Deployment Protection →
  "Protection Bypass for Automation" um segredo e grave-o no secret `VERCEL_PROTECTION_BYPASS` do GitHub.
- **Alertas**: issue no GitHub — "Manutenção: fontes de dados com problema", "Manutenção: cota do DeepL acima
  de 70%" e "Manutenção: site publicado sem dados reais". Se já houver uma aberta com o mesmo título, o job comenta nela em vez de abrir outra. Feche a issue
  quando resolver; o próximo problema abre uma nova.

Verificação sob demanda: `pnpm fontes:verificar` (endereço e coleta de todas as fontes, sem alterar nada).
