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
| 9 | 1.5 | 12:30 | Concepts | A skill is a recipe with a name |  |
| 10 | 1.5 | 14:00 | Concepts | Subagents: their own context and model |  |
| 11 | 1.5 | 15:30 | Concepts | The cost rule of thumb |  |
| 12 | 1 | 17:00 | Concepts | The cycle of every task |  |
| 13 | 1 | 18:00 | Preview | What we will build: the Security Arena |  |
| 14 | 0.5 | 19:00 | Preview | The swarm in action |  |
| 15 | 2.5 | 19:30 | Preview | The swarm building the Arena |  |
| 16 | 1 | 22:00 | Preview | The result: the game, ready to use |  |
| 17 | 0.5 | 23:00 | Project 1 | Project 1 |  |
| 18 | 1 | 23:30 | Project 1 | What we will do in this project today |  |
| 19 | 5 | 24:30 | Project 1 | Write your card |  |
| 20 | 1.5 | 29:30 | Project 1 | What /demo-plan does |  |
| 21 | 1.5 | 31:00 | Project 1 | Task → graph → waves |  |
| 22 | 3 | 32:30 | Project 1 | Plan the swarm |  |
| 23 | 1.5 | 35:30 | Project 1 | What /demo-swarm does |  |
| 24 | 2 | 37:00 | Project 1 | Release the swarm |  |
| 25 | 2 | 39:00 | Project 1 | Ask without interrupting |  |
| 26 | 3 | 41:00 | Project 1 | In a third terminal: three features |  |
| 27 | 2 | 44:00 | Project 1 | Create a PostToolUse hook |  |
| 28 | 2 | 46:00 | Project 1 | Make your own statusline |  |
| 29 | 5 | 48:00 | Project 1 | Why did this card fail? |  |
| 30 | 2 | 53:00 | Project 1 | The security gate |  |
| 31 | 1 | 55:00 | Project 1 | Measure, don't guess |  |
| 32 | 2 | 56:00 | Project 1 | How much did it cost? |  |
| 33 | 2 | 58:00 | Project 1 | Play what the swarm built |  |
| 34 | 2 | 60:00 | Memory | The memory of what you did |  |
| 35 | 3 | 62:00 | Memory | Open your first graph |  |
| 36 | 0.5 | 65:00 | Project 2 | Project 2 |  |
| 37 | 1.5 | 65:30 | Project 2 | The same cycle, in another repository |  |
| 38 | 3 | 67:00 | Project 2 | Start with issue EX-1 |  |
| 39 | 4 | 70:00 | Project 2 | The planner decides how many agents |  |
| 40 | 11 | 74:00 | Project 2 | Put the swarm to work |  |
| 41 | 2 | 85:00 | Project 2 | After the workshop |  |
| 42 | 1.5 | 87:00 | Closing | Five ideas to take with you |  |
| 43 | 1 | 88:30 | Closing | Tomorrow |  |
| 44 | 0.5 | 89:30 | Closing | Questions |  |

Total: 90 min.

## Notes per slide

### 1. Agent orchestration with Claude

[0:00 → 1:00] 1 min · you should be here at 0 min

Welcome. In 90 minutes we will put a swarm of agents to work building a game and then working on a real task, in a repository with tests.

### 2. You'll leave the workshop with this

[1:00 → 2:30] 1.5 min · you should be here at 1 min

Three concrete outcomes. Everything stays installed on each laptop and keeps working after today.

### 3. Ground rules on cost

[2:30 → 4:00] 1.5 min · you should be here at 3 min

