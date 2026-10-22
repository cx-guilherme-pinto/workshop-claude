# Speaker notes — Agent orchestration with Claude (v2)

Each slide: goal, what to say, what to read on the panel, typical failures and the clock. Slides marked **CAN SKIP** can be skipped if you are running late. The answers to the 3 ambiguous specs are in docs/PRESENTER-ANSWERS.md (not in the kit).

| # | min | clock | block | phase | type | slide |
|---|---|---|---|---|---|---|
| 1 | 0.5 | 0:00 | Opening | opening | — | Agent orchestration with Claude |
| 2 | 1.5 | 0:30 | Opening | opening | — | The rules: cost and what the panel sees |
| 3 | 1 | 2:00 | Opening | opening | Concept | What we will do today |
| 4 | 1 | 3:00 | Opening | opening | Concept | How we will work |
| 5 | 1 | 4:00 | Opening | opening | Concept | Your memory learns with you |
| 6 | 4 | 5:00 | Opening | opening | Do it now | Check and join the panel |
| 7 | 2 | 9:00 | Opening | opening | Do it now | Did a step fail? |
| 8 | 1 | 11:00 | Missions | missions | Panel | 11 missions, an empty grid |
| 9 | 2 | 12:00 | Missions | missions | M1 | Plan without touching |
| 10 | 2 | 14:00 | Missions | missions | M2 | The right model |
| 11 | 2 | 16:00 | Missions | missions | M3 | A subagent |
| 12 | 1 | 18:00 | Missions | missions | Concept | Tool or skill? |
| 13 | 2 | 19:00 | Missions | missions | M4 | Your skill |
| 14 | 2 | 21:00 | Missions | missions | M5 | Your hook |
| 15 | 2 | 23:00 | Missions | missions | M6 | Until it is green |
| 16 | 1 | 25:00 | Missions | missions | Panel | What the room is missing (and the bonus M7 to M10) |
| 17 | 2 | 26:00 | Project 1 | p1 | Panel | What we will build: the Pocketknife |
| 18 | 4 | 28:00 | Project 1 | p1 | Do it now | Invent your tool |
| 19 | 2 | 32:00 | Project 1 | p1 | Decide | How many agents, and which model? |
| 20 | 1 | 34:00 | Project 1 | p1 | Do it now | Plan |
| 21 | 7 | 35:00 | Project 1 | p1 | Do it now | Release the swarm |
| 22 | 4 | 42:00 | Project 1 | p1 | Do it now | Why did this tool fail? |
| 23 | 2 | 46:00 | Project 1 | p1 | Do it now | Gate and cost: which decision won? |
| 24 | 2 | 48:00 | Project 1 | p1 | M11 | Your tool, used by Claude |
| 25 | 2 | 50:00 | Project 2 | p2 | Panel | The same cycle, in another repository |
| 26 | 4 | 52:00 | Project 2 | p2 | Do it now | Read the issue |
| 27 | 6 | 56:00 | Project 2 | p2 | Decide | How many agents? |
| 28 | 12 | 62:00 | Project 2 | p2 | Do it now | Put the swarm to work |
| 29 | 5 | 74:00 | Project 2 | p2 | Do it now | The gate |
| 30 | 4 | 79:00 | Project 2 | p2 | Do it now | The report and the memory |
| 31 | 4 | 83:00 | Project 2 | p2 | Do it now | Now on your own: EX-3 |
| 32 | 2 | 87:00 | Closing | closing | Panel | The day in numbers, and 3 ideas to take home |
| 33 | 1 | 89:00 | Closing | closing | — | Questions |

Total: 90 min.

## Notes per slide

### 1. Agent orchestration with Claude

[0:00 → 0:30] 0.5 min · opening

Goal: Open the session and point at the panel on the right.

What to say:
- For 90 minutes we do instead of listen: 11 short missions, a swarm of agents and a task in a real repository.
- The panel on the right shows what everyone has done, live.

Look at the panel:
- If there are already names on the leaderboard: "whoever is on the panel ran the setup at home, thank you".

Clock: you should be here at 0 min.

### 2. The rules: cost and what the panel sees

[0:30 → 2:00] 1.5 min · opening

Goal: Make clear that cost is measured, not cut, and what the panel sees.

What to say:
- The target is US$ 5 per person for the whole day; at US$ 5 and US$ 10 a warning shows, and nobody is cut off.
- The panel only gets counts and decisions, never prompts or code. Points come from coverage and quality, never from spending more.
- Everything the panel kept today is deleted at midnight.

