# Speaker notes — Agent orchestration with Claude

Running clock: "you should be here at X min". Slides marked **CAN SKIP** can be skipped if you are running late.

| # | min | clock | section | slide | skip |
|---|---|---|---|---|---|
| 1 | 1 | 0:00 | Opening | Agent orchestration with Claude |  |
| 2 | 1.5 | 1:00 | Opening | What you take home |  |
| 3 | 1 | 2:30 | Opening | 90 minutes |  |
| 4 | 1.5 | 3:30 | Opening | The cost rules |  |
| 5 | 3 | 5:00 | Check | Check your installation |  |
| 6 | 2 | 8:00 | Check | Did a step fail? |  |
| 7 | 0.5 | 10:00 | Concepts | Concepts |  |
| 8 | 1.5 | 10:30 | Concepts | Claude Code works in your project |  |
| 9 | 2 | 12:00 | Concepts | A skill is a recipe with a name |  |
| 10 | 2 | 14:00 | Concepts | Subagents: their own context and model |  |
| 11 | 2 | 16:00 | Concepts | The economic rule |  |
| 12 | 2 | 18:00 | Concepts | Task → graph → waves |  |
| 13 | 1.5 | 20:00 | Concepts | A script decides the graph |  |
| 14 | 1.5 | 21:30 | Concepts | Measure, don't guess |  |
| 15 | 1 | 23:00 | Concepts | The cycle of every task |  |
| 16 | 1 | 24:00 | Concepts | Limits we respect | CAN SKIP |
| 17 | 4 | 25:00 | Preview | 100 agents building the Arena |  |
| 18 | 1 | 29:00 | Preview | The result: a game to play |  |
| 19 | 0.5 | 30:00 | Project 1 | Project 1 |  |
| 20 | 1 | 30:30 | Project 1 | What is ready and what is missing |  |
| 21 | 3 | 31:30 | Project 1 | Plan the swarm |  |
| 22 | 1.5 | 34:30 | Project 1 | Your plan: 4 waves |  |
| 23 | 2 | 36:00 | Project 1 | Release the swarm |  |
| 24 | 2 | 38:00 | Project 1 | Ask without interrupting |  |
| 25 | 2 | 40:00 | Project 1 | The statusline and the hook that feeds it |  |
| 26 | 3 | 42:00 | Project 1 | In Terminal 2: three features |  |
| 27 | 2 | 45:00 | Project 1 | Worktrees and routines | CAN SKIP |
| 28 | 2 | 47:00 | Project 1 | Until everything is green |  |
| 29 | 2 | 49:00 | Project 1 | The security gate |  |
| 30 | 2 | 51:00 | Project 1 | How much did it cost? |  |
| 31 | 2 | 53:00 | Project 1 | Play what the swarm built |  |
| 32 | 2 | 55:00 | Memory | The memory of what you did |  |
| 33 | 3 | 57:00 | Memory | Open your first graph |  |
| 34 | 0.5 | 60:00 | Project 2 | Project 2 |  |
| 35 | 1.5 | 60:30 | Project 2 | The same cycle, in your repository |  |
| 36 | 4 | 62:00 | Project 2 | Bring your task |  |
| 37 | 5 | 66:00 | Project 2 | The planner decides how many agents |  |
| 38 | 10 | 71:00 | Project 2 | Put the swarm to work |  |
| 39 | 1 | 81:00 | Project 2 | Jira and GitHub | CAN SKIP |
| 40 | 2 | 82:00 | Project 2 | After the workshop |  |
| 41 | 1 | 84:00 | Project 2 | Claude Desktop and mobile | CAN SKIP |
| 42 | 2 | 85:00 | Closing | Five ideas to take with you |  |
| 43 | 1.5 | 87:00 | Closing | Where everything is |  |
| 44 | 1 | 88:30 | Closing | Tomorrow |  |
| 45 | 0.5 | 89:30 | Closing | Questions |  |

Total: 90 min.

## Notes per slide

### 1. Agent orchestration with Claude

[0:00 → 1:00] 1 min · you should be here at 0 min

Welcome. In 90 minutes we will put a swarm of agents to work building a game and then working on a real task of your own.

### 2. What you take home

[1:00 → 2:30] 1.5 min · you should be here at 1 min

Three concrete outcomes. Everything stays installed on each laptop and keeps working after today.

### 3. 90 minutes

[2:30 → 3:30] 1 min · you should be here at 3 min

The clock is in the notes of each slide. Questions are at the end, with no time limit.

### 4. The cost rules

[3:30 → 5:00] 1.5 min · you should be here at 4 min

The budget is backed by the benchmark, not by cuts. If someone goes over the target, a warning shows up and they keep working.

