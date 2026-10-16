# Task `pagina-categoria` — the page for one category

Write **only** `pages/categoria.js`: an ES module that the app (`public/app.js`) imports when the player opens `#/categoria/<id>`. Until the file exists, the app shows "Not built yet — swarm wave 2".

The look is already done in `public/styles.css`, which follows `DESIGN.md`. Do not write CSS. Use exactly the classes and attributes in this spec, and the CSS draws the rest.

## What it exports

```js
export function renderCategoria(container, { categoria, cartoes, progresso, abrir })
```

| Parameter | Shape |
|---|---|
| `container` | The element you draw into. Replace all of its content with `container.replaceChildren(...)`. |
| `categoria` | `{ id: 'web', nome: 'Web (XSS, SQLi, CSRF)' }` |
| `cartoes` | `[{ id, title, difficulty, template, estado }]`, in the order they are shown. `difficulty` is 1, 2 or 3. `estado` is `'jogavel'` or `'por_construir'`. |
| `progresso` | `{ [id]: { certo: boolean } }`. A card with no entry has not been played yet. Ignore entries for other cards. |
| `abrir` | `(id) => void`. Call it when the player clicks a playable card. The app opens the card. |

## The state of each card

Work it out in this order and write it in the `data-estado` attribute of the `<li>`:

| `data-estado` | When | Text in `.tile-estado` |
|---|---|---|
| `por_construir` | `cartao.estado === 'por_construir'` (always wins over progress) | `Not built yet` |
| `certo` | `progresso[id].certo === true` (only `true` counts) | `Solved` |
| `errado` | there is an entry in `progresso[id]`, but `certo` is not `true` | `Wrong, try again` |
| `por_jogar` | there is no entry | `Not played` |

Points for a card: `difficulty × 10`.

## The structure you must create

```html
<section class="categoria" data-categoria="web">
  <header class="pagina-cabecalho">
    <h1 class="pagina-titulo">Web (XSS, SQLi, CSRF)</h1>
    <p class="pagina-resumo" data-resumo>1 of 4 solved · 10 points</p>
  </header>
  <ul class="tiles">
    <li class="tile-item" data-cartao="web-01" data-estado="certo">
      <button class="tile" type="button" data-abrir="web-01">
        <span class="tile-titulo">Find the SQL injection</span>
        <span class="tile-meta">Level 1 · 10 points</span>
        <span class="tile-estado">Solved</span>
      </button>
    </li>
    <!-- one <li> per card, in the order of `cartoes` -->
  </ul>
</section>
```

- **Summary** (`data-resumo`): `X of Y solved · P points`. `Y` is the total number of cards received (including the ones not built yet). `X` and `P` count only the `certo` ones.
- **Click:** the `<button>` calls `abrir(cartao.id)` once. On a `por_construir` card, the button has the `disabled` attribute **and** the handler does not call `abrir`, even if the click gets through.
- **Empty list:** if `cartoes` is empty, instead of the `<ul>` show `<p class="pagina-vazia">No cards in this category yet.</p>`.
- Drawing twice into the same `container` must not duplicate anything.

## How to create the DOM

Use `h()` from `../templates/common.js`. It creates elements with `textContent` and only accepts attributes from a list (`class`, `type`, `disabled`, `aria-*`, `data-*` and a few more).

```js
import { h } from '../templates/common.js';

export function renderCategoria(container, { categoria, cartoes = [], progresso = {}, abrir = () => {} }) {
  const doc = container.ownerDocument;
  // h(doc, 'button', { class: 'tile', type: 'button', 'data-abrir': id, disabled: true, on: { click: fn } }, child1, child2)
  // h(doc, 'span', { class: 'tile-titulo', text: titulo })
  // h(doc, 'p', { class: 'pagina-resumo', 'data-resumo': '', text: '…' })
  container.replaceChildren(h(doc, 'section', { class: 'categoria', 'data-categoria': categoria.id } /* , … */));
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
node --test pages/categoria.test.js
```

passes with no errors. To see the page: `node server.js` and open `http://localhost:3000/#/categoria/web`.