Look at the panel:
- If someone asks about privacy: "it is all in docs/PRIVACY.md, and node ~/.workshop-claude/kit/telemetry/ctl.mjs show prints the last 20 events exactly as they leave your laptop".

Clock: you should be here at 1 min.

### 3. What we will do today

[2:00 → 3:00] 1 min · opening

Goal: Give the map of the day before starting.

What to say:
- There is no theory block: each concept is learned in a 2-minute mission.
- The two projects are the same cycle: first on a project made for the workshop, then on a real task.
- Everything stays installed and keeps working after today.

Look at the panel:
- The panel is still empty: "it fills up as you do each thing".

Clock: you should be here at 2 min.

### 4. How we will work

[3:00 → 4:00] 1 min · opening

Goal: Explain the cycle that repeats in both projects.

What to say:
- Your job is to decide and to check; the agents’ job is to do.
- The cost is measured at every step, from the real tokens.

Clock: you should be here at 3 min.

### 5. Your memory learns with you

[4:00 → 5:00] 1 min · opening

Goal: Introduce the memory and explain that it grows with each person’s work.

What to say:
- They are Markdown files in ~/.agent-memory, with an index: everything stays on your laptop.
- Each lesson is linked to the project, the task and the files: tomorrow, /task-intake on another issue already finds it.
- We come back to this window at the end of each project.

Typical failures and the answer:
- agent-memory-gui does not exist → --check shows step 10; without the app everything else works (MEMORY UNAVAILABLE)
- The window does not open (Windows without WebView2) → the app opens the same interface in the browser

Clock: you should be here at 4 min.

### 6. Check and join the panel

[5:00 → 9:00] 4 min · opening

Goal: Everyone with the kit checked and registered on the panel.

What to say:
- --check installs nothing: it only confirms each step and connects you to the panel.
- The registration uses your gh login: it checks the company email on your laptop, and only the name goes to the panel.

Look at the panel:
- If "Ready" is below half at 3 min: "whoever has a green table, help your neighbour".
- If "Registered" is well below the room: "the register command under the table fixes it; without a verified @checkmarx.com email on GitHub you do the workshop all the same, you just do not appear on the leaderboard".

Typical failures and the answer:
- E-TEL-03: gh cannot read the emails → gh auth refresh -h github.com -s user:email and run register again
- E-TEL-02: no verified company email → add it at github.com/settings/emails; the workshop works without it
- The command does not exist: no setup yet → run the one-liner from the README now and pair with a neighbour while it installs

Clock: you should be here at 5 min.

### 7. Did a step fail?

[9:00 → 11:00] 2 min · opening

Goal: Fix setup failures without stopping the room.

What to say:
- --doctor asks Haiku for a diagnosis of the log excerpt, with the secrets already removed, and only runs a command if you say yes.
- Nobody waits: whoever cannot fix it in 2 minutes pairs with a neighbour.

Look at the panel:
- If "Ready" does not go up: "whoever has ❌ on Claude Code login, run claude auth login --console".

Typical failures and the answer:
- Company proxy or network → switch to the event network or a hotspot and run --check again
- Claude login missing → claude auth login --console

Clock: you should be here at 9 min.

### 8. 11 missions, an empty grid

[11:00 → 12:00] 1 min · missions

Goal: Open the missions project and start the room race.

What to say:
- There are 7 guided missions of 2 minutes (6 here, the last one in Project 1) and 4 bonus ones for the waits.
- Nobody clicks "done": the kit sees the feature being used and lights up the mission.
- /missions shows your mission book at any time.

Look at the panel:
- The grid is at 0 %: "let us see how many we light up before Project 1".

Typical failures and the answer:
- The missions-project folder does not exist → run --check: step 9 sets it up

Clock: you should be here at 11 min.

### 9. Plan without touching

[12:00 → 14:00] 2 min · missions

Goal: Show that you can think with Claude at no risk.

What to say:
- Plan mode is the cheapest and safest way to start: Claude reads the code and proposes, but touches nothing.
- If the plan works for you, you approve it and it runs; here we do not approve.

Look at the panel:
- If M1 is below 50 % halfway: "Shift+Tab twice; look for plan mode on under the input box".

Typical failures and the answer:
- "accept edits on" shows instead of plan mode → press Shift+Tab again
- Claude asks "Would you like to proceed?" → Esc: we do not want to run it

