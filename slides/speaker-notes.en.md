# Speaker notes — Agent orchestration with Claude

Running clock: "you should be here at X min". Slides marked **CAN SKIP** can be skipped if you are running late.

| # | min | clock | section | slide | skip |
|---|---|---|---|---|---|
| 1 | 1 | 0:00 | Opening | Agent orchestration with Claude |  |
| 2 | 1.5 | 1:00 | Opening | You'll leave the workshop with this |  |
| 3 | 1.5 | 2:30 | Opening | Ground rules on cost |  |
| 4 | 1.5 | 4:00 | Install | Install the kit |  |
| 5 | 3 | 5:30 | Install | Check your installation |  |
| 6 | 2 | 8:30 | Install | Did a step fail? |  |
| 7 | 0.5 | 10:30 | Concepts | Concepts |  |
| 8 | 1.5 | 11:00 | Concepts | Claude Code works in your project |  |
| 9 | 2 | 12:30 | Concepts | A skill is a recipe with a name |  |
| 10 | 2 | 14:30 | Concepts | Subagents: their own context and model |  |
| 11 | 2 | 16:30 | Concepts | The cost rule of thumb |  |
| 12 | 2 | 18:30 | Concepts | Task → graph → waves |  |
| 13 | 1.5 | 20:30 | Concepts | A script decides the graph |  |
| 14 | 1.5 | 22:00 | Concepts | Measure, don't guess |  |
| 15 | 1 | 23:30 | Concepts | The cycle of every task |  |
| 16 | 1 | 24:30 | Preview | What we will build: the Security Arena |  |
| 17 | 0.5 | 25:30 | Preview | The swarm in action |  |
| 18 | 2.5 | 26:00 | Preview | 100 agents building the Arena |  |
| 19 | 1 | 28:30 | Preview | The result: the game, ready to use |  |
| 20 | 0.5 | 29:30 | Project 1 | Project 1 |  |
| 21 | 1 | 30:00 | Project 1 | What we will do in this project today |  |
| 22 | 1.5 | 31:00 | Project 1 | What /demo-plan does |  |
| 23 | 3 | 32:30 | Project 1 | Plan the swarm |  |
| 24 | 1.5 | 35:30 | Project 1 | Your plan: 4 waves |  |
| 25 | 1.5 | 37:00 | Project 1 | What /demo-swarm does |  |
| 26 | 2 | 38:30 | Project 1 | Release the swarm |  |
| 27 | 2 | 40:30 | Project 1 | Ask without interrupting |  |
| 28 | 1.5 | 42:30 | Project 1 | Hooks: Claude Code signals, a script reacts |  |
| 29 | 1 | 44:00 | Project 1 | The statusline is a script |  |
| 30 | 3 | 45:00 | Project 1 | In a third terminal: three features |  |
| 31 | 1.5 | 48:00 | Project 1 | Worktrees and routines | CAN SKIP |
| 32 | 2 | 49:30 | Project 1 | Until everything is green |  |
| 33 | 2 | 51:30 | Project 1 | The security gate |  |
| 34 | 2 | 53:30 | Project 1 | How much did it cost? |  |
| 35 | 2 | 55:30 | Project 1 | Play what the swarm built |  |
| 36 | 2 | 57:30 | Memory | The memory of what you did |  |
| 37 | 3 | 59:30 | Memory | Open your first graph |  |
| 38 | 0.5 | 62:30 | Project 2 | Project 2 |  |
| 39 | 1.5 | 63:00 | Project 2 | The same cycle, in your repository |  |
| 40 | 4 | 64:30 | Project 2 | Bring your task |  |
| 41 | 5 | 68:30 | Project 2 | The planner decides how many agents |  |
| 42 | 10 | 73:30 | Project 2 | Put the swarm to work |  |
| 43 | 1 | 83:30 | Project 2 | Jira and GitHub | CAN SKIP |
| 44 | 2 | 84:30 | Project 2 | After the workshop |  |
| 45 | 2 | 86:30 | Closing | Five ideas to take with you |  |
| 46 | 1 | 88:30 | Closing | Tomorrow |  |
| 47 | 0.5 | 89:30 | Closing | Questions |  |

