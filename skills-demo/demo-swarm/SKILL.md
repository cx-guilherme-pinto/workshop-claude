---
name: demo-swarm
description: Runs the Security Arena swarm in parallel waves, following the dependencies in plan.json. Each batch shows a table with agent, model, task, state, time and cost. With --retry <id> it runs only that task again.
argument-hint: "[--auto] [--retry <id>]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
  - Agent
---

# /demo-swarm — run the swarm

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the participant in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers) exactly as it comes. Never translate the status markers (`STATE: …`, `ERROR: …`, `SWARM OK`).

Arguments: `$ARGUMENTS`. With `--auto` you ask no questions, because it is the benchmark mode. With `--retry <id>` (for example `--retry pv-07`) only that task runs again: its attempts start from zero (first on the plan's model, usually Haiku; a card broken on purpose gets a single attempt), the files the participant changed (such as the card's `spec.md`) stay as they are, and the rest of the run is kept.

The script decides the graph, not you. Your job is to launch exactly what it asks for.

**The command.** Without `--retry`, it is `node tools/workshop/orchestrator/next-wave.mjs`. With `--retry <id>`, it is `node tools/workshop/orchestrator/next-wave.mjs --retry <id>`, with the id exactly as the participant gave it. Use the same command in every turn of the loop.

**Loop** (repeat until `STATE: DONE` or `STATE: BLOCKED` appears):

1. Run the command. If `ERROR: plan not found` appears, tell the participant to run `/demo-plan` and stop. If another `ERROR: …` appears, show it as it is and stop.
2. Show the participant the previous batch's result table (the `## …` heading), if it exists, and the progress line, exactly as they came.
3. If `STATE: BATCH` appears, read the JSON between `<<<CALLS` and `CALLS>>>`. In a **single message**, make one call to the `Agent` tool per object, with `subagent_type`, `description` and `prompt` **exactly** as they are.
   - Do not change the prompts.
   - Do not merge or split calls.
   - Do not read the agents' files.
4. When all agents in the batch have answered, go back to step 1. Do not summarise their answers.

**At the end**, show the last table and the `STATE: DONE` line (with `--retry`, also the `Retry of …` line above it). Without `--auto`, suggest:
- running `node server.js` and opening the `/status` address it prints (usually `http://localhost:3000/status`) to see the grid;
- for a red card, asking "why did this card fail?": the reason is in the card's test message, on `/status` and in `node --test cards/<id>/card.test.js`. If the message says the card's `spec.md` does not decide the answer, it shows what the agent produced, never the right value: the participant decides that value from the prompt and the concept, writes it in the spec (agents never change specs) and runs `/demo-swarm --retry <id>`. Do not tell them the answer; if they decide wrong, the same message comes back with their value;
- `/demo-review` for the final gate;
- `/demo-cost` for the cost report.

With `--auto`, end only with `SWARM OK`.

While the swarm runs, the participant can use `/btw <question>`. Its answer opens in a panel; the agents' results wait until the panel is closed with Esc.
