# Manual tests (what automation does not cover)

**English** · [Português](pt/MANUAL-TESTS.md)

These tests must be done on a real machine before publishing. For each one, record the date, the machine and the result in `DECISIONS.md`.

## Windows 10 and Windows 11 (user without admin rights)

Step-by-step checklist for one laptop (the Windows fixes, about 60 to 90 minutes): [WINDOWS-CHECKLIST.md](WINDOWS-CHECKLIST.md) · [Português](pt/WINDOWS-CHECKLIST.md).

| # | Step | Expected result |
|---|---|---|
| W1 | On an account **without admin rights**, in a normal PowerShell 5.1 (not 7), run the one-liner from the README | Starts without execution policy errors; the header shows up in English, with no garbled characters |
| W2 | Let it run to the end | Every step ✅ or ⏭️, except Desktop (⚠️); the final line says "Everything is ready for the workshop." |
| W3 | Close and open a new terminal; run `claude --version`, `node -v`, `gh --version`, `uv --version`, `agent-memory --help` | All of them answer (the PATH is right) |
| W4 | Run the one-liner again | Steps already done show as ⏭️ |
| W5 | Run with `-Check` | Only checks; changes nothing (compare the date of `~/.claude/settings.json`) |
| W6 | Turn off the network halfway through a second install (on a clean profile) and run again | Resumes; the failed step shows why and what to do |
| W7 | With a corporate proxy (or Fiddler/mitmproxy intercepting) | Detects the interception, exports the certificates and the test `claude -p` works |
| W8 | `claude` in the Arena folder → accept trust for the folder → `/demo-plan` | Shows the Mermaid diagram and the estimate |
| W9 | `/demo-swarm` with the statusline visible | Cards turning green; the statusline shows the cost; the timer stays under 20 min |
| W10 | `node server.js` and open the `/status` address it prints (usually `http://localhost:3000/status`) | The grid changes colour; no Windows firewall warning appears |
| W11 | Open the Agent Memory app from the Start menu | The window opens (WebView2) and the graph shows up |
| W12 | `-Uninstall` (and the old alias `-Desinstalar`) | `settings.json` goes back to what it was; the agents, the skills and the MCP are removed |
| W13 | User with a space and accents in the name (e.g. `C:\Users\João Silva`) | Everything works, including the hooks and the statusline |
| W14 | Windows on ARM (if available) | Uses the arm64 binaries or gives a clear message |
| W16 | Account with **nothing** installed (no Git, no Claude Code, no `gh`) | The setup installs Git for Windows (per user), Claude Code and `gh`; opens the Claude login and the GitHub login in the browser; steps 1, 3 and 6 ✅ |
| W15 | Machine **without Python** (confirm that `python`/`py` don't exist or only open the Microsoft Store) | The memory app step installs, uv downloads its own Python 3.12, and `agent-memory selftest` shows "Python 3.12.x" and "FTS5" |
| W17 | Atlassian CLI: at the end of the setup, accept "Log in to the Atlassian CLI now?…", then `acli auth status` in a new terminal | The browser opens and the login is done. On a site without the ACLI app approved, "site admin must authorize" shows up and step 7 continues without failing (just the note) |
| W18 | Windows in English (or any language other than Portuguese), with no `language` in `~/.claude/settings.json` | The setup writes `"language": "English"`; the Arena (cards and `/status`), the orchestrator tables and the statusline show up in English, with no Portuguese word, file name or marker; `/demo-plan` answers in English |
| W19 | On an account with a kit from before D-25 (English names) installed, run the one-liner again | `claude mcp list` shows `agent-memory` and no other memory server; the old notes show up in the Agent Memory app and through `/memory`; the practice project is in `~/workshop-claude/practice-project` (it is moved only if that folder did not exist yet, and nothing is deleted) |

## macOS (Apple Silicon and Intel)

| # | Step | Expected result |
|---|---|---|
| M1 | On an account without admin rights, with `curl -fsSL … \| bash` | Runs to the end; the questions (login) show up and accept an answer |
| M2 | Without Xcode Command Line Tools | The git step explains the pre-work (`xcode-select --install`) and the independent steps continue |
| M3 | Intel (x64) | Installs the x64 Node and the right Claude Code |
| M4 | Agent Memory app from `~/Applications/Agent Memory.app` | Opens without a Gatekeeper warning |
| M5 | Real Console login (`claude auth login --console`) on a new Console account | `claude auth status` shows the Console method; the smoke test shows the cost |
| M6 | Account with **nothing** installed (no Claude Code, no `gh`, no Command Line Tools) | The setup installs everything, opens the Claude account login in the browser and then the GitHub login (code in the terminal, confirmation in the browser); steps 3 and 6 ✅; "Everything is ready for the workshop." |
| M7 | Atlassian CLI: accept the login in step 7, then `acli auth status`. With the MCP removed (`claude mcp remove --scope user atlassian`), run `/task-intake <KEY>` and `/task-report jira` on a test issue with a link to a Confluence page in the description | The intake reads the issue through `acli` (`"via":"acli"` in `task.json`) and the page with `acli confluence page view … --body-format storage --json`; `task.md` has `## Documentation (Confluence)` with a summary of up to 800 characters. Note the output size in `storage` and in `view` (D-19). The report asks for the yes and posts the comments with `--body-file`; it says to log the hours by hand. Run the setup again to restore the MCP |
| M8 | macOS in European Portuguese, with no `language` in `~/.claude/settings.json`; then, on another account, with a `language` already set | Without `language`: the setup writes `"European Portuguese"` and the Arena and the statusline show up in Portuguese. With `language`: the existing value stays |
| M9 | The same as W19 on the Mac: a kit from before D-25 installed, then the one-liner again | The same as W19 |

## Console flow (not exercised by the benchmark)

The benchmark runs on a Max subscription. Before the workshop, do this once, on a new Console account:
1. Clean install and login with `--console`.
2. Full Project 1 session in interactive mode, with a timer.
3. Compare the `/demo-cost` cost with the Console Cost page the next day. The expected difference is under 5%.
4. Record the result in `DECISIONS.md`.