Total: 90 min.

## Notes per slide

### 1. Agent orchestration with Claude

[0:00 → 1:00] 1 min · you should be here at 0 min

Welcome. In 90 minutes we will put a swarm of agents to work building a game and then working on a real task of your own.

### 2. You'll leave the workshop with this

[1:00 → 2:30] 1.5 min · you should be here at 1 min

Three concrete outcomes. Everything stays installed on each laptop and keeps working after today.

### 3. Ground rules on cost

[2:30 → 4:00] 1.5 min · you should be here at 3 min

The budget is backed by the benchmark, not by cuts. If someone goes over the target, a warning shows up and they keep working.

### 4. Install the kit

[4:00 → 5:30] 1.5 min · you should be here at 4 min

Almost everyone installed beforehand (pre-work): for them this slide only shows where the command is. Anyone who has not installed yet runs it now and follows along with a neighbour while it installs (10 to 20 minutes). The same command installs on another machine. The commands are generated from repos.conf: they are always right for the published version (v1.0.0-rc.1). To update only the memory app: memoria update. Before this slide, post the commands in Teams so everyone can copy them.

### 5. Check your installation

[5:30 → 8:30] 3 min · you should be here at 6 min

Everyone runs the check. It takes 2 to 3 minutes and installs nothing. Anyone who did not run the setup follows along with a neighbour and installs during the questions. The setup speaks English, but it detects the machine language and writes the Claude Code language setting (Portuguese, English, Hindi or Hebrew): the skills answer in that language. The Arena, the orchestrator tables and the docs come in Portuguese or English (any other language gets English). Before this slide, post the commands in Teams so everyone can copy them.

### 6. Did a step fail?

[8:30 → 10:30] 2 min · you should be here at 9 min

Doctor checks everything and, if a step failed, asks Claude for a diagnosis: it sends the state of each step and the end of the log, with no secrets. It runs nothing. Running the install command again only repeats the missing steps; there, on each failure, Claude suggests commands and runs them only after you confirm, one by one. If Claude is not installed yet, the pre-written help from TROUBLESHOOTING is shown. Before this slide, post the commands in Teams so everyone can copy them.

### 7. Concepts

[10:30 → 11:00] 0.5 min · you should be here at 11 min

Fifteen minutes of ideas, one concept per slide.

### 8. Claude Code works in your project

[11:00 → 12:30] 1.5 min · you should be here at 11 min

Claude Code is not a chat: it is an agent that acts on the repository. Everything it does goes through permissions. Plan mode (Shift+Tab) makes it only plan, without touching anything.

### 9. A skill is a recipe with a name

[12:30 → 14:30] 2 min · you should be here at 13 min

Skills replaced the old slash commands. The frontmatter pins the model and the allowed tools. Today we use two sets: /demo-* in the Arena and /task-* for everyday work. The kit skills are in English and tell Claude to answer in the participant's language.

### 10. Subagents: their own context and model

[14:30 → 16:30] 2 min · you should be here at 15 min

A subagent is a Claude instance with a clean context, its own tools and the model we choose. It is defined in a .claude/agents/<name>.md file. The /agents command no longer opens a wizard: you edit the file.

### 11. The cost rule of thumb

[16:30 → 18:30] 2 min · you should be here at 17 min

A cheap swarm is many small agents with clear instructions. What costs money is coordination. That is why the orchestrator is a script and the workers answer with one line.

### 12. Task → graph → waves

[18:30 → 20:30] 2 min · you should be here at 19 min

The plan is a dependency graph. We run it in waves: everything that is ready runs in parallel. The three cryptography tasks wait for lib-hash, a real dependency inside wave 1.

### 13. A script decides the graph

[20:30 → 22:00] 1.5 min · you should be here at 21 min

With 8 calls in parallel, a model forgets dependencies or rewrites prompts. The script is reproducible: that is what makes the cost predictable and the benchmark comparable.

### 14. Measure, don't guess

[22:00 → 23:30] 1.5 min · you should be here at 22 min

Hooks are commands that Claude Code runs on events. Ours only measures: it reads the real tokens from the transcript, multiplies them by the published prices and appends one line. It never blocks anything.

