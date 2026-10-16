# DESIGN — Arena de Segurança (uma página)

Derivado da skill `design-taste-frontend` (pasta `.claude/skills/`). O mesmo sistema serve a Arena, o `/estado`, a app de memória e os slides.

## Ideia
Um jogo de segurança tem o aspeto de um **painel de sinais**: fundo calmo, tinta forte e quatro cores de estado com significado fixo. A cor nunca é decoração: ou é ação (azul), ou é estado.

## Tokens (CSS custom properties, únicos valores permitidos)

| Papel | Claro | Escuro (`/estado` no projetor) |
|---|---|---|
| `--bg` fundo | `#f2f2ef` | `#0f1311` |
| `--surface` superfície (um degrau de tom) | `#e6e6e1` | `#1a201d` |
| `--surface-2` segundo degrau | `#d9dad3` | `#252c28` |
| `--ink` texto | `#121614` | `#e8ede9` |
| `--muted` notas secundárias | `#545c57` | `#9ba59f` |
| `--accent` ação principal (< 5% do ecrã) | `#1a4be0` | `#7d9bff` |
| `--accent-ink` texto sobre accent | `#ffffff` | `#0b1020` |
| `--estado-cinza` por fazer | `#c4c7c1` | `#3a423e` |
| `--estado-amarelo` a trabalhar | `#f1c232` | `#f1c232` |
| `--estado-verde` passou | `#1e9e57` | `#2fbf6c` |
| `--estado-vermelho` falhou | `#d2463f` | `#ef5b52` |

Proibido: gradientes, sombras em elementos parados, blur, violeta/índigo, creme com terracota, linhas finas a separar blocos e bordas de 1px em caixas. As superfícies separam-se por degraus de tom.

## Tipo
- **Uma família:** `Bricolage Grotesque` (variável, local em `/fonts/`), fallback `system-ui, sans-serif`.
- **Três tamanhos visíveis:**
  - display `clamp(2.5rem, 6vw, 5.5rem)`, peso 700, tracking `-0.035em`, leading `0.95`;
  - texto `1.0625rem` (17px), leading `1.5`;
  - pequeno `0.875rem`.
  - Títulos de secção podem usar `1.5rem`, peso 650.
- Títulos com 2 linhas no máximo e `text-wrap: balance`. Texto corrido a cor `--ink`, com 45 a 75 caracteres por linha.
- Números (pontuação, custo, tempo) com `font-variant-numeric: tabular-nums`.
- Sem monospace fora de código real (os excertos de `clica-erro` são código real e podem usar `ui-monospace`).
- Sem etiquetas pequenas em maiúsculas, sem "pills" acima de títulos, sem numeração 01/02/03, sem emoji.

## Espaço e grelha
- Margens laterais `clamp(1rem, 2.2vw, 2rem)`. Uma grelha de 12 colunas e 2 a 3 alinhamentos à esquerda na página.
- O espaço entre secções (96–160px) é claramente maior do que dentro delas (12–32px).
- No telemóvel, a composição é própria: alvos de toque com 44px ou mais, margens de 16px.

## Componentes
- **Botões:** planos, cantos **retos** (radius 0, em todo o lado), uma cor. Principal: fundo `--accent`, texto `--accent-ink`. Secundário: fundo `--surface-2`, texto `--ink`. Um só botão principal por ecrã. Nomeia a ação ("Confirmar", "Jogar", "Correr testes").
- **Foco:** `outline: 3px solid var(--accent); outline-offset: 2px` em `:focus-visible`. `::selection` no accent.
- **Opção escolhida / segmento marcado:** fundo `--ink`, texto `--bg`, sem bordas.
- **Resultado de um desafio:** faixa de cor de estado (verde/vermelho) com o texto da explicação a `--ink` sobre `--surface`.
- **Quadrado do `/estado`:** bloco de cor de estado com o id, o modelo, o tempo e o custo em `tabular-nums`. Sem bordas e sem sombras.

## Movimento
Só `transform` e `opacity`, com `cubic-bezier(.22,1,.36,1)`: carregar no botão 120ms, hover 160ms, mudança de estado de um quadrado 240ms. Respeita sempre `prefers-reduced-motion` (mantém o conteúdo, tira o movimento).

## Texto
Português de Portugal, frases curtas, sem jargão de marketing ("desbloqueia", "sem esforço", "de ponta").
