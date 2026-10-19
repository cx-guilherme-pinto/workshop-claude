---
name: demo-cost
description: Final cost and time report of the Project 1 swarm (the Pocketknife or the Security Arena), by agent, model and wave (real data measured by the hooks). At the end it saves to the memory app the lessons, what to do, what not to do and the session history.
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

**Language:** talk to the participant in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers) exactly as it comes. Never translate the status marker `COST OK`.

Arguments: `$ARGUMENTS`. With `--auto` you ask no questions.

First read `workshop.project.json` at the project root: you use its `memory.project`, `name` and `app`.

1. Run `node tools/workshop/orchestrator/report.mjs`. The script writes `.workshop/report.md` and `.workshop/memory-summary.md`.
2. Show the participant, without rewriting the numbers:
   - the result line, the duration and the total cost (with the US$ 5 target and the US$ 10 cap);
   - the tables by model and by wave (the second and third headings of the report);
   - the table by agent (the last heading), in full if it has up to 20 rows, otherwise only the 10 most expensive.
3. In 2 or 3 sentences, explain what the numbers show:
   - how much each model weighed;
   - the cost of a Haiku agent compared with the orchestrator;
   - what their decisions changed (how many agents in parallel, which model), and where money could be saved.

   Note: Claude Code's `/usage` may show a higher value, because some versions do not know the prices of the newest models yet. The number in this report uses the real tokens and the published price table. The official bill is the one in the Console.
4. **Memory.** Launch **one** `memory-extractor` subagent with the prompt:
   > Read .workshop/memory-summary.md. Project: <memory.project>. Language: <the participant's language>. Extract and save the memories of this workshop session.

   Then show the list it returns: type and title of each saved memory. If it answers `MEMORY UNAVAILABLE`, say in one line that the memory app is not installed and continue.
5. Without `--auto`, end with:
   - "Open the **Agent Memory** app to see your first graph."
   - "To use it: run `<app.start>` and open the address it prints (usually <app.url>)."

With `--auto`, end only with `COST OK`.
