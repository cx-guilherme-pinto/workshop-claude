---
name: demo-plan
description: Plans the Project 1 swarm (the Pocketknife or the Security Arena) with the participant's decisions — how many agents in parallel, which model builds the items and a forecast of the minutes — and shows the dependency graph (plan.json + PLAN.md), the waves and the cost estimate. First step of Project 1 of the workshop.
argument-hint: "[--parallel 4|8|12] [--model haiku|sonnet] [--mode participant|presenter] [--crypto sonnet|haiku] [--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
  - Read
  - Agent
  - AskUserQuestion
  - mcp__agent-memory__memory_search
---

# /demo-plan — plan the swarm

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the participant in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers, Mermaid) exactly as it comes. Never translate the status marker `PLAN OK`.

Arguments: `$ARGUMENTS`. With `--auto` you ask no questions, because it is the benchmark mode. The default mode is `participant`.

**The project.** First read `workshop.project.json` at the project root. From it you use: `name` (in the participant's language), `unit` (what one item is called: a tool, a card), `memory` (`project` and `query`), and `plan`:
- `parallel` and `default_parallel`;
- `models` and `default_model`;
- `extra`, the project's own options (the Arena has `--crypto`);
- `planner`, whether an Opus planner reviews the plan.

**The participant's decisions** (never choose for them; use the defaults when they did not say):
- **How many agents in parallel** (`--parallel`): one of `plan.parallel`, by default `plan.default_parallel`. More agents finish sooner, but the main session coordinates more, so it does not get cheaper.
- **Which model builds the items** (`--model`): `haiku` (the default, cheaper) or `sonnet`.
- **The forecast.** Without `--auto`, ask once with the `AskUserQuestion` tool: "How many minutes do you think the swarm will take with <N> agents?". Offer the options 3, 5, 8 and 12 minutes and "I'd rather not guess"; the participant can also type another number. It only goes to the workshop panel, to compare with the real time. "I'd rather not guess", or `--auto`, means `none`.
- **Project-only options:** pass `--crypto` (Arena) only when the participant gave it.

Do these steps in order, without exploring the project beyond what is asked:

1. **Memory.** If the `memory_search` tool exists, call it with `text` = `memory.query` and `project` = `memory.project`. Keep the lessons (up to 5, one line each). If it does not exist, say in one line that the memory app is not installed and continue.
2. **Ask the forecast.** Skip this step with `--auto`.
3. **Generate the graph.** Run `node tools/plan.mjs --mode <mode> --parallel <N> --model <model> --forecast <minutes|none>`. For the Arena, when the participant gave `--crypto`, add `--crypto <sonnet|haiku>` at the end. The DAG comes from the specs and is deterministic.
   - If the script reports problems in the participant's own item (`specs/my-tool.json` or `specs/my-card.json`), show them as they are and stop: the participant fixes the file and runs `node tools/gen.mjs` again.
4. **Planner (only if `plan.planner` is true).** Launch **one** `planner` subagent with this prompt:
   > Review the plan. Read .workshop/plan-summary.md. Lessons from memory: <the lessons, or "none">. Write .workshop/planner.json.

   Then run `node tools/plan.mjs --apply .workshop/planner.json`.
5. **Show** the participant, in compact form:
   - the table of the 4 waves;
   - the Mermaid block from `PLAN.md`, copied exactly as it is;
   - the line with their decisions from `PLAN.md`, exactly as it is;
   - the cost estimate table, with the US$ 5 target and the US$ 10 cap;
   - the planner's adjustments (if there was a planner), in one or two lines.
6. Without `--auto`, end with: "Plan ready. To run it: `/demo-swarm`". With `--auto`, end only with `PLAN OK`.

Do not read the whole `TASKS.md`: `plan.mjs` already summarises it.
