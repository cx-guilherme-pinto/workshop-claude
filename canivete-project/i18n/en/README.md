# Pocketknife

A page with 30 small everyday tools: count words, split the bill, convert colors… It is Project 1 of the Claude Code workshop: a swarm of Claude agents writes each tool, with its test, and the search that finds them.

## Running it

You need Node 22 or newer. There are no dependencies to install.

```
node tools/gen.mjs        # generates the specs and the tests of the tools (tools/<id>/) from specs/tools.json
node server.js            # shows the address: usually http://localhost:3000 (if the port is busy, it uses the next one)
node server.js --port 4000
node --test               # all the tests
```

The server only accepts connections from this computer (127.0.0.1).

| Address | What it is |
|---|---|
| `/` | The shell: the tools by category, the search and the "Run tests" button (it runs the `tool.test.js` files in the browser) |
| `/#/tool/<id>` | One tool: its inputs and the result, live |
| `/status` | The swarm status, live, one square per task (dark theme, for the projector) |
| `/status?replay=example` | A synthetic run, replayed without calling the API |

A tool that does not exist yet shows as "To build" (in gray) and becomes ready as soon as an agent writes its `tools/<id>/tool.js`, with no reload. Until the wave 2 search (`pages/catalog.js`) passes its test, the shell uses a simple search, on the title only.

## Where everything is

| Folder or file | Contents |
|---|---|
| `specs/tools.json` | The catalogue: the categories and the tools. `node tools/gen.mjs` generates the specs, the tests and `TASKS.md` from it |
| `specs/my-tool.example.json` | The example of your tool (see "Your decisions") |
| `tools/<id>/` | `spec.md` and `tool.test.js` are generated; `tool.js` is written by an agent (see `tools/CONTRACT.md`) |
| `templates/` | The 4 tool templates: `calc` (numbers → result), `convert` (both ways), `text` (text → text) and `generate` (at random, with a seed) |
| `lib/` | Tests that run in Node and in the browser (`testkit.js`), security checks (`security.js`) and all the texts (`texts.js`) |
| `pages/` | The search and the categories (`catalog.js`, wave 2); its test comes ready |
| `public/` | The shell: `app.js` (the grid and the search), `tool-view.js` (the panel of a tool), `status.js` (`/status`), `styles.css` (the tokens of `DESIGN.md`) and the font |
| `server.js` | The server, with no dependencies and a strict CSP. It only serves `public/`, `templates/`, `lib/`, `pages/`, `replays/` and, from `tools/`, only the `tool.js` and `tool.test.js` files |
| `mcp-server.mjs` | The MCP server: every `tools/<id>/tool.js` becomes a Claude Code tool (`mcp__canivete__<id>`) |
| `test/app.test.js` | Security tests of the app: headers, refused paths, `/api/tools` and source code without dangerous patterns |
| `replays/` | Replays for `/status` (format in `replays/README.md`) |
| `specs/tasks.json` and `specs/*.md` | The support tasks: `index-page`, `integration` and `review` |
| `tools/` | `gen.mjs` (and `my-tool.mjs`), `check-integration.mjs`, `review-digest.mjs` and `reset.mjs` |
| `DESIGN.md` | The design system, on one page |

## The swarm

In Claude Code, inside this folder:

1. `/demo-plan` writes the plan (`plan.json` and `PLAN.md`) and the cost estimate. Choose the parallelism (`--parallel 4`, `8` or `12`) and the model of the tools (`--model haiku` or `sonnet`).
2. `/demo-swarm` runs the waves:
   - wave 1: the tools (and yours);
   - wave 2: the search and the categories (`pages/catalog.js`);
   - wave 3: the integration;
   - wave 4: the review.
3. `/demo-reset` goes back to the start with `node tools/reset.mjs`. The history of each run is kept in `.workshop/history/`.

The results of each task are in `.workshop/status/` and the costs in `.workshop/usage.jsonl`. `/status` reads both.

## The tools in Claude Code

`.mcp.json` registers the `canivete` server (`mcp-server.mjs`, no dependencies). Every valid `tools/<id>/tool.js` is a Claude Code tool named `mcp__canivete__<id>` (for example `mcp__canivete__my-01`); the tool's inputs are the arguments and the result comes back as JSON. The server reads `tools/` again each time Claude asks for the list, so a tool shows up as soon as it turns green (if it does not, `/mcp` and reconnect). `.claude/settings.json` already approves the server and allows its tools: there is no approval prompt. To see it at work: "use my tool to …".

## Your decisions

- **Your tool.** Copy the example and change it: title, concept, `template` (`calc`, `convert`, `text` or `generate`), inputs, output, rules and examples (`category` is optional; without it, `daily`).
  ```
  cp specs/my-tool.example.json specs/my-tool.json          # Windows: Copy-Item specs\my-tool.example.json specs\my-tool.json
  node tools/gen.mjs
  ```
  `gen.mjs` tells you which field is wrong and gives an example. It generates the tool `my-01`, which goes into the plan, the shell and `/status`. Without `specs/my-tool.json` nothing changes.
- **The tools broken on purpose.** The `spec.md` of three tools (`tx-02`, `nm-03` and `dn-01`) leaves out the rule that decides some cases, so the agent guesses, and the test only keeps a short hash of the right result. When one goes red, the test message says what the tool returned and what the spec does not decide, never the right value. Decide it yourself, from the concept, write the rule in `tools/<id>/spec.md` (no agent may change a spec) and run only that one again: `/demo-swarm --retry <id>`.
