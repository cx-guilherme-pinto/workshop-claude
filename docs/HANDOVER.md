# Handover — workshop kit

**English** · [Português](pt/HANDOVER.md)

For the Claude session that continues the work on the company machine, which has Jira, Confluence and corporate GitHub but not the development Gitea. Written on 16 Oct 2026, at the end of the build.

Also read [`CLAUDE.md`](../CLAUDE.md) (rules and commands), [`DECISIONS.md`](../DECISIONS.md) (D-01 to D-21: what was decided and why, in Portuguese) and the Memória app's `docs/HANDOVER.md`, in the `claude-memory-app` repository.

## Where this comes from

The kit and the app were built on another machine, against a private Gitea (`repos.conf` → `DEV_REPO_HOST`). They arrived here in a zip with two git bundles: the full history, every branch and every tag. The `claude/*` branches come from parallel sessions and are already merged into `main`; they stay only as history.

## Status

| Piece | Status | Validated by |
|---|---|---|
| Setup (Mac and Windows) | Complete. Installs everything from scratch, without admin, and speaks English since D-20 | 115 bash tests, 44 Pester tests, PSScriptAnalyzer with no errors, end to end on the Mac in empty HOMEs. **Never run on real Windows** |
| Project 1 (Arena) | 100 cards; 15 in participant mode | Benchmark with the skills in pt (D-16): 10/10, US$ 1.03 on average and 4.0 min. With the skills in English: 6/6, US$ 0.94 to 1.05 and 4.0 to 4.5 min (Arena in pt and in en; D-20). Presenter: 3/3, US$ 2.54 and 7.1 min |
| Project 2 (`/task-*`) | Jira through the MCP, with `acli` as the fallback (D-19); Confluence through the MCP or `acli`; GitHub through `gh` | End to end on the practice project (D-18). **Never run against a real corporate Jira, Confluence or GitHub** |
| Memória app v0.4.0 | 4 languages, log of the MCP calls, portable app | 227 tests, selftest and an isolated install |
| Slides | 47 slides, 90 min, in pt and en | Rendered in LibreOffice |
| Releases | `v1.0.0-dev.3` on Gitea | `--check` from the release |

## What is left (in order)

1. **Test the machine without accounts:** `bash tools/test-machine.sh --only 1` (guide in [`docs/TEST-MACHINE.md`](TEST-MACHINE.md)). Phase 1 (kit and app) must be all green. It has already been validated from a clone of the zip.
2. **Publish to the company GitHub:** `bash tools/publish-to-github.sh --owner <org> [--host <host>] --dry-run`, then again without `--dry-run`. The script:
   - creates the repositories (private by default);
   - pushes the history;
   - switches the URLs (kit: `tools/switch-repos.sh`; app: `scripts/mudar-alojamento.sh`);
   - publishes the app (v0.4.1) and then the kit (`v1.0.0-rc.1`);
   - runs phase 5 of the test.
   It asks for a "yes" before each step.
3. **Full test with real accounts:** `bash tools/test-machine.sh --install --jira <test issue> --confluence <id> --github-host <host> --github-repo <org>/workshop-claude`. Add `--arena` (about US$ 1) and `--write` (1 test comment) when you want. The organizer brings back the `report.md`.
4. **Decisions the report may call for:**
   - **Private or internal repository.** Participants may not be able to run `curl … | bash` without logging in. Phase 5 tests it without login and with a token. If neither works, the way the setup is distributed has to change. For example: the setup in a public place, or `gh release download` after a `gh auth login` — but the setup is what installs `gh`, so the order needs designing.
   - **GitHub Enterprise Server.** Step 6 of the setup runs `gh auth login --hostname github.com`. If the company uses another server, `repos.conf` needs a key (for example, `GITHUB_HOST`) for the setup to use in the login and in `gh auth setup-git`. It does not exist today.
   - **Jira.** An admin has to authorize the Atlassian MCP (domains and Rovo credits) and the ACLI app on the site (OAuth, once). See [`docs/ORGANIZER.md`](ORGANIZER.md) and `E-ACLI-02` in [TROUBLESHOOTING](TROUBLESHOOTING.md).
5. **Real Windows:** tests W1 to W17 in [`docs/MANUAL-TESTS.md`](MANUAL-TESTS.md), on Windows 10 and 11, on an account without admin.
6. **A timed interactive session** of Project 1 on a new Console account (Evaluation tier; 429s are possible).
7. **Interactive logins:** M5 to M7 (Claude Console, GitHub and `acli`).

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
- **New decisions:** go into `DECISIONS.md` (D-21 onwards), with the date and what was validated.
