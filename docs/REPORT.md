# Final report — workshop kit "Agent Orchestration with Claude"

**English** · [Português](pt/REPORT.md)

Date: 16 Oct 2026. Development releases on Gitea:
- `workshop-claude` **v1.0.0-dev.3** (prerelease): setup-mac.sh, bootstrap-windows.ps1, setup-windows.ps1, the kit as .tar.gz and .zip (0.9 MB) and SHA256SUMS;
- `claude-memory-app` **v0.4.0** (languages pt, en, hi and he; log of MCP calls): wheel, constraints.txt, installers, the portable app (Mac arm64 and x86_64, Windows x64) and SHA256SUMS.

## What was done

| Piece | Status | Where |
|---|---|---|
| One-command setup, Mac and Windows | Installs and configures everything from scratch, without admin rights: git (portable on a Mac without Command Line Tools), Claude Code, Claude login, Node, uv + Python, gh, GitHub login (required), Jira MCP and the Atlassian CLI as backup, skills, agents, hooks, statusline, projects, memory app and Desktop (optional). Has `--check`, `--doctor` (with the Claude helper), `--uninstall` and resume | `setup/`, `installer/` |
| Languages (D-20) | The setup speaks English only (English options; the Portuguese ones still work) and writes Claude Code's `language` setting from the machine language, if it does not exist. Skills and agents in English, answering in the participant's language. Arena, orchestrator and statusline in Portuguese or English, depending on the machine (`WORKSHOP_LANG` forces it). Docs in Portuguese and English | `setup/messages.en.json`, `docs/en/`, `README.en.md` |
| URLs in a single file | `repos.conf`; README and docs generated; `tools/switch-repos` and `docs/PUBLISHING.md` to move to the public repositories | `repos.conf`, `tools/` |
| Security Arena (Project 1) | 100 specified cards in 10 categories (15 in participant mode), 4 models, pre-written tests, server with CSP, gallery, live and replay `/estado`, and reference solutions outside the kit | `demo-project/`, `dev/solutions/` |
| Deterministic orchestrator | `next-wave` (waves, dependencies, no shared files in the same batch, retries escalating to Sonnet), `grade`, `gate`, `digest`, `report`, `painel`, `validate-plan`, calibrated estimate | `orquestrador/` |
| Cost measurement | `SubagentStop`/`Stop` hooks that read the real tokens from the transcripts × `pricing.json`; statusline; informative warning at US$ 5 and at US$ 10 | `hooks/`, `statusline/`, `pricing.json` |
| Skills and agents | Demo: `/demo-plan`, `/demo-swarm`, `/demo-review`, `/demo-cost`, `/demo-reset`, `/memoria`. Production: `/task-intake`, `/task-plan`, `/task-swarm`, `/task-gate`, `/task-report`, `/memoria`. Opus, Sonnet and Haiku agents | `skills-*/`, `agents/` |
| Practice project (Project 2 without Jira) | Municipal Library with 3 local issues, linked to the epic EX-100 | `exemplo-projeto-real/` |
| Memória app | Markdown + SQLite FTS5, graph, search by name, project, ticket and epic, MCP server, `memoria update`, and the same look as the Arena | repo `claude-memory-app` |
| Design skill | MIT fork inside the repo (commit `2b44c81`), without the network script | `skills-shared/design-taste-frontend/` |
| Presentation | 45 slides for 90 min, with notes, running clock, "Do it now" slides, the real video of the 100 agents and screenshots | `slides/workshop.pptx`, `slides/speaker-notes.md` |
| Swarm preview | Sped-up video (92 s), GIF and the recorded Arena for replay without the API | `slides/media/`, `presenter-replay/` |
| Documentation | FAQ, TROUBLESHOOTING (error catalog), INSTALL, ORGANIZER, PUBLISHING, MANUAL-TESTS, DECISIONS (D-01 to D-21); English first, the docs also in Portuguese, and the README and install guide in Hindi and Hebrew | `docs/`, `docs/pt/`, `docs/hi/`, `docs/he/`, `DECISIONS.md` |

## Measured costs

Real tokens × published prices (`pricing.json`). Details in `benchmark/REPORT.md`.

| Run | N | Success | Average cost (max.) | Average duration (max.) |
|---|---|---|---|---|
| Full participant session (`/demo-plan` → `/demo-cost`) | 10 | 10/10 | **US$ 1.03** (1.12) | **4.0 min** (4.8) |
| Presenter mode, 100 cards, 107 agents | 3 | 3/3 | **US$ 2.54** (2.55) | **7.1 min** (7.9) |
| Project 2 on the practice project (EX-3) | 1 | 1/1 | US$ 0.60 | 3.9 min |
| Error helper and final test (Haiku) | — | — | < US$ 0.01 | seconds |

- Acceptance criterion **met with room to spare**: target of US$ 5 per participant and a ceiling of US$ 10, with no cut-off.
- The participant's session total, even adding Project 2, stays close to US$ 2.
- **Note:** `/usage` in Claude Code 2.1.285/2.1.292 shows 2 to 4× more, because it does not know Haiku 5.5 yet. The FAQ explains this and the Console is the reference.

## Verified

- Automated tests: hooks (9), orchestrator (6), Arena (665 with solutions), Arena app (16), setup (80 bash, 32 Node, 41 Pester), memory (147).
- Lint: shellcheck clean and PSScriptAnalyzer without errors (PS 5.1 compatibility rules). `check-repo` confirms there are no URLs outside `repos.conf`, that the `.ps1` files are ASCII and that there are no calls to Python.
- End-to-end setup on Mac, in empty HOMEs with accents and spaces, from the real one-line command on Gitea: installs everything; idempotent; resumes; `--check`, `--desinstalar`.
- Mac without Command Line Tools → portable git. No Python on the system → uv's Python. No Node → official Node. Downloads with `curl` → no Gatekeeper prompts, even with unsigned binaries (D-17).

## Open risks

1. **Interactive logins** (Claude Console, GitHub and Atlassian CLI): the code is ready and the commands were verified, but the browser flow can only be tested with a person running the setup. Checklist M5 to M7 in `docs/en/MANUAL-TESTS.md`.
2. **Real Windows was never run**: only static analysis, Pester and PSScriptAnalyzer. W1 to W17 must be run on Windows 10 and 11, on an account without admin rights.
3. **New Console accounts (Evaluation tier)**: the rate limits are not public and there may be 429s (slowness, not failure). Mitigation: parallelism 8, pre-work a few days before, replay as plan B.
4. **Each company's Jira**: the admin may restrict the Atlassian MCP; the calls spend Rovo credits. Backup: the Atlassian CLI (`acli`), which reads the issue and posts the comments when the MCP fails (D-19). The admin has to authorize the ACLI app on the site once, and `acli` does not log time. Without Jira: the practice project.
5. **Corporate networks**: TLS interception handled; NTLM-only proxies are not supported; EDR/AppLocker may block binaries in the profile (D-17 has the signing plan).
6. **Benchmark without full isolation**: the benchmark token got truncated when pasted. The token and cost numbers are not affected. To repeat it isolated: `claude setup-token` and save the whole token in the Keychain (`workshop-benchmark-oauth`).
7. **Claude Code version**: pinned to 2.1.292. If it changes before the workshop, repeat one benchmark run.

## Organizer's next steps

1. Run the manual tests M5 to M7 (Mac) and W1 to W17 (Windows), and record the results in `DECISIONS.md`.
2. One timed interactive session of Project 1 on a new Console account.
3. When there are public repositories: follow `docs/PUBLISHING.md` (update `repos.conf`, regenerate, create the releases and run `--check`).
