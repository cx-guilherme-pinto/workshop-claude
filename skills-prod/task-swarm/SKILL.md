---
name: task-swarm
description: Runs the approved plan (.workshop/plan.json) with subagents in parallel, in waves, following the dependencies. It never puts two tasks that touch the same files in the same batch (or it isolates them in git worktrees). It can be stopped and resumed.
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Agent
---

# /task-swarm — run the swarm

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the user in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers) exactly as it comes. Never translate the status markers (`STATE: …`, `ERROR: …`).

Arguments: `$ARGUMENTS`. With `--auto` you ask no questions.

The script decides the graph and the batches. Your job is to launch exactly what it asks for.

**Loop** (repeat until `STATE: DONE` or `STATE: BLOCKED` appears):

1. Run `node "{{KIT_DIR}}/orchestrator/next-wave.mjs" --plan .workshop/plan.json`. If `ERROR: plan not found` appears, tell the user to run `/task-plan` and stop.
2. Show the previous batch's result table (the `## …` heading), if it exists, and the progress line.
3. If `STATE: BATCH` appears, read the JSON between `<<<CALLS` and `CALLS>>>`. In a **single message**, make one call to the `Agent` tool per object, with `subagent_type`, `description`, `prompt` and, if present, `isolation`, **exactly** as they are.
4. When all of them have answered, go back to step 1. Do not summarise their answers.

**If `STATE: BLOCKED` appears**, show which tasks failed (the table has the test excerpt) and suggest:
- fixing it by hand, or
- `/loop 3m run the project's tests and, if there is a failure, launch the ws-implementer for the first one; stop when everything is green`.

**At the end**, show the last table and suggest `/task-gate`.

Tips for the user:
- The state is kept in `.workshop/`. If you stop (Esc), running `/task-swarm` again resumes where it left off.
- To watch the swarm live in another terminal, from the project folder: `node "{{KIT_DIR}}/orchestrator/dashboard.mjs"`.
- `/btw <question>` asks a side question. Close its answer panel with Esc: while it is open, the agents' results wait.
