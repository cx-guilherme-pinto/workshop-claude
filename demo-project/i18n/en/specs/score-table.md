# Task `score-table` — score table

Write **only** `pages/score.js`: an ES module that the app (`public/app.js`) imports when the player opens `#/score`. Until the file exists, the app shows "Not built yet — swarm wave 2".

The look is already done in `public/styles.css`, which follows `DESIGN.md`. Do not write CSS. Use exactly the classes and attributes in this spec. Numbers use `tabular-nums` thanks to the `number` class.

## What it exports

```js
export function renderScore(container, { categories, cards, progress })
```

| Parameter | Shape |
|---|---|
| `container` | The element you draw into. Replace all of its content with `container.replaceChildren(...)`. |
| `categories` | `[{ id: 'web', name: 'Web (XSS, SQLi, CSRF)' }]`. One row per category, in this order, even if it has no cards. |
| `cards` | `[{ id, category, difficulty }]`. `category` is the `id` of a category; `difficulty` is 1, 2 or 3. |
| `progress` | `{ [id]: { correct: boolean } }`. Only `correct === true` counts. Ignore entries for cards that are not in `cards`. |

## Calculations

- Points for a solved card: `difficulty × 10`. An unsolved card is worth 0.
- Per category: `solved of cards` (for example `1 of 3`) and the sum of the points.
- Total: the sum of the rows.
- Maximum possible: the sum of `difficulty × 10` over all the cards in the categories.

## The structure you must create

```html
<section class="score">
  <header class="page-header">
    <h1 class="page-title">Score</h1>
    <p class="page-summary" data-summary>You have 50 points out of 90 possible.</p>
  </header>
  <table class="score-table">
    <thead>
      <tr><th>Category</th><th class="number">Solved</th><th class="number">Points</th></tr>
    </thead>
    <tbody>
      <tr data-category="web">
        <th>Web (XSS, SQLi, CSRF)</th>
        <td class="number" data-solved>1 of 3</td>
        <td class="number" data-points>20</td>
      </tr>
      <!-- one row per category -->
    </tbody>
    <tfoot>
      <tr class="total" data-total>
        <th>Total</th>
        <td class="number" data-solved>3 of 5</td>
        <td class="number" data-points>50</td>
      </tr>
    </tfoot>
  </table>
</section>
```

- `data-points` contains **only the number** (`20`, not `20 points`).
- `data-solved` contains `X of Y`.
- Summary (`data-summary`): `You have P points out of M possible.`
- Drawing twice into the same `container` must not duplicate the table.

## How to create the DOM

Use `h()` from `../templates/common.js`. It creates elements with `textContent` and only accepts attributes from a list (`class`, `aria-*`, `data-*` and a few more; `scope` is not on the list and is not needed).

```js
import { h } from '../templates/common.js';

export function renderScore(container, { categories = [], cards = [], progress = {} }) {
  const doc = container.ownerDocument;
  // h(doc, 'td', { class: 'number', 'data-points': '', text: String(points) })
  // h(doc, 'tr', { 'data-category': cat.id }, h(doc, 'th', { text: cat.name }), …)
  container.replaceChildren(h(doc, 'section', { class: 'score' } /* , … */));
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
node --test pages/score.test.js
```

passes with no errors. To see the page: `node server.js` and open the address it prints with `#/score` at the end (usually `http://localhost:3000/#/score`).
