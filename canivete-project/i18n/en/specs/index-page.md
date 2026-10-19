# Task `index-page` — the Pocketknife's search and categories

Write **only** `pages/catalog.js`: a **pure** ES module (functions only, no DOM) that the shell (`public/app.js`) uses on the home page to search the tools and group them by category.

The shell already draws everything (the grid, the search box and the tool cards). Before it uses your module, it runs the module's test in the browser. While the file does not exist or the test fails, it uses a simple search: title only, with accents counting ("cafe" does not find "Café"). Once the test passes, the search becomes yours, with no reload.

## What it exports

```js
import { T } from '../lib/texts.js';

export function normalize(text) { … }            // → text
export function search(tools, query) { … }        // → list of tools
export function byCategory(tools, categories) { … } // → list of groups
export function summary(tools) { … }              // → { total, built, to_build }
```

Each tool you receive has this shape (it comes from `/api/tools`; more fields may come, which you ignore and never change):

```js
{
  id: 'dn-01',
  title: 'Tip and bill split',
  concept: 'At a group dinner: how much the tip is and how much each person pays.',
  category: 'money',           // id of the category
  category_name: 'Money',      // name of the category (may be null)
  template: 'calc',
  built: true,                 // true when tools/dn-01/tool.js exists
}
```

And each category: `{ id: 'money', name: 'Money' }`, in the order of the catalogue (`specs/tools.json`).

## `normalize(text)`

Returns the text ready to compare, in this order:

1. `null` or `undefined` give `''`; any other value becomes text with `String()`;
2. removes accents and the cedilla: `text.normalize('NFD')` and then deletes the characters from `̀` to `ͯ` (`'Façade'` → `'Facade'`);
3. lower case;
4. each run of whitespace (space, tab, line break) becomes a single space;
5. removes the spaces at the start and at the end.

`normalize('  Café   NOIR  ')` gives `'cafe noir'`.

## `search(tools, query)`

1. If `tools` is not a list (array), returns `[]`.
2. The search is the words of `normalize(query)`, split by spaces. With no words (`''`, only spaces, `null`, `undefined`), it returns **all** the tools, in the same order, in a **new** list (`tools.slice()`).
3. The text of each tool is `normalize` of `id`, `title`, `concept` and `category_name` together, separated by a space. A missing or `null` field counts as `''`.
4. A tool is in if **every** word of the search shows up in that text, in any order and in any field. Words can be parts of words: `'percent'` finds "Percentages", `'tx-'` finds `tx-01`.
5. The result keeps the order of `tools` and has the very objects it received (not copies). With no results, `[]`.

| Search | Finds |
|---|---|
| `'TIP'` | `dn-01` (upper and lower case are the same) |
| `'cafe'` and `'café'` | the title "Café timer" and the concept "… a cafe …" (accents do not count, on either side) |
| `'numbers'` | the tools of the category "Numbers" (the category name counts too) |
| `'nm-03'` | `nm-03` (the id counts too) |
| `'person bill'` | only the ones with both words |

## `byCategory(tools, categories)`

Returns one group per category, **in the order of `categories`** (not in the order the tools come in):

```js
{ id: 'money', name: 'Money', tools: [ … ], built: 1 }
```

- `tools`: the tools whose `category` is the category's `id`, in the order received.
- `built`: how many of them have `built === true` (only `true` counts).
- Each group has **exactly** these 4 keys: `id`, `name`, `tools` and `built`.
- The categories with no tools are left out. With no tools, `[]`.
- The tools whose `category` is none of the `id`s of `categories` (or that have no category) go, in the order received, into a **last** group with `id: 'other'` and `name: T.catalog.other` (the text comes from `../lib/texts.js`, so it is in the project's language). With no such tools, that group does not exist.

The shell calls `byCategory(search(tools, query), categories)`: only the categories with results show up.

## `summary(tools)`

`{ total, built, to_build }`: the number of tools, how many have `built === true` and how many are left (`total - built`). If `tools` is not a list, `{ total: 0, built: 0, to_build: 0 }`.

## Rules (the test checks them)

1. **Pure:** never change what you receive (no `sort()`, `push()` or `t.x = …` on the lists and objects you receive; the test freezes them). To sort or join, create new lists.
2. **No DOM, no network and no storage:** no `document`, `window`, `fetch`, `localStorage`, `sessionStorage` or dynamic `import()`. Never `innerHTML`, `eval` or `Function`.
3. **Imports only from `../lib/*.js` and `../templates/*.js`:** you only need `import { T } from '../lib/texts.js';`.
4. No dependencies, and do not touch any other file (not the shell, not `public/`, not the test).

## Check

```
node --test pages/catalog.test.js
```

passes with no errors. To see it: `node server.js` and open the address it shows (usually `http://localhost:3000`). Type "money" or "DATES" in the search box.
