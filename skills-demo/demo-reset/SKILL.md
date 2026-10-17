---
name: demo-reset
description: Resets the Security Arena to its initial state so the exercise can be repeated (the built cards are deleted; the cost history is kept in .workshop/history/).
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
---

# /demo-reset — start over

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the participant in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output exactly as it comes. Never translate status markers.

Arguments: `$ARGUMENTS`.

1. Without `--auto`, ask first: "This deletes the built cards and the current plan. The cost history stays in `.workshop/history/`. Shall I continue?" Wait for a clear yes.
2. Run `node tools/reset.mjs`.
3. Show what the script did in 2 or 3 lines and end with: "Done. To start over: `/demo-plan`."

Never use `git` directly for this: the script checks that you are really in the Arena before deleting anything.
