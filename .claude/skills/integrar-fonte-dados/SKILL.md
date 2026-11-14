---
name: integrar-fonte-dados
description: Padrão obrigatório para conectar uma API, feed RSS ou dataset externo ao TEATRO//OPS (GDELT, ACLED, UCDP, ReliefWeb, Federal Register, RSS de governos, Wikidata, DVIDS etc.). Use sempre que for criar, corrigir ou alterar um adaptador de fonte.
---

# Integrar uma fonte de dados

## Passo a passo

1. **Registrar** a fonte em `config/fontes.yaml` com `status: a_verificar` (campos: id, nome, url, tipo, auth, env, limite, licenca, categoria, job, paises, temas).
2. **Confirmar que é gratuita** e ler os termos de uso/licença. Anote em `docs/APIS.md`. Se exigir pagamento, pare e avise.
3. **Requisição real de teste**: chame o endpoint uma vez (com a chave do `.env.local`, se houver) e salve a resposta crua em `lib/fontes/<id>/__fixtures__/amostra.json` (ou `.xml`). Sem chave disponível? Peça ao usuário; não invente a resposta.
4. **Criar o adaptador** em `lib/fontes/<id>/index.ts` implementando a interface abaixo.
5. **Schema Zod** em `lib/fontes/<id>/schema.ts` descrevendo a resposta crua. Itens que não passam na validação são descartados e contados em `itens_ignorados`, nunca derrubam o job.
6. **Testes** em `lib/fontes/<id>/index.test.ts` usando a fixture: parse, normalização, deduplicação, item inválido.
7. **Script** `scripts/ingestao/<id>.ts` + script `ingest:<id>` no `package.json`.
8. **Agendar** no job certo em `.github/workflows/ingestao.yml`; adicionar os secrets necessários.
9. Mudar para `status: ativa` em `config/fontes.yaml` e rodar `/verificar-fontes`.

## Interface comum

```ts
// lib/fontes/_base/tipos.ts
export interface AdaptadorFonte<TCru, TNormalizado> {
  id: string;                                   // igual ao id em config/fontes.yaml
  buscar(desde: Date): Promise<TCru[]>;         // usa fetchComRetry + rateLimiter
  normalizar(item: TCru): TNormalizado | null;  // null = descartar
  hash(item: TNormalizado): string;             // sha256 da url normalizada (ou do id externo)
}
```

Utilitários obrigatórios em `lib/fontes/_base/`:
- `fetchComRetry(url, opts)`: timeout de 20 s, 3 tentativas com backoff exponencial, `User-Agent: TEATRO-OPS/1.0 (+https://<dominio>/fontes)`, respeita `Retry-After`.
- `rateLimiter(idFonte)`: lê `limite` de `config/fontes.yaml` (ex.: GDELT 1 req/5 s).
- `normalizarUrl(url)`: remove `utm_*`, `fbclid` e âncoras; força https.
- `registrarExecucao(job, fonte, resultado)`: grava em `execucoes_ingestao`.

## Regras por tipo

- **RSS**: use `fast-xml-parser`. Guarde só `title`, `link`, `pubDate` e `description` (truncada a 300 caracteres, apenas para gerar o resumo próprio; não exibir).
- **GDELT**: `mode=ArtList&format=json&maxrecords=75&sort=DateDesc`, com `timespan` curto (ex.: `1h` no job de 30 min). Consultas em inglês valem para todos os idiomas. Filtros úteis: `sourcecountry:`, `domain:`, `theme:`. Sempre esperar 5 s entre chamadas.
- **ACLED**: OAuth (token Bearer obtido com as credenciais myACLED; renove com o refresh token). O nível Open pode ter defasagem: mostre isso na interface.
- **ReliefWeb**: `appname` aprovado é obrigatório em toda URL (`RELIEFWEB_APPNAME`). Use a v2.
- **Federal Register**: sem chave; use `fields[]` para pedir só o necessário; filtre por `agencies[]=defense-department`, `state-department`, `treasury-department` (sanções) e por `type[]=PRESDOCU`.
- **Wikidata**: SPARQL com `User-Agent` identificável e no máximo 1 consulta por segundo; cache de 7 dias.
- **Fontes estatais** (Xinhua, IRNA, TASS, RT etc.): `categoria: estatal`, e a interface exibe o selo "Mídia estatal".

## Proibido

- Chamar APIs externas a partir do navegador (exceto os tiles do mapa).
- Raspar sites que proíbam isso no robots.txt ou nos termos.
- Guardar o corpo completo de artigos de imprensa.
- Esconder erro: falhas vão para `execucoes_ingestao.erro` e o site continua com o último dado válido.
