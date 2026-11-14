# Arquitetura — TEATRO//OPS

## Visão geral

```mermaid
flowchart LR
  subgraph Fontes externas
    G[GDELT] --- A[ACLED] --- U[UCDP] --- R[ReliefWeb]
    FR[Federal Register] --- RSS[RSS oficiais<br/>EUA · China · Rússia · Irã<br/>Israel · Ucrânia · Alemanha]
    W[Wikidata / Wikipedia PT] --- C[Commons / DVIDS]
  end

  subgraph GitHub Actions agendado
    I[scripts/ingestao/*<br/>adaptadores por fonte] --> N[normalizar + validar<br/>Zod]
    N --> D[deduplicar<br/>hash de URL/título]
    D --> T[traduzir pt-BR<br/>cache → DeepL → Argos]
    T --> CL[classificar<br/>país · tema · tipo]
  end

  Fontes externas --> I
  CL --> DB[(Supabase<br/>Postgres)]
  DB --> NX[Next.js<br/>ISR / Server Components]
  NX --> CDN[Vercel / Cloudflare]
  CDN --> USR((Leitor))
```

## Princípios

1. **O navegador nunca chama APIs externas diretamente** (exceto tiles do mapa). Toda coleta acontece na ingestão; o site só lê do banco. Isso protege chaves, respeita limites de taxa e deixa o site rápido.
2. **Ingestão idempotente**: rodar duas vezes não duplica nada (`on conflict (hash) do nothing`).
3. **Tradução uma vez só**: texto traduzido vai para `traducoes_cache`; reprocessar não gasta cota.
4. **Frescor declarado**: toda seção mostra "Atualizado em dd/mm/aaaa hh:mm (Brasília)" a partir de `execucoes_ingestao`.

## Agenda de ingestão (cron em UTC)

| Job | Frequência | Fontes |
|---|---|---|
| `noticias` | a cada 30 min | GDELT (conflitos, drones, IA), RSS de imprensa |
| `governos` | a cada 1 h | Federal Register, RSS oficiais dos 7 países |
| `eventos` | 1×/dia | ACLED, UCDP, ReliefWeb |
| `arsenal` | 1×/semana | Wikidata, Wikipedia PT, Commons, DVIDS |
| `manutencao` | 1×/dia | limpa itens > 90 dias sem acesso, verifica fontes, mantém o Supabase ativo |

## Rotas do site

| Rota | Conteúdo | Revalidação |
|---|---|---|
| `/` | Home (ver referência visual em `docs/design/referencia/Main.dc.html`) | 15 min |
| `/conflitos` e `/conflitos/[slug]` | Mapa, lista e página de cada conflito | 1 h |
| `/arsenal`, `/arsenal/[categoria]`, `/arsenal/[categoria]/[slug]` | Catálogo com filtros e fichas técnicas | 1 dia |
| `/arsenal/comparar?a=&b=` | Comparador | 1 dia |
| `/taticas` e `/taticas/[slug]` | Conteúdo editorial (MDX) | estático |
| `/tecnologia` | IA, drones, guerra eletrônica | 30 min |
| `/governos` e `/governos/[pais]` | Linha do tempo de decisões oficiais | 1 h |
| `/arquivo` | Linha do tempo histórica | estático |
| `/fontes` e `/metodologia` | Transparência: lista de fontes, licenças, como classificamos | estático |