Clock: you should be here at 12 min.

### 10. The right model

[14:00 → 16:00] 2 min · missions

Goal: Choose the model by the task, not by habit.

What to say:
- Haiku costs about 10 times less than Sonnet and is enough for simple questions.
- In Project 1 you will choose the model of 30 agents: this is the same decision, in small.

Look at the panel:
- If M2 lags behind M1: "/model haiku asks for a confirmation; press Enter".

Typical failures and the answer:
- It keeps asking for confirmation → Enter on the selected option

Clock: you should be here at 14 min.

### 11. A subagent

[16:00 → 18:00] 2 min · missions

Goal: Understand the building block of a swarm.

What to say:
- A swarm is this, multiplied: many subagents, each with its own context and task.
- The main context stays clean, and that is cost too.

Look at the panel:
- If M3 is below M2: "write the word subagent in the request".

Typical failures and the answer:
- Claude answers without launching a subagent → ask explicitly: use an Explore subagent

Clock: you should be here at 16 min.

### 12. Tool or skill?

[18:00 → 19:00] 1 min · missions

Goal: Tell tool from skill before M4 creates a skill and M11 uses a tool.

What to say:
- A tool is code: same input, same output, and almost free in tokens.
- A skill is text: written in minutes, but the model interprets it and can drift.
- The best skills call tools for the parts that must be exact.

Look at the panel:
- No panel cue here: move on to M4 within 1 minute.

Typical failures and the answer:
- Someone asks whether an MCP is a tool or a skill → an MCP server offers tools; a skill is just a Markdown file

Clock: you should be here at 18 min.

### 13. Your skill

[19:00 → 21:00] 2 min · missions

Goal: Show that a skill is just a file anyone can write.

What to say:
- The workshop skills (/demo-plan, /task-swarm…) are exactly this: Markdown with instructions.
- claude -c resumes the previous conversation: nothing is lost when you leave.
- Recall the last slide: the skill is the recipe in text, the tool is the function in code.

Look at the panel:
- If M4 stays low: "the skill only shows after you leave and come back; /exit and claude -c".

Typical failures and the answer:
- /summary does not exist → check the file .claude/skills/summary/SKILL.md and reopen with claude -c

Clock: you should be here at 19 min.

### 14. Your hook

[21:00 → 23:00] 2 min · missions

Goal: Understand that hooks automate without asking the model.

What to say:
- This is how the kit measures cost: a hook at the end of each subagent.
- settings.local.json is only yours and does not go to git.
- Esc Esc opens rewind: you go back to before the edit.

Look at the panel:
- If M5 is below 50 %: "half the room has no hook yet; whoever has one, help your neighbour".

Typical failures and the answer:
- edits.log does not show up → the hook only runs on the next edit: ask for another one
- The hook went into the kit’s settings.json → ask to move it to .claude/settings.local.json

Clock: you should be here at 21 min.

### 15. Until it is green

[23:00 → 25:00] 2 min · missions

Goal: See Claude work on its own with a stop condition.

What to say:
- The project ships with 2 tests broken on purpose.
- A loop with no stop condition burns money: always say when to stop.

Look at the panel:
- If M6 goes up slowly: "the loop runs every minute; while you wait, do a bonus one".

Typical failures and the answer:
- The loop does not stop → Esc and say: stop the loop

Clock: you should be here at 23 min.

### 16. What the room is missing (and the bonus M7 to M10)

[25:00 → 26:00] 1 min · missions

Goal: Close the guided missions and point the bonus ones at the waits.

What to say:
- The mission blinking on the panel is the least done: that is the one worth helping with now.
- The bonus ones get no stage time: you do them while the swarms work.

Look at the panel:
- Read the blinking mission out loud and ask whoever has it to show their neighbour.
- If the average coverage passes 70 %: "this room is faster than the rehearsal".

Clock: you should be here at 25 min.

### 17. What we will build: the Pocketknife

[26:00 → 28:00] 2 min · p1

Goal: Introduce the Pocketknife and plant the forecast.

What to say:
- Count words, split the bill, convert colours: 30 tools people really use.
- Each one is an agent and a test; you decide how many agents, which model and a tool of your own.

Look at the panel:
- Still empty: "by the end of this block this chart shows the time and cost of every swarm in the room".

Typical failures and the answer:
- The canivete-project folder does not exist → --check sets it up in step 9

Clock: you should be here at 26 min.

### 18. Invent your tool

