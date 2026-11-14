# TEATRO//OPS

Portal em Português do Brasil sobre conflitos no mundo, arsenal militar, táticas, guerra tecnológica (IA e drones) e decisões de governos. Construído só com serviços gratuitos.

## Começar

1. Instale o [Claude Code](https://docs.claude.com/en/docs/claude-code) e o Node LTS + pnpm.
2. Faça os cadastros da **Fase 0** em `PROMPTS.md`.
3. `cp .env.example .env.local` e preencha as chaves.
4. Abra o terminal nesta pasta, rode `claude` e siga `PROMPTS.md` fase por fase.

## O que já vem pronto

| Arquivo | Para quê |
|---|---|
| `CLAUDE.md` | Regras do projeto que o Claude Code lê em toda sessão |
| `PROMPTS.md` | Roteiro de prompts, da Fase 0 à 11 |
| `.claude/skills/` | 6 Skills: design system, integração de fontes, tradução pt-BR, fichas técnicas, monitor de governos, política editorial |
| `.claude/agents/` | 3 revisores: fontes/licenças, português, acessibilidade |
| `.claude/commands/` | `/nova-fonte`, `/novo-equipamento`, `/verificar-fontes`, `/auditar-custos`, `/revisar-pagina` |
| `.claude/settings.json` | Permissões (bloqueia leitura do `.env.local`, pede confirmação antes de push/deploy) |
| `docs/APIS.md` | Catálogo das fontes gratuitas, com autenticação, limites e licença |
| `docs/ARQUITETURA.md` | Fluxo de dados, agenda de ingestão e rotas |
| `docs/MODELO-DADOS.md` | SQL do banco |
| `docs/design/referencia/` | As 4 telas aprovadas (Home, Arsenal, Ficha, IA & Drones) |
| `config/fontes.yaml` | Registro de todas as fontes |
| `config/glossario-militar.csv` | Termos fixos EN → pt-BR |
| `.github/workflows/ingestao.yml` | Coleta agendada no GitHub Actions |
