# Speaker notes — Agent orchestration with Claude

Running clock: "you should be here at X min". Slides marked **CAN SKIP** can be skipped if you are running late.

| # | min | clock | section | slide | skip |
|---|---|---|---|---|---|
| 1 | 1 | 0:00 | Opening | Agent orchestration with Claude |  |
| 2 | 1.5 | 1:00 | Opening | What you take home |  |
| 3 | 1.5 | 2:30 | Opening | The cost rules |  |
| 4 | 3 | 4:00 | Check | Check your installation |  |
| 5 | 2 | 7:00 | Check | Did a step fail? |  |
| 6 | 0.5 | 9:00 | Concepts | Concepts |  |
| 7 | 1.5 | 9:30 | Concepts | Claude Code works in your project |  |
| 8 | 2 | 11:00 | Concepts | A skill is a recipe with a name |  |
| 9 | 2 | 13:00 | Concepts | Subagents: their own context and model |  |
| 10 | 2 | 15:00 | Concepts | The economic rule |  |
| 11 | 2 | 17:00 | Concepts | Task → graph → waves |  |
| 12 | 1.5 | 19:00 | Concepts | A script decides the graph |  |
| 13 | 1.5 | 20:30 | Concepts | Measure, don't guess |  |
| 14 | 1 | 22:00 | Concepts | The cycle of every task |  |
| 15 | 0.5 | 23:00 | Preview | The swarm in action |  |
| 16 | 3 | 23:30 | Preview | 100 agents building the Arena |  |
| 17 | 1 | 26:30 | Preview | The result: a game to play |  |
| 18 | 0.5 | 27:30 | Project 1 | Project 1 |  |
| 19 | 1 | 28:00 | Project 1 | What is ready and what is missing |  |
| 20 | 1.5 | 29:00 | Project 1 | What /demo-plan does |  |
| 21 | 3 | 30:30 | Project 1 | Plan the swarm |  |
| 22 | 1.5 | 33:30 | Project 1 | Your plan: 4 waves |  |
| 23 | 1.5 | 35:00 | Project 1 | What /demo-swarm does |  |
| 24 | 2 | 36:30 | Project 1 | Release the swarm |  |
| 25 | 2 | 38:30 | Project 1 | Ask without interrupting |  |
| 26 | 1.5 | 40:30 | Project 1 | Hooks: Claude signals, a script reacts |  |
| 27 | 1 | 42:00 | Project 1 | Statusline: the status line is a script |  |
| 28 | 3 | 43:00 | Project 1 | In Terminal 2: three features |  |
| 29 | 2 | 46:00 | Project 1 | Worktrees and routines | CAN SKIP |
| 30 | 2 | 48:00 | Project 1 | Until everything is green |  |
| 31 | 2 | 50:00 | Project 1 | The security gate |  |
| 32 | 2 | 52:00 | Project 1 | How much did it cost? |  |
| 33 | 2 | 54:00 | Project 1 | Play what the swarm built |  |
| 34 | 2 | 56:00 | Memory | The memory of what you did |  |
| 35 | 3 | 58:00 | Memory | Open your first graph |  |
| 36 | 0.5 | 61:00 | Project 2 | Project 2 |  |
| 37 | 1.5 | 61:30 | Project 2 | The same cycle, in your repository |  |
| 38 | 4 | 63:00 | Project 2 | Bring your task |  |
| 39 | 5 | 67:00 | Project 2 | The planner decides how many agents |  |
| 40 | 10 | 72:00 | Project 2 | Put the swarm to work |  |
| 41 | 1 | 82:00 | Project 2 | Jira and GitHub | CAN SKIP |
| 42 | 2 | 83:00 | Project 2 | After the workshop |  |
| 43 | 2 | 85:00 | Closing | Five ideas to take with you |  |
| 44 | 1.5 | 87:00 | Closing | Where everything is |  |
| 45 | 1 | 88:30 | Closing | Tomorrow |  |
| 46 | 0.5 | 89:30 | Closing | Questions |  |

Total: 90 min.

## Notes per slide

### 1. Agent orchestration with Claude

[0:00 → 1:00] 1 min · you should be here at 0 min

Welcome. In 90 minutes we will put a swarm of agents to work building a game and then working on a real task of your own.

### 2. What you take home

[1:00 → 2:30] 1.5 min · you should be here at 1 min

Three concrete outcomes. Everything stays installed on each laptop and keeps working after today.

### 3. The cost rules

[2:30 → 4:00] 1.5 min · you should be here at 3 min

The budget is backed by the benchmark, not by cuts. If someone goes over the target, a warning shows up and they keep working.

### 4. Check your installation

[4:00 → 7:00] 3 min · you should be here at 4 min

Everyone runs the check. It takes 2 to 3 minutes and installs nothing. Anyone who did not run the setup follows along with a neighbour and installs during the questions. The setup speaks English, but it detects the machine language and writes the Claude Code language setting (Portuguese, English, Hindi or Hebrew): the skills answer in that language. The Arena, the orchestrator tables and the docs come in Portuguese or English (any other language gets English). Before this slide, post the commands in Teams so everyone can copy them.

