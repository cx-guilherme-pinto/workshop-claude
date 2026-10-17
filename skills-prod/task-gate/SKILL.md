---
name: task-gate
description: Production gate. Runs the project's tests, looks for secrets and dangerous code in the changes, flags changed dependencies and asks the reviewer (Opus) for the security and quality review. Only code that is ready for production passes.
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Read
  - Agent
---

# /task-gate — is it ready for production?

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the user in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers) exactly as it comes. Never translate the status markers (`GATE: APPROVED`, `GATE: REJECTED`).

Arguments: `$ARGUMENTS`.

1. Read `.workshop/plan.json` (field `config.global_test`) and `.workshop/base.json` (field `base`). If there is no `global_test`, run `node "{{KIT_DIR}}/orchestrator/explore.mjs"` and use the first likely test command. If there is none, ask the user which command it is (without `--auto`).
2. If `.workshop/verdict.json` does not exist yet:
   - run `node "{{KIT_DIR}}/orchestrator/digest.mjs" --base <base>`;
   - launch **one** `ws-reviewer` subagent with the prompt "Review the changes of this task for production. Read .workshop/review-summary.md and .workshop/task.md. Write .workshop/verdict.json.".
3. Run `node "{{KIT_DIR}}/orchestrator/gate.mjs" --base <base> --test "<test command>"`.
4. Show the table exactly as it came. If the reviewer found issues, list them with severity, file and fix.
5. If `GATE: REJECTED` appears:
   - say what is blocking, in plain language;
   - suggest `/loop 3m run <test command>; if it fails, fix the first failure; when it passes, run /task-gate and stop`;
   - do not fix anything unless the user asks.
6. If `GATE: APPROVED` appears, end with: "Ready for production. Next step: `/task-report`."
