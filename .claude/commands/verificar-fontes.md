---
description: Testa todas as fontes de config/fontes.yaml e atualiza o status de cada uma
---

1. Rode `pnpm fontes:verificar` (se o script ainda não existir, crie-o em `scripts/verificar-fontes.ts`: para cada fonte, faz 1 requisição respeitando o limite, valida contra o schema Zod do adaptador quando houver e mede o tempo de resposta).
2. Para cada fonte, classifique: `ativa` (200 + schema ok), `quebrada` (erro, 4xx/5xx, schema falhou, feed vazio há mais de 7 dias), `a_verificar` (sem adaptador ainda).
3. Para as quebradas, investigue a causa (URL mudou? exige appname/token novo? mudou de formato?) e proponha a correção; procure a URL nova na página oficial.
4. Atualize `status` e `ultima_verificacao` em `config/fontes.yaml`.
5. Me entregue uma tabela em pt-BR: fonte · status · tempo · observação.
