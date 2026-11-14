---
description: Confere se o projeto continua 100% gratuito e dentro das cotas
---

Faça uma auditoria de custos e cotas:

1. Liste todas as dependências externas (serviços, APIs, pacotes com serviço pago associado) encontradas no código, em `config/fontes.yaml` e nas variáveis de `.env.example`.
2. Para cada serviço, confira o plano gratuito atual na página oficial (limites, exigência de cartão, restrição comercial) e compare com o uso real:
   - DeepL: `GET /v2/usage` e soma de `caracteres_traduzidos` do mês em `execucoes_ingestao`.
   - Gemini (se usado): quantidade de chamadas por dia.
   - GitHub Actions: minutos usados no mês (`gh api /repos/{owner}/{repo}/actions/...` se disponível).
   - Supabase: tamanho do banco (`select pg_size_pretty(pg_database_size(current_database()))`).
3. Aponte qualquer item que esteja a mais de 70% da cota ou que tenha mudado de regra, com a alternativa gratuita.
4. Entregue uma tabela em pt-BR: serviço · limite grátis · uso atual · risco · ação.