[28:00 → 32:00] 4 min · p1

Goal: Give each person a tool that is only theirs.

What to say:
- There are 4 templates: calc, convert, text and generate; the agent only writes the run() function.
- gen.mjs tells you which field is wrong and gives an example.

Look at the panel:
- Read the most chosen templates: "the room likes calc; who made a generate one?".

Typical failures and the answer:
- gen.mjs refuses my-tool.json → read the message: it names the field and gives an example
- No ideas → use the example as it is: it works

Clock: you should be here at 28 min.

### 19. How many agents, and which model?

[32:00 → 34:00] 2 min · p1

Goal: Get the room to split, so the comparison on the panel is rich.

What to say:
- Suggestion: front rows 4, middle 8, back 12.
- More agents finish sooner, but the main session coordinates more: the cost does not go down.

Look at the panel:
- No points yet: "in 10 minutes we will see who was right".

Clock: you should be here at 32 min.

### 20. Plan

[34:00 → 35:00] 1 min · p1

Goal: Record the decision and the forecast before seeing the result.

What to say:
- The graph is deterministic: it comes from the specs, not from the model.
- The forecast only goes to the panel, to compare with the real time.

Look at the panel:
- If the forecast median shows: "the room thinks X minutes; let us see".

Typical failures and the answer:
- ERROR: plan not found later → run /demo-plan first, in the canivete-project folder

Clock: you should be here at 34 min.

### 21. Release the swarm

[35:00 → 42:00] 7 min · p1

Goal: See a swarm work, and the effect of the room’s decisions.

What to say:
- Each square is a tool: yellow working, green passed, red failed.
- The reds are the next slide: it is not bad luck.

Look at the panel:
- At 4 min, when the dots show: "the 12s finished first; see whether they spent less".
- If the real median is far from the forecast: "we said X, it took Y; who got it right?".

Typical failures and the answer:
- Port 3000 is busy → server.js uses the next one and says which
- It asks for a permission halfway → the project must be trusted: the setup does it; accept and carry on
- The swarm stopped → run /demo-swarm again: it resumes where it was

Clock: you should be here at 35 min.

### 22. Why did this tool fail?

[42:00 → 46:00] 4 min · p1

Goal: Understand that what the spec does not decide, the agent guesses.

What to say:
- The 3 broken on purpose (nm-03, dn-01, tx-02) leave out a rule; the agent picks the "obvious" answer, and it is the wrong one.
- The message says what the tool returned and what the spec does not decide, never the right value: you decide.
- No agent may change a spec: that is your job.

Look at the panel:
- If "specs fixed" is still 0 at 2 min: "open the red one’s spec.md and write one line with the rule".

Typical failures and the answer:
- It goes red again → the rule is ambiguous: write an example with the value
- Does not know the rule → think like the person who asked for the tool: what is right for an accountant?

Clock: you should be here at 42 min.

### 23. Gate and cost: which decision won?

[46:00 → 48:00] 2 min · p1

Goal: Close the loop: quality and cost, measured.

What to say:
- The reviewer is Opus: it reads a summary, not the whole tree, and says APPROVED or REJECTED.
- The cost comes from the real tokens and the published prices.

Look at the panel:
- Read the cost per green for 4, 8 and 12: "more agents did not get cheaper".
- If there are Sonnet swarms: "Sonnet cost more and gave hardly any more greens".

Typical failures and the answer:
- GATE: REJECTED → read the reservations; usually it is a red one still to fix

Clock: you should be here at 46 min.

### 24. Your tool, used by Claude

[48:00 → 50:00] 2 min · p1

Goal: Close the tool-or-skill idea: what the swarm built, Claude calls as a tool.

What to say:
- This is a tool: code with typed inputs, called by name, with no recipe to read.
- Same tool, two ways to use it: the page in the browser and Claude.

Look at the panel:
- If M11 stays low: "Claude Code must be open in the Pocketknife folder; /mcp shows whether the canivete server is connected".

Typical failures and the answer:
- Claude cannot find the tool → /mcp: the canivete server must be connected; reopen with claude -c
- It answers without calling the tool → ask by name: use the my-01 tool

Clock: you should be here at 48 min.

### 25. The same cycle, in another repository

[50:00 → 52:00] 2 min · p2

Goal: Connect Project 2 to what they already did.

What to say:
- The plan is /demo-plan, the swarm is /demo-swarm, the gate is /demo-review: the difference is that the task comes from an issue.
- The default path is the Municipal Library, with no login; whoever has Jira or GitHub working can use their own issue.

