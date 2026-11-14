---
name: design-system-teatro-ops
description: Identidade visual e componentes do TEATRO//OPS. Use ao criar ou alterar qualquer página, componente, cor, tipografia, layout ou animação do site.
---

# Design system TEATRO//OPS — "central de comando"

A referência visual aprovada está em `docs/design/referencia/` (4 telas: Home, Arsenal, Ficha técnica, IA & Drones). Leia a marcação dessas telas antes de construir a página correspondente e reproduza fielmente o layout, a hierarquia e o tom. Os arquivos `.dc.html` são referência de design, não código para copiar: reescreva como componentes React + Tailwind.

## Tokens (configurar em `tailwind.config.ts` / CSS variables)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0A0C0B` | fundo da página |
| `--surface` | `#0D100F` | seções alternadas, cards |
| `--surface-2` | `#141816` | placeholders de imagem, inputs |
| `--line` | `#232825` | bordas e divisórias (1 px) |
| `--line-strong` | `#3A413C` | bordas de botões secundários |
| `--text` | `#E8EAE6` | texto principal |
| `--text-2` | `#C9CEC9` | navegação, texto secundário forte |
| `--muted` | `#9BA39D` | legendas, rótulos (passa AA sobre `--bg`) |
| `--accent` | `#F2A900` | âmbar de sinalização: CTA, números, destaques |
| `--accent-hover` | `#FFC94D` | |
| `--alert` | `#E5483D` | "ao vivo", alta intensidade (fundos e pontos) |
| `--alert-text` | `#FF8A80` | texto de alerta sobre fundo escuro |

Regra de cor: **um único acento (âmbar)**. Vermelho só para estado de alerta. Nunca gradientes decorativos, glow neon ou emoji.

## Tipografia (Google Fonts via `next/font`)

- **Barlow Condensed** 700/800 — títulos, sempre em CAIXA ALTA, `line-height` 0.85–0.95. H1 `clamp(64px, 9vw, 132px)`, H2 64 px, títulos de card 28–44 px.
- **JetBrains Mono** 400/500 — rótulos, dados, metadados, navegação; CAIXA ALTA com `letter-spacing` 0.08–0.16em; prefixo `// ` em rótulos de seção ("// 02 — ARSENAL").
- **Inter** 400/500/600 — texto corrido, 15–20 px, `line-height` 1.5–1.65.

## Linguagem visual

- Malha tática de fundo (64 px) nos heros: duas `linear-gradient` de 1 px na cor `#161A18`.
- Cantoneiras de mira (2 px âmbar) em painéis de destaque.
- Grades com `gap: 1px` sobre fundo `--line` para efeito de "tabela de comando".
- Cantos retos (radius 0). Bordas 1 px. Nada de sombras.
- Placeholders de imagem: fundo `--surface-2` com listras diagonais sutis.
- Animações: radar com varredura, ticker horizontal, ponto piscando "AO VIVO", linha de varredura no HUD. **Sempre** respeitar `prefers-reduced-motion`.

## Componentes a criar (em `components/`)

`Cabecalho`, `TickerAoVivo`, `RotuloSecao` (`// 01 — TÍTULO`), `TituloSecao`, `BotaoPrimario`, `BotaoSecundario`, `CardEquipamento`, `CardConflito`, `SeloIntensidade`, `PainelRadar`, `MapaConflitos` (MapLibre, carregado só no cliente), `FichaTecnica` (`<dl>`), `BarraComparacao`, `AbasTopicos`, `LinhaDoTempo`, `CarimboAtualizacao`, `CreditoFonte`, `Rodape`.

## Regras de acessibilidade e responsividade

- Contraste AA mínimo; `--muted` é o cinza mais claro permitido para texto pequeno.
- Alvos de toque ≥ 44 px. `<button>` e `<a href>` reais. Ícones só SVG com `aria-hidden` ou `aria-label`.
- Layouts com `flex-wrap`/`grid auto-fit`; testar em 375, 768, 1280 e 1440 px.
- Mapa e gráficos sempre têm alternativa em texto/tabela.

## Microcopy (pt-BR)

Tom: direto, sóbrio, informativo, sem sensacionalismo. Exemplos: "Abrir mapa de conflitos", "Explorar arsenal", "Atualizado em 14/11/2026 às 11h20", "Fonte: ACLED", "Estimativa — números podem mudar".
