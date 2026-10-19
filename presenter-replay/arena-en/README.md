# Security Arena

A game of short security challenges. It is the demo project of the Claude Code workshop: a swarm of Claude agents builds the cards and the pages, each one with its own test.

## Run

You need Node 22 or newer. There are no dependencies to install.

```
node server.js            # prints the address: usually http://localhost:3000 (if the port is taken, it uses the next one)
node server.js --port 4000
node --test               # all the tests
```

The server only accepts connections from this computer (127.0.0.1).

| Address | What it is |
|---|---|
| `/` | The gallery: categories, cards, score and the "Run tests" button (runs the `card.test.js` files in the browser) |
| `/#/card/<id>` | Play a card |
| `/#/category/<id>` and `/#/score` | Pages built by the swarm in wave 2 |
| `/status` | The live status of the swarm, one square per task (dark theme, for the projector) |
| `/status?replay=example` | A recorded run, replayed without calling the API |

## Where everything is

| Folder or file | Contents |
|---|---|
| `specs/cards.json` | The cards and the categories. `node tools/gen.mjs` generates the specs, the tests and `TASKS.md` from it |
| `specs/my-card.example.json` | The example of your card (see "Your decisions") |
| `cards/<id>/` | `spec.md` and `card.test.js` come ready-made; `card.js` is written by an agent (see `cards/CONTRACT.md`) |
| `templates/` | The 4 card templates: choice, spot-the-flaw, order and answer |
| `lib/` | Tests that run in Node and in the browser (`testkit.js`, `fakedom.js`), security checks (`security.js`), the texts (`texts.js`) and `hash.js` (wave 1) |
| `pages/` | Category page and score table (wave 2); their tests come ready-made |
| `public/` | The app: `app.js` (gallery), `status.js` (`/status`), `styles.css` (tokens from `DESIGN.md`) and the font |
| `server.js` | The server, with no dependencies and a strict CSP |
| `test/app.test.js` | Security tests for the app: headers, refused paths and source code without dangerous patterns |
| `replays/` | Replays for `/status` (format in `replays/README.md`) |
| `specs/tasks.json` and `specs/*.md` | The support tasks: `lib-hash`, `category-page`, `score-table`, `integration` and `review` |
| `tools/` | `gen.mjs` (and `my-card.mjs`), `plan.mjs` (swarm plan), `check-integration.mjs`, `review-digest.mjs`, `reset.mjs` and `routine.mjs` |
| `DESIGN.md` | The design system, on one page |

## The swarm

In Claude Code, inside this folder:

1. `/demo-plan` generates the plan (`plan.json` and `PLAN.md`) and the cost estimate.
2. `/demo-swarm` runs the waves:
   - wave 1: the cards and `lib/hash.js`;
   - wave 2: the pages;
   - wave 3: integration;
   - wave 4: review.
3. `/demo-reset` goes back to the start with `node tools/reset.mjs`. The history of each run is kept in `.workshop/history/`.

The results of each task are in `.workshop/status/` and the costs in `.workshop/usage.jsonl`. `/status` reads both.

## Your decisions

- **Your card.** Copy the example and change it: title, concept, prompt, `template` (`spot-the-flaw`, `choice`, `order` or `answer`) and that template's fields (`category` is optional; without it, `secure-code`).
  ```
  cp specs/my-card.example.json specs/my-card.json          # Windows: Copy-Item specs\my-card.example.json specs\my-card.json
  node tools/gen.mjs
  ```
  `gen.mjs` says which field is wrong and gives an example. It generates the card `my-01`, which goes into the plan (101 cards), the gallery and `/status`, and the swarm builds it with Haiku. Without `specs/my-card.json` nothing changes.
- **The cards broken on purpose.** The `spec.md` of four cards is missing a detail that the test checks, and no agent may change a spec. When one turns red, ask why it failed: the test message says which line is missing. Add it to `cards/<id>/spec.md` and run only that card again: `/demo-swarm --retry <id>` (or `node tools/workshop/orchestrator/next-wave.mjs --retry <id>`).
- **The cost of cryptography.** `lib-hash` and the cards that depend on it go to Sonnet by default. `/demo-plan --crypto haiku` (or `node tools/plan.mjs --crypto haiku`) keeps them on Haiku, which is cheaper; `--crypto sonnet` goes back to Sonnet.
