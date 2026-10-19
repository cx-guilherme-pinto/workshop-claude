# DESIGN — Canivete (uma página)

O mesmo sistema da Arena de Segurança (`demo-project/DESIGN.md`), derivado da skill `design-taste-frontend`. Serve a casca, o `/status`, a app de memória e os slides.

## Ideia
Um canivete é uma **bancada de trabalho**: fundo calmo, tinta forte, campos onde se escreve e um resultado grande que se lê de relance. A cor nunca é decoração: ou é ação (azul), ou é estado (cinzento por construir, amarelo a ser escrita por um agente, verde passou, vermelho falhou ou erro).

## Tokens (CSS custom properties, únicos valores permitidos)

| Papel | Claro | Escuro (`/status` no projetor) |
|---|---|---|
| `--bg` fundo | `#f2f2ef` | `#0f1311` |
| `--surface` superfície (um degrau de tom) | `#e6e6e1` | `#1a201d` |
| `--surface-2` segundo degrau | `#d9dad3` | `#252c28` |
| `--ink` texto | `#121614` | `#e8ede9` |
| `--muted` notas secundárias | `#545c57` | `#9ba59f` |
| `--accent` ação principal (< 5% do ecrã) | `#1a4be0` | `#7d9bff` |
| `--accent-ink` texto sobre accent | `#ffffff` | `#0b1020` |
| `--status-gray` por fazer, por construir | `#c4c7c1` | `#3a423e` |
| `--status-yellow` a trabalhar | `#f1c232` | `#f1c232` |
| `--status-green` passou, pronta | `#1e9e57` | `#2fbf6c` |
| `--status-red` falhou, erro | `#d2463f` | `#ef5b52` |

Proibido: gradientes, sombras em elementos parados, blur, violeta/índigo, creme com terracota, linhas finas a separar blocos e bordas de 1px em caixas. As superfícies separam-se por degraus de tom. Os campos de texto têm só um traço de 3px por baixo, a `--ink`.

## Tipo
- **Uma família:** `Bricolage Grotesque` (variável, local em `/fonts/`), fallback `system-ui, sans-serif`.
- **Três tamanhos visíveis:**
  - display `clamp(2.5rem, 6vw, 5.5rem)`, peso 700, tracking `-0.035em`, leading `0.95` (o título da página, o título de uma ferramenta e um resultado que é um só número);
  - texto `1.0625rem` (17px), leading `1.5`;
  - pequeno `0.875rem`.
  - Títulos de secção, os campos e os resultados em texto podem usar `1.5rem`, peso 600 a 650.
- Títulos com 2 linhas no máximo e `text-wrap: balance`. Texto corrido a cor `--ink`, com 45 a 75 caracteres por linha.
- Números (resultados, contagens, custo, tempo) com `font-variant-numeric: tabular-nums`.
- Sem monospace fora de código real: só os resultados das ferramentas de Dev (JSON, Base64, UUID) podem usar `ui-monospace`.
- Sem etiquetas pequenas em maiúsculas, sem "pills" acima de títulos, sem numeração 01/02/03, sem emoji.

## Espaço e grelha
- Margens laterais `clamp(1rem, 2.2vw, 2rem)`. Uma grelha de 12 colunas e 2 a 3 alinhamentos à esquerda na página.
- Página inicial: o título e o texto à esquerda, as contagens à direita; a pesquisa por baixo; cada categoria com o nome nas colunas 1 a 3 e as ferramentas nas colunas 4 a 12.
- Painel de uma ferramenta: as entradas nas colunas 1 a 5, o resultado nas colunas 7 a 12 (fica à vista ao descer).
- O espaço entre secções é claramente maior do que dentro delas (12–32px).
- No telemóvel, a composição é própria: uma coluna, alvos de toque com 44px ou mais, margens de 16px.

## Componentes
- **Botões:** planos, cantos **retos** (radius 0, em todo o lado), uma cor. Principal: fundo `--accent`, texto `--accent-ink`. Secundário: fundo `--surface-2`, texto `--ink`. Um só botão principal por ecrã ("Correr testes" na página inicial, "Gerar outra vez" num gerador). Nomeia a ação.
- **Foco:** `outline: 3px solid var(--accent); outline-offset: 2px` em `:focus-visible`. `::selection` no accent.
- **Opção escolhida / segmento marcado:** fundo `--ink`, texto `--bg`, sem bordas.
- **Ferramenta na grelha:** um bloco a `--surface` quando está pronta (é para usar), com um quadrado verde antes de "Pronta"; a cor de estado quando ainda não está (cinzento, amarelo, vermelho). Na vista "Testes", a cor vem do resultado do `tool.test.js`.
- **Sentido de uma conversão:** o sentido atual em texto grande e o botão "Trocar o sentido" ao lado, na mesma faixa a `--surface`.
- **Resultado:** a `--surface`. Campos como linhas etiqueta → valor; listas como listas; um número em display. Um erro é a faixa inteira a `--status-red`, com a mensagem a `--on-red`.
- **Quadrado do `/status`:** bloco de cor de estado com o id, o modelo, o tempo e o custo em `tabular-nums`. Sem bordas e sem sombras.

## Movimento
Só `transform` e `opacity`, com `cubic-bezier(.22,1,.36,1)`: carregar no botão 120ms, hover 160ms, mudança de estado de um quadrado ou de uma ferramenta 240ms. O resultado muda a cada tecla e não tem animação. Respeita sempre `prefers-reduced-motion` (mantém o conteúdo, tira o movimento).

## Texto
Português de Portugal, frases curtas, sem jargão de marketing ("desbloqueia", "sem esforço", "de ponta"). Todo o texto da casca está em `lib/texts.js`.
