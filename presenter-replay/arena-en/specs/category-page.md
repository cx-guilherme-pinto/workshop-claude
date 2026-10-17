# Task `category-page` — the page for one category

Write **only** `pages/category.js`: an ES module that the app (`public/app.js`) imports when the player opens `#/category/<id>`. Until the file exists, the app shows "Not built yet — swarm wave 2".

The look is already done in `public/styles.css`, which follows `DESIGN.md`. Do not write CSS. Use exactly the classes and attributes in this spec, and the CSS draws the rest.

## What it exports

```js
export function renderCategory(container, { category, cards, progress, open })
```

| Parameter | Shape |
|---|---|
| `container` | The element you draw into. Replace all of its content with `container.replaceChildren(...)`. |
| `category` | `{ id: 'web', name: 'Web (XSS, SQLi, CSRF)' }` |
| `cards` | `[{ id, title, difficulty, template, status }]`, in the order they are shown. `difficulty` is 1, 2 or 3. `status` is `'playable'` or `'not_built'`. |
| `progress` | `{ [id]: { correct: boolean } }`. A card with no entry has not been played yet. Ignore entries for other cards. |
| `open` | `(id) => void`. Call it when the player clicks a playable card. The app opens the card. |

## The status of each card

Work it out in this order and write it in the `data-status` attribute of the `<li>`:

| `data-status` | When | Text in `.tile-status` |
|---|---|---|
| `not_built` | `card.status === 'not_built'` (always wins over progress) | `Not built yet` |
| `solved` | `progress[id].correct === true` (only `true` counts) | `Solved` |
| `wrong` | there is an entry in `progress[id]`, but `correct` is not `true` | `Wrong, try again` |
| `not_played` | there is no entry | `Not played` |

Points for a card: `difficulty × 10`.

## The structure you must create

```html
<section class="category" data-category="web">
  <header class="page-header">
    <h1 class="page-title">Web (XSS, SQLi, CSRF)</h1>
    <p class="page-summary" data-summary>1 of 4 solved · 10 points</p>
  </header>
  <ul class="tiles">
    <li class="tile-item" data-card="web-01" data-status="solved">
      <button class="tile" type="button" data-open="web-01">
        <span class="tile-title">Find the SQL injection</span>
        <span class="tile-meta">Level 1 · 10 points</span>
        <span class="tile-status">Solved</span>
      </button>
    </li>
    <!-- one <li> per card, in the order of `cards` -->
  </ul>
</section>
```

- **Summary** (`data-summary`): `X of Y solved · P points`. `Y` is the total number of cards received (including the ones not built yet). `X` and `P` count only the `solved` ones.
- **Click:** the `<button>` calls `open(card.id)` once. On a `not_built` card, the button has the `disabled` attribute **and** the handler does not call `open`, even if the click gets through.
- **Empty list:** if `cards` is empty, instead of the `<ul>` show `<p class="page-empty">No cards in this category yet.</p>`.
- Drawing twice into the same `container` must not duplicate anything.

## How to create the DOM

Use `h()` from `../templates/common.js`. It creates elements with `textContent` and only accepts attributes from a list (`class`, `type`, `disabled`, `aria-*`, `data-*` and a few more).

```js
import { h } from '../templates/common.js';

export function renderCategory(container, { category, cards = [], progress = {}, open = () => {} }) {
  const doc = container.ownerDocument;
  // h(doc, 'button', { class: 'tile', type: 'button', 'data-open': id, disabled: true, on: { click: fn } }, child1, child2)
  // h(doc, 'span', { class: 'tile-title', text: title })
  // h(doc, 'p', { class: 'page-summary', 'data-summary': '', text: '…' })
  container.replaceChildren(h(doc, 'section', { class: 'category', 'data-category': category.id } /* , … */));
}
```

`disabled: true` creates the attribute; `disabled: false` creates nothing.

## Rules (the test checks them)

1. **Safe DOM:** only `h()`, `textContent` and `replaceChildren`. Never `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval` or `Function`. A title like `<img src=x onerror=alert(1)>` shows up as text.
2. **No `document` or `window`:** use `container.ownerDocument`. The test runs in Node, with a fake DOM.
3. **Imports only from `../templates/*.js` and `../lib/*.js`.** No `fetch`, `localStorage` or `import()`.
4. **Text** in plain English, exactly as in this spec: no emoji and no labels in capital letters (see `DESIGN.md`).
5. Do not touch any other file.

## Check

```
node --test pages/category.test.js
```

passes with no errors. To see the page: `node server.js` and open the address it prints with `#/category/web` at the end (usually `http://localhost:3000/#/category/web`).
