# FAQ — frequently asked questions

**English** · [Português](pt/FAQ.md)

Short answers to the most likely questions at the workshop. For install errors with a code (`E-NET-01`, `E-PERM-01`…), see `TROUBLESHOOTING.md`.

## Install

**I got a permission error.**
The script installs everything in your profile and does not need admin rights. Run `setup --doctor` (Mac: `bash setup-mac.sh --doctor`; Windows: `-Doctor`): it tells you which folder has no permission and the command to fix it. On a company laptop, a folder blocked by policy (AppLocker, antivirus) is a case for your IT team.

**How do I know everything is ready?**
Run the script with `--check` (Windows: `-Check`). It takes 2 to 3 minutes, installs nothing and ends with "Everything is ready for the workshop." or with the list of what is missing. The summary is saved in `~/.workshop-claude/summary.txt`, and you can show it to whoever helps you.

**Can I run the script twice?**
Yes. It detects what is already done and skips those steps (⏭️). If it failed halfway, running it again continues from there.

**I installed an earlier version of the kit. Do I need to do anything?**
Run the setup again. It updates what the earlier version installed, with the names the kit uses now: the memory MCP server becomes `agent-memory`, and the practice project moves to `~/workshop-claude/practice-project` (only if that folder does not exist yet; nothing is deleted). Your notes stay where they are and the app keeps using them. The old commands still work.

**I'm behind a company proxy.**
The script detects the system proxy and, if your company inspects HTTPS traffic, exports the company certificates and configures Claude Code, Node and uv to use them. Proxies that only accept NTLM or Kerberos are not supported. In that case, talk to IT or use another network.

**`gh` does not authenticate.**
Run `gh auth login` in a new terminal, choose GitHub.com, HTTPS and "Login with a web browser". If your company uses GitHub Enterprise, choose it and enter the server. Confirm with `gh auth status`.

**Jira does not show up in `/mcp`.**
1. Confirm with `claude mcp list` that there is an `atlassian` line. If there isn't, run the setup again.
2. Inside Claude Code, run `/mcp`, choose `atlassian` and log in in the browser.
3. If the login refuses access, your company's Jira admin may have restricted the domains or the apps allowed in the "Atlassian MCP server". Without that, use the backup (below) or the practice project `practice-project/`, which has the issues in local files.

**The Jira MCP fails. Is there an alternative?**
Yes: the setup installs the **Atlassian CLI** (`acli`, official from Atlassian). When the MCP tools are missing or fail, `/task-intake` reads the issue with `acli` and `/task-report` posts the comments with it, always after your "yes" before writing.
1. Log in once in a terminal: `acli auth login` (opens the browser; in the terminal, choose the same site). Confirm with `acli auth status`.
2. If you see "site admin must authorize this app", the Jira admin has to approve the ACLI app on the site (see `E-ACLI-02` in TROUBLESHOOTING). The API token login, for when there is no OAuth, is also there.
3. `acli` does not log time: at the end, `/task-report` tells you how much time to log by hand in *Log work*.
The same login works for Confluence: `acli confluence space list` and `acli confluence page view --id <id>`.

**The Agent Memory app does not open on Windows.**
It needs Microsoft WebView2. The setup installs it if it is missing. If it still does not open, the app opens the same interface in your browser.

## Costs

**How much have I spent so far?**
- The **statusline**, the line below the text box, shows the session cost and the project total. It warns you when you pass US$ 5 and US$ 10.
- **`/demo-cost`** gives the full report, by agent, model and wave.
- The billed amount is in the Anthropic Console, under Usage and Cost. It shows up with a few minutes of delay.

**Why does `/usage` show a higher value than the statusline?**
Some Claude Code versions don't know the prices of the newest models yet (for example, Haiku 5.5) and overestimate them. The statusline and `/demo-cost` use the real tokens and the published price table (`pricing.json`). The Console always has the final word.

**Does the swarm stop if I go over US$ 10?**
No. The workshop never interrupts a session because of cost: it only shows a warning. The design was measured to stay close to US$ 5 (see `benchmark/REPORT.md`).

**Why does the orchestrator use Sonnet and not Opus?**
With a Console account, the default model is Opus. The demo project pins Sonnet in the main session and uses Opus only where it pays off: planning and reviewing. Most of the work goes to Haiku, about 20 times cheaper.

## During the swarm

