---
name: ficha-equipamento
description: Como montar e atualizar fichas técnicas de equipamentos militares (caças, tanques, embarcações, aviões, helicópteros, armamento, drones, defesa aérea) a partir de Wikidata, Wikipedia PT, Wikimedia Commons e DVIDS. Use ao cadastrar um equipamento, preencher especificações, comparar equipamentos ou buscar fotos.
---

# Ficha técnica de equipamento

## Fluxo

1. **Identificar** o item no Wikidata (QID): buscar pelo rótulo em inglês e conferir a descrição. Guarde `wikidata_id`.
2. **Especificações** via SPARQL (`lib/fontes/wikidata/consultas.ts`). Propriedades úteis (confirme cada uma no Wikidata antes de usar):
   - `P176` fabricante · `P495` país de origem · `P606` primeiro voo · `P729` entrada em serviço · `P2043` comprimento · `P2050` envergadura · `P2048` altura · `P2067` massa · `P2052` velocidade · `P516` motor · `P31`/`P279` tipo.
   - Converta para o padrão do site (m, kg, km/h ou Mach, km) e guarde também o valor original.
3. **Resumo em português**: `https://pt.wikipedia.org/api/rest_v1/page/summary/{título}`, exibido com "Fonte: Wikipedia (CC BY-SA 4.0)" e link. Sem artigo em PT? Traduza o resumo em inglês com a skill `traducao-ptbr` e marque "Traduzido da Wikipedia em inglês".
4. **Fotos**: primeiro Wikimedia Commons (categoria do equipamento; pegue `extmetadata` → `Artist` e `LicenseShortName`), depois DVIDS para equipamentos dos EUA. Guarde autor, licença e link em `midias`. Sem foto livre → placeholder do design system, nunca imagem de terceiros.
5. **Gravar** em `equipamentos.specs` neste formato:

```json
{
  "velocidade_max": { "valor": 1.6, "unidade": "mach", "fonte": "Wikidata", "url": "https://www.wikidata.org/wiki/Q..." },
  "comprimento":    { "valor": 15.7, "unidade": "m",   "fonte": "Wikidata", "url": "..." }
}
```

## Regras

- **Cada campo tem sua fonte.** Se o Wikidata não tem o dado, deixe o campo vazio; não preencha de memória. Se as fontes divergem, mostre o intervalo e as duas fontes.
- Rotule como "aproximado" os valores marcados como estimativa ou sigilosos.
- Campos permitidos: dimensões, massa, velocidade, alcance/raio, teto, tripulação, motorização, armamento **por tipo e calibre** (ex.: "canhão de 120 mm", "4 pontos internos"), operadores, datas, custo unitário com fonte.
- **Não publicar**: vulnerabilidades, assinaturas eletrônicas, frequências, táticas de neutralização, instruções de modificação ou manutenção.
- Comparador (`/arsenal/comparar`): só compare campos que os dois itens têm com fonte; barras proporcionais ao maior valor.

## Categorias e slugs

`cacas`, `tanques`, `embarcacoes`, `avioes`, `helicopteros`, `armamento`, `drones`, `defesa-aerea`. Slug do item: nome em minúsculas, sem acento, com hífens (`gripen-e-f-39`).

## Lista inicial (da referência visual)

F-35A Lightning II, Su-57, Rafale, Gripen E/F-39, Leopard 2A7, M1A2 Abrams, T-90M, USS Gerald R. Ford, Type 055, Classe Riachuelo, B-21 Raider, KC-390 Millennium, M142 HIMARS, Bayraktar TB2, MQ-9 Reaper.
