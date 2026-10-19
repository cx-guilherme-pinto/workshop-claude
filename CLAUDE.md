# CLAUDE.md — kit for the workshop "Agent Orchestration with Claude"

A kit for a few hundred participants, each with their own **Console** (API) account, on company laptops running Mac and Windows, **without admin rights** and sometimes behind a proxy. The kit includes:
- a one-command setup;
- the skills and the agents;
- the cost hooks and the statusline;
- the orchestrator;
- two hands-on projects: the Security Arena and the practice project;
- the slides.

The Agent Memory app (called Memória until v0.4) lives in another repository (`claude-memory-app`), next to this one. Its command is `agent-memory` (MCP server `agent-memory`; `memoria` stays as a legacy alias).

**Read `docs/HANDOVER.md` first**: the current state, what is left and where to pick up. The decisions and the reasons behind them are in `DECISIONS.md` (D-01 to D-21, in Portuguese).

## Map

| Folder | What it is |
|---|---|
| `setup/` | `setup-mac.sh`, `setup-windows.ps1`, `bootstrap-windows.ps1` and the catalogs `messages.en.json` (what the setup prints; generates `docs/TROUBLESHOOTING.md`) and `messages.pt.json` (generates `docs/pt/TROUBLESHOOTING.md`). Tests in `setup/test/` |
| `installer/` | Node with no dependencies: user-level install, `settings.json` merge, Arena assembly, injection into the release, and redaction |
| `orchestrator/` | `next-wave`, `grade`, `gate`, `digest`, `report`, `publish-text`, `estimate`, `validate-plan`, `explore`, `dashboard` and `init-workshop`. The DAG is deterministic (D-07). Reads plans with English keys or the older Portuguese ones |
| `telemetry/`, `missions/`, `missions-project/` | Workshop v2 (D-30, D-31): the event allowlist, the telemetry hook's library, `emit`/`ctl`, the mission book (`rules.json`, `missions.mjs`, the `npm test` reporter) and the missions project (`i18n/en/` is the whole English project). Spec in `docs/pt/WORKSHOP-V2-SPEC.md`, hook events in `docs/OBSERVABILITY.md` |
| `panel/` | The live panel (D-32): `aggregate.mjs` (pure), `api.mjs` (same code in the Worker and in Node), `server.mjs` (local), `worker/` (Cloudflare Worker + Durable Object), `public/` (the page), `simulate.mjs`, `replays/`. Deploy with `tools/deploy-panel.sh` (asks before each step) |
| `hooks/`, `statusline/`, `pricing.json` | Cost from the real tokens in the transcripts × `pricing.json` (D-08). Never `total_cost_usd` |
| `skills-demo/`, `skills-prod/`, `skills-shared/`, `agents/` | Skills and agents, in English, that answer in the user's language (D-20) |
| `demo-project/` | The Arena (100 cards; `i18n/en/` overlays the pt source). Reference solutions in `dev/solutions/` (not shipped in the kit) |
| `practice-project/` | The practice project for Project 2 (issues in local JSON; `i18n/en/` is the whole English project). Installed as `~/workshop-claude/practice-project` |
| `benchmark/` | `run-benchmark.sh` (the full day, P1 + P2; `--dry-run`), `run-projeto2.sh` (P2 only), `person.mjs` (fixes the broken cards' specs), `collect`/`report`/`calibrar` and `REPORT.md` |
| `slides/` | `build.mjs` + `content.mjs` → `workshop.pptx` and `workshop.en.pptx` (`--lingua en`) |
| `docs/`, `README.md` | English is the primary version: `README.md` and `docs/` (INSTALL, PUBLISHING, TROUBLESHOOTING, FAQ, ORGANIZER, REPORT, MANUAL-TESTS, HANDOVER, TEST-MACHINE). Portuguese is secondary: `README.pt.md` and `docs/pt/`, with the same file names. Also `README.hi.md`, `README.he.md`, `docs/hi/INSTALL.md` and `docs/he/INSTALL.md` |
| `tools/` | `render.mjs` (templates in `tools/templates/<lang>/`), `check-repo.mjs`, `switch-repos.sh`, `build-release.sh`, `publish-release.sh`, `test-all.sh`, `test-machine.sh`, `pack-for-transfer.sh` and `publish-to-github.sh` |

## Rules that never break

- **URLs and versions only in `repos.conf`.** After changing them, run `node tools/render.mjs` (README, INSTALL, PUBLISHING and TROUBLESHOOTING in en and pt, plus README and INSTALL in hi and he; from `tools/templates/<lang>/*.tmpl` and the message catalogs). `node tools/check-repo.mjs` fails if the old server shows up anywhere else.
- **`.ps1` files are ASCII only.** Text shown to the user comes from the `messages.*.json` files, and both catalogs have the same keys (check-repo verifies it).
- **Skills:** frontmatter with `model`, `allowed-tools` and `disable-model-invocation`. They have:
  - the **Commands:** line: each command on its own, with no `;`, `&&` or `|`;
  - the **Language:** line;
  - `{{KIT_DIR}}` in the production skills;
  - an explicit "yes" before any write to Jira or GitHub.
- **Markers that are never translated** (English in both languages): `STATE: BATCH|DONE|BLOCKED`, `<<<CALLS … CALLS>>>`, `TASK:`/`AGENT:`/`ATTEMPT:`, `GATE: APPROVED|REJECTED`, `PLAN OK`, `PLAN INVALID`, `SWARM OK`, `COST OK`, `ERROR: plan not found`, `MEMORY UNAVAILABLE` and `OK <id>`/`FAILED <id>`.
- **Names the participant sees are English in both languages:** files, folders, flags, task ids, JSON keys written by the kit (`.workshop/task.md`, `task.json`, `verdict.json`, `PLAN.md`, `report.md`, `memory-summary.md`, `review-summary.md`, `publish.json`…), MCP tools (`mcp__agent-memory__memory_search|memory_add|memory_related`). Only human sentences are localised. Old names stay accepted as aliases (flags such as `--projeto`, `--todos`, `--teste`; files such as `veredito.json`, `tarefa.json`; `lingua.json`).
- **Tokens:** never on the command line, in files or in logs. They reach `curl` through `-K -` (stdin), and logs go through redaction.
- **No admin and no system Python** (D-14 and D-15): Node, uv/Python, gh, portable git and acli go into the user profile.
- **Never cut off for cost:** only warnings at US$ 5 and US$ 10.
- **Languages (D-20):**
  - the setup prints English only;
  - skills and agents are written in English and answer in the user's language;
  - kit texts (docs, slides, Arena, practice project, orchestrator, hooks, statusline) exist in Portuguese (pt-PT) and English. In the repo, English is the primary version and Portuguese the secondary one;
  - when translating, localise; don't translate word for word. Technical terms (swarm, agent, skill, hook, MCP, worktree, prompt, token…) stay in English in every language;
  - the organizer writes in Brazilian Portuguese; answer them in Portuguese.

## Tests

```bash
bash tools/test-all.sh            # hooks, orchestrator, Arena (pt and en), practice project, check-repo, tools, shellcheck (Docker; --no-docker skips it)
bash setup/test/test-mac.sh       # Mac setup functions (bash 3.2)
```

**Pester and PSScriptAnalyzer** (Windows), in Docker: image `mcr.microsoft.com/powershell:latest`, `--platform linux/amd64` and `-e DOTNET_TieredCompilation=0 -e DOTNET_TieredPGO=0 -e DOTNET_EnableWriteXorExecute=0` (without these, the emulation crashes). The Pester 5.7 and PSScriptAnalyzer 1.23 modules are mounted from a folder, and the command is `Invoke-Pester -Path setup/test/setup-windows.Tests.ps1`.

**Whole machine with real accounts** (Jira, Confluence, corporate GitHub): `bash tools/test-machine.sh --help` (guide in `docs/TEST-MACHINE.md`).

**Benchmark:** `BENCH_LINGUA=pt benchmark/run-benchmark.sh` (or `BENCH_LINGUA=en`) measures a participant's full day: Project 1 (own card, swarm, the 4 broken cards fixed by the benchmark's "person" and `--retry`, review, cost and memory) and Project 2 (`/task-*` on EX-1), about US$ 5 and 25 min per run, one row in `benchmark/results.csv`. `--scope p1|p2` measures one project, `--crypto haiku` the cheaper plan, `--dry-run` prints every `claude -p` call without calling Claude (free). `node benchmark/calibrar.mjs` recalibrates `orchestrator/profiles.json` from the runs of the current kit version. Check with the organizer before any run that is not a `--dry-run`.

## Publishing

- **Release:** `tools/build-release.sh <tag>` and `tools/publish-release.sh <tag> [--prerelease]`. The tag must match `WORKSHOP_VERSION`.
- **Company GitHub:** `tools/publish-to-github.sh --owner <org> [--host <host>] --dry-run` first. It creates the repositories, pushes the history, switches the URLs and publishes the app and then the kit, asking for confirmation at each step.
- **Confirmations:** any push, release or write to Jira or GitHub only with the organizer's "yes" in the conversation.
