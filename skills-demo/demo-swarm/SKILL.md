---
name: demo-swarm
description: Runs the Security Arena swarm in parallel waves, following the dependencies in plan.json. Each batch shows a table with agent, model, task, state, time and cost.
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
  - Agent
---

# /demo-swarm — run the swarm

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the participant in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers) exactly as it comes. Never translate the status markers (`ESTADO: …`, `ERRO: …`, `ENXAME OK`).

Arguments: `$ARGUMENTS`. With `--auto` you ask no questions, because it is the benchmark mode.

The script decides the graph, not you. Your job is to launch exactly what it asks for.

**Loop** (repeat until `ESTADO: FIM` or `ESTADO: BLOQUEADO` appears):

1. Run `node tools/workshop/orquestrador/next-wave.mjs`. If `ERRO: Plano nao encontrado` appears, tell the participant to run `/demo-plan` and stop.
2. Show the participant the table "Previous batch result" (`## Resultado do lote anterior` in Portuguese), if it exists, and the `Progress:` line (`Progresso:` in Portuguese), exactly as they came.
3. If `ESTADO: LOTE` appears, read the JSON between `<<<CHAMADAS` and `CHAMADAS>>>`. In a **single message**, make one call to the `Agent` tool per object, with `subagent_type`, `description` and `prompt` **exactly** as they are.
   - Do not change the prompts.
   - Do not merge or split calls.
   - Do not read the agents' files.
4. When all agents in the batch have answered, go back to step 1. Do not summarise their answers.

**At the end**, show the last table and the `ESTADO: FIM` line. Without `--auto`, suggest:
- opening `http://localhost:3000/estado` (with `node server.js`) to see the grid;
- `/demo-review` for the final gate;
- `/demo-cost` for the cost report.

With `--auto`, end only with `ENXAME OK`.

While the swarm runs, the participant can use `/btw <question>`. Its answer opens in a panel; the agents' results wait until the panel is closed with Esc.
