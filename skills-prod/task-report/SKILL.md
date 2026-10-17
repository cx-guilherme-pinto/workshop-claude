---
name: task-report
description: Closes the task. In Jira (Atlassian MCP, or the Atlassian CLI if the MCP fails) it publishes one comment per subtask (agent, model, duration, cost), the work log and a total summary; in GitHub it opens the PR with gh pr create and the same summary. It ALWAYS asks for confirmation before any write. At the end it saves the task's memories.
argument-hint: "[jira|github|both]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Bash(git status*)
  - Bash(git branch*)
  - Bash(git rev-parse *)
  - Bash(acli auth status*)
  - Bash(acli jira auth status*)
  - Read
  - Agent
---

# /task-report — report and remember

**Commands:** run each command exactly as written, on its own. Do not add `;`, `&&`, `|`, `echo` or `ls`, because the permissions only accept the command as it is. The scripts already show the result and the state.

**Language:** talk to the user in their language (Claude Code's `language` setting, otherwise the language they write in). Localise, don't translate word for word: write as a native speaker would, and keep technical terms in English (swarm, agent, skill, hook, statusline, MCP, worktree, prompt, token, plan mode, command names) the way developers who speak that language say them. Show script output and the texts to publish exactly as they come. Never translate status markers.

Argument: `$ARGUMENTS` (destination: `jira`, `github` or `both`; by default, the source of the task).

**Rule:** nothing is written to Jira or GitHub without a clear yes from the user **for that write**. If the answer is ambiguous, do not publish.

1. Run `node "{{KIT_DIR}}/orchestrator/publish-text.mjs"`. It prepares, without publishing, `.workshop/publish.json`, `.workshop/pr-body.md` and the same texts as files in `.workshop/publish/` (for `acli`).
2. Read `.workshop/publish.json` and show the user **exactly** what will be published:
   - the comments, one per subtask, each with agent, model, duration and cost;
   - the total summary;
   - the work log (`jira_time`);
   - the PR title.
3. **Jira** (source `jira`, or destination `jira`/`both`):
   - Ask: "Publish N comments, the summary and a work log of <time> on issue <target>? (yes/no)".
   - With yes:
     - one comment per subtask with `addOrEditJiraIssueComment`, using the `cloudId` from `.workshop/task.json`; if the subtask has its own `target`, the comment goes to that Jira subtask;
     - one comment with the summary;
     - the work log with `addOrEditJiraIssueWorklog` (`timeSpent` = `jira_time`). If this tool does not appear directly, use the atlassian server's `discover` tool to find it and then `executeWrite`.
   - **Fallback: Atlassian CLI (`acli`).** Use it if `task.json` has `"via":"acli"`, or if the `mcp__atlassian__*` tools do not exist or fail. The yes you already received covers these writes, and Claude Code still asks for approval for each command:
     - confirm the login with `acli auth status` (or `acli jira auth status`). Without a login, stop and tell the user to run `acli auth login` in a terminal;
     - each comment: `acli jira workitem comment create --key <target> --body-file <file>`, with the `target` and the `file` of each entry of `comments` in `publish.json`;
     - the summary: `acli jira workitem comment create --key <target> --body-file .workshop/publish/summary.txt`;
     - the work log: `acli` does not log time. Say: "Log <jira_time> by hand in *Log work*; `acli jira workitem view <target> --web` opens the issue in the browser.";
     - if the MCP failed halfway, publish with `acli` only what has not been published yet (do not duplicate comments);
     - run one command at a time and stop at the first error, showing it.
   - Show what was published, with links.
4. **GitHub** (source `github`, or destination `github`/`both`):
   - Check the branch with `git rev-parse --abbrev-ref HEAD`. If it is `main`/`master`, propose creating a branch and wait for the answer.
   - Ask: "Push branch <b> and open PR '<title>'? (yes/no)".
   - With yes, run in a terminal, asking for approval for each command: `git push -u origin <b>` and `gh pr create --title "<title>" --body-file .workshop/pr-body.md`. Show the PR URL.
5. **Memory.** Launch **one** `memory-extractor` subagent with the prompt "Read .workshop/memory-summary.md. Project: <repository name>. Language: <the user's language>." and show the list of what was saved.
6. End with a one-line summary: what was published, where, and how much the task cost.
