# DESIGN — Security Arena (one page)

Derived from the `design-taste-frontend` skill (folder `.claude/skills/`). The same system is used for the Arena, `/status`, the memory app and the slides.

## Idea
A security game looks like a **signal board**: a calm background, strong ink and four status colors with a fixed meaning. Color is never decoration: it is either action (blue) or status.

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
| `--status-gray` to do | `#c4c7c1` | `#3a423e` |
| `--status-yellow` working | `#f1c232` | `#f1c232` |
| `--status-green` passed | `#1e9e57` | `#2fbf6c` |
| `--status-red` failed | `#d2463f` | `#ef5b52` |

Forbidden: gradients, shadows on elements at rest, blur, violet/indigo, cream with terracotta, thin lines separating blocks and 1px borders on boxes. Surfaces are separated by tone steps.

## Type
- **One family:** `Bricolage Grotesque` (variable, local in `/fonts/`), fallback `system-ui, sans-serif`.
- **Three visible sizes:**
  - display `clamp(2.5rem, 6vw, 5.5rem)`, weight 700, tracking `-0.035em`, leading `0.95`;
  - body `1.0625rem` (17px), leading `1.5`;
  - small `0.875rem`.
  - Section titles may use `1.5rem`, weight 650.
- Titles with 2 lines at most and `text-wrap: balance`. Running text in `--ink`, with 45 to 75 characters per line.
- Numbers (score, cost, time) with `font-variant-numeric: tabular-nums`.
- No monospace outside real code (the `spot-the-flaw` excerpts are real code and may use `ui-monospace`).
- No small labels in capital letters, no "pills" above titles, no 01/02/03 numbering, no emoji.

## Space and grid
- Side margins `clamp(1rem, 2.2vw, 2rem)`. A 12-column grid and 2 to 3 left alignments on the page.
- The space between sections (96–160px) is clearly larger than inside them (12–32px).
- On phones, the layout is its own: touch targets of 44px or more, 16px margins.

## Components
- **Buttons:** flat, **square** corners (radius 0, everywhere), one color. Primary: `--accent` background, `--accent-ink` text. Secondary: `--surface-2` background, `--ink` text. Only one primary button per screen. Name the action ("Confirm", "Play", "Run tests").
- **Focus:** `outline: 3px solid var(--accent); outline-offset: 2px` on `:focus-visible`. `::selection` in the accent.
- **Chosen option / marked segment:** `--ink` background, `--bg` text, no borders.
- **Result of a challenge:** a band in the status color (green/red) with the explanation text in `--ink` on `--surface`.
- **Square in `/status`:** a block in the status color with the id, the model, the time and the cost in `tabular-nums`. No borders and no shadows.

## Motion
Only `transform` and `opacity`, with `cubic-bezier(.22,1,.36,1)`: button press 120ms, hover 160ms, a square changing status 240ms. Always respect `prefers-reduced-motion` (keep the content, remove the motion).

## Text
Plain English, short sentences, no marketing jargon ("unlock", "effortless", "cutting-edge").
