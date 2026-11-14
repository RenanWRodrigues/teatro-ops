---
description: Cadastra um equipamento militar com ficha técnica, resumo em pt-BR e fotos livres
argument-hint: <nome do equipamento> [categoria]
---

Cadastre o equipamento: $ARGUMENTS

Siga `.claude/skills/ficha-equipamento/SKILL.md` à risca:
1. Encontre o QID no Wikidata e confirme comigo se houver ambiguidade (ex.: variantes).
2. Busque as especificações via SPARQL; cada campo com fonte e URL. Não preencha nada de memória.
3. Busque o resumo na Wikipedia em português (ou traduza do inglês e marque).
4. Busque até 6 fotos com licença livre no Wikimedia Commons e/ou DVIDS, com autor e licença.
5. Grave em `equipamentos` e `midias` (ou gere um seed SQL se o banco não estiver configurado).
6. Mostre uma prévia da ficha em tabela pt-BR, com as fontes, e liste os campos que ficaram vazios.
