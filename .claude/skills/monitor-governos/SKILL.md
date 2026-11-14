---
name: monitor-governos
description: Coleta, classificação e exibição de decisões e comunicados oficiais de governos (EUA, China, Rússia, Irã, Israel, Ucrânia, Alemanha e outros) sobre defesa, sanções, conflitos, armamentos e IA militar. Use ao trabalhar em /governos, nos feeds oficiais ou na classificação de decisões.
---

# Monitor de governos

## Países e prioridade de fonte

Para cada país, nesta ordem: (1) site oficial do governo, presidência ou ministério → (2) agência estatal, com o selo "Mídia estatal" → (3) GDELT com `domain:` do site oficial ou `sourcecountry:`.

| Código | País | Órgãos a monitorar |
|---|---|---|
| US | Estados Unidos | Casa Branca (Federal Register `PRESDOCU`), Departamento de Defesa, Departamento de Estado, Tesouro/OFAC (sanções), Congresso (NDAA, via Congress.gov) |
| CN | China | Ministério das Relações Exteriores, Ministério da Defesa Nacional, Xinhua (estatal) |
| RU | Rússia | Presidência (Kremlin), Governo, Ministério das Relações Exteriores, Ministério da Defesa |
| IR | Irã | Presidência, Ministério das Relações Exteriores, IRNA (estatal) |
| IL | Israel | Gabinete do Primeiro-Ministro, Ministério da Defesa, IDF |
| UA | Ucrânia | Presidência, Ministério da Defesa, Estado-Maior |
| DE | Alemanha | Governo Federal, Ministério da Defesa (BMVg), Bundestag |

As URLs ficam em `config/fontes.yaml` (grupo `governos`). Todas começam como `a_verificar`: teste cada uma, descubra o feed RSS real na página e só então ative.

## Filtro de relevância

Um comunicado entra em `decisoes_governo` se o título ou a descrição tiver termos de pelo menos um destes grupos (lista em inglês e no idioma original, em `lib/governos/termos.ts`):
defesa/forças armadas · sanções/controle de exportação · conflito/cessar-fogo/negociação · armas/míssil/nuclear/drone · inteligência artificial militar · orçamento de defesa · exercício militar · acordo/tratado.
O resto é descartado (agenda protocolar, cultura, economia doméstica).

## Classificação de `tipo`

Regras simples primeiro (palavras-chave + tipo de documento do Federal Register); IA opcional só para desempate.
`ordem_executiva` · `lei` · `sancao` · `comunicado` · `acordo` · `exercicio_militar` · `orcamento` · `outro`.

## Exibição (`/governos` e `/governos/[pais]`)

- Linha do tempo por país, filtro por tipo e período, e comparação lado a lado de dois países na mesma semana.
- Cada item mostra: bandeira em SVG (sem emoji), órgão, tipo, título em pt-BR, resumo de 2 frases, data, **link para o documento oficial** e o selo "Mídia estatal" quando for o caso.
- Linguagem sempre atribuída: "O Kremlin afirmou…", "Segundo a Casa Branca…". Nunca apresente a versão de um governo como fato.
- Mesma estrutura, mesmo destaque e mesmo tom para todos os países.
