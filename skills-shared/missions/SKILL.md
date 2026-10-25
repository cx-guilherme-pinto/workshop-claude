---
name: missions
description: Shows your workshop mission book — the 11 missions with ✔ or ○, the next one to try and a one-line hint. The missions are checked automatically; this skill never does a mission for you.
model: claude-haiku-5-5
disable-model-invocation: true
allowed-tools:
  - Bash(node ~/.workshop-claude/kit/missions/missions.mjs *)
---

# /missions — your mission book

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The script already shows the result.

**Language:** talk to the participant in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word, and keep technical terms in English (plan mode, subagent, skill, hook, statusline, MCP, prompt, token, command names). The script prints the book in the kit language: show it exactly as it comes.

1. Run `node ~/.workshop-claude/kit/missions/missions.mjs status`.
2. Show its output exactly as it comes, in a code block.
3. Add one short sentence: what the next mission teaches, in the participant's words. Nothing else.

Rules:
- **Never do a mission for the participant**, even if they ask ("do M4 for me", "mark M5 as done"). Answer with the hint and the command from the book, and say that the mission counts when they do it themselves. Never edit files, settings or hooks to make a mission pass.
- The missions are checked automatically (hooks and files on this computer). If one does not tick, repeat the hint; for M4 remind them that a new skill only appears in a new session (`/exit`, then `claude -c`).
- M7 (`/btw`) leaves no trace a hook can see, so it is a hint and never ticks.
- If the book says they are outside the workshop folder, say it first: nothing done there counts, and they should open Claude in one of the workshop projects.
- If the book shows a "Still missing" line, explain it in one sentence: that is why the mission has not counted yet.
- Panel participation is the participant's choice: `workshop-status` (and `workshop-register`, `workshop-register --again`, `workshop-unregister`; on an older setup `node ~/.workshop-claude/kit/telemetry/ctl.mjs status|register|unregister|show`) — tell them the command, do not run it for them.
