---
name: task-plan
description: Plans the task read by /task-intake. The planner (Opus) breaks it down into a dependency graph (DAG) and decides the number of agents according to the size of the task, with a justification. The skill validates the plan, estimates the cost and asks for approval.
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Read
  - Agent
  - mcp__memoria__memoria_procurar
---

# /task-plan — break down, estimate, approve

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the user in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output (tables, numbers, Mermaid) exactly as it comes. Never translate the status markers (`PLANO INVALIDO`…).

Arguments: `$ARGUMENTS`. With `--auto` you do not ask for approval.

1. Check that `.workshop/tarefa.md` exists. If it does not, tell the user to run `/task-intake <id>` first.
2. **Planner (Opus).** Launch **one** `ws-planner` subagent with the prompt: "Plan the task described in .workshop/tarefa.md. Write .workshop/plan-proposta.json."
3. **Validate.** Run `node "{{KIT_DIR}}/orquestrador/validate-plan.mjs" .workshop/plan-proposta.json`.
   - If `PLANO INVALIDO` appears, launch `ws-planner` **one more time**, with the errors in the prompt ("Fix .workshop/plan-proposta.json. Errors: …"). Then validate again. If it fails again, show the errors and stop.
   - The validator adds the integration (Sonnet) and the review (Opus) by itself, writes `.workshop/plan.json` and `.workshop/PLANO.md`, and prints the plan.
4. **Show** the user:
   - the Mermaid diagram, copied exactly as it is;
   - the task table;
   - the section "Why this number of agents" (`## Porquê este número de agentes` in Portuguese);
   - the cost estimate;
   - the warnings.
5. **Approval** (without `--auto`): ask "Do you approve this plan? Answer *yes*, *adjust: <what>* or *no*."
   - With "adjust", launch `ws-planner` again with the request and go back to step 3.
   - With "yes", end with: "Plan approved. To run it: `/task-swarm`."
   - With "no", stop.

Do not start implementing anything in this skill.
