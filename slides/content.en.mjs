// Presentation content (English). build.mjs turns this into workshop.en.pptx and speaker-notes.en.md.
// Same shape and slide order as content.mjs (pt-PT): change a slide there = change the same slide here.
// {{...}} are replaced from repos.conf, pricing.json and slides/dados.json (see build.mjs).
// Every Project 1 number (cost, times, agents, estimate) comes from dados.json (P1_*, ESTIMATIVA):
// one reference run. The swarm video is a different run (presenter mode) and uses the APRES_* keys.
// min = minutes for the slide; saltar = can be skipped if running late.

export const SECCOES = ['Opening', 'Install', 'Concepts', 'Preview', 'Project 1', 'Memory', 'Project 2', 'Closing'];

export const SLIDES = [
  // ---------------- Opening (0–4)
  {
    seccao: 'Opening', tipo: 'titulo', min: 1,
    titulo: 'Agent orchestration with Claude',
    subtitulo: 'Skills, subagents and parallel swarms, with measured cost',
    notas: 'Welcome. In 90 minutes we will put a swarm of agents to work building a game and then working on a real task, in a repository with tests.',
  },
  {
    seccao: 'Opening', tipo: 'colunas', min: 1.5,
    titulo: "You'll leave the workshop with this",
    colunas: [
      { icone: 'network', titulo: 'A swarm', texto: 'that builds a security game with 100 challenges, up to {{P1_PARALELO}} agents in parallel' },
      { icone: 'clipboard-check', titulo: 'A task', texto: 'in a real repository, broken down and running: the practice one or your own' },
      { icone: 'share-2', titulo: 'A memory', texto: 'a graph of what you learned, ready to use tomorrow' },
    ],
    notas: 'Three concrete outcomes. Everything stays installed on each laptop and keeps working after today.',
  },
  {
    seccao: 'Opening', tipo: 'stats', min: 1.5,
    titulo: 'Ground rules on cost',
    stats: [
      { valor: 'US$ 5', rotulo: 'target per person, for everything you do today' },
      { valor: 'US$ 10', rotulo: 'safety cap, never the goal' },
      { valor: '0', rotulo: 'sessions stopped because of cost' },
    ],
    rodape: 'Project 1, in one real end-to-end run: {{P1_CUSTO}}, {{P1_AGENTES}} agents, swarm in {{P1_SWARM}}, session in {{P1_SESSAO}}.',
    notas: 'The budget is backed by the benchmark, not by cuts. If someone goes over the target, a warning shows up and they keep working. The footer numbers come from the Project 1 reference run ({{P1_PARALELO}} agents in parallel, as on everyone\'s laptop): they are the same numbers used in the rest of the deck.',
  },

  // ---------------- Install (4–10.5)
  {
    seccao: 'Install', tipo: 'faca', min: 1.5,
    titulo: 'Install the kit',
    aviso: "The commands are in Teams: copy them from there.",
    passos: ['Already installed? Go to the next slide', 'Copy the command for your system', 'Paste it into a terminal and answer the questions'],
    comandos: [
      { rotulo: 'Mac (Terminal)', cmd: '{{ONE_LINER_MAC}}' },
      { rotulo: 'Windows (PowerShell)', cmd: '{{ONE_LINER_WIN}}' },
    ],
    esperado: 'The setup summary table, with every step done',
    notas: 'Almost everyone installed beforehand (pre-work): for them this slide only shows where the command is. Anyone who has not installed yet runs it now and follows along with a neighbour while it installs (10 to 20 minutes). The same command installs on another machine. The commands are generated from repos.conf: they are always right for the published version ({{WORKSHOP_VERSION}}). To update only the Agent Memory app: agent-memory update. Before this slide, post the commands in Teams so everyone can copy them.',
  },
  {
    seccao: 'Install', tipo: 'faca', min: 3,
    titulo: 'Check your installation',
    aviso: "The commands are in Teams: copy them from there.",
    passos: ['Open a terminal', 'Run the command for your system', 'Wait for the summary table'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{CHECK_MAC}}' },
      { rotulo: 'Windows', cmd: '{{CHECK_WIN}}' },
    ],
    esperado: '"Check complete: everything is ready for the workshop."',
    notas: 'Everyone runs the check. It takes 2 to 3 minutes and installs nothing. Anyone who did not run the setup follows along with a neighbour and installs during the questions. The setup speaks English, but it detects the machine language and writes the Claude Code language setting (Portuguese, English, Hindi or Hebrew): the skills answer in that language. The Arena, the orchestrator tables and the docs come in Portuguese or English (any other language gets English). Before this slide, post the commands in Teams so everyone can copy them.',
  },
  {
    seccao: 'Install', tipo: 'faca', min: 2,
    titulo: 'Did a step fail?',
    aviso: "The commands are in Teams: copy them from there.",
    passos: ['Run doctor mode', "Read Claude's diagnosis (under US$ 0.01)", 'Follow the steps and run the install command again'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{DOCTOR_MAC}}' },
      { rotulo: 'Windows', cmd: '{{DOCTOR_WIN}}' },
    ],
    esperado: 'What failed, why and how to fix it; the install only repeats what is missing',
    notas: 'Doctor checks everything and, if a step failed, asks Claude for a diagnosis: it sends the state of each step and the end of the log, with no secrets. It runs nothing. Running the install command again only repeats the missing steps; there, on each failure, Claude suggests commands and runs them only after you confirm, one by one. If Claude is not installed yet, the pre-written help from TROUBLESHOOTING is shown. Before this slide, post the commands in Teams so everyone can copy them.',
  },

  // ---------------- Concepts (10.5–18)
  { seccao: 'Concepts', tipo: 'seccao', min: 0.5, titulo: 'Concepts', subtitulo: 'Skills, agents and money', notas: 'Seven minutes of ideas, one concept per slide. The task graph and cost measurement come later, in Project 1, right where they are used.' },
  {
    seccao: 'Concepts', tipo: 'colunas', min: 1.5,
    titulo: 'Claude Code works in your project',
    colunas: [
      { icone: 'file-pen-line', titulo: 'Reads and writes', texto: 'project files, with permissions you control' },
      { icone: 'square-terminal', titulo: 'Runs commands', texto: 'tests, git, scripts: it reads the output and fixes what fails' },
      { icone: 'plug', titulo: 'Connects to tools', texto: 'Jira and your memory via MCP; GitHub with gh' },
    ],
    notas: 'Claude Code is not a chat: it is an agent that acts on the repository. Everything it does goes through permissions. Plan mode (Shift+Tab) makes it only plan, without touching anything.',
  },
  {
    seccao: 'Concepts', tipo: 'codigo', min: 1.5,
    titulo: 'A skill is a recipe with a name',
    intro: 'A SKILL.md file in a folder. You type /name and Claude follows the recipe.',
    codigo: `---
name: demo-swarm
description: Runs the Arena swarm in waves
model: sonnet
allowed-tools: Bash(node tools/*), Agent
---
1. Run next-wave.mjs
2. Launch exactly the calls it returns
3. Repeat until STATE: DONE
Answer in the participant's language.`,
    depois: '.claude/skills/ in the project · ~/.claude/skills/ for every project · written in English, they answer in your language',
    notas: 'Skills replaced the old slash commands. The frontmatter pins the model and the allowed tools. Today we use two sets: /demo-* in the Arena and /task-* for everyday work. The kit skills are in English and tell Claude to answer in the participant\'s language.',
  },
  {
    seccao: 'Concepts', tipo: 'modelos', min: 1.5,
    titulo: 'Subagents: their own context and model',
    modelos: [
      { nome: 'Opus', papel: 'planning and review', icone: 'brain', preco: 'US$ 4 / 20' },
      { nome: 'Sonnet', papel: 'integration and hard logic', icone: 'puzzle', preco: 'US$ 2 / 10' },
      { nome: 'Haiku', papel: 'the bulk of the swarm', icone: 'feather', preco: 'US$ 0.10 / 0.50' },
    ],
    rodape: 'Price per million tokens: input / output.\nSource: {{PRICING_URL}} ({{PRICING_DATA}})',
    notas: 'A subagent is a Claude instance with a clean context, its own tools and the model we choose. It is defined in a .claude/agents/<name>.md file. The /agents command no longer opens a wizard: you edit the file.',
  },
  {
    seccao: 'Concepts', tipo: 'stats', min: 1.5,
    titulo: 'The cost rule of thumb',
    stats: [
      { valor: '20×', rotulo: 'Haiku is 20 times cheaper than Sonnet' },
      { valor: '{{CUSTO_CARTAO}}', rotulo: 'average cost of one small task done by a Haiku agent' },
      { valor: '{{PESO_ORQ}}', rotulo: 'of the cost goes to the main session, not to the swarm' },
    ],
    rodape: 'As much as possible on Haiku. Sonnet only where Haiku fails. Opus only to think and review.',
    notas: 'A cheap swarm is many small agents with clear instructions. What costs money is coordination. That is why the orchestrator is a script and the workers answer with one line. Both numbers come from the Project 1 reference run.',
  },
  {
    seccao: 'Concepts', tipo: 'fluxo', min: 1,
    titulo: 'The cycle of every task',
    passos: [
      { titulo: 'plan', texto: 'the task becomes a graph, reviewed by Opus' },
      { titulo: 'swarm', texto: 'Haiku agents build the pieces in parallel' },
      { titulo: 'review', texto: 'Opus checks the tests and the security' },
      { titulo: 'cost', texto: 'what it cost, per agent and per model' },
      { titulo: 'memory', texto: 'the lessons stay for next time' },
    ],
    notas: 'It is the same cycle in both projects: plan with Opus, run as a swarm, a security gate, measure and save what was learned. Each step shows up again in Project 1, where it is used.',
  },

  // ---------------- Preview (18–23)
  {
    seccao: 'Preview', tipo: 'apresenta', min: 1,
    titulo: 'What we will build: the Security Arena',
    media: 'media/arena-cartao.en.png',
    legendaImagem: 'One challenge of the game: click the line that exposes the secret and confirm.',
    pontos: [
      { icone: 'gamepad-2', titulo: 'A mini-game, ready to play', texto: 'Short security challenges, in the browser, across 10 categories: passwords, phishing, web, networks, cryptography and more.' },
      { icone: 'layers', titulo: 'Each task builds a challenge', texto: 'In 4 formats: point at the insecure line, pick the answer, put the steps in order or type the answer.' },
      { icone: 'bot', titulo: 'One agent per task', texto: 'Each agent does one task, and that task\'s test says whether it is right. In the video and on your laptop: the same 100.' },
    ],
    estados: true,
    notas: 'Before the video, say what is going to be built. The Arena is a security mini-game: each task builds a small challenge (find the line that exposes a secret, pick the real website, order the parts of a URL, type an answer). The app shell and the tests already exist; the agents write the challenges, one task each. Explain the colours now, because they show up everywhere: each square is a task, grey while it waits, yellow while an agent works on it, green when its test passes, red when it fails.',
  },
  {
    seccao: 'Preview', tipo: 'seccao', min: 0.5,
    titulo: 'The swarm in action',
    subtitulo: 'The Arena with 100 tasks, built by agents in parallel. Then you build the same one.',
    notas: 'Bridge into Project 1. What they are about to see is the cycle from the concepts (plan → swarm → review → cost → memory) in a real run with 100 tasks. Right after, each person builds the same Arena, with up to {{P1_PARALELO}} agents in parallel.',
  },
  {
    seccao: 'Preview', tipo: 'video', objeto: 'video-swarm', min: 2.5, estados: true,
    titulo: 'The swarm building the Arena',
    media: 'media/enxame-acelerado.en.mp4',
    poster: 'media/estado-final.en.png',
    legenda: 'A different run, in presenter mode ({{APRES_PARALELO}} agents in parallel): {{APRES_DURACAO}} · {{APRES_CUSTO}} · {{APRES_AGENTES}} agents',
    notas: 'Sped-up video of a real run with 100 tasks, recorded in presenter mode: {{APRES_PARALELO}} agents in parallel, so the footer numbers are not the Project 1 ones (on each laptop, {{P1_PARALELO}} run in parallel; see the cost slide). On the left, the /status page: each square is a task, yellow while an agent works on it and green when its test passes. On the right, the terminal with the agent batches. Plan B if the video fails: open /status?replay=recording in the recorded Arena.',
  },
  {
    seccao: 'Preview', tipo: 'video', min: 1,
    titulo: 'The result: the game, ready to use',
    media: 'media/arena-jogo.en.mp4',
    poster: 'media/arena-jogo.en.png',
    objeto: 'video-game',
    legenda: 'The Arena the swarm built: security challenges in 4 formats, to play in the browser.',
    notas: 'Recording of someone playing the final Arena: point at the insecure line, pick the right answer, order the steps and type the answer. Each challenge explains the why at the end. At the end of Project 1 everyone plays their own.',
  },

  // ---------------- Project 1 (23–60)
  { seccao: 'Project 1', tipo: 'seccao', min: 0.5, titulo: 'Project 1', subtitulo: 'The Security Arena', notas: '37 minutes of hands-on. In the reference run, the 100-task swarm took {{P1_SWARM}} (the full session, {{P1_SESSAO}}); in interactive mode and with new accounts it can take longer. The slides between "Release the swarm" and "Why did this card fail?" (9 minutes) cover that wait: they are all done while the swarm works.' },
  {
    seccao: 'Project 1', tipo: 'colunas', min: 1,
    titulo: 'What we will do in this project today',
    colunas: [
      { titulo: 'Ready', texto: 'the app shell, 4 challenge formats and one test for each task', cor: 'verde' },
      { titulo: 'To do', texto: '100 challenges plus yours, lib-hash, 2 pages, integration and review', cor: 'cinza' },
      { titulo: 'Who does it', texto: 'your swarm: Haiku, Sonnet and Opus', cor: 'amarelo' },
    ],
    notas: 'The tests already exist: each agent only has to turn its test green. That is what lets Haiku do the bulk of the work safely. That is 105 tasks; with each person\'s own card, 106.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 5,
    titulo: 'Write your card',
    intro: 'Before planning, add a challenge of your own to the 100: the swarm builds it too.',
    passos: ['Copy the example to specs/my-card.json', 'In your editor, change title, concept, prompt and template: spot-the-flaw, choice, order or answer', 'Generate the card files'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: 'cd ~/workshop-claude/demo-project\ncp specs/my-card.example.json specs/my-card.json\n# edit specs/my-card.json, then:\nnode tools/gen.mjs' },
    ],
    esperado: 'After the swarm: card my-01 in the gallery and on /status (101 cards), built by a Haiku agent',
    notas: 'The example already has every field: just change the text. The template picks the format: spot-the-flaw (point at the insecure line), choice (pick the answer), order (put the steps in order) or answer (type the answer); each one has its own fields, and the example shows them. gen.mjs writes the card spec and test (cards/my-01/), and /demo-plan adds it to the other tasks: that makes 101 cards. Anyone who would rather not write one skips this step and keeps 100. On Windows, cp works in PowerShell.',
  },
  {
    seccao: 'Project 1', tipo: 'anatomia', min: 1.5,
    titulo: 'What /demo-plan does',
    rotulo: '.claude/skills/demo-plan/SKILL.md (summary)',
    codigo: '---\nname: demo-plan\nmodel: sonnet\nallowed-tools: Read, Agent,\n  node tools/*, memory_search\n---\n1. Look up lessons in the memory\n2. node tools/plan.mjs → the graph\n3. The planner (Opus) reviews it\n4. Show waves, diagram and cost',
    pontos: [
      { icone: 'scroll-text', titulo: 'It is a skill', texto: 'A Markdown file with steps: you type /demo-plan and Claude follows the recipe.' },
      { icone: 'workflow', titulo: 'What goes in and out', texto: 'In: the Arena specs. Out: plan.json and PLAN.md, with the graph and the estimate.' },
      { icone: 'folder-git-2', titulo: 'In your project', texto: '/task-plan does the same for a Jira or GitHub issue.' },
    ],
    notas: 'Explain before running it. A skill is not magic: it is a Markdown recipe that Claude follows. Here it calls a script that builds the graph (always the same, from the tasks, your card included) and an Opus agent that only reviews it. The result is in files they can open and read (PLAN.md has the waves, the dependencies and the estimate).',
  },
  {
    seccao: 'Project 1', tipo: 'dag', min: 1.5,
    titulo: 'Task → graph → waves',
    notas: 'The plan is a dependency graph. We run it in waves: everything that is ready runs in parallel. In wave 1, lib-hash and the challenges start together; the three cryptography tasks wait for lib-hash (a real dependency inside wave 1) and join as soon as it turns green. This is what /demo-plan draws on the next slide.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 3,
    titulo: 'Plan the swarm',
    passos: ['In the Arena folder, open Claude Code', 'Pick "Yes, I trust this folder" (↓ then Enter: the preselected option exits)', 'Run /demo-plan'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: 'cd ~/workshop-claude/demo-project\nclaude\n/demo-plan' },
      { rotulo: 'Optional: you pick the cryptography model', cmd: '/demo-plan --crypto haiku\n/demo-plan --crypto sonnet' },
    ],
    esperado: 'A Mermaid diagram, 4 waves and an estimate close to {{ESTIMATIVA}}',
    notas: 'The trust dialog matters: without it, the project permissions stay off. In recent Claude Code versions, because the Arena pre-approves permissions, the preselected option is "No, exit": pressing Enter quits. Show the down arrow. /demo-plan checks the memory, builds the graph and asks the planner (Opus) to review it. Then show someone\'s plan on the projector. Optional cost decision: with --crypto haiku or --crypto sonnet each person picks the model for the cryptography tasks; at the end, in /demo-cost, they compare cost and green cards with a neighbour who picked the other one.',
  },
  {
    seccao: 'Project 1', tipo: 'anatomia', min: 1.5,
    titulo: 'What /demo-swarm does',
    rotulo: '.claude/skills/demo-swarm/SKILL.md (summary)',
    codigo: '---\nname: demo-swarm\nmodel: sonnet\nallowed-tools: node tools/*, Agent\n---\nRepeat until STATE: DONE\n 1. next-wave.mjs → the next batch\n 2. Launch the batch, in parallel\n 3. 1 agent = 1 task + its test\n 4. Show agent, model and cost',
    pontos: [
      { icone: 'route', titulo: 'A script decides', texto: 'next-wave.mjs reads the graph and says what runs now. Claude launches that batch: no improvising.' },
      { icone: 'bot', titulo: 'One agent, one task', texto: 'A clean context, one task, its test and the right model: Haiku for the bulk.' },
      { icone: 'folder-git-2', titulo: 'In your project', texto: '/task-swarm does the same with the subtasks of your issue.' },
    ],
    notas: 'Explain before running it. The key point: a script picks what runs, not the model. With {{P1_PARALELO}} calls in parallel, a model forgets dependencies or rewrites prompts; the script is reproducible, and that is what makes the cost predictable and the benchmark comparable. grade.mjs runs the test of each task and decides: green or red. If a task fails, the script retries it with the error message and, on the third attempt, with Sonnet.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'Release the swarm',
    passos: ['Run /demo-swarm', 'Open a second terminal', 'Start the server and open the /status address it prints'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: '/demo-swarm' },
      { rotulo: 'Terminal 2', cmd: 'cd ~/workshop-claude/demo-project\nnode server.js' },
    ],
    esperado: 'On /status (usually http://localhost:3000/status; if the port is busy, node server.js prints another one): the squares turn yellow and then green',
    notas: 'Prediction, before pressing Enter: each person writes in Teams how much they think it will cost and how many cards will end up red. From here the swarm works for a few minutes ({{P1_SWARM}} in the reference run; longer with new accounts). The next four slides (9 minutes) happen during that wait; whoever finishes first plays the Arena.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'Ask without interrupting',
    passos: ['Go back to Terminal 1; leave the swarm running', 'Type /btw and your question', 'Read the answer and close it with Esc'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/btw why does task cr-01 wait for lib-hash?' }],
    esperado: 'An answer on the side, outside the conversation; after Esc, the swarm carries on',
    notas: '/btw answers on the side, outside the conversation. Careful: while the answer panel is open, the agents\' results wait (Claude Code shows "background task updates waiting while this panel is open"). Read it and press Esc so the swarm carries on.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 3,
    titulo: 'In a third terminal: three features',
    passos: ['Open a third terminal in the Arena folder', 'Plan mode: Shift+Tab until "plan mode"', 'Headless: a question without opening a session', 'Rewind: Esc Esc to go back'],
    comandos: [
      { rotulo: 'Plan mode', cmd: 'claude\n(Shift+Tab) How would you add an 11th category?' },
      { rotulo: 'Headless', cmd: 'claude -p "Summarise PLAN.md in one sentence" --model claude-haiku-5-5' },
    ],
    esperado: 'A plan with no changes, one sentence in the terminal and a checkpoint to rewind to',
    notas: 'Still during the swarm. Plan mode only reads and proposes. claude -p is the basis for scripts and CI. Esc Esc opens rewind: it restores code and conversation to a checkpoint, but not what was done through Bash nor most of what the subagents did. If someone asks about worktrees: claude -w <name> opens an isolated copy of the repository on its own branch, and isolation: worktree gives a subagent its own worktree when tasks touch the same files.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'Create a PostToolUse hook',
    intro: 'A hook is a command Claude Code runs on its own on an event. The kit measures cost this way.',
    passos: ['In Terminal 3, open Claude in the practice project', 'Ask for the hook in your own words', 'Open /hooks and check it is there'],
    comandos: [
      { rotulo: 'Terminal 3', cmd: 'cd ~/workshop-claude/practice-project\nclaude\n> Create a PostToolUse hook in\n  .claude/settings.local.json: after\n  each Edit or Write, append the time and\n  the file to ~/workshop-claude/edits.log' },
    ],
    esperado: '/hooks shows your PostToolUse; in Project 2, every edited file shows up in edits.log',
    notas: 'Still during the swarm, and outside the Arena, so the swarm session is not touched. A hook is "when X happens, run Y", set up in a settings.json; Claude writes hooks very well, just describe what you want. settings.local.json belongs to this folder only and stays out of git. In Project 2 (the practice project) the hook also fires for the /task-swarm agents: open edits.log and watch the files show up. The kit uses SubagentStop to record the cost of each agent (see "Measure, don\'t guess").',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'Make your own statusline',
    intro: 'The line under the input box is a script: it gets the session as JSON and returns one line.',
    passos: ['Still in Terminal 3, type /statusline and what you want to see', 'Accept the script Claude writes', 'See the new line under the input box'],
    comandos: [{ rotulo: 'Terminal 3', cmd: '/statusline show the model, the git branch\n  and the session cost; save it only in\n  this project, in\n  .claude/settings.local.json' }],
    esperado: 'Your line in this project; in Terminal 1, the kit statusline still shows the swarm cost',
    notas: 'Still during the swarm. The kit statusline reads what the hook recorded and shows the session and project cost, live, against the US$ 5 target: show the one in Terminal 1 changing as the agents finish. Asking to save it in .claude/settings.local.json matters: otherwise /statusline writes to the user settings and replaces the kit one in every project. To get the kit one back in this project, delete statusLine from settings.local.json. Claude Code\'s /usage may show more, because some versions do not know the latest prices yet; /demo-cost uses the published prices.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 5,
    titulo: 'Why did this card fail?',
    intro: '4 cards fail on purpose: their spec leaves out a detail that the test checks.',
    passos: ['On /status, click a red square', 'Read the test line that failed', 'Add the missing detail to cards/<id>/spec.md', 'Run only that card again'],
    comandos: [
      { rotulo: 'Browser', cmd: 'http://localhost:3000/status' },
      { rotulo: 'Terminal 1', cmd: '/demo-swarm --retry <id>' },
    ],
    esperado: 'That square turns green: the quality of the spec decides the swarm',
    notas: 'The lesson of Project 1: the agent does not guess what the spec does not say. The test shows what it expected and what it got; the card spec did not say it, so neither Haiku nor Sonnet (which steps in on the third attempt) gets it right. Whoever finishes repeats it for the other red cards: the gate only approves when everything is green. Compare with the Teams prediction: how many red cards did they expect? Optional extra, for anyone who wants to automate it: /loop 2m run node tools/workshop/orchestrator/grade.mjs --all and fix the first red task with the implementer agent; stop when everything is green (/loop repeats a prompt at each interval; Esc cancels).',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'The security gate',
    passos: ['Run /demo-review', "Read the Opus reviewer's verdict"],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/demo-review' }],
    esperado: 'GATE: APPROVED: tests green, CSP on, no eval or innerHTML, no secrets',
    notas: 'A security game with security flaws would be the worst example. The gate links each check to the OWASP Top 10. With cards still red, the gate says GATE: REJECTED and lists what is missing: go back to the previous slide.',
  },
  {
    seccao: 'Project 1', tipo: 'fluxo', min: 1,
    titulo: 'Measure, don\'t guess',
    passos: [
      { titulo: 'The subagent finishes', texto: 'every swarm agent, when it is done' },
      { titulo: 'The SubagentStop hook runs', texto: 'a kit script (the Stop hook measures the main session)' },
      { titulo: 'Tokens × price', texto: 'the real transcript tokens, at the published prices' },
      { titulo: 'One line in usage.jsonl', texto: 'agent, model, time and cost' },
      { titulo: 'Statusline and /demo-cost', texto: 'the live cost and the final report' },
    ],
    notas: 'Before /demo-cost: where the numbers come from. The kit hook is like the one they created, on a different event: it reads the real tokens from the transcript, multiplies them by the published prices and appends one line. It never blocks anything. The statusline and /demo-cost only read those lines.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'How much did it cost?',
    passos: ['Run /demo-cost', 'Compare the Haiku agents with the main session', 'Compare with your neighbour: cost and green cards'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/demo-cost' }],
    esperado: 'Cost per agent, model and wave, close to {{P1_CUSTO}}',
    notas: 'The report uses real tokens and published prices. At the end it saves the lessons to the memory app. Whoever used --crypto haiku compares with whoever used --crypto sonnet: cost and green cards. Duel: each room collects everyone\'s cost and green cards in Teams, and the two rooms compare at the end (and against the prediction made before the swarm).',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'Play what the swarm built',
    passos: ['Open the gallery', 'Pick a challenge and play (yours is my-01)', 'Click "Run tests"'],
    comandos: [{ rotulo: 'Browser', cmd: 'http://localhost:3000' }],
    esperado: 'Challenges from green tasks are playable; the red ones show why they failed',
    notas: 'The tests also run in the browser. It is the same test that decided the colour of the square.',
  },

  // ---------------- Memory (60–65)
  {
    seccao: 'Memory', tipo: 'imagem', min: 2,
    titulo: 'The memory of what you did',
    media: 'media/memoria-procura.en.png',
    legenda: 'Search by project, issue or epic (e.g. arena or EX-1): lessons, "do", "don\'t" and history, linked to projects, epics, tasks and files',
    notas: 'They are Markdown files in ~/.agent-memory, with an SQLite index. Everything stays on your PC. Each memory is linked to the Jira or GitHub ticket and to its epic: searching ABC-123 brings everything for that ticket and the epic. /task-intake and /task-plan check it before planning ("last time in this epic, don\'t do X").',
  },
  {
    seccao: 'Memory', tipo: 'faca', min: 3,
    titulo: 'Open your first graph',
    passos: ['Open the Agent Memory app', 'Click a node to read the lesson', 'Drag the time slider'],
    comandos: [
      { rotulo: 'Mac', cmd: 'open "$HOME/Applications/Agent Memory.app"\n# or: agent-memory' },
      { rotulo: 'Windows', cmd: 'Start menu → Agent Memory\n# or: agent-memory' },
    ],
    esperado: 'The Arena session graph, with the lessons linked to the project',
    notas: 'The app opens in your native language and has a language selector. The lesson about the card that failed should be there.',
  },

  // ---------------- Project 2 (65–87)
  { seccao: 'Project 2', tipo: 'seccao', min: 0.5, titulo: 'Project 2', subtitulo: 'A real task: the Municipal Library, or your own', notas: '22 minutes. Everyone\'s path is the practice project: the Municipal Library, a small API with tests and the issues EX-1 to EX-3 as JSON, with no Jira login and no MCP. Anyone who already has Jira or GitHub working can bring a task of their own. The task may not finish here: the goal is to leave with the orchestration running and to know how to continue.' },
  {
    seccao: 'Project 2', tipo: 'fluxo', min: 1.5,
    titulo: 'The same cycle, in another repository',
    passos: [
      { titulo: '/task-intake', texto: 'reads the issue: a JSON file in the practice project, or Jira or GitHub' },
      { titulo: '/task-plan', texto: 'decides how many agents and why' },
      { titulo: '/task-swarm', texto: 'the agents work in batches' },
      { titulo: '/task-gate', texto: 'tests, secrets and the Opus verdict' },
      { titulo: '/task-report', texto: 'comments, worklog and PR, after you say yes' },
    ],
    notas: 'The /task-* skills are installed at user level and work in any repository. Every write to Jira or GitHub asks for confirmation; in the practice project there is nothing to publish.',
  },
  {
    seccao: 'Project 2', tipo: 'faca', min: 3,
    titulo: 'Start with issue EX-1',
    passos: ['In Terminal 3, in the practice project, open Claude Code', 'Read issue EX-1 (no login: it is a JSON file)', 'Jira or GitHub already working? You can use an issue of your own'],
    comandos: [
      { rotulo: 'Terminal 3 · practice project', cmd: 'cd ~/workshop-claude/practice-project\nclaude\n/task-intake issues/EX-1.json' },
      { rotulo: 'Optional · your repository', cmd: 'cd <your repository>\nclaude\n/task-intake ABC-123' },
    ],
    esperado: 'Title, acceptance criteria and the test command of the project (npm test)',
    notas: 'Anyone who still has Claude open in Terminal 3 (from the hook) only types the last line. EX-1 is small: validate the ISBN and the email when creating books and readers. Intake only reads; it writes nothing. With your own repository: Jira needs the /mcp login (atlassian) and GitHub uses gh.',
  },
  {
    seccao: 'Project 2', tipo: 'faca', min: 4,
    titulo: 'The planner decides how many agents',
    passos: ['Run /task-plan', 'Read why it picked that number of agents', 'Approve or adjust'],
    comandos: [{ rotulo: 'Terminal 3', cmd: '/task-plan' }],
    esperado: 'EX-1 is small: 1 to 3 agents, with a reason and an estimate',
    notas: 'The planner (Opus) proposes the graph and a script validates it: ids, dependencies, cycles and known agents. Tasks that touch the same files go in different batches, at swarm time. Integration and review are added automatically. A larger task (EX-2) gets more agents.',
  },
  {
    seccao: 'Project 2', tipo: 'faca', min: 11,
    titulo: 'Put the swarm to work',
    passos: ['Run /task-swarm', 'In another terminal, in the project folder, open the dashboard', 'Stop with Esc; run /task-swarm again to resume'],
    comandos: [
      { rotulo: 'Terminal 3', cmd: '/task-swarm' },
      { rotulo: 'Another terminal', cmd: 'cd ~/workshop-claude/practice-project\nnode "$HOME/.workshop-claude/kit/orchestrator/dashboard.mjs"' },
    ],
    esperado: 'Batches of agents finishing and npm test green; never two on the same file at the same time',
    notas: 'The state lives in .workshop/. Running /task-swarm again resumes. Tasks that touch the same files go in different batches, or in git worktrees if the planner decides so. The Project 1 hook is working: open ~/workshop-claude/edits.log and watch the files the agents edit. Whoever finishes EX-1 moves on to EX-3 (small, security: a reader can see another reader\'s loans) or EX-2 (medium, more agents), and can run /task-gate.',
  },
  {
    seccao: 'Project 2', tipo: 'colunas', min: 2,
    titulo: 'After the workshop',
    colunas: [
      { icone: 'shield-check', titulo: '/task-gate', texto: 'tests, secrets, dangerous code and the Opus verdict' },
      { icone: 'message-square-text', titulo: '/task-report', texto: 'Jira (MCP or acli) or GitHub (gh): comments, worklog and PR, only after you say yes' },
      { icone: 'share-2', titulo: '/memory', texto: 'the lessons from this task stay for the next one' },
    ],
    notas: 'To use it with your own issues: Jira goes through the Atlassian MCP, logged in via /mcp; if that fails, the Atlassian CLI (acli auth login), which the setup already installed, reads the issue and posts the comments (hours are logged by hand). The Atlassian MCP uses the company\'s Rovo credits and the admin can limit it. GitHub uses gh (gh auth login): it uses less context than an MCP and shares no tokens. Example comment: agent ws-worker-07 · Haiku · 5 s · US$ 0.004.',
  },

  // ---------------- Closing (87–90)
  {
    seccao: 'Closing', tipo: 'lista', min: 1.5,
    titulo: 'Five ideas to take with you',
    itens: [
      'Skills make work repeatable',
      'Subagents bring a clean context and the right model per piece',
      'A script decides the graph; the spec decides the result',
      'Measure with hooks; never guess the cost',
      'Memory makes each task teach the next one',
    ],
    notas: 'A summary in five sentences. The third one joins the two lessons of Project 1: the orchestrator is a script, and the card that failed failed because of its spec.',
  },
  {
    seccao: 'Closing', tipo: 'lista', min: 1,
    titulo: 'Tomorrow',
    itens: [
      'Run /task-intake on the next issue assigned to you',
      'Write a skill for a task you repeat every week',
      'Open Agent Memory before planning',
    ],
    notas: 'Three concrete actions.',
  },
  { seccao: 'Closing', tipo: 'titulo', fecho: true, min: 0.5, titulo: 'Questions', subtitulo: 'No time limit', rodape: '{{WORKSHOP_REPO}}', notas: 'Questions can go past 90 minutes. Anyone who did not run the setup installs now. If there is time: the result of the duel between the two rooms.' },
];