Look at the panel:
- The funnel is empty: "in 30 minutes we want the whole room at the end".
- Whoever will work in their own repository and prefers that nothing leaves the laptop: "unregister stops the sending; your mission book stays, and register --again turns it back on".

Clock: you should be here at 50 min.

### 26. Read the issue

[52:00 → 56:00] 4 min · p2

Goal: Get everyone a task that has been read.

What to say:
- EX-1 is small: validate the ISBN and the email when creating books and readers.
- The intake only reads: it writes nothing to Jira or GitHub.

Look at the panel:
- If the funnel is still at "intake" at 3 min: "check you are in the practice-project folder".

Typical failures and the answer:
- Issue not found → run it in the practice-project folder: the path is issues/EX-1.json

Clock: you should be here at 52 min.

### 27. How many agents?

[56:00 → 62:00] 6 min · p2

Goal: Decide on the why, not on the number.

What to say:
- The planner reads the issue and the code and proposes subtasks: tasks that touch the same files go in different batches.
- Adjusting is normal: the plan is a proposal.

Look at the panel:
- Read the histogram: "most have 2 or 3; whoever adjusted, why?".

Typical failures and the answer:
- PLAN INVALID → ask the planner to fix it: the message says what is missing

Clock: you should be here at 56 min.

### 28. Put the swarm to work

[62:00 → 74:00] 12 min · p2

Goal: See the swarm on a real task, with resume.

What to say:
- Esc interrupts; /task-swarm again resumes where it was.
- If the planner chose worktrees, each agent works in its own copy of the repository.

Look at the panel:
- Halfway, read the funnel: "half are already at the gate; whoever is still in the swarm, let it run".

Typical failures and the answer:
- A subtask fails 3 times → read the reason on the dashboard; fix the description and run --retry
- The dashboard shows nothing → it has to run in the project folder

Clock: you should be here at 62 min.

### 29. The gate

[74:00 → 79:00] 5 min · p2

Goal: Deliver nothing without verification.

What to say:
- The gate runs the tests, looks for secrets and dangerous code, and asks Opus for the verdict.
- A REJECTED is not a failure: it is the gate doing its job.

Look at the panel:
- If approved gates stay low: "read the reservations; it is almost always a test still to run".

Typical failures and the answer:
- GATE: REJECTED → fix what the reservations say and run /task-gate again

Clock: you should be here at 74 min.

### 30. The report and the memory

[79:00 → 83:00] 4 min · p2

Goal: Close the task and keep what was learned.

What to say:
- In the practice project the report goes to report.md; in Jira or GitHub, /task-report only writes after your yes.
- The memory stays on your laptop and the next /task-intake reads it.

Look at the panel:
- When the funnel reaches "report": "whoever closed it, move on to EX-3".

Typical failures and the answer:
- MEMORY UNAVAILABLE → the Agent Memory app is not installed: the rest works; --check shows step 10

Clock: you should be here at 79 min.

### 31. Now on your own: EX-3

[83:00 → 87:00] 4 min · p2

Goal: Run the cycle without help.

What to say:
- EX-3 is a small security flaw (IDOR), with an authorisation test already written.
- It is the final test of the workshop: if you can do it alone, you can do it tomorrow in your repository.

Look at the panel:
- Read the closed issues: "N EX-3s closed already".

Typical failures and the answer:
- EX-1 is not finished → carry on with EX-1: EX-3 is optional

Clock: you should be here at 83 min.

### 32. The day in numbers, and 3 ideas to take home

[87:00 → 89:00] 2 min · closing

Goal: Close with the room’s numbers and 3 concrete ideas.

What to say:
- The 3 numbers on the panel are "do better" ones: cost per green, greens at the first try, % on Haiku.
- Everything you installed keeps working tomorrow: start with the next issue assigned to you, with /task-intake.

Look at the panel:
- Read the average cost per person against the US$ 5 target.
- Read the % of greens at the first try: "this is what a good spec buys".

Clock: you should be here at 87 min.

### 33. Questions

[89:00 → 90:00] 1 min · closing

Goal: Open the questions.

What to say:
- Questions can go past 90 minutes. Anyone who did not run the setup installs now.
- The panel deletes everything at midnight; your mission book and your memories stay on your laptop.

Look at the panel:
- If there is time: show the final leaderboard.

Clock: you should be here at 89 min.

