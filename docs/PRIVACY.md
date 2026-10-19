# Privacy of the workshop panel

The kit has a **mission book** that lives only on your computer, and an optional **live panel** that the presenters project next to the slides. This page covers what the panel receives, what never leaves your laptop and how to turn it off. The rules come from the specification (`docs/pt/WORKSHOP-V2-SPEC.md`, section 6.6) and from decisions D-30 and D-31 in `DECISIONS.md`.

## Your choice

- **The setup asks once** (step 8): "Send anonymous events to the workshop panel? Only the name of the Claude Code feature you used, never what you type." The default is **no**.
  - With no terminal (an automated install), or with `--yes`, the answer is no.
  - If you say yes, you choose your room (A or B).
- **You can change it at any time:**
  - `node ~/.workshop-claude/kit/telemetry/ctl.mjs status` shows your current choice;
  - `ctl.mjs on A` or `ctl.mjs on B` turns it on;
  - `ctl.mjs off` turns it off and deletes the events still waiting to be sent;
  - `ctl.mjs show` prints the last 20 events, exactly as they leave your computer.
- **Off or on, the mission book works the same** (`/missions` and the statusline). With participation off you simply do not appear in the room's numbers.

## What is sent (only with participation on)

Only the events and fields in `telemetry/allowlist.json`. Nothing else can be sent: the kit drops any other field before writing the queue, and the server refuses it again. Every event has:
- the format version;
- the workshop code;
- your room (A or B);
- a random id (16 random bytes created at install time, not derived from you or your machine);
- the event name, the time and the kit version.

The events add:

| Event | Extra fields |
|---|---|
| `join` | language (pt/en), system (mac/win), nickname only if you set one |
| `check_ok` | — |
| `feature` | the name of a Claude Code feature you used once in a session: `plan_mode`, `model_switch`, `subagent`, `skill_user`, `hook_user`, `loop`, `statusline_user`, `headless`, `memory_write` |
| `mission_done` | the mission id (M1 to M10) |
| `cost` | a cost in US$ (from the tokens in the transcripts × `pricing.json`), the model family (haiku/sonnet/opus/other), the block (missions/p1/p2) |
| `p1_*`, `p2_*` | your Project 1 and 2 choices and results: parallelism, model, forecast in minutes, number of tasks, duration, green/red counts, a catalogue tool id, the gate verdict, the number of agents, `EX-1`/`EX-2`/`EX-3` or `own` (never the real issue key), the report destination (file/jira/github) |

`tests_run` (green and red counts of `npm test` in the missions project) is local only and is never sent.

## What never leaves your computer

- Your prompts, Claude's answers and your code.
- File names, paths, the working folder and `transcript_path`.
- Repository names and real issue keys.
- Tokens.
- Your email, user name and machine name.

**How the kit makes sure:**
- The telemetry hook reads Claude Code's hook input, keeps only the name of the feature and discards the rest without writing it anywhere.
- It acts only in the workshop projects (`~/workshop-claude` and repositories where `/task-intake` created `.workshop/`).
- It never does network itself. A separate sender posts the queue in batches.
- A test (`tools/test/telemetry-privacy.test.mjs`) feeds it the real inputs of Claude Code 2.1.292 with markers in every free-text value, and fails if any marker reaches a file.

## Nickname

Off by default. With `ctl.mjs nickname <name>` (1 to 16 characters: letters without accents, digits, space, `_`, `-`), your nickname can appear in the panel's milestone feed, for example "Ana was the first in room A to finish M4". The presenter can hide any nickname. The panel never shows a ranking of people: it shows the room and the comparison between the two rooms.

## The server

- **Where it runs:** a Cloudflare Worker with a Durable Object (the API) and Cloudflare Pages (the page), on `workers.dev` and `pages.dev` addresses (D-30).
- **What our code stores:** the allowed events. It never stores your IP address, the request headers or Cloudflare's request data, and the Worker's logs are off.
- **What Cloudflare sees:** your IP address, at the network level, like any website you open.
- **How long it keeps the events:** they are deleted 7 days after the workshop. The organizer resets the workshop with `POST /admin/reset`, and the workshop code and the admin token change for each workshop.

## Expiry and uninstall

- **Expiry:** the telemetry configuration has an expiry date, the end of the day after the workshop (`WORKSHOP_DATE` in `repos.conf`; without a date, 14 days after the install). After it, the kit records and sends nothing.
- **Uninstall:** `--uninstall` deletes `~/.workshop-claude/telemetry/` (the book, the queue and the id).
