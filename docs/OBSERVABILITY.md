# Observability of the mission actions (workshop v2, Phase 0)

What Claude Code **2.1.292** (the version in `repos.conf`) tells a hook for each action of the missions, measured on 19 Oct 2026. This table decides how each mission of `docs/pt/WORKSHOP-V2-SPEC.md` (section 4.2) is validated. Repeat the spike when `CLAUDE_CODE_VERSION` changes.

## Method

- **Environment:** a clean participant install (the published rc.5 one-liner) in a test HOME under `/private/tmp`, with the token only in the environment. A small spike-only `missions-project` (unit converter, 8 tests, 2 failing) stood in for the real one.
- **Spike hook:** a `type: "command"` hook on every event of the 2.1.292 hook enum, which wrote the full input to a local file. The enum has 33 events: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Notification`, `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`, `SessionEnd`, `Stop`, `StopFailure`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PostCompact`, `PreModelSwitch`, `PostModelSwitch`, `PermissionRequest`, `PermissionDenied`, `Setup`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `Elicitation`, `ElicitationResult`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `InstructionsLoaded`, `CwdChanged`, `FileChanged`, `DirectoryAdded` and `MessageDisplay`. `WorktreeCreate` and `WorktreeRemove` were left out, because a hook on them replaces git's worktree creation. The spike hook is not part of the kit.
- **Sessions:** two interactive sessions driven through a pty, as a participant would type, plus one `claude -p`. The second session checked the skill after a restart and the confirmed model switch.
- **Cost:** US$ 0.46, plus one Haiku 4.5 turn that `pricing.json` cannot price (see the findings).

## Results

| Action | Events fired | Useful fields | Tells the action apart without reading the prompt? |
|---|---|---|---|
| Prompt in plan mode | `UserPromptSubmit` | `permission_mode: "plan"` (also on every tool event of the turn) | **Yes** |
| `/model haiku` | `PreModelSwitch` on the command; `PostModelSwitch` only after the "Switch model?" dialog is confirmed | `from_model`, `to_model` (`claude-haiku-4-5-20251001` for the `haiku` alias), `requested_model`, `source: "command"` | **Yes**, with `PostModelSwitch` (a cancelled switch fires only `PreModelSwitch`) |
| Request that launches a subagent | `SubagentStart`, then `PostToolUse` `Agent`; the subagent's tools fire `PostToolUse` with `agent_id` | `agent_type` (`Explore`) | **Yes**. `/statusline` (`statusline-setup`) and the kit's `/memory` (`memory-extractor`) also start subagents |
| `/resumo` (user skill) | `UserPromptExpansion` | `expansion_type: "slash_command"`, `command_name: "resumo"`, `command_source: "projectSettings"` | **Yes**, but only in a session started after the skill was created: in the same session the result is "Unknown command: /resumo" |
| The model uses the skill | `PostToolUse` | `tool_name: "Skill"`, `tool_input.skill: "resumo"` | **Yes** (same restart condition) |
| Hook written by Claude in `settings.local.json` | `PostToolUse` `Write`/`Edit`, then `ConfigChange` | `source: "local_settings"`, `file_path` | **Yes**: `ConfigChange` plus a read of the file. The new hook ran on the next edit without a restart |
| `/loop 1m …` | `UserPromptExpansion`, then `PostToolUse` `CronCreate`; each iteration is a plain `UserPromptSubmit`; at the end `PostToolUse` `CronDelete` | `command_name: "loop"`, `command_source: "bundled"`; `Stop.session_crons` lists the active cron | **Yes**, for "used `/loop`". An iteration's `UserPromptSubmit` has no field that marks it as started by Claude Code (`CLAUDE_CODE_SESSION_ATTENDED` is still `1`); only its `prompt` equals the cron prompt |
| `/btw …` | None (the side panel opened and answered) | — | **No** |
| `/statusline …` | `UserPromptExpansion`, `SubagentStart` (`statusline-setup`) and `ConfigChange` | `command_name: "statusline"`, `command_source: "builtin"`; `source: "local_settings"` | **Yes** |
| `claude -p …` | `SessionStart` … `SessionEnd`, like a session | `source: "startup"`; in the hook's environment `CLAUDE_CODE_ENTRYPOINT=sdk-cli` and `CLAUDE_CODE_SESSION_ATTENDED=0` (interactive: `cli` and `1`) | **Yes**, from the environment |
| Agent Memory write via MCP | `PostToolUse` inside the `memory-extractor` subagent | `tool_name: "mcp__agent-memory__memory_add"` and `agent_id` | **Yes** |
| Esc Esc (rewind) | None (the Rewind menu opened) | — | **No** (as expected) |

