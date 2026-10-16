---
name: demo-review
description: Final gate of the Security Arena — tests, static checks (no eval, no innerHTML, CSP on the server), secret scan and the security verdict of the reviewer (Opus).
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

**Language:** talk to the participant in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers) exactly as it comes. Never translate the status markers (`GATE: APROVADO`, `GATE: REPROVADO`).

Arguments: `$ARGUMENTS`. With `--auto` you ask no questions.

1. Run `node tools/workshop/orquestrador/gate.mjs --teste "node tools/check-integracao.mjs" --base arena-inicial --ignorar cards/`. The `cards/` folder stays out of the generic search for secrets and dangerous code: the challenges show insecure code on purpose, as text. Each `card.js` already has its own static check, which ignores strings and runs in the tests. The script asks no questions and checks:
   - the tests of all cards and of the app itself (CSP, headers, no paths outside the project);
   - secrets in the changed files;
   - dangerous patterns (`eval`, `innerHTML`…);
   - the reviewer's verdict.
2. If `.workshop/veredito.json` does not exist yet (for example, if wave 4 did not run):
   - run `node tools/review-digest.mjs`;
   - launch **one** `reviewer` subagent with the prompt "Review the Arena. Follow specs/revisao.md. Read .workshop/revisao-resumo.md.";
   - run the gate again.
3. Show the gate table exactly as it came. Then, in 3 to 5 lines, explain to the participant what each check protects, linking it to the OWASP Top 10:
   - injection (A03);
   - XSS and CSP (A03/A05);
   - secrets (A02/A07);
   - dependencies (A06).
4. If the verdict has problems, list them with severity, file and suggested fix. Do not fix anything on your own. Without `--auto`, suggest `/loop 2m run node tools/workshop/orquestrador/grade.mjs --todos and fix the first red task with the implementer agent; stop when everything is green`.
5. End with `GATE: APROVADO` or `GATE: REPROVADO`, as the script said.

A security game with security flaws would be the worst possible example. That is why this gate is mandatory before playing.
