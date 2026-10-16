# Organizer guide

[Português](../ORGANIZADOR.md) · **English**

## Before the day (at least 3 days before)

1. **Send the install command** (the one in `README.en.md`, generated from `repos.conf`), with a deadline: "run it by <date>; on the day we will only check".
2. **Ask each person** to:
   - have their own **Console account**, with credits;
   - set a **monthly spend limit well above US$ 10** (for example, US$ 25), only as protection against abuse. Never below, because a limit that is hit cuts the session halfway;
   - run the setup and then `--check`;
   - send `~/.workshop-claude/resumo.txt` if any step is missing.
3. **New accounts and rate limits.** New Console organizations may start on the *Evaluation* tier, with lower, unpublished limits. The participant's swarm uses up to 8 agents in parallel (`ARENA_MAX_PARALELO`). If 429 errors show up, Claude Code retries by itself and the swarm just gets slower. We recommend that each person runs the setup and a `/demo-plan` a few days before, so the account builds some usage history.
4. **Jira.** The Atlassian MCP server uses OAuth and spends the organization's Rovo credits. In each company, the admin can:
   - restrict the allowed domains (Atlassian Administration → Connectors → Atlassian MCP server);
   - turn off write tools.
   **Backup:** the setup also installs the Atlassian CLI (`acli`, official), which the skills use when the MCP fails. Since version 1.3.15, an admin of each site has to authorize the ACLI app once: run `acli jira auth login`, choose "Web" and approve the site. Ask the admin for this together with the MCP request. Without OAuth, each person can log in with an API token (`E-ACLI-02`). `acli` does not log time (worklog): with it, `/task-report` only posts comments.
   People without Jira use `exemplo-projeto-real/` (issues in JSON).
5. **Room network.** Hundreds of laptops downloading at the same time exhaust the network. That is why the setup is done **before** the day. On the day, people only run `--check` and the API calls. Domains the room network must allow:
   - `api.anthropic.com`, `claude.ai`, `platform.claude.com`, `downloads.claude.ai`;
   - the repository server (from `repos.conf`);
   - `mcp.atlassian.com`, `*.atlassian.net`, `acli.atlassian.com` (Atlassian CLI download);
   - `github.com`, `api.github.com`;
   - for those who have not installed yet: `nodejs.org`, `astral.sh`, `releases.astral.sh`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, `pypi.org`, `files.pythonhosted.org`.
6. **Language.** The setup speaks English only. The skills are in English and answer in each person's language (the setup writes Claude Code's `language` setting, if it does not exist yet). The Arena, the orchestrator and the statusline are in Portuguese on Portuguese machines and in English on all others; `WORKSHOP_LANG=pt` or `WORKSHOP_LANG=en` forces one of them. The documentation exists in Portuguese and English (`README.en.md`, `docs/en/`): send the right version to each group.

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
- **Plan B for the video:** if the MP4 fails on the projector, open `/estado?replay=gravacao` in the recorded Arena (`presenter-replay/`), which replays the real run without calling the API.
- **Pace:** `slides/speaker-notes.md` has the running clock and the slides you can skip.

## After

- `memoria update` updates the memory app without touching the memories.
- To clean up a machine: run the setup with `--uninstall` (Windows: `-Uninstall`).
