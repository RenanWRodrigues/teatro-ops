---
description: Integra uma nova fonte de dados (API, RSS ou dataset) seguindo o padrão do projeto
argument-hint: <nome ou URL da fonte> [o que ela deve alimentar no site]
---

Integre a fonte: $ARGUMENTS

1. Leia `.claude/skills/integrar-fonte-dados/SKILL.md` e `docs/APIS.md`.
2. Pesquise a documentação oficial atual da fonte: endpoint, autenticação, limites, licença e se é gratuita. Se não for gratuita, pare e me diga.
3. Registre em `config/fontes.yaml` com `status: a_verificar`.
4. Faça uma requisição real e salve a fixture. Se precisar de chave, diga exatamente onde eu cadastro e qual variável criar no `.env.local`, e espere.
5. Implemente adaptador + schema Zod + testes + script `ingest:<id>`.
6. Ligue ao job certo do workflow e liste os secrets que devo criar no GitHub.
7. Rode lint, typecheck e testes. Chame o agente `revisor-fontes`.
8. Atualize `docs/APIS.md` e marque `status: ativa`.

Ao final, me mostre: o que a fonte entrega, uma amostra normalizada (3 itens, em pt-BR), limites e licença.
