# Security Arena

A game of short security challenges. It is the demo project of the Claude Code workshop: a swarm of Claude agents builds the cards and the pages, each one with its own test.

## Run

You need Node 22 or newer. There are no dependencies to install.

```
node server.js            # http://localhost:3000 (if the port is taken, it uses the next one)
node server.js --porta 4000
node --test               # all the tests
```

The server only accepts connections from this computer (127.0.0.1).

| Address | What it is |
|---|---|
| `/` | The gallery: categories, cards, score and the "Run tests" button (runs the `card.test.js` files in the browser) |
| `/#/cartao/<id>` | Play a card |
| `/#/categoria/<id>` and `/#/pontuacao` | Pages built by the swarm in wave 2 |
| `/estado` | The live state of the swarm, one square per task (dark theme, for the projector) |
| `/estado?replay=exemplo` | A recorded run, replayed without calling the API |

## Where everything is

| Folder or file | Contents |
|---|---|
| `specs/cards.json` | The cards and the categories. `node tools/gen.mjs` generates the specs, the tests and `TASKS.md` from it |
| `cards/<id>/` | `spec.md` and `card.test.js` come ready-made; `card.js` is written by an agent (see `cards/CONTRACT.md`) |
| `templates/` | The 4 card templates: escolha (choice), clica-erro (spot the flaw), ordenar (order), resposta (answer) |
| `lib/` | Tests that run in Node and in the browser (`testkit.js`, `fakedom.js`), security checks (`seguranca.js`) and `hash.js` (wave 1) |
| `pages/` | Category page and score table (wave 2); their tests come ready-made |
| `public/` | The app: `app.js` (gallery), `estado.js` (`/estado`), `styles.css` (tokens from `DESIGN.md`) and the font |
| `server.js` | The server, with no dependencies and a strict CSP |
| `test/app.test.js` | Security tests for the app: headers, refused paths and source code without dangerous patterns |
| `replays/` | Replays for `/estado` (format in `replays/README.md`) |
| `specs/*.md` | The support tasks: `lib-hash`, `pagina-categoria`, `tabela-pontuacao`, `integracao` and `revisao` |
| `tools/` | `gen.mjs`, `plan.mjs` (swarm plan), `check-integracao.mjs`, `review-digest.mjs` and `reset.mjs` |
| `DESIGN.md` | The design system, on one page |

## The swarm

In Claude Code, inside this folder:

1. `/demo-plan` generates the plan (`plan.json` and `PLANO.md`) and the cost estimate.
2. `/demo-swarm` runs the waves:
   - wave 1: the cards and `lib/hash.js`;
   - wave 2: the pages;
   - wave 3: integration;
   - wave 4: review.
3. `/demo-reset` goes back to the start with `node tools/reset.mjs`. The history of each run is kept in `.workshop/historico/`.

The results of each task are in `.workshop/status/` and the costs in `.workshop/usage.jsonl`. `/estado` reads both.
