# Handover — workshop kit

**English** · [Português](pt/HANDOVER.md)

For the Claude session that continues the work on the company machine, which has Jira, Confluence and corporate GitHub but not the development Gitea. Written on 16 Oct 2026, at the end of the build.

Also read [`CLAUDE.md`](../CLAUDE.md) (rules and commands), [`DECISIONS.md`](../DECISIONS.md) (D-01 to D-27: what was decided and why, in Portuguese) and the Agent Memory app's `docs/HANDOVER.md`, in the `claude-memory-app` repository.

## Update, 17 Oct 2026 (v1.0.0-rc.2)

- **Chaos tests (D-26):** 155 broken-environment scenarios on a real Mac, each in an isolated HOME, in three rounds. Round 1: 56 failures plus 12 Windows problems from a static review. Round 2: none of them came back; 46 new ones (new categories), all fixed. Round 3: clean.
- **Tests now:** 601 bash tests, 239 Pester tests (Pester and PSScriptAnalyzer run on a portable PowerShell 7.4.6, without Docker), app 370 tests. Still **never run on real Windows**: the first check list is [`WINDOWS-CHECKLIST.md`](WINDOWS-CHECKLIST.md).
- **English:** the English deck uses English media (swarm video, poster, memory search); the full English demo video (`tools/record/out/demo-en-20261017/demo-completa.en.mp4`, not in git) has no Portuguese word. Plan B replays: `presenter-replay/arena` (pt) and `presenter-replay/arena-en`.
- **Releases:** `v1.0.0-rc.2` and Agent Memory `v0.5.0` are built locally; publishing needs the organizer's "yes".

## Where this comes from

The kit and the app were built on another machine, against a private Gitea (`repos.conf` → `DEV_REPO_HOST`). They arrived here in a zip with two git bundles: the full history, every branch and every tag. The `claude/*` branches come from parallel sessions and are already merged into `main`; they stay only as history.

## Status

| Piece | Status | Validated by |
|---|---|---|
| Setup (Mac and Windows) | Complete. Installs everything from scratch, without admin, and speaks English since D-20 | 115 bash tests, 44 Pester tests, PSScriptAnalyzer with no errors, end to end on the Mac in empty HOMEs. **Never run on real Windows** |
| Project 1 (Arena) | 100 cards (105 tasks) in both modes: 8 agents in parallel for the participant, 16 for the presenter (D-24) | Interactive participant run (D-24): 105/105 green, swarm 6.5 min, full session about 9 min, US$ 3.39. Earlier benchmark, with 15 cards and the skills in pt (D-16): 10/10, US$ 1.03 on average and 4.0 min. With the skills in English: 6/6, US$ 0.94 to 1.05 and 4.0 to 4.5 min (Arena in pt and in en; D-20). Presenter: 3/3, US$ 2.54 and 7.1 min |
| Project 2 (`/task-*`) | Jira through the MCP, with `acli` as the fallback (D-19); Confluence through the MCP or `acli`; GitHub through `gh` | End to end on the practice project (D-18). **Never run against a real corporate Jira, Confluence or GitHub** |
| Agent Memory app | v0.4: 4 languages, log of the MCP calls, portable app. v0.5.0: the new name and English names for the command (`agent-memory`), the MCP server and tools and the note fields; old notes are still read (D-25) | v0.4.0: 227 tests, selftest and an isolated install |
| English names (D-25) | Files, folders, commands, flags, markers, Arena task ids and the memory MCP tools are in English in both languages; the old names still work as aliases | Kit tests. The swarm video and two screenshots in the slides still show the old names (see below) |
| Slides | 47 slides, 90 min, in pt and en | Rendered in LibreOffice |
| Releases | `v1.0.0-dev.3` on Gitea | `--check` from the release |

## What is left (in order)

1. **Test the machine without accounts:** `bash tools/test-machine.sh --only 1` (guide in [`docs/TEST-MACHINE.md`](TEST-MACHINE.md)). Phase 1 (kit and app) must be all green. It has already been validated from a clone of the zip.
2. **Publish to the company GitHub:** `bash tools/publish-to-github.sh --owner <org> [--host <host>] --dry-run`, then again without `--dry-run`. The script:
   - creates the repositories (private by default);
   - pushes the history;
   - switches the URLs (kit: `tools/switch-repos.sh`; app: `scripts/mudar-alojamento.sh`);
   - publishes the app and then the kit (the versions in `repos.conf`);
   - runs phase 5 of the test.
   It asks for a "yes" before each step.
3. **Full test with real accounts:** `bash tools/test-machine.sh --install --jira <test issue> --confluence <id> --github-host <host> --github-repo <org>/workshop-claude`. Add `--arena` (about US$ 1) and `--write` (1 test comment) when you want. The organizer brings back the `report.md`.
4. **Decisions the report may call for:**
   - **Private or internal repository.** Participants may not be able to run `curl … | bash` without logging in. Phase 5 tests it without login and with a token. If neither works, the way the setup is distributed has to change. For example: the setup in a public place, or `gh release download` after a `gh auth login` — but the setup is what installs `gh`, so the order needs designing.
   - **GitHub Enterprise Server.** Step 6 of the setup runs `gh auth login --hostname github.com`. If the company uses another server, `repos.conf` needs a key (for example, `GITHUB_HOST`) for the setup to use in the login and in `gh auth setup-git`. It does not exist today.
   - **Jira.** An admin has to authorize the Atlassian MCP (domains and Rovo credits) and the ACLI app on the site (OAuth, once). See [`docs/ORGANIZER.md`](ORGANIZER.md) and `E-ACLI-02` in [TROUBLESHOOTING](TROUBLESHOOTING.md).
5. **Real Windows:** tests W1 to W19 in [`docs/MANUAL-TESTS.md`](MANUAL-TESTS.md), on Windows 10 and 11, on an account without admin.
6. **A timed interactive session** of Project 1 on a new Console account (Evaluation tier; 429s are possible).
7. **Interactive logins:** M5 to M7 (Claude Console, GitHub and `acli`).
8. **Record the English media again** with the English names (`tools/record`): the swarm video and its poster, and the memory search screenshot, in `slides/media/`. The English deck still uses the Portuguese recordings, made before D-25.

## Known risks

- **Pinned versions:**
  - Claude Code 2.1.292: if it changes before the workshop, rerun 1 benchmark;
  - `acli` 1.3.39: each version is only supported for 6 months, until Mar 2027;
  - Node 24.22.0, uv 0.13.1 and gh 2.102.0.
- **Cost:** Claude Code's `/usage` shows 2 to 4× more, because it does not know the Haiku 5.5 price yet. The reference is the Console (see the [FAQ](FAQ.md)).
- **Corporate networks:** TLS interception is handled; NTLM-only proxies are not supported; EDR or AppLocker may block binaries in the user profile. D-17 has the Mac signing plan.

## Rules for this continuation

- **Writes:** nothing is written to Jira, Confluence or GitHub without the organizer's "yes" in the conversation. The same goes for pushes, releases and creating repositories.
- **Tokens:** never shown, saved or passed on the command line.
- **Company data:** stays out of the reports; issues and pages are only shown by key, status and size.
- **Tests:** before any push, `bash tools/test-all.sh` and `bash setup/test/test-mac.sh` green. If you touch the Windows setup, Pester too (command in `CLAUDE.md`).
- **New decisions:** go into `DECISIONS.md` (D-26 onwards), with the date and what was validated.
