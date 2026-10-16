# Card contract

Each card is a folder `cards/<id>/` with three files:

| File | Who writes it | What for |
|---|---|---|
| `spec.md` | comes ready-made | what the card has to teach, and the answers |
| `card.test.js` | comes ready-made | the test that has to turn green |
| `card.js` | **the agent** | the card itself |

## What `card.js` exports

A single `export default` created with one of the 4 templates in `templates/`:

```js
import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'pw-01',                 // same as the folder name
  title: 'Which password is strongest?',
  category: 'passwords',       // same as the spec
  difficulty: 1,               // 1, 2 or 3
  concept: 'A short sentence with the core idea.',
  prompt: 'The question the player reads.',
  explanation: 'The explanation shown at the end of the challenge.',
  options: [ { id: 'a', text: '…' }, /* … */ ],
  answer: 'c',
});
```

The final object meets `{ id, title, category, difficulty, template, render(container, api), validate(answer) }`. `render` comes from the template, so **never write it by hand**.

## The 4 templates

| Template | Import | Its own fields | Answer format |
|---|---|---|---|
| `escolha` | `../../templates/escolha.js` | `options: [{id, text, detail?}]`, `answer: 'b'`, `scenario?` | option id, e.g. `'b'` |
| `clicaErro` | `../../templates/clica-erro.js` | `segments: ['…', …]`, `answer: [2]`, `language?` | list of indexes, e.g. `[2]` |
| `ordenar` | `../../templates/ordenar.js` | `items: [{id, text}]` (shuffled), `answer: ['x','y','z']` | list of ids in the right order |
| `resposta` | `../../templates/resposta.js` | `accept: ['…']` **or** `check(normalizada, original)`, `placeholder?`, `scenario?` | text |

`scenario` (optional) is `{ kind: 'email' | 'url' | 'texto' | 'conversa', label?: '…', lines: ['…'] }` and is always shown as text.

For custom logic in `resposta`, use `check`. The answer arrives normalized (lowercase, no accents, no extra spaces), and `normalizar` is also exported by `templates/resposta.js`.

## Rules (the tests check them)

1. You may only import from `../../templates/*.js` and `../../lib/*.js`.
2. No `document`, `window`, `innerHTML`, `eval`, `Function`, `fetch`, `localStorage` or dynamic `import()` in `card.js`.
3. The `id`, the `category` and the template must be the ones in the spec.
4. All visible text is in plain English, with short sentences.
5. Do not touch any other file. If the test fails because of another file, explain it in your answer.

## Check

```
node --test cards/<id>/card.test.js
```