`"async": true` works: an async hook that slept 4 s did not hold up the turn, which had already run its tools when the hook finished.

## Proposed validation of M1 to M10

| Mission | Validation | Notes |
|---|---|---|
| M1 | `UserPromptSubmit` with `permission_mode === "plan"` → feature `plan_mode` | In 2.1.292 Shift+Tab cycles default → accept edits → plan mode → auto mode |
| M2 | `PostModelSwitch` with a `to_model` that contains `haiku` → feature `model_switch`; fallback: `SessionStart.model` | Never `PreModelSwitch`. `/model` saves the model as the default for new sessions |
| M3 | `SubagentStart` with an `agent_type` that is not started by a built-in command or a kit skill (`statusline-setup`, `memory-extractor` and the kit's agents) → feature `subagent` | Without the exclusion, M8 or M10 would tick M3 |
| M4 | `UserPromptExpansion` with `command_source: "projectSettings"` (or `userSettings` and a name that is not a kit skill), or `PostToolUse` `Skill` with a non-kit skill, plus `.claude/skills/<name>/SKILL.md` with valid frontmatter → feature `skill_user` | The slide must say to restart (`/exit`, then `claude -c`) after creating the skill |
| M5 | `ConfigChange` with `source: "local_settings"` → the file has a `PostToolUse` hook that is not the kit's, and `edits.log` has ≥ 1 line → feature `hook_user` | The hook Claude wrote used `jq` (present on macOS, not on Windows) |
| M6 | `UserPromptExpansion` with `command_name: "loop"` → feature `loop`; done when, after it, a `tests_run` with 0 red follows one with red | The "≥ 2 turns without a prompt" condition is dropped: no field shows who started a turn |
| M7 | Not observable → a hint without validation, outside the panel grid (the spec's plan B) | The grid shows 9 missions; the average coverage uses the 9 |
| M8 | `UserPromptExpansion` `statusline` or `ConfigChange` `local_settings`, and `settings.local.json` with a `statusLine` that is not the kit's → feature `statusline_user` | |
| M9 | Any event whose hook environment has `CLAUDE_CODE_ENTRYPOINT=sdk-cli`, in the missions project → feature `headless`; plus `resumo.txt` not empty | |
| M10 | `PostToolUse` with `tool_name: "mcp__agent-memory__memory_add"` → feature `memory_write`; fallback: a new file in the Agent Memory folder for `missions-project` | Fires inside the `memory-extractor` subagent |

**Hook registration for the kit** (Phase 1), all `type: "command"` and `"async": true`:
- `SessionStart`;
- `UserPromptSubmit`;
- `UserPromptExpansion`;
- `SubagentStart`;
- `PostToolUse` with the matcher `Skill|CronCreate|mcp__agent-memory__memory_add`;
- `PostModelSwitch`;
- `ConfigChange`;
- `Stop` (rc.3): it records nothing, it only runs the mission check again.

**When the missions are checked** (rc.3): after a new feature, at the end of each turn (`Stop`) and at the start of a session (`SessionStart`). The file missions (M4, M5, M8, M9) become true while Claude works, not when a feature shows up. The check runs at most once every 10 s: inside that window the hook asks for one delayed check (`missions.mjs check --delay`), so the last turn before the person closes Claude is still checked. If two checks meet, the second leaves `missions.dirty` and the first looks once more before it ends.

## Other findings

- **Haiku names:** in 2.1.292 the `haiku` alias (`/model haiku`, `--model haiku`) is **Haiku 4.5** (`claude-haiku-4-5-20251001`). `pricing.json` has no price for it, so the cost shows "?".
  - The full ID `claude-haiku-5-5` works.
  - With `claude -p`, it prints a warning on stderr ("isn't described by this version's model catalog").
  - With Haiku 4.5, auto mode is unavailable: the session falls back to manual mode.
- **What the hook input carries:** `prompt`, `cwd`, `transcript_path`, `scratchpad_dir`, `tool_input` and `tool_response`. All of these must stay on the machine: the telemetry hook extracts the boolean and drops the rest (spec 6.6, `telemetry-privacy.test.mjs`).
- **Project scope:** the hook's environment has `CLAUDE_PROJECT_DIR`. That is how the hook decides whether it is in a workshop project, without sending the path.