### 5. Did a step fail?

[7:00 → 9:00] 2 min · you should be here at 7 min

Claude reads only the log excerpt for that step, with no secrets, and suggests commands. It never runs anything without confirmation. If Claude is not installed yet, the pre-written message from TROUBLESHOOTING is shown. Before this slide, post the commands in Teams so everyone can copy them.

### 6. Concepts

[9:00 → 9:30] 0.5 min · you should be here at 9 min

Fifteen minutes of ideas, one concept per slide.

### 7. Claude Code works in your project

[9:30 → 11:00] 1.5 min · you should be here at 10 min

Claude Code is not a chat: it is an agent that acts on the repository. Everything it does goes through permissions. Plan mode (Shift+Tab) makes it only plan, without touching anything.

### 8. A skill is a recipe with a name

[11:00 → 13:00] 2 min · you should be here at 11 min

Skills replaced the old slash commands. The frontmatter pins the model and the allowed tools. Today we use two sets: /demo-* in the Arena and /task-* for everyday work. The kit skills are in English and tell Claude to answer in the participant's language.

### 9. Subagents: their own context and model

[13:00 → 15:00] 2 min · you should be here at 13 min

A subagent is a Claude instance with a clean context, its own tools and the model we choose. It is defined in a .claude/agents/<name>.md file. The /agents command no longer opens a wizard: you edit the file.

### 10. The economic rule

[15:00 → 17:00] 2 min · you should be here at 15 min

A cheap swarm is many small agents with clear instructions. What costs money is coordination. That is why the orchestrator is a script and the workers answer with one line.

### 11. Task → graph → waves

[17:00 → 19:00] 2 min · you should be here at 17 min

The plan is a dependency graph. We run it in waves: everything that is ready runs in parallel. The three cryptography cards wait for lib/hash, a real dependency inside wave 1.

### 12. A script decides the graph

[19:00 → 20:30] 1.5 min · you should be here at 19 min

With 15 calls in parallel, a model forgets dependencies or rewrites prompts. The script is reproducible: that is what makes the cost predictable and the benchmark comparable.

### 13. Measure, don't guess

[20:30 → 22:00] 1.5 min · you should be here at 21 min

Hooks are commands that Claude Code runs on events. Ours only measures: it reads the real tokens from the transcript, multiplies them by the published prices and appends one line. It never blocks anything.

### 14. The cycle of every task

[22:00 → 23:00] 1 min · you should be here at 22 min

It is the same cycle in both projects: plan with Opus, run as a swarm, a security gate, measure and save what was learned.

### 15. The swarm in action

[23:00 → 23:30] 0.5 min · you should be here at 23 min

Bridge into Project 1. What they are about to see is the cycle from the previous slide (plan → swarm → review → cost → memory) in a real run with 100 cards. Right after, each person does the same with 15.

### 16. 100 agents building the Arena

[23:30 → 26:30] 3 min · you should be here at 24 min

Sped-up video of a real run with 100 cards. On the left, the /estado page: each square is a card, yellow while an agent works on it and green when its test passes. On the right, the terminal with the agent batches. The time and cost are the real ones. Plan B if the video fails: open /estado?replay=gravacao in the recorded Arena.

### 17. The result: a game to play

[26:30 → 27:30] 1 min · you should be here at 27 min

Recording of someone playing the final Arena: point at the insecure line, pick the right answer, order the steps and type the answer. Each card explains the why at the end. At the end of Project 1 everyone plays their own.

### 18. Project 1

[27:30 → 28:00] 0.5 min · you should be here at 28 min

25 minutes of hands-on. In the benchmark, the 15-card swarm took 4 to 6 minutes; in interactive mode and with new accounts it can take longer. We use that time to look at features.

### 19. What is ready and what is missing

[28:00 → 29:00] 1 min · you should be here at 28 min

The tests already exist: each agent only has to turn its test green. That is what lets Haiku do the bulk of the work safely.

### 20. What /demo-plan does

[29:00 → 30:30] 1.5 min · you should be here at 29 min

Explain before running it. A skill is not magic: it is a Markdown recipe that Claude follows. Here it calls a script that builds the graph (always the same, from the tasks) and an Opus agent that only reviews it. The result is in files they can open and read.

### 21. Plan the swarm

[30:30 → 33:30] 3 min · you should be here at 31 min

The trust dialog matters: without it, the project permissions stay off. /demo-plan checks the memory, builds the graph and asks the planner (Opus) to review it.

### 22. Your plan: 4 waves

[33:30 → 35:00] 1.5 min · you should be here at 34 min

Show someone's plan on the projector. In wave 1, lib/hash and the cards start together; the cryptography ones join as soon as hash turns green.

### 23. What /demo-swarm does

[35:00 → 36:30] 1.5 min · you should be here at 35 min

Explain before running it. The key point: a script picks what runs, not the model. That is why cost and time are predictable. If a card fails, the script retries it with the error message and, on the third attempt, with Sonnet.