**How do I stop the swarm?**
Press **Esc** in Claude Code. The running agents finish and no more are launched. The state is saved in `.workshop/`, so running `/demo-swarm` (or `/task-swarm`) again resumes where it stopped.

**Can I ask a question without interrupting?**
Yes: `/btw <question>`. The answer does not go into the main conversation.

**Where can I see the agents working?**
- In the browser: `node server.js` in the Arena folder, then `http://localhost:3000/status`.
- In another terminal: `node tools/workshop/orchestrator/dashboard.mjs`.

**A card turned red. Now what?**
The orchestrator retries it by itself, first with Haiku and the error message, then with Sonnet. If it still fails, `/demo-review` shows why. To keep going until everything is green: `/loop 2m run node tools/workshop/orchestrator/grade.mjs --all and fix the first red task with the implementer agent; stop when everything is green`.

**I got "Is this a project you created or one you trust?" (or "Do you trust the files in this folder?").**
That is Claude Code asking if you trust the folder. In the Arena, answer yes: without it, the project permissions (`.claude/settings.json`) stay off and the swarm stops to ask for permission. Careful: because the Arena pre-approves some permissions, recent versions of Claude Code open this dialog with **No, exit** selected. Press the down arrow to pick **Yes, I trust this folder** and then Enter. If Claude Code closed, run `claude` again in the same folder.

**I want to restart the Arena from scratch.**
`/demo-reset`. The cost history is kept in `.workshop/history/`.

## Language

**Why is the setup in English?**
The setup speaks English only, on every machine, and so do its options: `--uninstall`, `--no-desktop`, `--yes` and `--replace-statusline` (Windows: `-Uninstall`, `-NoDesktop`, `-Yes` and `-ReplaceStatusline`). The old option names from earlier versions still work. The error codes are the same in every language, and [TROUBLESHOOTING.md](TROUBLESHOOTING.md) explains them.

**What language does Claude answer in?**
Yours. The skills and agents are written in English, but they answer in the user's language. The setup writes Claude Code's `language` setting from the machine language (European or Brazilian Portuguese, English, Hindi or Hebrew), only if you don't have one yet. If you already had one, yours stays.

**And the Arena, the orchestrator and the statusline?**
They follow the machine language: Portuguese on a Portuguese machine, English on all others (Hindi and Hebrew included). To force one of them for the kit texts, set `WORKSHOP_LANG=pt` or `WORKSHOP_LANG=en` before you open Claude Code.

## Features

**How do I find everything I learned on a ticket or an epic?**
In the Agent Memory app, type the key in the search (e.g. `ABC-123` or the epic `ABC-100`): you see the memories for that ticket, the epic's and the linked tasks. In Claude Code, `/task-intake` does the same by itself before planning. Memories are linked to the ticket because `/task-report` and `/memory` save the id, the epic and the URL.

**Does `/task-intake` read the Confluence pages linked in the issue?**
Yes, up to 2. If the Jira issue description has links to Confluence pages (`…/wiki/spaces/<space>/pages/<id>/…`), the intake reads them through the MCP or, if the MCP fails, through `acli`. Then it saves a short summary of each one in `.workshop/task.md`, in the "Documentation (Confluence)" section, and `/task-plan` uses it.
- It only reads: it never writes to Confluence.
- If the MCP fails and `acli` is not logged in (`acli auth login`), it warns you in one line and continues without the pages.
- Short links (`…/wiki/x/…`) don't have the page id and are left out. In the issue, paste the full link.

**Why doesn't `/schedule` (routines) show up?**
Cloud routines require a claude.ai subscription. With a Console account, use `/loop` (with the session open) or a "local routine": the system scheduler (launchd on Mac, Task Scheduler on Windows) running `claude -p "..."`.

**Can I continue the session on my phone?**
Remote Control also requires a claude.ai subscription and does not accept API keys. With a Console account, no.

**Is Claude Desktop useful for the workshop?**
Not for the hands-on: the Desktop Code tab requires a subscription. Desktop is installed separately, in case you want to use it to chat (with a claude.ai account, even the free one). All the hands-on runs in Claude Code, in the terminal.

**What about the GitHub MCP?**
The workshop uses `gh` (simpler and uses less context). If you want the official GitHub MCP, you need a personal access token (PAT): `claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer <your PAT>"}}'`. Don't share that token.