### 5. Check your installation

[5:00 → 8:00] 3 min · you should be here at 5 min

Everyone runs the check. It takes 2 to 3 minutes and installs nothing. Anyone who did not run the setup follows along with a neighbour and installs during the questions. The setup speaks English, but it detects the machine language and writes the Claude Code language setting (Portuguese, English, Hindi or Hebrew): the skills answer in that language. The Arena, the orchestrator tables and the docs come in Portuguese or English (any other language gets English).

### 6. Did a step fail?

[8:00 → 10:00] 2 min · you should be here at 8 min

Claude reads only the log excerpt for that step, with no secrets, and suggests commands. It never runs anything without confirmation. If Claude is not installed yet, the pre-written message from TROUBLESHOOTING is shown.

### 7. Concepts

[10:00 → 10:30] 0.5 min · you should be here at 10 min

Fifteen minutes of ideas, one concept per slide.

### 8. Claude Code works in your project

[10:30 → 12:00] 1.5 min · you should be here at 11 min

Claude Code is not a chat: it is an agent that acts on the repository. Everything it does goes through permissions. Plan mode (Shift+Tab) makes it only plan, without touching anything.

### 9. A skill is a recipe with a name

[12:00 → 14:00] 2 min · you should be here at 12 min

Skills replaced the old slash commands. The frontmatter pins the model and the allowed tools. Today we use two sets: /demo-* in the Arena and /task-* for everyday work. The kit skills are in English and tell Claude to answer in the participant's language.

### 10. Subagents: their own context and model

[14:00 → 16:00] 2 min · you should be here at 14 min

A subagent is a Claude instance with a clean context, its own tools and the model we choose. It is defined in a .claude/agents/<name>.md file. The /agents command no longer opens a wizard: you edit the file.

### 11. The economic rule

[16:00 → 18:00] 2 min · you should be here at 16 min

A cheap swarm is many small agents with clear instructions. What costs money is coordination. That is why the orchestrator is a script and the workers answer with one line.

### 12. Task → graph → waves

[18:00 → 20:00] 2 min · you should be here at 18 min

The plan is a dependency graph. We run it in waves: everything that is ready runs in parallel. The three cryptography cards wait for lib/hash, a real dependency inside wave 1.

### 13. A script decides the graph

[20:00 → 21:30] 1.5 min · you should be here at 20 min

With 15 calls in parallel, a model forgets dependencies or rewrites prompts. The script is reproducible: that is what makes the cost predictable and the benchmark comparable.

### 14. Measure, don't guess

[21:30 → 23:00] 1.5 min · you should be here at 22 min

Hooks are commands that Claude Code runs on events. Ours only measures: it reads the real tokens from the transcript, multiplies them by the published prices and appends one line. It never blocks anything.

### 15. The cycle of every task

[23:00 → 24:00] 1 min · you should be here at 23 min

It is the same cycle in both projects: plan with Opus, run as a swarm, a security gate, measure and save what was learned.

### 16. Limits we respect

[24:00 → 25:00] 1 min · CAN SKIP · you should be here at 24 min

Skip if running late. Claude Code refuses a 21st concurrent subagent. API rate limits are per organisation. That is why we work in batches.

### 17. 100 agents building the Arena

[25:00 → 29:00] 4 min · you should be here at 25 min

Sped-up video of a real run in presenter mode. The time and cost on screen are the real ones. Plan B if the video fails: open /estado?replay=gravacao in the recorded Arena.

### 18. The result: a game to play

[29:00 → 30:00] 1 min · you should be here at 29 min

Open the final Arena in the browser and play a card. It is a static app, with no risk. The game comes in Portuguese or English, depending on the machine language.

### 19. Project 1

[30:00 → 30:30] 0.5 min · you should be here at 30 min

25 minutes of hands-on. In the benchmark, the 15-card swarm took 4 to 6 minutes; in interactive mode and with new accounts it can take longer. We use that time to look at features.

### 20. What is ready and what is missing

[30:30 → 31:30] 1 min · you should be here at 31 min

The tests already exist: each agent only has to turn its test green. That is what lets Haiku do the bulk of the work safely.

### 21. Plan the swarm

[31:30 → 34:30] 3 min · you should be here at 32 min

The trust dialog matters: without it, the project permissions stay off. /demo-plan checks the memory, builds the graph and asks the planner (Opus) to review it.

### 22. Your plan: 4 waves

[34:30 → 36:00] 1.5 min · you should be here at 35 min

Show someone's plan on the projector. In wave 1, lib/hash and the cards start together; the cryptography ones join as soon as hash turns green.

### 23. Release the swarm

[36:00 → 38:00] 2 min · you should be here at 36 min

