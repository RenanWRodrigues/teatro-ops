---
name: traducao-ptbr
description: Pipeline gratuito de tradução e resumo para Português do Brasil, com cache, glossário militar e controle de cota. Use ao traduzir títulos, resumos, tipos de evento, nomes de órgãos ou qualquer texto vindo de fonte estrangeira, e ao revisar textos em pt-BR do site.
---

# Tradução e resumo em pt-BR

## Ordem de tentativa (`lib/traducao/traduzir.ts`)

1. **Já está em português?** (fonte pt-BR, Wikipedia PT) → usar direto.
2. **Cache** `traducoes_cache` por `sha256(texto + idioma_origem)` → usar.
3. **Glossário** `config/glossario-militar.csv`: termos fixos são protegidos antes da tradução e reaplicados depois (e cadastrados como glossário no DeepL).
4. **DeepL API Free** (`https://api-free.deepl.com/v2/translate`, `target_lang=PT-BR`, cabeçalho `Authorization: DeepL-Auth-Key $DEEPL_API_KEY`). Antes de cada lote, consulte `/v2/usage`; se faltarem menos de 20 mil caracteres no mês, pule para o passo 5.
5. **Argos Translate / LibreTranslate** auto-hospedado (`LIBRETRANSLATE_URL`), grátis e sem cota.
6. Se tudo falhar → salvar `titulo_pt = null` e exibir o título original com o selo "Tradução pendente". Nunca bloquear a ingestão.

Registre o `motor` usado e conte `caracteres_traduzidos` em `execucoes_ingestao`. O comando `/auditar-custos` lê esses números.

## O que traduzir (economia de cota)

- Sempre: títulos, nomes de órgãos, tipos de evento.
- Resumo: gere **2 frases próprias** em pt-BR a partir de título + descrição. Opção A: regra simples (título traduzido + órgão/fonte + data). Opção B (opcional, se `GEMINI_API_KEY` existir): Gemini Flash no plano gratuito, com o prompt abaixo. O site precisa funcionar sem a opção B.
- Nunca traduzir o corpo inteiro de artigos.

### Prompt de resumo (opção B)

```
Você é editor de um portal brasileiro de informação sobre defesa e conflitos.
Escreva em Português do Brasil um resumo NEUTRO de no máximo 2 frases (até 280 caracteres)
com base apenas no título e na descrição abaixo. Atribua afirmações à fonte
("segundo <fonte>…"). Não acrescente fatos, números ou opiniões que não estejam no texto.
Não inclua detalhes operacionais (como fabricar, modificar ou empregar armas).
Responda só com o resumo.

Fonte: {fonte}
Título: {titulo}
Descrição: {descricao}
```

## Convenções de pt-BR

- Datas: `14/11/2026`; horário de Brasília com `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`.
- Números: `1.090 km`, `Mach 1,6`, `15,7 m`. Unidades métricas; manter "Mach"; "nós" para navios; "pés" só entre parênteses.
- Nomes próprios de equipamentos não se traduzem (F-35A Lightning II, Leopard 2A7, Bayraktar TB2).
- Países e órgãos em português: Estados Unidos, Rússia, China, Irã, Israel, Ucrânia, Alemanha; "Departamento de Defesa dos EUA", "Ministério da Defesa da Rússia", "Casa Branca", "Kremlin", "Knesset", "Bundestag".
- Siglas: explique na primeira ocorrência, como em "OTAN (Organização do Tratado do Atlântico Norte)". Use OTAN, não NATO; ONU, não UN; prefira "drone" a "VANT" no texto corrido.
- Evite anglicismos quando há termo consagrado: "munição de espera" (loitering munition), "guerra eletrônica", "interferência" (jamming), "falsificação de sinal" (spoofing), "enxame" (swarm).
