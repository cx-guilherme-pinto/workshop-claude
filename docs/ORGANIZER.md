# Organizer guide

**English** · [Português](pt/ORGANIZER.md)

## Before the day (at least 3 days before)

1. **Send the install command** (the one in `README.md`, generated from `repos.conf`), with a deadline: "run it by <date>; on the day we will only check".
2. **Ask each person** to:
   - have their own **Console account**, with credits;
   - set a **monthly spend limit well above US$ 10** (for example, US$ 25), only as protection against abuse. Never below, because a limit that is hit cuts the session halfway;
   - run the setup and then `--check`;
   - send `~/.workshop-claude/summary.txt` if any step is missing.
3. **New accounts and rate limits.** New Console organizations may start on the *Evaluation* tier, with lower, unpublished limits. The participant's swarm uses up to 8 agents in parallel (`ARENA_MAX_PARALLEL`). If 429 errors show up, Claude Code retries by itself and the swarm just gets slower. We recommend that each person runs the setup and a `/demo-plan` a few days before, so the account builds some usage history.
4. **Jira.** The Atlassian MCP server uses OAuth and spends the organization's Rovo credits. In each company, the admin can:
   - restrict the allowed domains (Atlassian Administration → Connectors → Atlassian MCP server);
   - turn off write tools.
   **Backup:** the setup also installs the Atlassian CLI (`acli`, official), which the skills use when the MCP fails. Since version 1.3.15, an admin of each site has to authorize the ACLI app once: run `acli jira auth login`, choose "Web" and approve the site. Ask the admin for this together with the MCP request. Without OAuth, each person can log in with an API token (`E-ACLI-02`). `acli` does not log time (worklog): with it, `/task-report` only posts comments.
   People without Jira use `practice-project/` (issues in JSON).
5. **Room network.** Hundreds of laptops downloading at the same time exhaust the network. That is why the setup is done **before** the day. On the day, people only run `--check` and the API calls. Domains the room network must allow:
   - `api.anthropic.com`, `claude.ai`, `platform.claude.com`, `downloads.claude.ai`;
   - the repository server (from `repos.conf`);
   - `mcp.atlassian.com`, `*.atlassian.net`, `acli.atlassian.com` (Atlassian CLI download);
   - `github.com`, `api.github.com`;
   - for those who have not installed yet: `nodejs.org`, `astral.sh`, `releases.astral.sh`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, `pypi.org`, `files.pythonhosted.org`.
6. **Language.** The setup speaks English only. The skills are in English and answer in each person's language (the setup writes Claude Code's `language` setting, if it does not exist yet). The Arena, the orchestrator and the statusline are in Portuguese on Portuguese machines and in English on all others; `WORKSHOP_LANG=pt` or `WORKSHOP_LANG=en` forces one of them. File and folder names, commands, options, markers, the Arena task ids and the memory MCP tools are in English in both languages (D-25), so an English session shows no Portuguese. The documentation is in English first (`README.md`, `docs/`), with Portuguese versions (`README.pt.md`, `docs/pt/`) and the README and install guide also in Hindi and Hebrew (`README.hi.md`, `README.he.md`, `docs/hi/`, `docs/he/`): send the right version to each group.

## Tracking participants' spend

Each participant pays for their own account. So there is no central dashboard, and each person sees their own spend:
- in the Claude Code **statusline** (session and project cost, with a warning at US$ 5 and at US$ 10);
- in **`/demo-cost`** (report by agent, model and wave);
- in the **Console** → Usage and Cost (the billed amount, with a few minutes of delay).

If the organizer provides access (by inviting people to their Console organization), you can track everyone:
- **"Claude Code" workspace**: created automatically on the first Console login in Claude Code, and the only one that allows spend limits **per person**. Set them well above US$ 10.
- **Console → Claude Code** (`platform.claude.com/claude-code`): spend and accepted lines per member.
- **Admin API** (with an admin key): `GET /v1/organizations/usage_report/messages` (can be grouped by key and workspace, with buckets from 1 min to 1 day) and `GET /v1/organizations/cost_report`. The data arrives about 5 minutes late.
- **Watch the rate limits:** they are per organization. With hundreds of people in the same organization, you need to ask for a temporary increase (Custom tier) and start the swarms in queues.

## On the day

- **Opening:** everyone runs `--check`. Anyone with ❌ runs `--doctor` and shows the result to an assistant. Anyone without the setup pairs with a neighbour and installs during the Q&A break.
- **Plan B for the video:** if the MP4 fails on the projector, open `/status?replay=recording` in the recorded Arena (`presenter-replay/`), which replays the real run without calling the API.
- **Pace:** `slides/speaker-notes.en.md` (English deck, `slides/workshop.en.pptx`) has the running clock and the slides you can skip. The Portuguese deck has its own, `slides/speaker-notes.md`.

## The live panel (workshop v2)

The panel is a page projected next to the slides, fed by anonymous events from the laptops whose owners said yes in the setup (`docs/PRIVACY.md`). It runs on Cloudflare (D-30): the API on a Worker with a Durable Object, the page on Pages.

- **Publish** (at least 3 days before), from this repository, logged in to `wrangler`:
  1. Set `WORKSHOP_CODE` (a new one for each workshop) and `WORKSHOP_DATE` in `repos.conf`.
  2. Run `tools/deploy-panel.sh --dry-run`, then `tools/deploy-panel.sh`. It asks before each step: the Worker, the admin token (wrangler asks for it; it never goes on the command line) and the page.
  3. Put the two addresses it prints in `repos.conf` (`PANEL_URL`, `PANEL_PAGE_URL`), run `node tools/render.mjs` and build the release again, so the laptops send to the panel.
  4. Run `tools/deploy-panel.sh` again: the Worker now accepts the page's address (CORS).
- **Rehearse:** `node panel/simulate.mjs --people 100 --rooms 2 --speed 10 --url <PANEL_URL> --ws <code>` (with `PANEL_ADMIN_TOKEN` in the environment it also moves the views). Or run everything locally with `PANEL_ADMIN_TOKEN=<t> node panel/server.mjs` and open `http://127.0.0.1:8787/?room=A`.
- **On the day:**
  - Each room opens `<page>/?room=A` or `?room=B`; the closing uses `?room=all`.
  - The presenter adds `#admin=<token>` once: the token stays in the browser and keys 1 to 5 change the view in both rooms (Opening, Missions, Project 1, Project 2, Closing).
  - To hide a nickname from the feed, press `H` and click it.
  - On a slow projector, use `?lite=1`.
- **Plan B:**
  - Without network or the Worker, use `<page>/?replay=simulated&x=10`. After the rehearsal, use `?replay=rehearsal`, from `panel/replays/rehearsal.jsonl`.
  - The laptops keep their events in the queue and send them later. Their mission book keeps working.
- **After:** clear the workshop's events within 7 days: `POST <PANEL_URL>/admin/reset` with the header `X-Admin-Token`. Then change `WORKSHOP_CODE` and the token before the next workshop.

## After

- `agent-memory update` updates the Agent Memory app without touching the notes.
- To clean up a machine: run the setup with `--uninstall` (Windows: `-Uninstall`).
