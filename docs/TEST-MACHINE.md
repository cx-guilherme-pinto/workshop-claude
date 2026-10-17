# Testing on the presentation machine

**English** · [Português](pt/TEST-MACHINE.md)

A full test run for the Mac that has everything: the company's Jira and Confluence, the corporate GitHub and your Claude account. It shows what works and what is missing, and saves a report you can bring back for review.

The script is `tools/test-machine.sh` and it only works on macOS.

## 1. Get the kit onto that machine

**If that machine can reach the Gitea:** `git clone` both repositories, side by side in the same folder.

**If it can't** (company network): on this machine, run:

```bash
bash tools/pack-for-transfer.sh
```

The result is a zip, `dist/transfer/workshop-claude-package-<date>.zip`, with:
- `workshop-claude.bundle` and `claude-memory-app.bundle`: the full history, every branch and every tag, but only what is committed;
- `SHA256SUMS`;
- `README.md` (English) and `LEIA-ME.md` (Portuguese): the steps to verify, clone, test and publish to the corporate GitHub with the history (`git push --mirror`).

Before closing the zip, the script clones each bundle and checks it has the same number of commits as the original. Copy the zip over AirDrop or a USB stick and, on the other machine:

```bash
unzip workshop-claude-package-*.zip && cd workshop-claude-package-*
shasum -a 256 -c SHA256SUMS
git clone workshop-claude.bundle workshop-claude
git clone claude-memory-app.bundle claude-memory-app
```

## 2. What to prepare first

- **A Jira test issue** (`--jira ABC-123`). Ideally with a link to a Confluence page in the description, so that reading pages gets tested too. The script only reads it; it only writes with `--write` and after your "yes".
- **The id of a Confluence page** (`--confluence 123456`): the number in the URL `…/wiki/spaces/<space>/pages/<id>/…`.
- **The corporate GitHub** (`--github-host github.empresa.com` and `--github-repo equipa/workshop-claude`), once the kit is published there. If the company uses github.com, you don't need `--github-host`.
- **Logins done:** Claude Code, `gh` (on the company server), Jira in `/mcp` and `acli auth login`. If nothing is installed yet, use `--install`: the script runs the setup the way a participant would and asks for the logins along the way.

## 3. Run it

Open the Terminal in the `workshop-claude` folder.

**Before publishing to the corporate GitHub** (tests the kit, the setup and the accounts):

```bash
bash tools/test-machine.sh --install --jira ABC-123 --confluence 123456
```

**After publishing** (also tests the release and the download the participants will do):

```bash
bash tools/test-machine.sh --jira ABC-123 --confluence 123456 --github-host github.empresa.com --github-repo equipa/workshop-claude
```

**Full run**, with the whole Project 1 session and a test comment on Jira:

```bash
bash tools/test-machine.sh --jira ABC-123 --confluence 123456 --github-host github.empresa.com --github-repo equipa/workshop-claude --arena --write
```

To repeat only part of it, use `--only` with the phase numbers, for example `--only 3,4`. The full help is in `bash tools/test-machine.sh --help`.

## 4. What each phase does

| Phase | What it tests | Writes? | Cost | Time |
|---|---|---|---|---|
| 1. Kit | `tools/test-all.sh`, the setup tests and the Agent Memory app tests (if the clone sits next to it) | no | — | 3 to 5 min |
| 5. Release | The release on the corporate GitHub: the 6 files, the SHA-256s, whether the release's `repos.conf` points there, whether the participants' `curl \| bash` works without login and with a token, and the Agent Memory app release | no | — | 1 min |
| 2. Setup | `--install` runs the real setup; `--check` always runs afterwards. Uses the release script if phase 5 downloaded it | only with `--install` (in your profile, as a participant) | — | 3 to 15 min |
| 3. Accounts | Login and a test request to Claude; `gh` on the company server and the permission on the repository; the Jira MCP answering; `acli` logged in, reading the issue and the page (measures the size in `storage` and `view`); the Agent Memory app and its MCP | no | ~US$ 0.01 | 1 min |
| 4. Project 2 | `/task-intake <issue>` in a copy of the practice project, first through the MCP and then with the MCP turned off, to force the use of `acli`. Checks `tarefa.json` (source, id, epic, `via`) and the Confluence section | only in the test folder | ~US$ 0.15 to 0.30 | 2 to 4 min |
| 6. Arena | Only with `--arena`: the full participant session (`/demo-plan` → `/demo-swarm` → `/demo-review` → `/demo-cost`) | only in the test folder | ~US$ 1 | ~5 min |
| 7. Write | Only with `--write`: posts 1 test comment on the issue with `acli`, after your "yes" | **yes**, 1 comment | — | seconds |

The actual order is 1, 5, 2, 3, 4, 6, 7, because phase 5 downloads the setup that phase 2 uses.

## 5. Publish to the corporate GitHub

Follow [`docs/PUBLISHING.md`](PUBLISHING.md). In short, on the company machine:

```bash
git remote add empresa https://github.empresa.com/equipa/workshop-claude.git
tools/switch-repos.sh --workshop-url https://github.empresa.com/equipa/workshop-claude.git --memory-url https://github.empresa.com/equipa/claude-memory-app.git --raw-pattern 'https://github.empresa.com/{owner}/{name}/raw/{version}/{path}' --release-pattern '{repo}/releases/download/{version}/{file}'
```

(This `raw` pattern is the one for a self-hosted GitHub Enterprise server; on github.com use the one in [`docs/PUBLISHING.md`](PUBLISHING.md).)

- **Configure:** in `repos.conf`, switch to `RELEASE_PROVIDER=github`. On a self-hosted GitHub Enterprise server, also set `GITHUB_API_URL=https://github.empresa.com/api/v3` and `GITHUB_UPLOADS_URL=https://github.empresa.com/api/uploads`.
- **Publish:** commit, tag and `git push empresa main --tags`. Then `tools/build-release.sh <version>`, `tools/publish-release.sh <version> --dry-run` and `tools/publish-release.sh <version> --prerelease`. The token comes from `gh auth login` on that server.
- **Agent Memory app:** do the same in its repository.
- **Confirm:** run the test again with `--github-host` and `--github-repo`.

## 6. The report

The result goes to `~/workshop-test/<date>/report.md`: a table with ✅ ⚠️ ❌ ⏭️ for each check, the cost of the calls to Claude and the summary of `setup --check`.

- **What to share:** only `report.md`. It has no tokens and none of the content of the issues and pages: only keys, statuses and sizes.
- **What not to share:** the `logs/` folder and the `projeto2-*` folders. They hold the full Jira and Confluence responses (company data), even after redaction has removed the tokens.
- **The script exits with code 0** when there is no ❌.

**What to look at first** (the check names in the report are in Portuguese):
- **Phase 5, "One-line command without login"**: if the repository is private or internal, participants can't run `curl | bash` without logging in. The next warning says whether the same URL works with a token. If neither works, the way the setup is distributed has to change before the workshop.
- **Phase 3, "GitHub server"**: the setup only logs in to github.com. If the company uses its own server, participants need to log in to that server.
- **Phase 3, "acli login"**: "site admin must authorize" means a Jira admin has to approve the ACLI app once (`E-ACLI-02` in [TROUBLESHOOTING](TROUBLESHOOTING.md)).
