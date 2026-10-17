---
name: memory
description: Saves to the memory app the lessons, what to do, what not to do and the history of the current task (extraction with Haiku, negligible cost). Use it at the end of a task or when you want to keep a lesson.
argument-hint: "[optional free note]"
model: sonnet
allowed-tools:
  - Bash(node *)
  - Read
  - Agent
---

# /memory — keep what was learned

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the user in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output exactly as it comes. Never translate status markers.

Arguments: `$ARGUMENTS` (optional: a free note from the user to save as well).

1. Find the project: it is the name of the current folder. If `.workshop/plan.json` or `plan.json` exists with the `project` field, use that one.
2. Prepare the summary:
   - **In the Arena** (`tools/workshop/orchestrator/report.mjs` exists): run `node tools/workshop/orchestrator/report.mjs > /dev/null`.
   - **In another project with `.workshop/`:** run `node "{{KIT_DIR}}/orchestrator/report.mjs" > /dev/null`.
   - If neither exists, write a short `.workshop/memory-summary.md` yourself, with what was done in this conversation: task, files touched, what went well and what went wrong.
3. Launch **one** `memory-extractor` subagent. The prompt is: "Read .workshop/memory-summary.md. Project: <project>. Language: <the user's language>." and, if the user gave a note, add "User note to save as a lesson: <note>".
4. Show the list it returns: type and title of each saved memory, in a short table. If it answers `MEMORY UNAVAILABLE`, say that the memory app is not installed and where the summary was left (`.workshop/memory-summary.md`).
