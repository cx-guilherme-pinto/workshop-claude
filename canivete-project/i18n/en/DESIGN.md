# DESIGN — Pocketknife (one page)

The same system as the Security Arena (`demo-project/DESIGN.md`), derived from the `design-taste-frontend` skill. It is used for the shell, `/status`, the memory app and the slides.

## Idea
A pocketknife is a **workbench**: a calm background, strong ink, fields you type in and a big result you read at a glance. Color is never decoration: it is either action (blue) or status (gray to build, yellow being written by an agent, green passed, red failed or error).

## Tokens (CSS custom properties, the only values allowed)

| Role | Light | Dark (`/status` on the projector) |
|---|---|---|
| `--bg` background | `#f2f2ef` | `#0f1311` |
| `--surface` surface (one tone step) | `#e6e6e1` | `#1a201d` |
| `--surface-2` second step | `#d9dad3` | `#252c28` |
| `--ink` text | `#121614` | `#e8ede9` |
| `--muted` secondary notes | `#545c57` | `#9ba59f` |
| `--accent` main action (< 5% of the screen) | `#1a4be0` | `#7d9bff` |
| `--accent-ink` text on accent | `#ffffff` | `#0b1020` |
| `--status-gray` to do, to build | `#c4c7c1` | `#3a423e` |
| `--status-yellow` working | `#f1c232` | `#f1c232` |
| `--status-green` passed, ready | `#1e9e57` | `#2fbf6c` |
| `--status-red` failed, error | `#d2463f` | `#ef5b52` |

Forbidden: gradients, shadows on elements at rest, blur, violet/indigo, cream with terracotta, thin lines separating blocks and 1px borders on boxes. Surfaces are separated by tone steps. Text fields only have a 3px line underneath, in `--ink`.

## Type
- **One family:** `Bricolage Grotesque` (variable, local in `/fonts/`), fallback `system-ui, sans-serif`.
- **Three visible sizes:**
  - display `clamp(2.5rem, 6vw, 5.5rem)`, weight 700, tracking `-0.035em`, leading `0.95` (the page title, the title of a tool and a result that is a single number);
  - body `1.0625rem` (17px), leading `1.5`;
  - small `0.875rem`.
  - Section titles, the fields and text results may use `1.5rem`, weight 600 to 650.
- Titles with 2 lines at most and `text-wrap: balance`. Running text in `--ink`, with 45 to 75 characters per line.
- Numbers (results, counts, cost, time) with `font-variant-numeric: tabular-nums`.
- No monospace outside real code: only the results of the Dev tools (JSON, Base64, UUIDs) may use `ui-monospace`.
- No small labels in capital letters, no "pills" above titles, no 01/02/03 numbering, no emoji.

## Space and grid
- Side margins `clamp(1rem, 2.2vw, 2rem)`. A 12-column grid and 2 to 3 left alignments on the page.
- Home page: the title and the text on the left, the counts on the right; the search below; each category with its name in columns 1 to 3 and its tools in columns 4 to 12.
- Panel of a tool: the inputs in columns 1 to 5, the result in columns 7 to 12 (it stays in view when you scroll).
- The space between sections is clearly larger than inside them (12–32px).
- On phones, the layout is its own: one column, touch targets of 44px or more, 16px margins.

## Components
- **Buttons:** flat, **square** corners (radius 0, everywhere), one color. Primary: `--accent` background, `--accent-ink` text. Secondary: `--surface-2` background, `--ink` text. Only one primary button per screen ("Run tests" on the home page, "Generate again" in a generator). Name the action.
- **Focus:** `outline: 3px solid var(--accent); outline-offset: 2px` on `:focus-visible`. `::selection` in the accent.
- **Chosen option / marked segment:** `--ink` background, `--bg` text, no borders.
- **Tool in the grid:** a block on `--surface` when it is ready (it is there to be used), with a green square before "Ready"; the status color while it is not (gray, yellow, red). In the "Tests" view, the color comes from the result of `tool.test.js`.
- **Direction of a conversion:** the current direction in large text and the "Swap the direction" button next to it, in the same band on `--surface`.
- **Result:** on `--surface`. Fields as label → value rows; lists as lists; a number in display. An error is the whole band in `--status-red`, with the message in `--on-red`.
- **Square in `/status`:** a block in the status color with the id, the model, the time and the cost in `tabular-nums`. No borders and no shadows.

## Motion
Only `transform` and `opacity`, with `cubic-bezier(.22,1,.36,1)`: button press 120ms, hover 160ms, a square or a tool changing status 240ms. The result changes on every key and has no animation. Always respect `prefers-reduced-motion` (keep the content, remove the motion).

## Text
Plain English, short sentences, no marketing jargon ("unlock", "effortless", "cutting-edge"). All the text of the shell is in `lib/texts.js`.
