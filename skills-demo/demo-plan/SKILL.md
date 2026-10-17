---
name: demo-plan
description: Plans the Security Arena swarm. Reads TASKS.md, generates the dependency graph (plan.json + PLAN.md with a Mermaid diagram), shows the waves and the cost estimate. First step of Project 1 of the workshop.
argument-hint: "[--mode participant|presenter] [--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
  - Read
  - Agent
  - mcp__agent-memory__memory_search
---

# /demo-plan — plan the swarm

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the participant in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers, Mermaid) exactly as it comes. Never translate the status marker `PLAN OK`.

Arguments: `$ARGUMENTS`. With `--auto` you ask no questions, because it is the benchmark mode. The default mode is `participant`.

Do these steps in order, without exploring the project beyond what is asked:

1. **Memory.** If the `memory_search` tool exists, call it with `text: "arena swarm"` and `project: "security-arena"`. Keep the lessons (up to 5, one line each). If it does not exist, say in one line that the memory app is not installed and continue.
2. **Generate the graph.** Run `node tools/plan.mjs --mode <mode>`. The DAG comes from the specs and is deterministic.
3. **Planner (Opus).** Launch **one** `planner` subagent with this prompt:
   > Review the Arena plan. Read .workshop/plan-summary.md. Lessons from memory: <the lessons, or "none">. Write .workshop/planner.json.
4. **Apply.** Run `node tools/plan.mjs --apply .workshop/planner.json`.
5. **Show** the participant, in compact form:
   - the table of the 4 waves;
   - the Mermaid block from `PLAN.md`, copied exactly as it is;
   - the cost estimate table, with the US$ 5 target and the US$ 10 cap;
   - the planner's adjustments, in one or two lines.
6. Without `--auto`, end with: "Plan ready. To run it: `/demo-swarm`". With `--auto`, end only with `PLAN OK`.

Do not read the whole `TASKS.md`: `plan.mjs` already summarises it.