### 24. Release the swarm

[36:30 → 38:30] 2 min · you should be here at 37 min

From here the swarm works for a few minutes (4 to 6 in the benchmark). The next slides use that time; whoever finishes first plays the Arena.

### 25. Ask without interrupting

[38:30 → 40:30] 2 min · you should be here at 39 min

/btw answers on the side. It is the right way to ask questions during a long run.

### 26. Hooks: Claude signals, a script reacts

[40:30 → 42:00] 1.5 min · you should be here at 41 min

No code walkthrough. The idea: a hook is "when X happens, run Y", set up in settings.json. Claude writes hooks very well: just describe what you want. Show /hooks to see the active ones.

### 27. Statusline: the status line is a script

[42:00 → 43:00] 1 min · you should be here at 42 min

Show the statusline changing as the agents finish. The hook records, the statusline shows: together they give the live cost. Claude Code's /usage may show more, because some versions do not know the latest prices yet; /demo-cost uses the published prices.

### 28. In Terminal 2: three features

[43:00 → 46:00] 3 min · you should be here at 43 min

Plan mode only reads and proposes. claude -p is the basis for scripts and CI. Esc Esc opens rewind: it restores code and conversation to a checkpoint, but not what was done through Bash nor most of what the subagents did.

### 29. Worktrees and routines

[46:00 → 48:00] 2 min · CAN SKIP · you should be here at 46 min

Skip if running late. Example routine: a daily security review with node tools/rotina.mjs --instalar, which registers a claude -p "/demo-review --auto" in launchd or in Task Scheduler.

### 30. Until everything is green

[48:00 → 50:00] 2 min · you should be here at 48 min

/loop repeats a prompt at each interval, while the session is open. Esc cancels.

### 31. The security gate

[50:00 → 52:00] 2 min · you should be here at 50 min

A security game with security flaws would be the worst example. The gate links each check to the OWASP Top 10.

### 32. How much did it cost?

[52:00 → 54:00] 2 min · you should be here at 52 min

The report uses real tokens and published prices. At the end it saves the lessons to the memory app.

### 33. Play what the swarm built

[54:00 → 56:00] 2 min · you should be here at 54 min

The tests also run in the browser. It is the same test that decided the colour of the square.

### 34. The memory of what you did

[56:00 → 58:00] 2 min · you should be here at 56 min

They are Markdown files in ~/.memoria, with an SQLite index. Everything stays on your PC. Each memory is linked to the Jira or GitHub ticket and to its epic: searching ABC-123 brings everything for that ticket and the epic. /task-intake and /task-plan check it before planning ("last time in this epic, don't do X").

### 35. Open your first graph

[58:00 → 61:00] 3 min · you should be here at 58 min

The app opens in your native language and has a language selector. Routines, worktrees and headless mode were already covered during the waiting moments.

### 36. Project 2

[61:00 → 61:30] 0.5 min · you should be here at 61 min

25 minutes. The task may not finish here: the goal is to leave with the orchestration running and to know how to continue.

### 37. The same cycle, in your repository

[61:30 → 63:00] 1.5 min · you should be here at 62 min

The /task-* skills are installed at user level and work in any repository. Every write to Jira or GitHub asks for confirmation.

### 38. Bring your task

[63:00 → 67:00] 4 min · you should be here at 63 min

For Jira you need to have logged in via /mcp (atlassian). GitHub uses gh. Intake only reads; it writes nothing.

### 39. The planner decides how many agents

[67:00 → 72:00] 5 min · you should be here at 67 min

The planner (Opus) proposes the graph and a script validates it: cycles, shared files, known agents. Integration and review are added automatically.

### 40. Put the swarm to work

[72:00 → 82:00] 10 min · you should be here at 72 min

The state lives in .workshop/. Running /task-swarm again resumes. Tasks that touch the same files go in different batches, or in git worktrees if the planner decides so.

### 41. Jira and GitHub

[82:00 → 83:00] 1 min · CAN SKIP · you should be here at 82 min

Skip if running late. The Atlassian MCP spends the company Rovo credits and the admin can limit it. If the MCP fails, the skills use the official Atlassian CLI (acli), which the setup already installed: it reads the issue and posts the comments; hours are logged by hand.

### 42. After the workshop

[83:00 → 85:00] 2 min · you should be here at 83 min

Example comment: agent ws-worker-07 · Haiku · 5 s · US$ 0.004.

### 43. Five ideas to take with you

[85:00 → 87:00] 2 min · you should be here at 85 min

A summary in five sentences.

### 44. Where everything is

[87:00 → 88:30] 1.5 min · you should be here at 87 min

The commands are generated from repos.conf: they are always right for the published version. Before this slide, post the commands in Teams so everyone can copy them.

### 45. Tomorrow

[88:30 → 89:30] 1 min · you should be here at 89 min

Three concrete actions.

### 46. Questions

[89:30 → 90:00] 0.5 min · you should be here at 90 min

Questions can go past 90 minutes. Anyone who did not run the setup installs now.

