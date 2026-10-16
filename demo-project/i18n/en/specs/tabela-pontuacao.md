# Task `tabela-pontuacao` — score table

Write **only** `pages/pontuacao.js`: an ES module that the app (`public/app.js`) imports when the player opens `#/pontuacao`. Until the file exists, the app shows "Not built yet — swarm wave 2".

The look is already done in `public/styles.css`, which follows `DESIGN.md`. Do not write CSS. Use exactly the classes and attributes in this spec. Numbers use `tabular-nums` thanks to the `numero` class.

## What it exports

```js
export function renderPontuacao(container, { categorias, cartoes, progresso })
```

| Parameter | Shape |
|---|---|
| `container` | The element you draw into. Replace all of its content with `container.replaceChildren(...)`. |
| `categorias` | `[{ id: 'web', nome: 'Web (XSS, SQLi, CSRF)' }]`. One row per category, in this order, even if it has no cards. |
| `cartoes` | `[{ id, category, difficulty }]`. `category` is the `id` of a category; `difficulty` is 1, 2 or 3. |
| `progresso` | `{ [id]: { certo: boolean } }`. Only `certo === true` counts. Ignore entries for cards that are not in `cartoes`. |

## Calculations

- Points for a solved card: `difficulty × 10`. An unsolved card is worth 0.
- Per category: `solved of cards` (for example `1 of 3`) and the sum of the points.
- Total: the sum of the rows.
- Maximum possible: the sum of `difficulty × 10` over all the cards in the categories.

## The structure you must create

```html
<section class="pontuacao">
  <header class="pagina-cabecalho">
    <h1 class="pagina-titulo">Score</h1>
    <p class="pagina-resumo" data-resumo>You have 50 points out of 90 possible.</p>
  </header>
  <table class="tabela-pontos">
    <thead>
      <tr><th>Category</th><th class="numero">Solved</th><th class="numero">Points</th></tr>
    </thead>
    <tbody>
      <tr data-categoria="web">
        <th>Web (XSS, SQLi, CSRF)</th>
        <td class="numero" data-resolvidos>1 of 3</td>
        <td class="numero" data-pontos>20</td>
      </tr>
      <!-- one row per category -->
    </tbody>
    <tfoot>
      <tr class="total" data-total>
        <th>Total</th>
        <td class="numero" data-resolvidos>3 of 5</td>
        <td class="numero" data-pontos>50</td>
      </tr>
    </tfoot>
  </table>
</section>
```

- `data-pontos` contains **only the number** (`20`, not `20 points`).
- `data-resolvidos` contains `X of Y`.
- Summary (`data-resumo`): `You have P points out of M possible.`
- Drawing twice into the same `container` must not duplicate the table.

## How to create the DOM

Use `h()` from `../templates/common.js`. It creates elements with `textContent` and only accepts attributes from a list (`class`, `aria-*`, `data-*` and a few more; `scope` is not on the list and is not needed).

```js
import { h } from '../templates/common.js';

export function renderPontuacao(container, { categorias = [], cartoes = [], progresso = {} }) {
  const doc = container.ownerDocument;
  // h(doc, 'td', { class: 'numero', 'data-pontos': '', text: String(pontos) })
  // h(doc, 'tr', { 'data-categoria': cat.id }, h(doc, 'th', { text: cat.nome }), …)
  container.replaceChildren(h(doc, 'section', { class: 'pontuacao' } /* , … */));
}
```

## Rules (the test checks them)

1. **Safe DOM:** only `h()`, `textContent` and `replaceChildren`. Never `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval` or `Function`. A name like `<img src=x onerror=alert(1)>` shows up as text.
2. **No `document` or `window`:** use `container.ownerDocument`. The test runs in Node, with a fake DOM.
3. **Imports only from `../templates/*.js` and `../lib/*.js`.** No `fetch`, `localStorage` or `import()`.
4. **Text** in plain English, exactly as in this spec: no emoji and no labels in capital letters (see `DESIGN.md`).
5. Do not touch any other file.

## Check

```
node --test pages/pontuacao.test.js
```

passes with no errors. To see the page: `node server.js` and open `http://localhost:3000/#/pontuacao`.
