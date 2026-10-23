# Privacy of the workshop panel

The kit has a **mission book** that lives only on your computer, and a **live panel** that the presenters project next to the slides. This page covers what the panel receives, what never leaves your laptop and how to turn it off. The rules come from the specification (`docs/pt/WORKSHOP-V2-SPEC.md`, section 6.6) and from decisions D-30 and D-31 in `DECISIONS.md`.

## Registration (decision D-34)

- **Everyone is on the panel.** The setup registers you right after the GitHub login (step 6). There is no question to answer.
- **How the registration works — no token and no email leave your computer:**
  - on your laptop, the kit asks gh (which keeps its own login) for your GitHub profile and your emails, and checks there that the account has a **verified email of the company domain** (`PANEL_EMAIL_DOMAIN`, checkmarx.com);
  - it then sends the panel's Worker, over HTTPS, only two things: your GitHub name and a hash (SHA-256) of the workshop code and your GitHub account id, so that a second laptop or a new setup keeps your place that day;
  - the Worker answers with a credential, an HMAC signature that only the server can make. That signature is all that goes with your events afterwards.
- **What the panel keeps:** your GitHub name (as it appears on the leaderboard) and the hash, until the end of the day. Never your email, your login, your account id or any token.
- **The trade-off (the organizer's choice):** the company email is checked on the laptop, so the Worker trusts the kit's word. Anyone who has the workshop code could register a made-up name; the presenter can hide any name, and the code changes for each workshop.
- **Without a company email:** you do the workshop all the same; you just do not appear on the leaderboard.
- **Your commands:**
  - `node ~/.workshop-claude/kit/telemetry/ctl.mjs status` shows your registration;
  - `ctl.mjs register` registers again;
  - `ctl.mjs unregister` stops sending anything to the panel, for example at the end of Project 1, before working in your own repository. The events still waiting to leave are deleted; your mission book and your local data stay. Running the setup again does not put you back: only `ctl.mjs register --again` does;
  - `ctl.mjs show` prints the last 20 events, exactly as they leave your computer.
- **The scope it needs:** the GitHub login of the setup asks for the `user:email` scope, so that the panel can see your verified emails.
- **The mission book** (`/missions` and the statusline) works the same, registered or not.

## What is sent (once registered)

Only the events and fields in `telemetry/allowlist.json`. Nothing else can be sent: the kit drops any other field before writing the queue, and the server refuses it again. Every event has:
- the format version;
- the workshop code;
- the participant id the panel gave you at registration;
- the event name, the time and the kit version.

The events add:

| Event | Extra fields |
|---|---|
| `join` | language (pt/en), system (mac/win) |
| `check_ok` | — |
| `feature` | the name of a Claude Code feature you used once in a session: `plan_mode`, `model_switch`, `subagent`, `skill_user`, `hook_user`, `loop`, `statusline_user`, `headless`, `memory_write` |
| `mission_done` | the mission id (M1 to M11) |
| `cost` | a cost in US$ (from the tokens in the transcripts × `pricing.json`), the model family (haiku/sonnet/opus/other), the block (missions/p1/p2) |
| `p1_*`, `p2_*` | your Project 1 and 2 choices and results: parallelism, model, forecast in minutes, number of tasks, duration, green/red counts, a catalogue tool id, the gate verdict, the number of agents, `EX-1`/`EX-2`/`EX-3` or `own` (never the real issue key), the report destination (file/jira/github) |

`tests_run` (green and red counts of `npm test` in the missions project) is local only and is never sent.

## What never leaves your computer

- Your prompts, Claude's answers and your code.
- File names, paths, the working folder and `transcript_path`.
- Repository names and real issue keys.
- Tokens: none, ever. gh keeps its own; the panel credential is a signature made by the server.
- Your email, your GitHub login, your account id and your machine name. Only your GitHub name and a hash of the account reach the panel.

**How the kit makes sure:**
- The telemetry hook reads Claude Code's hook input, keeps only the name of the feature and discards the rest without writing it anywhere.
- It acts only in the workshop projects (`~/workshop-claude` and repositories where `/task-intake` created `.workshop/`).
- It never does network itself. A separate sender posts the queue in batches.
- A test (`tools/test/telemetry-privacy.test.mjs`) feeds it the real inputs of Claude Code 2.1.292 with markers in every free-text value, and fails if any marker reaches a file.

## The leaderboard

The panel shows one leaderboard of people, with the GitHub name, ranked by points:
- each validated mission: 1 point;
- each project's swarm done: 1 point;
- a spec you fixed: 1 point;
- each gate approved: 2 points;
- the Project 2 report: 1 point.

Ties go to whoever got there first. The cost never counts: spending more cannot give points. The presenter can hide any name (it stays ranked, as "—").

## The server

- **Where it runs:** a Cloudflare Worker with a Durable Object (the API) and Cloudflare Pages (the page), on `workers.dev` and `pages.dev` addresses (D-30).
- **What our code stores:** the allowed events and the registrations (GitHub name, the account hash). It never receives your email or any token, it never stores your IP address, the request headers or Cloudflare's request data, and the Worker's logs are off.
- **What Cloudflare sees:** your IP address, at the network level, like any website you open.
- **How long it keeps them: until midnight.** At the end of each day (midnight, `PANEL_TIMEZONE` in `repos.conf`, Europe/Lisbon) the panel deletes everything: the events, the names, the account hashes and the signing secret, so yesterday's credentials stop working. Nothing of one day is left for the next. The organizer can also delete it all at any time with `POST /admin/reset`, and the workshop code and the admin token change for each workshop.
- **On your laptop after that:** the next time it tries to send, the panel no longer knows your credential; the kit then ends your registration and empties its queue. Your mission book stays (it is yours, on your computer).

## Expiry and uninstall

- **Expiry:** the telemetry configuration has an expiry date, the end of the day after the workshop (`WORKSHOP_DATE` in `repos.conf`; without a date, 14 days after the install). After it, the kit records and sends nothing.
- **Uninstall:** `--uninstall` deletes `~/.workshop-claude/telemetry/` (the book, the queue and the id).