### 15. The cycle of every task

[23:30 → 24:30] 1 min · you should be here at 24 min

It is the same cycle in both projects: plan with Opus, run as a swarm, a security gate, measure and save what was learned.

### 16. What we will build: the Security Arena

[24:30 → 25:30] 1 min · you should be here at 25 min

Before the video, say what is going to be built. The Arena is a security mini-game: each task builds a small challenge (find the line that exposes a secret, pick the real website, order the parts of a URL, type an answer). The app shell and the tests already exist; the agents write the challenges, one task each. Explain the colours now, because they show up everywhere: each square is a task, grey while it waits, yellow while an agent works on it, green when its test passes, red when it fails.

### 17. The swarm in action

[25:30 → 26:00] 0.5 min · you should be here at 26 min

Bridge into Project 1. What they are about to see is the cycle from the previous slide (plan → swarm → review → cost → memory) in a real run with 100 tasks. Right after, each person does the same with 15.

### 18. 100 agents building the Arena

[26:00 → 28:30] 2.5 min · you should be here at 26 min

Sped-up video of a real run with 100 tasks. On the left, the /estado page: each square is a task, yellow while an agent works on it and green when its test passes. On the right, the terminal with the agent batches. The time and cost are the real ones. Plan B if the video fails: open /estado?replay=gravacao in the recorded Arena.

### 19. The result: the game, ready to use

[28:30 → 29:30] 1 min · you should be here at 29 min

Recording of someone playing the final Arena: point at the insecure line, pick the right answer, order the steps and type the answer. Each challenge explains the why at the end. At the end of Project 1 everyone plays their own.

### 20. Project 1

[29:30 → 30:00] 0.5 min · you should be here at 30 min

25 minutes of hands-on. In the benchmark, the 15-task swarm took 2 to 3 minutes (the full session, 3.5 to 5); in interactive mode and with new accounts it can take longer. We use that time to look at features.

### 21. What we will do in this project today

[30:00 → 31:00] 1 min · you should be here at 30 min

The tests already exist: each agent only has to turn its test green. That is what lets Haiku do the bulk of the work safely.

### 22. What /demo-plan does

[31:00 → 32:30] 1.5 min · you should be here at 31 min

Explain before running it. A skill is not magic: it is a Markdown recipe that Claude follows. Here it calls a script that builds the graph (always the same, from the tasks) and an Opus agent that only reviews it. The result is in files they can open and read.

### 23. Plan the swarm

[32:30 → 35:30] 3 min · you should be here at 33 min

The trust dialog matters: without it, the project permissions stay off. In recent Claude Code versions, because the Arena pre-approves permissions, the preselected option is "No, exit": pressing Enter quits. Show the down arrow. /demo-plan checks the memory, builds the graph and asks the planner (Opus) to review it.

### 24. Your plan: 4 waves

[35:30 → 37:00] 1.5 min · you should be here at 36 min

Show someone's plan on the projector. In wave 1, lib-hash and the challenge tasks start together; the cryptography ones join as soon as hash turns green.

### 25. What /demo-swarm does

[37:00 → 38:30] 1.5 min · you should be here at 37 min

Explain before running it. The key point: a script picks what runs, not the model. That is why cost and time are predictable. If a task fails, the script retries it with the error message and, on the third attempt, with Sonnet.

### 26. Release the swarm

[38:30 → 40:30] 2 min · you should be here at 39 min

From here the swarm works for a few minutes (2 to 3 in the benchmark; longer with new accounts). The next slides use that time; whoever finishes first plays the Arena.

### 27. Ask without interrupting

[40:30 → 42:30] 2 min · you should be here at 41 min

/btw answers on the side. It is the right way to ask questions during a long run.

### 28. Hooks: Claude Code signals, a script reacts

[42:30 → 44:00] 1.5 min · you should be here at 43 min

No code walkthrough. The idea: a hook is "when X happens, run Y", set up in settings.json. Claude writes hooks very well: just describe what you want. Show /hooks to see the active ones.

### 29. The statusline is a script

[44:00 → 45:00] 1 min · you should be here at 44 min

