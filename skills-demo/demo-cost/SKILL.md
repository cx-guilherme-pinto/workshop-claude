---
name: demo-cost
description: Final cost and time report of the Arena swarm, by agent, model and wave (real data measured by the hooks). At the end it saves to the memory app the lessons, what to do, what not to do and the session history.
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
  - Read
  - Agent
---

# /demo-cost — how much it cost and how long it took

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the participant in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers) exactly as it comes. Never translate the status marker `CUSTO OK`.

Arguments: `$ARGUMENTS`. With `--auto` you ask no questions.

1. Run `node tools/workshop/orquestrador/report.mjs`. The script writes `.workshop/relatorio.md` and `.workshop/memoria-resumo.md`.
2. Show the participant, without rewriting the numbers:
   - the result line, the duration and the total cost (with the US$ 5 target and the US$ 10 ceiling);
   - the tables "By model" and "By wave" (`## Por modelo` and `## Por onda` in Portuguese);
   - the table "By agent" (`## Por agente` in Portuguese), in full if it has up to 20 rows, otherwise only the 10 most expensive.
3. In 2 or 3 sentences, explain what the numbers show: how much each model weighed, the cost of a Haiku agent compared with the orchestrator, and where money could be saved.
   Note: Claude Code's `/usage` may show a higher value, because some versions do not know the prices of the newest models yet. The number in this report uses the real tokens and the published price table. The official bill is the one in the Console.
4. **Memory.** Launch **one** `memoria-extrator` subagent with the prompt:
   > Read .workshop/memoria-resumo.md. Project: arena-de-seguranca. Language: <the participant's language>. Extract and save the memories of this workshop session.
   Then show the list it returns: type and title of each saved memory. If it says the memory app is not installed, say so in one line and continue.
5. Without `--auto`, end with:
   - "Open the **Agent Memory** app to see your first graph."
   - "To play: `node server.js` and open http://localhost:3000."

With `--auto`, end only with `CUSTO OK`.
