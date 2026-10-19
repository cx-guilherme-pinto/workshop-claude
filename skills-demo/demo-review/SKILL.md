---
name: demo-review
description: Final gate of Project 1 (the Pocketknife or the Security Arena) — tests, static checks (no eval, no innerHTML, CSP on the server), secret scan and the security verdict of the reviewer (Opus).
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
  - Bash(node --test *)
  - Read
  - Agent
---

# /demo-review — final gate

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the participant in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers) exactly as it comes. Never translate the status markers (`GATE: APPROVED`, `GATE: REJECTED`).

Arguments: `$ARGUMENTS`. With `--auto` you ask no questions.

First read `workshop.project.json` at the project root: you use its `gate` (the gate command), `review_prompt`, `name` and `unit`.

1. Run the command in `gate`, exactly as it is written there. The script asks no questions and checks:
   - the tests of every item and of the app itself (CSP, headers, no paths outside the project);
   - secrets in the changed files;
   - dangerous patterns (`eval`, `innerHTML`…);
   - the reviewer's verdict.

   In the Arena the gate leaves `cards/` out of the generic search for secrets and dangerous code: the challenges show insecure code on purpose, as text, and each `card.js` has its own static check in its tests.
2. If `.workshop/verdict.json` does not exist yet (for example, if wave 4 did not run):
   - run `node tools/review-digest.mjs`;
   - launch **one** `reviewer` subagent with the prompt in `review_prompt`;
   - run the gate again.
3. Show the gate table exactly as it came. Then, in 3 to 5 lines, explain to the participant what each check protects, linking it to the OWASP Top 10:
   - injection (A03);
   - XSS and CSP (A03/A05);
   - secrets (A02/A07);
   - dependencies (A06).
4. If the verdict has issues, list them with severity, file and suggested fix. Do not fix anything on your own.
   - Without `--auto`, if some items failed, suggest asking "why did this <unit> fail?" for one of them. Its test message says what is wrong, on `/status` or by running its test.
   - When the message says the item's `spec.md` does not decide the answer, it names what the agent produced, never the right value. The participant decides the rule from the concept, writes it in the spec (agents never change specs) and runs `/demo-swarm --retry <id>`.
5. End with `GATE: APPROVED` or `GATE: REJECTED`, as the script said.

An app built by a swarm and never reviewed would be the worst possible example. That is why this gate is mandatory before using it.