Show the statusline changing as the agents finish. The hook records, the statusline shows: together they give the live cost. Claude Code's /usage may show more, because some versions do not know the latest prices yet; /demo-cost uses the published prices.

### 30. In a third terminal: three features

[45:00 → 48:00] 3 min · you should be here at 45 min

Plan mode only reads and proposes. claude -p is the basis for scripts and CI. Esc Esc opens rewind: it restores code and conversation to a checkpoint, but not what was done through Bash nor most of what the subagents did.

### 31. Worktrees and routines

[48:00 → 49:30] 1.5 min · CAN SKIP · you should be here at 48 min

Skip if running late. Example routine: a daily security review with node tools/rotina.mjs --instalar --sim (without --sim it only shows what it would do), which registers a claude -p "/demo-review --auto" in launchd or in Task Scheduler.

### 32. Until everything is green

[49:30 → 51:30] 2 min · you should be here at 50 min

/loop repeats a prompt at each interval, while the session is open. Esc cancels.

### 33. The security gate

[51:30 → 53:30] 2 min · you should be here at 52 min

A security game with security flaws would be the worst example. The gate links each check to the OWASP Top 10.

### 34. How much did it cost?

[53:30 → 55:30] 2 min · you should be here at 54 min

The report uses real tokens and published prices. At the end it saves the lessons to the memory app.

### 35. Play what the swarm built

[55:30 → 57:30] 2 min · you should be here at 56 min

The tests also run in the browser. It is the same test that decided the colour of the square.

### 36. The memory of what you did

[57:30 → 59:30] 2 min · you should be here at 58 min

They are Markdown files in ~/.memoria, with an SQLite index. Everything stays on your PC. Each memory is linked to the Jira or GitHub ticket and to its epic: searching ABC-123 brings everything for that ticket and the epic. /task-intake and /task-plan check it before planning ("last time in this epic, don't do X").

### 37. Open your first graph

[59:30 → 62:30] 3 min · you should be here at 60 min

The app opens in your native language and has a language selector. Routines, worktrees and headless mode were already covered while we waited.

### 38. Project 2

[62:30 → 63:00] 0.5 min · you should be here at 63 min

25 minutes. The task may not finish here: the goal is to leave with the orchestration running and to know how to continue.

### 39. The same cycle, in your repository

[63:00 → 64:30] 1.5 min · you should be here at 63 min

The /task-* skills are installed at user level and work in any repository. Every write to Jira or GitHub asks for confirmation.

### 40. Bring your task

[64:30 → 68:30] 4 min · you should be here at 65 min

For Jira you need to have logged in via /mcp (atlassian). GitHub uses gh. Intake only reads; it writes nothing.

### 41. The planner decides how many agents

[68:30 → 73:30] 5 min · you should be here at 69 min

The planner (Opus) proposes the graph and a script validates it: ids, dependencies, cycles and known agents. Tasks that touch the same files go in different batches, at swarm time. Integration and review are added automatically.

### 42. Put the swarm to work

[73:30 → 83:30] 10 min · you should be here at 74 min

The state lives in .workshop/. Running /task-swarm again resumes. Tasks that touch the same files go in different batches, or in git worktrees if the planner decides so.

### 43. Jira and GitHub

[83:30 → 84:30] 1 min · CAN SKIP · you should be here at 84 min

Skip if running late. The Atlassian MCP uses the company's Rovo credits and the admin can limit it. If the MCP fails, the skills use the official Atlassian CLI (acli), which the setup already installed: it reads the issue and posts the comments; hours are logged by hand.

### 44. After the workshop

[84:30 → 86:30] 2 min · you should be here at 85 min

Example comment: agent ws-worker-07 · Haiku · 5 s · US$ 0.004.

### 45. Five ideas to take with you

[86:30 → 88:30] 2 min · you should be here at 87 min

A summary in five sentences.

### 46. Tomorrow

[88:30 → 89:30] 1 min · you should be here at 89 min

Three concrete actions.

### 47. Questions

[89:30 → 90:00] 0.5 min · you should be here at 90 min

Questions can go past 90 minutes. Anyone who did not run the setup installs now.