The budget is backed by the benchmark, not by cuts. If someone goes over the target, a warning shows up and they keep working. The footer numbers come from the Project 1 reference run (8 agents in parallel, as on everyone's laptop): they are the same numbers used in the rest of the deck.

### 4. Install the kit

[4:00 → 5:30] 1.5 min · you should be here at 4 min

Almost everyone installed beforehand (pre-work): for them this slide only shows where the command is. Anyone who has not installed yet runs it now and follows along with a neighbour while it installs (10 to 20 minutes). The same command installs on another machine. The commands are generated from repos.conf: they are always right for the published version (v1.0.0-rc.4). To update only the Agent Memory app: agent-memory update. Before this slide, post the commands in Teams so everyone can copy them.

### 5. Check your installation

[5:30 → 8:30] 3 min · you should be here at 6 min

Everyone runs the check. It takes 2 to 3 minutes and installs nothing. Anyone who did not run the setup follows along with a neighbour and installs during the questions. The setup speaks English, but it detects the machine language and writes the Claude Code language setting (Portuguese, English, Hindi or Hebrew): the skills answer in that language. The Arena, the orchestrator tables and the docs come in Portuguese or English (any other language gets English). Before this slide, post the commands in Teams so everyone can copy them.

### 6. Did a step fail?

[8:30 → 10:30] 2 min · you should be here at 9 min

Doctor checks everything and, if a step failed, asks Claude for a diagnosis: it sends the state of each step and the end of the log, with no secrets. It runs nothing. Running the install command again only repeats the missing steps; there, on each failure, Claude suggests commands and runs them only after you confirm, one by one. If Claude is not installed yet, the pre-written help from TROUBLESHOOTING is shown. Before this slide, post the commands in Teams so everyone can copy them.

### 7. Concepts

[10:30 → 11:00] 0.5 min · you should be here at 11 min

Seven minutes of ideas, one concept per slide. The task graph and cost measurement come later, in Project 1, right where they are used.

### 8. Claude Code works in your project

[11:00 → 12:30] 1.5 min · you should be here at 11 min

Claude Code is not a chat: it is an agent that acts on the repository. Everything it does goes through permissions. Plan mode (Shift+Tab) makes it only plan, without touching anything.

### 9. A skill is a recipe with a name

[12:30 → 14:00] 1.5 min · you should be here at 13 min

Skills replaced the old slash commands. The frontmatter pins the model and the allowed tools. Today we use two sets: /demo-* in the Arena and /task-* for everyday work. The kit skills are in English and tell Claude to answer in the participant's language.

### 10. Subagents: their own context and model

[14:00 → 15:30] 1.5 min · you should be here at 14 min

A subagent is a Claude instance with a clean context, its own tools and the model we choose. It is defined in a .claude/agents/<name>.md file. The /agents command no longer opens a wizard: you edit the file.

### 11. The cost rule of thumb

[15:30 → 17:00] 1.5 min · you should be here at 16 min

A cheap swarm is many small agents with clear instructions. What costs money is coordination. That is why the orchestrator is a script and the workers answer with one line. Both numbers come from the Project 1 reference run.

### 12. The cycle of every task

[17:00 → 18:00] 1 min · you should be here at 17 min

It is the same cycle in both projects: plan with Opus, run as a swarm, a security gate, measure and save what was learned. Each step shows up again in Project 1, where it is used.

### 13. What we will build: the Security Arena

[18:00 → 19:00] 1 min · you should be here at 18 min

Before the video, say what is going to be built. The Arena is a security mini-game: each task builds a small challenge (find the line that exposes a secret, pick the real website, order the parts of a URL, type an answer). The app shell and the tests already exist; the agents write the challenges, one task each. Explain the colours now, because they show up everywhere: each square is a task, grey while it waits, yellow while an agent works on it, green when its test passes, red when it fails.

### 14. The swarm in action

[19:00 → 19:30] 0.5 min · you should be here at 19 min

Bridge into Project 1. What they are about to see is the cycle from the concepts (plan → swarm → review → cost → memory) in a real run with 100 tasks. Right after, each person builds the same Arena, with up to 8 agents in parallel.

### 15. The swarm building the Arena

[19:30 → 22:00] 2.5 min · you should be here at 20 min

Sped-up video of a real run with 100 tasks, recorded before your own card and the cards that fail on purpose existed (8 agents in parallel), so the footer numbers are not the Project 1 ones (on each laptop, 8 run in parallel; see the cost slide). On the left, the /status page: each square is a task, yellow while an agent works on it and green when its test passes. On the right, the terminal with the agent batches. Plan B if the video fails: open /status?replay=recording in the recorded Arena.

### 16. The result: the game, ready to use

[22:00 → 23:00] 1 min · you should be here at 22 min

Recording of someone playing the final Arena: point at the insecure line, pick the right answer, order the steps and type the answer. Each challenge explains the why at the end. At the end of Project 1 everyone plays their own.

### 17. Project 1

[23:00 → 23:30] 0.5 min · you should be here at 23 min

37 minutes of hands-on. In the reference run, the 100-task swarm took 7.4 min (the full session, 14 min); in interactive mode and with new accounts it can take longer. The slides between "Release the swarm" and "Why did this card fail?" (9 minutes) cover that wait: they are all done while the swarm works.

### 18. What we will do in this project today

[23:30 → 24:30] 1 min · you should be here at 24 min

The tests already exist: each agent only has to turn its test green. That is what lets Haiku do the bulk of the work safely. That is 105 tasks; with each person's own card, 106.

### 19. Write your card

[24:30 → 29:30] 5 min · you should be here at 25 min

The example already has every field: just change the text. The template picks the format: spot-the-flaw (point at the insecure line), choice (pick the answer), order (put the steps in order) or answer (type the answer); each one has its own fields, and the example shows them. gen.mjs writes the card spec and test (cards/my-01/), and /demo-plan adds it to the other tasks: that makes 101 cards. Anyone who would rather not write one skips this step and keeps 100. On Windows, cp works in PowerShell.

### 20. What /demo-plan does

[29:30 → 31:00] 1.5 min · you should be here at 30 min

Explain before running it. A skill is not magic: it is a Markdown recipe that Claude follows. Here it calls a script that builds the graph (always the same, from the tasks, your card included) and an Opus agent that only reviews it. The result is in files they can open and read (PLAN.md has the waves, the dependencies and the estimate).

### 21. Task → graph → waves

[31:00 → 32:30] 1.5 min · you should be here at 31 min

The plan is a dependency graph. We run it in waves: everything that is ready runs in parallel. In wave 1, lib-hash and the challenges start together; the three cryptography tasks wait for lib-hash (a real dependency inside wave 1) and join as soon as it turns green. This is what /demo-plan draws on the next slide.

### 22. Plan the swarm

[32:30 → 35:30] 3 min · you should be here at 33 min

The trust dialog matters: without it, the project permissions stay off. In recent Claude Code versions, because the Arena pre-approves permissions, the preselected option is "No, exit": pressing Enter quits. Show the down arrow. /demo-plan checks the memory, builds the graph and asks the planner (Opus) to review it. Then show someone's plan on the projector. Optional cost decision: with --crypto haiku or --crypto sonnet each person picks the model for the cryptography tasks; at the end, in /demo-cost, they compare cost and green cards with a neighbour who picked the other one.

### 23. What /demo-swarm does

[35:30 → 37:00] 1.5 min · you should be here at 36 min

Explain before running it. The key point: a script picks what runs, not the model. With 8 calls in parallel, a model forgets dependencies or rewrites prompts; the script is reproducible, and that is what makes the cost predictable and the benchmark comparable. grade.mjs runs the test of each task and decides: green or red. If a task fails, the script retries it with the error message and, on the third attempt, with Sonnet.

### 24. Release the swarm

[37:00 → 39:00] 2 min · you should be here at 37 min

Prediction, before pressing Enter: each person writes in Teams how much they think it will cost and how many cards will end up red. From here the swarm works for a few minutes (7.4 min in the reference run; longer with new accounts). The next four slides (9 minutes) happen during that wait; whoever finishes first plays the Arena.

### 25. Ask without interrupting

[39:00 → 41:00] 2 min · you should be here at 39 min

/btw answers on the side, outside the conversation. Careful: while the answer panel is open, the agents' results wait (Claude Code shows "background task updates waiting while this panel is open"). Read it and press Esc so the swarm carries on.

### 26. In a third terminal: three features

[41:00 → 44:00] 3 min · you should be here at 41 min

Still during the swarm. Plan mode only reads and proposes. claude -p is the basis for scripts and CI. Esc Esc opens rewind: it restores code and conversation to a checkpoint, but not what was done through Bash nor most of what the subagents did. If someone asks about worktrees: claude -w <name> opens an isolated copy of the repository on its own branch, and isolation: worktree gives a subagent its own worktree when tasks touch the same files.

### 27. Create a PostToolUse hook

[44:00 → 46:00] 2 min · you should be here at 44 min

Still during the swarm, and outside the Arena, so the swarm session is not touched. A hook is "when X happens, run Y", set up in a settings.json; Claude writes hooks very well, just describe what you want. settings.local.json belongs to this folder only and stays out of git. In Project 2 (the practice project) the hook also fires for the /task-swarm agents: open edits.log and watch the files show up. The kit uses SubagentStop to record the cost of each agent (see "Measure, don't guess").

### 28. Make your own statusline

[46:00 → 48:00] 2 min · you should be here at 46 min

Still during the swarm. The kit statusline reads what the hook recorded and shows the session and project cost, live, against the US$ 5 target: show the one in Terminal 1 changing as the agents finish. Asking to save it in .claude/settings.local.json matters: otherwise /statusline writes to the user settings and replaces the kit one in every project. To get the kit one back in this project, delete statusLine from settings.local.json. Claude Code's /usage may show more, because some versions do not know the latest prices yet; /demo-cost uses the published prices.

### 29. Why did this card fail?

[48:00 → 53:00] 5 min · you should be here at 48 min

The lesson of Project 1: what the spec does not decide, the agent guesses. In the 4 cards (pv-07, rd-09, cr-07 and sc-08) two answers are plausible and the spec lacks the rule that picks one; the test only keeps a short hash of the right one, so neither the agent nor the message gives it away. The message says what the agent produced and what the spec does not decide; the decision is the person's, from the prompt and the concept. These cards fail at once, with no new attempts. If the person decides wrong, the agent follows the spec and the same message comes back with that value: think again. Whoever finishes repeats it for the other red cards: the gate only approves when everything is green. Compare with the Teams prediction: how many red cards did they expect? Optional extra, for anyone who wants to automate it: /loop 2m run node tools/workshop/orchestrator/grade.mjs --all and fix the first red task with the implementer agent; stop when everything is green (/loop repeats a prompt at each interval; Esc cancels).

### 30. The security gate

[53:00 → 55:00] 2 min · you should be here at 53 min

A security game with security flaws would be the worst example. The gate links each check to the OWASP Top 10. With cards still red, the gate says GATE: REJECTED and lists what is missing: go back to the previous slide.

### 31. Measure, don't guess

[55:00 → 56:00] 1 min · you should be here at 55 min

Before /demo-cost: where the numbers come from. The kit hook is like the one they created, on a different event: it reads the real tokens from the transcript, multiplies them by the published prices and appends one line. It never blocks anything. The statusline and /demo-cost only read those lines.

### 32. How much did it cost?

[56:00 → 58:00] 2 min · you should be here at 56 min

The report uses real tokens and published prices. At the end it saves the lessons to the memory app. Whoever used --crypto haiku compares with whoever used --crypto sonnet: cost and green cards. Duel: each room collects everyone's cost and green cards in Teams, and the two rooms compare at the end (and against the prediction made before the swarm).

### 33. Play what the swarm built

[58:00 → 60:00] 2 min · you should be here at 58 min

The tests also run in the browser. It is the same test that decided the colour of the square.

### 34. The memory of what you did

[60:00 → 62:00] 2 min · you should be here at 60 min

They are Markdown files in ~/.agent-memory, with an SQLite index. Everything stays on your PC. Each memory is linked to the Jira or GitHub ticket and to its epic: searching ABC-123 brings everything for that ticket and the epic. /task-intake and /task-plan check it before planning ("last time in this epic, don't do X").

### 35. Open your first graph

[62:00 → 65:00] 3 min · you should be here at 62 min

The app opens in your native language and has a language selector. The lesson about the card that failed should be there.

### 36. Project 2

[65:00 → 65:30] 0.5 min · you should be here at 65 min

22 minutes. Everyone's path is the practice project: the Municipal Library, a small API with tests and the issues EX-1 to EX-3 as JSON, with no Jira login and no MCP. Anyone who already has Jira or GitHub working can bring a task of their own. The task may not finish here: the goal is to leave with the orchestration running and to know how to continue.

### 37. The same cycle, in another repository

[65:30 → 67:00] 1.5 min · you should be here at 66 min

The /task-* skills are installed at user level and work in any repository. Every write to Jira or GitHub asks for confirmation; in the practice project there is nothing to publish.

### 38. Start with issue EX-1

[67:00 → 70:00] 3 min · you should be here at 67 min

Anyone who still has Claude open in Terminal 3 (from the hook) only types the last line. EX-1 is small: validate the ISBN and the email when creating books and readers. Intake only reads; it writes nothing. With your own repository: Jira needs the /mcp login (atlassian) and GitHub uses gh.

### 39. The planner decides how many agents

[70:00 → 74:00] 4 min · you should be here at 70 min

The planner (Opus) proposes the graph and a script validates it: ids, dependencies, cycles and known agents. Tasks that touch the same files go in different batches, at swarm time. Integration and review are added automatically. A larger task (EX-2) gets more agents.

### 40. Put the swarm to work

[74:00 → 85:00] 11 min · you should be here at 74 min

The state lives in .workshop/. Running /task-swarm again resumes. Tasks that touch the same files go in different batches, or in git worktrees if the planner decides so. The Project 1 hook is working: open ~/workshop-claude/edits.log and watch the files the agents edit. Whoever finishes EX-1 moves on to EX-3 (small, security: a reader can see another reader's loans) or EX-2 (medium, more agents), and can run /task-gate.

### 41. After the workshop

[85:00 → 87:00] 2 min · you should be here at 85 min

To use it with your own issues: Jira goes through the Atlassian MCP, logged in via /mcp; if that fails, the Atlassian CLI (acli auth login), which the setup already installed, reads the issue and posts the comments (hours are logged by hand). The Atlassian MCP uses the company's Rovo credits and the admin can limit it. GitHub uses gh (gh auth login): it uses less context than an MCP and shares no tokens. Example comment: agent ws-worker-07 · Haiku · 5 s · US$ 0.004.

### 42. Five ideas to take with you

[87:00 → 88:30] 1.5 min · you should be here at 87 min

A summary in five sentences. The third one joins the two lessons of Project 1: the orchestrator is a script, and the card that failed failed because of its spec.

### 43. Tomorrow

[88:30 → 89:30] 1 min · you should be here at 89 min

Three concrete actions.

### 44. Questions

[89:30 → 90:00] 0.5 min · you should be here at 90 min

Questions can go past 90 minutes. Anyone who did not run the setup installs now. If there is time: the result of the duel between the two rooms.

