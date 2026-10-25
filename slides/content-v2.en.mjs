// Content of the v2 deck (English), docs/pt/WORKSHOP-V2-SPEC.md section 8: 32 slides at 1280 x 1080, each with
// the panel phase. build-v2.mjs turns it into workshop-v2.en.pptx, speaker-notes-v2.en.md and palco.html. Same
// shape as content-v2.mjs: change a slide here = change the same slide there. The fields are described there.
// {{...}} come from repos.conf (installer/lib/conf.mjs).

export const BLOCOS = ['Opening', 'Missions', 'Project 1', 'Project 2', 'Closing'];

const MISSIONS = 'cd ~/workshop-claude/missions-project\nclaude';
const POCKETKNIFE = 'cd ~/workshop-claude/canivete-project\nclaude';
const PRACTICE = 'cd ~/workshop-claude/practice-project\nclaude';

export const SLIDES = [
  // ---------------- Opening (0–11)
  {
    min: 0.5, bloco: 'Opening', fase: 'opening', tipo: 'titulo',
    titulo: 'Agent orchestration with Claude',
    subtitulo: 'Missions, a swarm that builds a pocketknife and a real task',
    notas: {
      objetivo: 'Open the session and point at the panel on the right.',
      dizer: ['For 90 minutes we do instead of listen: 11 short missions, a swarm of agents and a task in a real repository.', 'The panel on the right shows what everyone has done, live.'],
      painel: ['If there are already names on the leaderboard: "whoever is on the panel ran the setup at home, thank you".'],
      falhas: [],
    },
  },
  {
    min: 1.5, bloco: 'Opening', fase: 'opening', tipo: 'regras',
    titulo: 'The rules: cost and what the panel sees',
    custo: [
      { valor: 'US$ 5', rotulo: 'target per person, for the whole day' },
      { valor: 'US$ 10', rotulo: 'safety ceiling, never the goal' },
      { valor: '0', rotulo: 'sessions cut off for cost' },
    ],
    painelVe: [
      'Which missions you did and your decisions (agents, model)',
      'Your GitHub name, on the leaderboard',
      'Never your prompts, your code or any token',
      'Everything is deleted at midnight',
    ],
    notas: {
      objetivo: 'Make clear that cost is measured, not cut, and what the panel sees.',
      dizer: ['The target is US$ 5 per person for the whole day; at US$ 5 and US$ 10 a warning shows, and nobody is cut off.', 'The panel only gets counts and decisions, never prompts or code. Points come from coverage and quality, never from spending more.', 'Everything the panel kept today is deleted at midnight.'],
      painel: ['If someone asks about privacy: "it is all in docs/PRIVACY.md, and node ~/.workshop-claude/kit/telemetry/ctl.mjs show prints the last 20 events exactly as they leave your laptop".'],
      falhas: [],
    },
  },
  {
    min: 1, bloco: 'Opening', fase: 'opening', tipo: 'conceito',
    titulo: 'What we will do today',
    intro: 'Three blocks, always on your laptop, always hands-on:',
    blocos: [
      { titulo: 'Missions · 15 min', texto: '11 short missions: plan mode, models, subagents, skills, hooks, /loop and a tool of your own, one at a time.' },
      { titulo: 'Project 1 · 24 min', texto: 'A swarm of agents builds the Pocketknife: 30 tools plus yours. You decide how many agents and which model.' },
      { titulo: 'Project 2 · 37 min', texto: 'The same cycle on a real task: an issue from the practice project, or from your Jira or GitHub.' },
    ],
    rodape: 'You take home: the kit installed, a memory of what you learned and a cycle to use tomorrow.',
    notas: {
      objetivo: 'Give the map of the day before starting.',
      dizer: ['There is no theory block: each concept is learned in a 2-minute mission.', 'The two projects are the same cycle: first on a project made for the workshop, then on a real task.', 'Everything stays installed and keeps working after today.'],
      painel: ['The panel is still empty: "it fills up as you do each thing".'],
      falhas: [],
    },
  },
  {
    min: 1, bloco: 'Opening', fase: 'opening', tipo: 'conceito',
    titulo: 'How we will work',
    intro: 'The same cycle in both projects:',
    blocos: [
      { titulo: 'You decide', texto: 'the spec, how many agents and which model.' },
      { titulo: 'The agents do', texto: 'in parallel, each with its own task and its own test.' },
      { titulo: 'The gate checks', texto: 'the tests, secrets, dangerous code and the Opus review.' },
      { titulo: 'The panel shows', texto: 'what the room has done, live (never your prompts).' },
      { titulo: 'The memory learns', texto: 'the lessons of each project, for next time.' },
    ],
    notas: {
      objetivo: 'Explain the cycle that repeats in both projects.',
      dizer: ['Your job is to decide and to check; the agents’ job is to do.', 'The cost is measured at every step, from the real tokens.'],
      painel: [],
      falhas: [],
    },
  },
  {
    min: 1, bloco: 'Opening', fase: 'opening', tipo: 'conceito', faz: true,
    titulo: 'Your memory learns with you',
    intro: 'The Agent Memory app keeps, on your laptop, what you learn during the day:',
    blocos: [
      { titulo: 'It reads before planning', texto: '/demo-plan, /task-intake and /task-plan first look for what you already know.' },
      { titulo: 'It saves at the end', texto: '/demo-cost and /task-report save the lessons of each project; /memory saves one of yours.' },
    ],
    comandos: [{ rotulo: 'In a terminal', cmd: 'agent-memory-gui' }],
    esperado: 'The app opens with an empty graph; by the end of the day it has the lessons of the Pocketknife and EX-1',
    notas: {
      objetivo: 'Introduce the memory and explain that it grows with each person’s work.',
      dizer: ['They are Markdown files in ~/.agent-memory, with an index: everything stays on your laptop.', 'Each lesson is linked to the project, the task and the files: tomorrow, /task-intake on another issue already finds it.', 'We come back to this window at the end of each project.'],
      painel: [],
      falhas: [
        { falha: 'agent-memory-gui does not exist', resposta: '--check shows step 10; without the app everything else works (MEMORY UNAVAILABLE)' },
        { falha: 'The window does not open (Windows without WebView2)', resposta: 'the app opens the same interface in the browser' },
      ],
    },
  },
  {
    min: 4, bloco: 'Opening', fase: 'opening', tipo: 'faca',
    titulo: 'Check and join the panel',
    passos: ['In a terminal, run the command for your system', 'Look for your name on the panel leaderboard'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{CHECK_MAC}}' },
      { rotulo: 'Windows (PowerShell)', cmd: '{{CHECK_WIN}}' },
      { rotulo: 'Not on the panel?', cmd: 'node "$HOME/.workshop-claude/kit/telemetry/ctl.mjs" register' },
    ],
    esperado: 'The summary table with no failures and your name on the panel, under "Registered"',
    notas: {
      objetivo: 'Everyone with the kit checked and registered on the panel.',
      dizer: ['--check installs nothing: it only confirms each step and connects you to the panel.', 'The registration uses your gh login: it checks the company email on your laptop, and only the name goes to the panel.'],
      painel: ['If "Ready" is below half at 3 min: "whoever has a green table, help your neighbour".', 'If "Registered" is well below the room: "the register command under the table fixes it; without a verified @checkmarx.com email on GitHub you do the workshop all the same, you just do not appear on the leaderboard".'],
      falhas: [
        { falha: 'E-TEL-03: gh cannot read the emails', resposta: 'gh auth refresh -h github.com -s user:email and run register again' },
        { falha: 'E-TEL-02: no verified company email', resposta: 'add it at github.com/settings/emails; the workshop works without it' },
        { falha: 'The command does not exist: no setup yet', resposta: 'run the one-liner from the README now and pair with a neighbour while it installs' },
      ],
    },
  },
  {
    min: 2, bloco: 'Opening', fase: 'opening', tipo: 'faca',
    titulo: 'Did a step fail?',
    passos: ['Run --doctor for your system', 'Follow the command it suggests, one at a time', 'Still stuck? Pair with a neighbour and call us'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{DOCTOR_MAC}}' },
      { rotulo: 'Windows (PowerShell)', cmd: '{{DOCTOR_WIN}}' },
    ],
    esperado: 'The likely cause and the command that fixes it',
    notas: {
      objetivo: 'Fix setup failures without stopping the room.',
      dizer: ['--doctor asks Haiku for a diagnosis of the log excerpt, with the secrets already removed, and only runs a command if you say yes.', 'Nobody waits: whoever cannot fix it in 2 minutes pairs with a neighbour.'],
      painel: ['If "Ready" does not go up: "whoever has ❌ on Claude Code login, run claude auth login --console".'],
      falhas: [
        { falha: 'Company proxy or network', resposta: 'switch to the event network or a hotspot and run --check again' },
        { falha: 'Claude login missing', resposta: 'claude auth login --console' },
      ],
    },
  },

  // ---------------- Missions (11–26)
  {
    min: 1, bloco: 'Missions', fase: 'missions', tipo: 'painel',
    titulo: '11 missions, an empty grid',
    pergunta: 'How many missions will the room light up in 15 minutes?',
    apoio: 'Each mission checks itself: you do it, and the panel lights up.',
    comandos: [{ rotulo: 'Terminal 1 · missions', cmd: MISSIONS }],
    notas: {
      objetivo: 'Open the missions project and start the room race.',
      dizer: ['There are 7 guided missions of 2 minutes (6 here, the last one in Project 1) and 4 bonus ones for the waits.', 'Nobody clicks "done": the kit sees the feature being used and lights up the mission.', '/missions shows your mission book at any time.'],
      painel: ['The grid is at 0 %: "let us see how many we light up before Project 1".'],
      falhas: [{ falha: 'The missions-project folder does not exist', resposta: 'run --check: step 9 sets it up' }],
    },
  },
  {
    min: 2, bloco: 'Missions', fase: 'missions', tipo: 'missao', id: 'M1',
    titulo: 'Plan without touching',
    conceito: 'Plan mode reads and plans, but writes nothing.',
    passos: ['Press Shift+Tab until "plan mode on" shows', 'Ask the question', 'Read the plan and leave plan mode with Shift+Tab'],
    comandos: [{ rotulo: 'In Claude Code', cmd: 'Shift+Tab  →  plan mode on\nHow would you add volume conversion?' }],
    esperado: 'A plan with steps, and no file changed',
    notas: {
      objetivo: 'Show that you can think with Claude at no risk.',
      dizer: ['Plan mode is the cheapest and safest way to start: Claude reads the code and proposes, but touches nothing.', 'If the plan works for you, you approve it and it runs; here we do not approve.'],
      painel: ['If M1 is below 50 % halfway: "Shift+Tab twice; look for plan mode on under the input box".'],
      falhas: [
        { falha: '"accept edits on" shows instead of plan mode', resposta: 'press Shift+Tab again' },
        { falha: 'Claude asks "Would you like to proceed?"', resposta: 'Esc: we do not want to run it' },
      ],
    },
  },
  {
    min: 2, bloco: 'Missions', fase: 'missions', tipo: 'missao', id: 'M2',
    titulo: 'The right model',
    conceito: 'Each model has a price: Haiku for the simple, Sonnet for the work, Opus to decide.',
    passos: ['Switch to Haiku and confirm with Enter', 'Ask a simple question', 'Go back to Sonnet'],
    comandos: [{ rotulo: 'In Claude Code', cmd: '/model haiku\nWhat does units.js do? One sentence.\n/model sonnet' }],
    esperado: 'Haiku’s answer, for a fraction of the cost',
    notas: {
      objetivo: 'Choose the model by the task, not by habit.',
      dizer: ['Haiku costs about 10 times less than Sonnet and is enough for simple questions.', 'In Project 1 you will choose the model of 30 agents: this is the same decision, in small.'],
      painel: ['If M2 lags behind M1: "/model haiku asks for a confirmation; press Enter".'],
      falhas: [{ falha: 'It keeps asking for confirmation', resposta: 'Enter on the selected option' }],
    },
  },
  {
    min: 2, bloco: 'Missions', fase: 'missions', tipo: 'missao', id: 'M3',
    titulo: 'A subagent',
    conceito: 'A subagent works in a clean context and returns only the summary.',
    passos: ['Hand the work to a subagent', 'Watch it work on the side', 'Get only the result back'],
    comandos: [{ rotulo: 'In Claude Code', cmd: 'Use an Explore subagent to list the functions in src/units.js that have no test.' }],
    esperado: 'A short list; your main session did not fill up with files',
    notas: {
      objetivo: 'Understand the building block of a swarm.',
      dizer: ['A swarm is this, multiplied: many subagents, each with its own context and task.', 'The main context stays clean, and that is cost too.'],
      painel: ['If M3 is below M2: "write the word subagent in the request".'],
      falhas: [{ falha: 'Claude answers without launching a subagent', resposta: 'ask explicitly: use an Explore subagent' }],
    },
  },
  {
    min: 1, bloco: 'Missions', fase: 'missions', tipo: 'conceito',
    titulo: 'Tool or skill?',
    intro: 'Two ways to give Claude more power. You will use both today:',
    blocos: [
      { titulo: 'Tool', texto: 'A function with typed inputs that Claude calls (Read, Bash, memory_add, the Pocketknife\'s). For: deterministic, testable, cheap in tokens. Against: needs code and a server.' },
      { titulo: 'Skill', texto: 'A Markdown recipe Claude follows (/demo-swarm, your /summary). For: written in minutes, flexible. Against: the model interprets it, costs tokens, can drift.' },
      { titulo: 'Together', texto: 'A skill can call tools: the recipe decides what, the tool does it exactly.' },
    ],
    notas: {
      objetivo: 'Tell tool from skill before M4 creates a skill and M11 uses a tool.',
      dizer: ['A tool is code: same input, same output, and almost free in tokens.', 'A skill is text: written in minutes, but the model interprets it and can drift.', 'The best skills call tools for the parts that must be exact.'],
      painel: ['No panel cue here: move on to M4 within 1 minute.'],
      falhas: [{ falha: 'Someone asks whether an MCP is a tool or a skill', resposta: 'an MCP server offers tools; a skill is just a Markdown file' }],
    },
  },
  {
    min: 2, bloco: 'Missions', fase: 'missions', tipo: 'missao', id: 'M4',
    titulo: 'Your skill',
    conceito: 'A skill is a named recipe, not a tool: a SKILL.md that Claude Code follows when you call it.',
    passos: ['Ask Claude to create the skill', 'Leave and come back to the same session', 'Use the skill by name'],
    comandos: [{ rotulo: 'In Claude Code', cmd: 'Create .claude/skills/summary/SKILL.md: summarise a file in 3 lines\n/exit\nclaude -c\n/summary src/units.js' }],
    esperado: 'A 3-line summary, made by your skill',
    notas: {
      objetivo: 'Show that a skill is just a file anyone can write.',
      dizer: ['The workshop skills (/demo-plan, /task-swarm…) are exactly this: Markdown with instructions.', 'claude -c resumes the previous conversation: nothing is lost when you leave.', 'Recall the last slide: the skill is the recipe in text, the tool is the function in code.'],
      painel: ['If M4 stays low: "the skill only shows after you leave and come back; /exit and claude -c".'],
      falhas: [{ falha: '/summary does not exist', resposta: 'check the file .claude/skills/summary/SKILL.md and reopen with claude -c' }],
    },
  },
  {
    min: 2, bloco: 'Missions', fase: 'missions', tipo: 'missao', id: 'M5',
    titulo: 'Your hook',
    conceito: 'A hook is a command Claude Code runs on an event.',
    passos: ['Ask Claude for the hook', 'Ask for any edit', 'Open edits.log'],
    comandos: [{ rotulo: 'In Claude Code', cmd: 'Add a PostToolUse hook (Edit|Write) in .claude/settings.local.json that appends the time and the file to edits.log.\nAdd a comment at the top of README.md.' }],
    esperado: 'A new line in edits.log on every edit. Broke something? Esc Esc goes back',
    notas: {
      objetivo: 'Understand that hooks automate without asking the model.',
      dizer: ['This is how the kit measures cost: a hook at the end of each subagent.', 'settings.local.json is only yours and does not go to git.', 'Esc Esc opens rewind: you go back to before the edit.'],
      painel: ['If M5 is below 50 %: "half the room has no hook yet; whoever has one, help your neighbour".'],
      falhas: [
        { falha: 'edits.log does not show up', resposta: 'the hook only runs on the next edit: ask for another one' },
        { falha: 'The hook went into the kit’s settings.json', resposta: 'ask to move it to .claude/settings.local.json' },
      ],
    },
  },
  {
    min: 2, bloco: 'Missions', fase: 'missions', tipo: 'missao', id: 'M6',
    titulo: 'Until it is green',
    conceito: '/loop repeats a request on its own, until the condition is true.',
    passos: ['Start the loop', 'Let it work: do not type anything', 'It stops when everything is green'],
    comandos: [{ rotulo: 'In Claude Code', cmd: '/loop 1m run npm test and fix the first red test; when everything is green, stop the loop' }],
    esperado: 'The 2 red tests turn green and the loop stops',
    notas: {
      objetivo: 'See Claude work on its own with a stop condition.',
      dizer: ['The project ships with 2 tests broken on purpose.', 'A loop with no stop condition burns money: always say when to stop.'],
      painel: ['If M6 goes up slowly: "the loop runs every minute; while you wait, do a bonus one".'],
      falhas: [{ falha: 'The loop does not stop', resposta: 'Esc and say: stop the loop' }],
    },
  },
  {
    min: 1, bloco: 'Missions', fase: 'missions', tipo: 'painel',
    titulo: 'What the room is missing (and the bonus M7 to M10)',
    pergunta: 'Which mission did the fewest people do?',
    apoio: 'The bonus ones are for the waits in the projects:',
    comandos: [{ rotulo: 'Bonus', cmd: 'M7  /btw what is a subagent?   (a tip, not checked)\nM8  /statusline show the model and the branch\nM9  claude -p "Summarise the README" --model haiku > summary.txt\nM10 /memory save a lesson about the converter' }],
    notas: {
      objetivo: 'Close the guided missions and point the bonus ones at the waits.',
      dizer: ['The mission blinking on the panel is the least done: that is the one worth helping with now.', 'The bonus ones get no stage time: you do them while the swarms work.'],
      painel: ['Read the blinking mission out loud and ask whoever has it to show their neighbour.', 'If the average coverage passes 70 %: "this room is faster than the rehearsal".'],
      falhas: [],
    },
  },

  // ---------------- Project 1 (26–50)
  {
    min: 2, bloco: 'Project 1', fase: 'p1', tipo: 'painel',
    titulo: 'What we will build: the Pocketknife',
    pergunta: 'How many minutes do 8 agents take to build 30 tools?',
    apoio: '30 everyday tools, each made by an agent with its own test, plus yours.',
    comandos: [{ rotulo: 'Terminal 2 · Pocketknife', cmd: POCKETKNIFE }],
    notas: {
      objetivo: 'Introduce the Pocketknife and plant the forecast.',
      dizer: ['Count words, split the bill, convert colours: 30 tools people really use.', 'Each one is an agent and a test; you decide how many agents, which model and a tool of your own.'],
      painel: ['Still empty: "by the end of this block this chart shows the time and cost of every swarm in the room".'],
      falhas: [{ falha: 'The canivete-project folder does not exist', resposta: '--check sets it up in step 9' }],
    },
  },
  {
    min: 4, bloco: 'Project 1', fase: 'p1', tipo: 'faca',
    titulo: 'Invent your tool',
    passos: ['Copy the example', 'Change the title, concept, template and examples', 'Generate the spec and the test'],
    comandos: [
      { rotulo: 'Mac', cmd: 'cp specs/my-tool.example.json specs/my-tool.json\nnode tools/gen.mjs' },
      { rotulo: 'Windows', cmd: 'Copy-Item specs\\my-tool.example.json specs\\my-tool.json\nnode tools/gen.mjs' },
    ],
    esperado: 'Your tool my-01, with spec and test, ready for the swarm',
    painel: 'Look at the panel: tools invented by the room',
    notas: {
      objetivo: 'Give each person a tool that is only theirs.',
      dizer: ['There are 4 templates: calc, convert, text and generate; the agent only writes the run() function.', 'gen.mjs tells you which field is wrong and gives an example.'],
      painel: ['Read the most chosen templates: "the room likes calc; who made a generate one?".'],
      falhas: [
        { falha: 'gen.mjs refuses my-tool.json', resposta: 'read the message: it names the field and gives an example' },
        { falha: 'No ideas', resposta: 'use the example as it is: it works' },
      ],
    },
  },
  {
    min: 2, bloco: 'Project 1', fase: 'p1', tipo: 'decide',
    titulo: 'How many agents, and which model?',
    pergunta: 'Choose the parallelism (and the model of the tools):',
    opcoes: [
      { titulo: '4 agents', efeito: 'Slower; the main session coordinates little', cmd: '--parallel 4' },
      { titulo: '8 agents', efeito: 'The middle ground, the default', cmd: '--parallel 8' },
      { titulo: '12 agents', efeito: 'Faster, but the cost does not go down', cmd: '--parallel 12' },
    ],
    rodape: 'Model: --model haiku (the default, cheap) or --model sonnet (dearer, about the same greens)',
    notas: {
      objetivo: 'Get the room to split, so the comparison on the panel is rich.',
      dizer: ['Suggestion: front rows 4, middle 8, back 12.', 'More agents finish sooner, but the main session coordinates more: the cost does not go down.'],
      painel: ['No points yet: "in 10 minutes we will see who was right".'],
      falhas: [],
    },
  },
  {
    min: 1, bloco: 'Project 1', fase: 'p1', tipo: 'faca',
    titulo: 'Plan',
    passos: ['Run the plan with your decision', 'Answer the minutes forecast', 'Read the waves and the cost estimate'],
    comandos: [{ rotulo: 'Terminal 2 · Claude Code', cmd: '/demo-plan --parallel 8 --model haiku' }],
    preve: { pergunta: 'How many minutes will your swarm take?', onde: '/demo-plan asks; you may skip it' },
    esperado: 'PLAN.md with 4 waves and the cost estimate',
    notas: {
      objetivo: 'Record the decision and the forecast before seeing the result.',
      dizer: ['The graph is deterministic: it comes from the specs, not from the model.', 'The forecast only goes to the panel, to compare with the real time.'],
      painel: ['If the forecast median shows: "the room thinks X minutes; let us see".'],
      falhas: [{ falha: 'ERROR: plan not found later', resposta: 'run /demo-plan first, in the canivete-project folder' }],
    },
  },
  {
    min: 7, bloco: 'Project 1', fase: 'p1', tipo: 'faca',
    titulo: 'Release the swarm',
    passos: ['Start the swarm', 'In another terminal, open /status', 'While you wait: a bonus mission'],
    comandos: [
      { rotulo: 'Terminal 2 · Claude Code', cmd: '/demo-swarm' },
      { rotulo: 'Another terminal · /status', cmd: 'cd ~/workshop-claude/canivete-project\nnode server.js\nhttp://localhost:3000/status' },
    ],
    esperado: 'The grid fills with greens; 2 or 3 tools stay red',
    painel: 'Look at the panel: each dot is a finished swarm',
    notas: {
      objetivo: 'See a swarm work, and the effect of the room’s decisions.',
      dizer: ['Each square is a tool: yellow working, green passed, red failed.', 'The reds are the next slide: it is not bad luck.'],
      painel: ['At 4 min, when the dots show: "the 12s finished first; see whether they spent less".', 'If the real median is far from the forecast: "we said X, it took Y; who got it right?".'],
      falhas: [
        { falha: 'Port 3000 is busy', resposta: 'server.js uses the next one and says which' },
        { falha: 'It asks for a permission halfway', resposta: 'the project must be trusted: the setup does it; accept and carry on' },
        { falha: 'The swarm stopped', resposta: 'run /demo-swarm again: it resumes where it was' },
      ],
    },
  },
  {
    min: 4, bloco: 'Project 1', fase: 'p1', tipo: 'faca',
    titulo: 'Why did this tool fail?',
    passos: ['Read the red test’s message', 'Decide the rule the spec does not give', 'Write it in the spec and retry only that one'],
    comandos: [
      { rotulo: 'In Claude Code', cmd: 'Why did nm-03 fail?' },
      { rotulo: 'In your editor, then', cmd: 'tools/nm-03/spec.md   (add the rule)\n/demo-swarm --retry nm-03' },
    ],
    esperado: 'The red one turns green on the second try',
    notas: {
      objetivo: 'Understand that what the spec does not decide, the agent guesses.',
      dizer: ['The 3 broken on purpose (nm-03, dn-01, tx-02) leave out a rule; the agent picks the "obvious" answer, and it is the wrong one.', 'The message says what the tool returned and what the spec does not decide, never the right value: you decide.', 'No agent may change a spec: that is your job.'],
      painel: ['If "specs fixed" is still 0 at 2 min: "open the red one’s spec.md and write one line with the rule".'],
      falhas: [
        { falha: 'It goes red again', resposta: 'the rule is ambiguous: write an example with the value' },
        { falha: 'Does not know the rule', resposta: 'think like the person who asked for the tool: what is right for an accountant?' },
      ],
    },
  },
  {
    min: 2, bloco: 'Project 1', fase: 'p1', tipo: 'faca',
    titulo: 'Gate and cost: which decision won?',
    passos: ['Run the review', 'Run the cost', 'Compare with your forecast and with the panel'],
    comandos: [{ rotulo: 'Terminal 2 · Claude Code', cmd: '/demo-review\n/demo-cost' }],
    esperado: 'GATE: APPROVED and the cost per green tool',
    painel: 'Look at the panel: cost per green, by parallelism and model',
    notas: {
      objetivo: 'Close the loop: quality and cost, measured.',
      dizer: ['The reviewer is Opus: it reads a summary, not the whole tree, and says APPROVED or REJECTED.', 'The cost comes from the real tokens and the published prices.'],
      painel: ['Read the cost per green for 4, 8 and 12: "more agents did not get cheaper".', 'If there are Sonnet swarms: "Sonnet cost more and gave hardly any more greens".'],
      falhas: [{ falha: 'GATE: REJECTED', resposta: 'read the reservations; usually it is a red one still to fix' }],
    },
  },
  {
    min: 2, bloco: 'Project 1', fase: 'p1', tipo: 'missao', id: 'M11',
    titulo: 'Your tool, used by Claude',
    conceito: 'The tools the swarm built are Claude tools too: call them by name.',
    passos: ['Open Claude Code in the Pocketknife', 'Ask Claude to use your tool', 'See the tool call'],
    comandos: [
      { rotulo: 'In Claude Code', cmd: 'Use the my-01 tool with an example of your own.' },
      { rotulo: 'Optional · in the browser', cmd: 'http://localhost:3000' },
    ],
    esperado: 'Claude calls mcp__canivete__my-01 and answers with your tool\'s result',
    notas: {
      objetivo: 'Close the tool-or-skill idea: what the swarm built, Claude calls as a tool.',
      dizer: ['This is a tool: code with typed inputs, called by name, with no recipe to read.', 'Same tool, two ways to use it: the page in the browser and Claude.'],
      painel: ['If M11 stays low: "Claude Code must be open in the Pocketknife folder; /mcp shows whether the canivete server is connected".'],
      falhas: [
        { falha: 'Claude cannot find the tool', resposta: '/mcp: the canivete server must be connected. Plan B: /exit and claude -c, then ask again (a new session reads every tool)' },
        { falha: 'It answers without calling the tool (it reads tool.js with cat)', resposta: 'ask by name: use the my-01 tool; if it still does, /exit and claude -c' },
      ],
    },
  },

  // ---------------- Project 2 (50–87)
  {
    min: 2, bloco: 'Project 2', fase: 'p2', tipo: 'painel',
    titulo: 'The same cycle, in another repository',
    pergunta: 'What changes when the task is real?',
    apoio: 'intake → plan → swarm → gate → report → memory: the same orchestration, now with the /task-* skills.',
    comandos: [
      { rotulo: 'Terminal 3 · practice project', cmd: PRACTICE },
      { rotulo: 'Optional · stop sending to the panel', cmd: 'cd "$HOME/.workshop-claude/kit/telemetry"\nnode ctl.mjs unregister' },
    ],
    notas: {
      objetivo: 'Connect Project 2 to what they already did.',
      dizer: ['The plan is /demo-plan, the swarm is /demo-swarm, the gate is /demo-review: the difference is that the task comes from an issue.', 'The default path is the Municipal Library, with no login; whoever has Jira or GitHub working can use their own issue.'],
      painel: ['The funnel is empty: "in 30 minutes we want the whole room at the end".', 'Whoever will work in their own repository and prefers that nothing leaves the laptop: "unregister stops the sending; your mission book stays, and register --again turns it back on".'],
      falhas: [],
    },
  },
  {
    min: 4, bloco: 'Project 2', fase: 'p2', tipo: 'faca',
    titulo: 'Read the issue',
    passos: ['In the practice project, open Claude Code', 'Read issue EX-1 (it is a JSON file, no login)', 'Have Jira or GitHub? Use one of yours'],
    comandos: [
      { rotulo: 'Terminal 3 · Claude Code', cmd: '/task-intake issues/EX-1.json' },
      { rotulo: 'Optional · your repository', cmd: '/task-intake ABC-123' },
    ],
    esperado: '.workshop/task.md with the issue, the criteria and what the memory already knows',
    notas: {
      objetivo: 'Get everyone a task that has been read.',
      dizer: ['EX-1 is small: validate the ISBN and the email when creating books and readers.', 'The intake only reads: it writes nothing to Jira or GitHub.'],
      painel: ['If the funnel is still at "intake" at 3 min: "check you are in the practice-project folder".'],
      falhas: [{ falha: 'Issue not found', resposta: 'run it in the practice-project folder: the path is issues/EX-1.json' }],
    },
  },
  {
    min: 6, bloco: 'Project 2', fase: 'p2', tipo: 'decide',
    titulo: 'How many agents?',
    pergunta: '/task-plan proposes a number and says why. Decide:',
    opcoes: [
      { titulo: 'Approve', efeito: 'Go with the plan as it is', cmd: 'yes' },
      { titulo: 'Fewer agents', efeito: 'Cheaper, slower; fewer conflicts', cmd: 'fewer agents' },
      { titulo: 'More agents', efeito: 'Faster, only if the tasks do not touch the same files', cmd: 'more agents' },
    ],
    rodape: 'First run /task-plan and read why it chose that number.',
    painel: 'Look at the panel: how many agents the room chose',
    notas: {
      objetivo: 'Decide on the why, not on the number.',
      dizer: ['The planner reads the issue and the code and proposes subtasks: tasks that touch the same files go in different batches.', 'Adjusting is normal: the plan is a proposal.'],
      painel: ['Read the histogram: "most have 2 or 3; whoever adjusted, why?".'],
      falhas: [{ falha: 'PLAN INVALID', resposta: 'ask the planner to fix it: the message says what is missing' }],
    },
  },
  {
    min: 12, bloco: 'Project 2', fase: 'p2', tipo: 'faca',
    titulo: 'Put the swarm to work',
    passos: ['Start the swarm', 'In another terminal, open the dashboard', 'While you wait: the bonus missions you are missing'],
    comandos: [
      { rotulo: 'Terminal 3 · Claude Code', cmd: '/task-swarm' },
      { rotulo: 'Another terminal · in the project folder', cmd: 'node "$HOME/.workshop-claude/kit/orchestrator/dashboard.mjs"' },
    ],
    esperado: 'The subtasks green; the state stays in .workshop/',
    painel: 'Look at the panel: the funnel moves on',
    notas: {
      objetivo: 'See the swarm on a real task, with resume.',
      dizer: ['Esc interrupts; /task-swarm again resumes where it was.', 'If the planner chose worktrees, each agent works in its own copy of the repository.'],
      painel: ['Halfway, read the funnel: "half are already at the gate; whoever is still in the swarm, let it run".'],
      falhas: [
        { falha: 'A subtask fails 3 times', resposta: 'read the reason on the dashboard; fix the description and run --retry' },
        { falha: 'The dashboard shows nothing', resposta: 'it has to run in the project folder' },
      ],
    },
  },
  {
    min: 5, bloco: 'Project 2', fase: 'p2', tipo: 'faca',
    titulo: 'The gate',
    passos: ['Run the gate', 'Read the verdict and the reservations', 'Fix what it asks for, if it asks'],
    comandos: [{ rotulo: 'Terminal 3 · Claude Code', cmd: '/task-gate' }],
    esperado: 'GATE: APPROVED, with tests, secrets and dangerous code checked',
    notas: {
      objetivo: 'Deliver nothing without verification.',
      dizer: ['The gate runs the tests, looks for secrets and dangerous code, and asks Opus for the verdict.', 'A REJECTED is not a failure: it is the gate doing its job.'],
      painel: ['If approved gates stay low: "read the reservations; it is almost always a test still to run".'],
      falhas: [{ falha: 'GATE: REJECTED', resposta: 'fix what the reservations say and run /task-gate again' }],
    },
  },
  {
    min: 4, bloco: 'Project 2', fase: 'p2', tipo: 'faca',
    titulo: 'The report and the memory',
    passos: ['Write the report', 'Save the lesson in the memory', 'In your repository: confirm before each write'],
    comandos: [{ rotulo: 'Terminal 3 · Claude Code', cmd: '/task-report\n/memory save the lesson from EX-1' }],
    esperado: 'report.md in the practice project and a new memory',
    notas: {
      objetivo: 'Close the task and keep what was learned.',
      dizer: ['In the practice project the report goes to report.md; in Jira or GitHub, /task-report only writes after your yes.', 'The memory stays on your laptop and the next /task-intake reads it.'],
      painel: ['When the funnel reaches "report": "whoever closed it, move on to EX-3".'],
      falhas: [{ falha: 'MEMORY UNAVAILABLE', resposta: 'the Agent Memory app is not installed: the rest works; --check shows step 10' }],
    },
  },
  {
    min: 4, bloco: 'Project 2', fase: 'p2', tipo: 'faca',
    titulo: 'Now on your own: EX-3',
    passos: ['Repeat the cycle on EX-3, with no slides', 'intake → plan → swarm → gate → report', 'Still on EX-1? Carry on with it'],
    comandos: [{ rotulo: 'Terminal 3 · Claude Code', cmd: '/task-intake issues/EX-3.json\n/task-plan\n/task-swarm\n/task-gate\n/task-report' }],
    esperado: 'EX-3 closed: a reader can no longer see another reader’s loans',
    notas: {
      objetivo: 'Run the cycle without help.',
      dizer: ['EX-3 is a small security flaw (IDOR), with an authorisation test already written.', 'It is the final test of the workshop: if you can do it alone, you can do it tomorrow in your repository.'],
      painel: ['Read the closed issues: "N EX-3s closed already".'],
      falhas: [{ falha: 'EX-1 is not finished', resposta: 'carry on with EX-1: EX-3 is optional' }],
    },
  },

  // ---------------- Closing (87–90)
  {
    min: 2, bloco: 'Closing', fase: 'closing', tipo: 'painel',
    titulo: 'The day in numbers, and 3 ideas to take home',
    pergunta: 'What would you do differently tomorrow?',
    ideias: [
      'What the spec does not decide, the agent guesses',
      'More agents is not cheaper: decide the parallelism',
      'Haiku for the simple, and always measure the cost',
    ],
    notas: {
      objetivo: 'Close with the room’s numbers and 3 concrete ideas.',
      dizer: ['The 3 numbers on the panel are "do better" ones: cost per green, greens at the first try, % on Haiku.', 'Everything you installed keeps working tomorrow: start with the next issue assigned to you, with /task-intake.'],
      painel: ['Read the average cost per person against the US$ 5 target.', 'Read the % of greens at the first try: "this is what a good spec buys".'],
      falhas: [],
    },
  },
  {
    min: 1, bloco: 'Closing', fase: 'closing', tipo: 'perguntas',
    titulo: 'Questions',
    subtitulo: 'No time limit',
    rodape: '{{WORKSHOP_REPO}}',
    notas: {
      objetivo: 'Open the questions.',
      dizer: ['Questions can go past 90 minutes. Anyone who did not run the setup installs now.', 'The panel deletes everything at midnight; your mission book and your memories stay on your laptop.'],
      painel: ['If there is time: show the final leaderboard.'],
      falhas: [],
    },
  },
];