From here the swarm works for a few minutes (4 to 6 in the benchmark). The next slides use that time; whoever finishes first plays the Arena.

### 24. Ask without interrupting

[38:00 → 40:00] 2 min · you should be here at 38 min

/btw answers on the side. It is the right way to ask questions during a long run.

### 25. The statusline and the hook that feeds it

[40:00 → 42:00] 2 min · you should be here at 40 min

Show the statusline changing as the agents finish. Explain why /usage can show more: versions that do not know the latest prices yet.

### 26. In Terminal 2: three features

[42:00 → 45:00] 3 min · you should be here at 42 min

Plan mode only reads and proposes. claude -p is the basis for scripts and CI. Esc Esc opens rewind: it restores code and conversation to a checkpoint, but not what was done through Bash nor most of what the subagents did.

### 27. Worktrees and routines

[45:00 → 47:00] 2 min · CAN SKIP · you should be here at 45 min

Skip if running late. Example routine: a daily security review with node tools/rotina.mjs --instalar, which registers a claude -p "/demo-review --auto" in launchd or in Task Scheduler.

### 28. Until everything is green

[47:00 → 49:00] 2 min · you should be here at 47 min

/loop repeats a prompt at each interval, while the session is open. Esc cancels.

### 29. The security gate

[49:00 → 51:00] 2 min · you should be here at 49 min

A security game with security flaws would be the worst example. The gate links each check to the OWASP Top 10.

### 30. How much did it cost?

[51:00 → 53:00] 2 min · you should be here at 51 min

The report uses real tokens and published prices. At the end it saves the lessons to the memory app.

### 31. Play what the swarm built

[53:00 → 55:00] 2 min · you should be here at 53 min

The tests also run in the browser. It is the same test that decided the colour of the square.

### 32. The memory of what you did

[55:00 → 57:00] 2 min · you should be here at 55 min

They are Markdown files in ~/.memoria, with an SQLite index. Everything stays on your PC. Each memory is linked to the Jira or GitHub ticket and to its epic: searching ABC-123 brings everything for that ticket and the epic. /task-intake and /task-plan check it before planning ("last time in this epic, don't do X").

### 33. Open your first graph

[57:00 → 60:00] 3 min · you should be here at 57 min

The app opens in your native language and has a language selector. Routines, worktrees and headless mode were already covered during the waiting moments.

### 34. Project 2

[60:00 → 60:30] 0.5 min · you should be here at 60 min

25 minutes. The task may not finish here: the goal is to leave with the orchestration running and to know how to continue.

### 35. The same cycle, in your repository

[60:30 → 62:00] 1.5 min · you should be here at 61 min

The /task-* skills are installed at user level and work in any repository. Every write to Jira or GitHub asks for confirmation.

### 36. Bring your task

[62:00 → 66:00] 4 min · you should be here at 62 min

For Jira you need to have logged in via /mcp (atlassian). GitHub uses gh. Intake only reads; it writes nothing.

### 37. The planner decides how many agents

[66:00 → 71:00] 5 min · you should be here at 66 min

The planner (Opus) proposes the graph and a script validates it: cycles, shared files, known agents. Integration and review are added automatically.

### 38. Put the swarm to work

[71:00 → 81:00] 10 min · you should be here at 71 min

The state lives in .workshop/. Running /task-swarm again resumes. Tasks that touch the same files go in different batches, or in git worktrees if the planner decides so.

### 39. Jira and GitHub

[81:00 → 82:00] 1 min · CAN SKIP · you should be here at 81 min

Skip if running late. The Atlassian MCP spends the company Rovo credits and the admin can limit it. If the MCP fails, the skills use the official Atlassian CLI (acli), which the setup already installed: it reads the issue and posts the comments; hours are logged by hand.

### 40. After the workshop

[82:00 → 84:00] 2 min · you should be here at 82 min

Example comment: agent ws-worker-07 · Haiku · 5 s · US$ 0.004.

### 41. Claude Desktop and mobile

[84:00 → 85:00] 1 min · CAN SKIP · you should be here at 84 min

Skip if running late. With a subscription, the same session can continue on the phone and routines run in the cloud.

### 42. Five ideas to take with you

[85:00 → 87:00] 2 min · you should be here at 85 min

A summary in five sentences.

### 43. Where everything is

[87:00 → 88:30] 1.5 min · you should be here at 87 min

The commands are generated from repos.conf: they are always right for the published version.

### 44. Tomorrow

[88:30 → 89:30] 1 min · you should be here at 89 min

Three concrete actions.

### 45. Questions

[89:30 → 90:00] 0.5 min · you should be here at 90 min

Questions can go past 90 minutes. Anyone who did not run the setup installs now.

