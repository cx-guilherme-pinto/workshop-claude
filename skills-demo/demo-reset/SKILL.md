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

1. Without `--auto`, first run `node tools/reset.mjs --dry-run` and show its output. Then ask: "This deletes the built cards and the current plan, and puts back the files listed above. Your own changes, files and commits are saved first in `.workshop/history/<date>/` (commits also in a `my-work-...` branch), and the cost history stays there too. Shall I continue?" Wait for a clear yes.
2. Run `node tools/reset.mjs`. If it says `Refused`, show the message as it is and stop.
3. Show what the script did in 2 or 3 lines (say where the participant's work was saved, if the script saved any) and end with: "Done. To start over: `/demo-plan`."

Never use `git` directly for this: the script checks that you are really in the Arena before deleting anything.
