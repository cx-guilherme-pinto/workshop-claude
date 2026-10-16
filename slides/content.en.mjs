// Presentation content (English). build.mjs turns this into workshop.en.pptx and speaker-notes.en.md.
// Same shape and slide order as content.mjs (pt-PT): change a slide there = change the same slide here.
// {{...}} are replaced from repos.conf and the benchmark (see build.mjs).
// min = minutes for the slide; saltar = can be skipped if running late.

export const SECCOES = ['Opening', 'Check', 'Concepts', 'Preview', 'Project 1', 'Memory', 'Project 2', 'Closing'];

export const SLIDES = [
  // ---------------- Opening (0–5)
  {
    seccao: 'Opening', tipo: 'titulo', min: 1,
    titulo: 'Agent orchestration with Claude',
    subtitulo: 'Skills, subagents and parallel swarms, with measured cost',
    notas: 'Welcome. In 90 minutes we will put a swarm of agents to work building a game and then working on a real task of your own.',
  },
  {
    seccao: 'Opening', tipo: 'colunas', min: 1.5,
    titulo: 'What you take home',
    colunas: [
      { titulo: 'A swarm', texto: 'that builds a security game with 15 agents in parallel', cor: 'verde' },
      { titulo: 'Your task', texto: 'a real one, from Jira or GitHub, broken down and running', cor: 'accent' },
      { titulo: 'A memory', texto: 'a graph of what you learned, ready to use tomorrow', cor: 'amarelo' },
    ],
    notas: 'Three concrete outcomes. Everything stays installed on each laptop and keeps working after today.',
  },
  {
    seccao: 'Opening', tipo: 'agenda', min: 1,
    titulo: '90 minutes',
    blocos: [
      ['0', 'Opening'], ['5', 'Check'], ['10', 'Concepts'], ['25', 'Preview'],
      ['30', 'Project 1'], ['55', 'Memory'], ['60', 'Project 2'], ['85', 'Wrap-up'],
    ],
    notas: 'The clock is in the notes of each slide. Questions are at the end, with no time limit.',
  },
  {
    seccao: 'Opening', tipo: 'stats', min: 1.5,
    titulo: 'The cost rules',
    stats: [
      { valor: 'US$ 5', rotulo: 'target per person, for everything you do today' },
      { valor: 'US$ 10', rotulo: 'safety cap, never the goal' },
      { valor: '0', rotulo: 'sessions stopped because of cost' },
    ],
    rodape: 'Measured over {{BENCH_N}} real runs: average {{BENCH_MEDIA}}, maximum {{BENCH_MAX}}.',
    notas: 'The budget is backed by the benchmark, not by cuts. If someone goes over the target, a warning shows up and they keep working.',
  },

  // ---------------- Check (5–10)
  {
    seccao: 'Check', tipo: 'faca', min: 3,
    titulo: 'Check your installation',
    passos: ['Open a terminal', 'Run the command for your system', 'Wait for the summary table'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{CHECK_MAC}}' },
      { rotulo: 'Windows', cmd: '{{CHECK_WIN}}' },
    ],
    esperado: '"Everything is ready for the workshop"',
    notas: 'Everyone runs the check. It takes 2 to 3 minutes and installs nothing. Anyone who did not run the setup follows along with a neighbour and installs during the questions. The setup speaks English, but it detects the machine language and writes the Claude Code language setting (Portuguese, English, Hindi or Hebrew): the skills answer in that language. The Arena, the orchestrator tables and the docs come in Portuguese or English (any other language gets English).',
  },
  {
    seccao: 'Check', tipo: 'faca', min: 2,
    titulo: 'Did a step fail?',
    passos: ['Run doctor mode', 'Accept the analysis by Claude (under US$ 0.01)', 'Confirm the commands one by one'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{DOCTOR_MAC}}' },
      { rotulo: 'Windows', cmd: '{{DOCTOR_WIN}}' },
    ],
    esperado: 'The failed step runs again and gets done',
    notas: 'Claude reads only the log excerpt for that step, with no secrets, and suggests commands. It never runs anything without confirmation. If Claude is not installed yet, the pre-written message from TROUBLESHOOTING is shown.',
  },

  // ---------------- Concepts (10–25)
  { seccao: 'Concepts', tipo: 'seccao', min: 0.5, titulo: 'Concepts', subtitulo: 'Skills, agents, graphs and money', notas: 'Fifteen minutes of ideas, one concept per slide.' },
  {
    seccao: 'Concepts', tipo: 'colunas', min: 1.5,
    titulo: 'Claude Code works in your project',
    colunas: [
      { titulo: 'Reads and writes', texto: 'project files, with permissions you control' },
      { titulo: 'Runs commands', texto: 'tests, git, scripts: it sees the result and fixes it' },
      { titulo: 'Connects to tools', texto: 'Jira, GitHub and your memory, via MCP' },
    ],
    notas: 'Claude Code is not a chat: it is an agent that acts on the repository. Everything it does goes through permissions. Plan mode (Shift+Tab) makes it only plan, without touching anything.',
  },
  {
    seccao: 'Concepts', tipo: 'codigo', min: 2,
    titulo: 'A skill is a recipe with a name',
    intro: 'A SKILL.md file in a folder. You type /name and Claude follows the recipe.',
    codigo: `---
name: demo-swarm
description: Runs the Arena swarm in waves
model: sonnet
allowed-tools:
  - Bash(node tools/*)
  - Agent
---
1. Run next-wave.mjs
2. Launch exactly the calls it returns
3. Repeat until ESTADO: FIM
Answer in the participant's language.`,
    depois: '.claude/skills/ in the project · ~/.claude/skills/ for every project · written in English, they answer in your language',
    notas: 'Skills replaced the old slash commands. The frontmatter pins the model and the allowed tools. Today we use two sets: /demo-* in the Arena and /task-* for everyday work. The kit skills are in English and tell Claude to answer in the participant\'s language.',
  },
  {
    seccao: 'Concepts', tipo: 'modelos', min: 2,
    titulo: 'Subagents: their own context and model',
    modelos: [
      { nome: 'Opus', papel: 'plan and review', cor: 'accent', preco: 'US$ 4 / 20' },
      { nome: 'Sonnet', papel: 'integration and hard logic', cor: 'verde', preco: 'US$ 2 / 10' },
      { nome: 'Haiku', papel: 'the bulk of the swarm', cor: 'amarelo', preco: 'US$ 0.10 / 0.50' },
    ],
    rodape: 'Price per million tokens: input / output. Source: pricing.json ({{PRICING_DATA}}).',
    notas: 'A subagent is a Claude instance with a clean context, its own tools and the model we choose. It is defined in a .claude/agents/<name>.md file. The /agents command no longer opens a wizard: you edit the file.',
  },
  {
    seccao: 'Concepts', tipo: 'stats', min: 2,
    titulo: 'The economic rule',
    stats: [
      { valor: '20×', rotulo: 'Haiku is 20 times cheaper than Sonnet' },
      { valor: '{{CUSTO_CARTAO}}', rotulo: 'average cost of one card built by a Haiku agent' },
      { valor: '{{PESO_ORQ}}', rotulo: 'of the cost goes to the main session, not to the swarm' },
    ],
    rodape: 'As much as possible on Haiku. Sonnet only where Haiku fails. Opus only to think and review.',
    notas: 'A cheap swarm is many small agents with clear instructions. What costs money is coordination. That is why the orchestrator is a script and the workers answer with one line.',
  },
  {
    seccao: 'Concepts', tipo: 'dag', min: 2,
    titulo: 'Task → graph → waves',
    notas: 'The plan is a dependency graph. We run it in waves: everything that is ready runs in parallel. The three cryptography cards wait for lib/hash, a real dependency inside wave 1.',
  },
  {
    seccao: 'Concepts', tipo: 'colunas', min: 1.5,
    titulo: 'A script decides the graph',
    colunas: [
      { titulo: 'next-wave.mjs', texto: 'reads the plan and the state and returns the next batch of calls' },
      { titulo: 'the model', texto: 'launches exactly those calls, all in the same message' },
      { titulo: 'grade.mjs', texto: 'runs the test of each task and decides: green or red' },
    ],
    notas: 'With 15 calls in parallel, a model forgets dependencies or rewrites prompts. The script is reproducible: that is what makes the cost predictable and the benchmark comparable.',
  },
  {
    seccao: 'Concepts', tipo: 'fluxo', min: 1.5,
    titulo: 'Measure, don\'t guess',
    passos: ['The subagent finishes', 'The SubagentStop hook runs', 'Transcript tokens × price', 'One line in usage.jsonl', 'Statusline and /demo-cost'],
    notas: 'Hooks are commands that Claude Code runs on events. Ours only measures: it reads the real tokens from the transcript, multiplies them by the published prices and appends one line. It never blocks anything.',
  },
  {
    seccao: 'Concepts', tipo: 'fluxo', min: 1,
    titulo: 'The cycle of every task',
    passos: ['plan', 'swarm', 'review', 'cost', 'memory'],
    notas: 'It is the same cycle in both projects: plan with Opus, run as a swarm, a security gate, measure and save what was learned.',
  },
  {
    seccao: 'Concepts', tipo: 'stats', min: 1, saltar: true,
    titulo: 'Limits we respect',
    stats: [
      { valor: '20', rotulo: 'subagents at the same time, at most, per session' },
      { valor: '8', rotulo: 'in parallel by default today, for new accounts' },
      { valor: '16', rotulo: 'in presenter mode (100 agents in batches)' },
    ],
    notas: 'Skip if running late. Claude Code refuses a 21st concurrent subagent. API rate limits are per organisation. That is why we work in batches.',
  },

  // ---------------- Preview (25–30)
  {
    seccao: 'Preview', tipo: 'video', min: 4,
    titulo: '100 agents building the Arena',
    media: 'media/enxame-acelerado.mp4',
    poster: 'media/estado-final.png',
    legenda: 'Real recorded run: {{APRES_DURACAO}} · {{APRES_CUSTO}} · {{APRES_AGENTES}} agents',
    notas: 'Sped-up video of a real run in presenter mode. The time and cost on screen are the real ones. Plan B if the video fails: open /estado?replay=gravacao in the recorded Arena.',
  },
  {
    seccao: 'Preview', tipo: 'imagem', min: 1,
    titulo: 'The result: a game to play',
    media: 'media/arena.png',
    legenda: 'Green: the test passed · red: it failed. What did not work is visible too.',
    notas: 'Open the final Arena in the browser and play a card. It is a static app, with no risk. The game comes in Portuguese or English, depending on the machine language.',
  },

  // ---------------- Project 1 (30–55)
  { seccao: 'Project 1', tipo: 'seccao', min: 0.5, titulo: 'Project 1', subtitulo: 'The Security Arena', notas: '25 minutes of hands-on. In the benchmark, the 15-card swarm took 4 to 6 minutes; in interactive mode and with new accounts it can take longer. We use that time to look at features.' },
  {
    seccao: 'Project 1', tipo: 'colunas', min: 1,
    titulo: 'What is ready and what is missing',
    colunas: [
      { titulo: 'Ready', texto: 'the app shell, 4 card templates and one test for each card', cor: 'verde' },
      { titulo: 'To do', texto: '15 cards, lib/hash and two pages', cor: 'cinza' },
      { titulo: 'Who does it', texto: 'your swarm: Haiku, Sonnet and Opus', cor: 'amarelo' },
    ],
    notas: 'The tests already exist: each agent only has to turn its test green. That is what lets Haiku do the bulk of the work safely.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 3,
    titulo: 'Plan the swarm',
    passos: ['Go to the Arena folder', 'Open Claude Code and trust the folder', 'Run /demo-plan'],
    comandos: [{ rotulo: 'Terminal 1', cmd: 'cd ~/workshop-claude/demo-project\nclaude\n/demo-plan' }],
    esperado: 'A Mermaid diagram, 4 waves and an estimate close to {{ESTIMATIVA}}',
    notas: 'The trust dialog matters: without it, the project permissions stay off. /demo-plan checks the memory, builds the graph and asks the planner (Opus) to review it.',
  },
  {
    seccao: 'Project 1', tipo: 'dag', min: 1.5,
    titulo: 'Your plan: 4 waves',
    notas: 'Show someone\'s plan on the projector. In wave 1, lib/hash and the cards start together; the cryptography ones join as soon as hash turns green.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'Release the swarm',
    passos: ['Run /demo-swarm', 'Open a second terminal', 'Start the server and open /estado'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: '/demo-swarm' },
      { rotulo: 'Terminal 2', cmd: 'cd ~/workshop-claude/demo-project\nnode server.js' },
    ],
    esperado: 'http://localhost:3000/estado: the squares turn yellow and then green',
    notas: 'From here the swarm works for a few minutes (4 to 6 in the benchmark). The next slides use that time; whoever finishes first plays the Arena.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'Ask without interrupting',
    passos: ['While the swarm works, in Terminal 1', 'Use /btw for a side question'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/btw why does cr-01 wait for lib-hash?' }],
    esperado: 'An answer that does not enter the conversation or stop the swarm',
    notas: '/btw answers on the side. It is the right way to ask questions during a long run.',
  },
  {
    seccao: 'Project 1', tipo: 'codigo', min: 2,
    titulo: 'The statusline and the hook that feeds it',
    intro: 'At the bottom: model · session · project against the target · time · swarm.',
    codigo: `"hooks": {
  "SubagentStop": [{ "hooks": [{
    "type": "command",
    "command": "node tools/workshop/hooks/subagent-stop.mjs"
  }]}]
},
"statusLine": {
  "type": "command",
  "command": "node tools/workshop/statusline/statusline.mjs"
}`,
    depois: 'The Arena .claude/settings.json. The Claude Code /usage gives another estimate; /demo-cost uses the published prices.',
    notas: 'Show the statusline changing as the agents finish. Explain why /usage can show more: versions that do not know the latest prices yet.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 3,
    titulo: 'In Terminal 2: three features',
    passos: ['Plan mode: Shift+Tab until "plan mode"', 'Headless: a question without opening a session', 'Rewind: Esc Esc to go back'],
    comandos: [
      { rotulo: 'Plan mode', cmd: 'claude\n(Shift+Tab) How would you add an 11th category?' },
      { rotulo: 'Headless', cmd: 'claude -p "Summarise PLANO.md in one sentence" --model claude-haiku-5-5' },
    ],
    esperado: 'No changes made, one sentence in the terminal and a checkpoint to rewind to',
    notas: 'Plan mode only reads and proposes. claude -p is the basis for scripts and CI. Esc Esc opens rewind: it restores code and conversation to a checkpoint, but not what was done through Bash nor most of what the subagents did.',
  },
  {
    seccao: 'Project 1', tipo: 'colunas', min: 2, saltar: true,
    titulo: 'Worktrees and routines',
    colunas: [
      { titulo: 'claude -w experiment', texto: 'an isolated copy of the repository, on its own branch, to work in parallel' },
      { titulo: 'isolation: worktree', texto: 'a subagent in its own worktree, when the tasks touch the same files' },
      { titulo: 'Local routine', texto: 'the system scheduler runs claude -p every day. The cloud /schedule needs a subscription' },
    ],
    notas: 'Skip if running late. Example routine: a daily security review with node tools/rotina.mjs --instalar, which registers a claude -p "/demo-review --auto" in launchd or in Task Scheduler.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'Until everything is green',
    passos: ['If there are red squares at the end', 'Let a /loop work for you'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/loop 2m run node tools/check-integracao.mjs and fix the first red test with the implementer; stop when everything is green' }],
    esperado: 'The loop stops by itself when the suite is green',
    notas: '/loop repeats a prompt at each interval, while the session is open. Esc cancels.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'The security gate',
    passos: ['Run /demo-review', 'Read the verdict of the reviewer (Opus)'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/demo-review' }],
    esperado: 'GATE: APROVADO, with tests, CSP, no eval or innerHTML, no secrets',
    notas: 'A security game with security flaws would be the worst example. The gate links each check to the OWASP Top 10.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'How much did it cost?',
    passos: ['Run /demo-cost', 'Compare Haiku with the orchestrator'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/demo-cost' }],
    esperado: 'Cost per agent, model and wave, close to {{BENCH_MEDIA}}',
    notas: 'The report uses real tokens and published prices. At the end it saves the lessons to the memory app.',
  },
  {
    seccao: 'Project 1', tipo: 'faca', min: 2,
    titulo: 'Play what the swarm built',
    passos: ['Open the gallery', 'Pick a card and play', 'Click "Run tests"'],
    comandos: [{ rotulo: 'Browser', cmd: 'http://localhost:3000' }],
    esperado: 'Green cards you can play; the red ones show why they failed',
    notas: 'The tests also run in the browser. It is the same test that decided the colour of the square.',
  },

  // ---------------- Memory (55–60)
  {
    seccao: 'Memory', tipo: 'imagem', min: 2,
    titulo: 'The memory of what you did',
    media: 'media/memoria-procura.png',
    legenda: 'Search by ticket or epic (e.g. ARENA-1): lessons, do, don\'t and history linked to projects, epics, tasks and files',
    notas: 'They are Markdown files in ~/.memoria, with an SQLite index. Everything stays on your PC. Each memory is linked to the Jira or GitHub ticket and to its epic: searching ABC-123 brings everything for that ticket and the epic. /task-intake and /task-plan check it before planning ("last time in this epic, don\'t do X").',
  },
  {
    seccao: 'Memory', tipo: 'faca', min: 3,
    titulo: 'Open your first graph',
    passos: ['Open the Memória app', 'Click a node to read the lesson', 'Drag the time slider'],
    comandos: [
      { rotulo: 'Mac', cmd: 'open ~/Applications/Memória.app   (or: memoria)' },
      { rotulo: 'Windows', cmd: 'Start menu → Memória   (or: memoria)' },
    ],
    esperado: 'The Arena session graph, with the lessons linked to the project',
    notas: 'The app opens in your native language and has a language selector. Routines, worktrees and headless mode were already covered during the waiting moments.',
  },

  // ---------------- Project 2 (60–85)
  { seccao: 'Project 2', tipo: 'seccao', min: 0.5, titulo: 'Project 2', subtitulo: 'Your real task', notas: '25 minutes. The task may not finish here: the goal is to leave with the orchestration running and to know how to continue.' },
  {
    seccao: 'Project 2', tipo: 'fluxo', min: 1.5,
    titulo: 'The same cycle, in your repository',
    passos: ['/task-intake', '/task-plan', '/task-swarm', '/task-gate', '/task-report'],
    notas: 'The /task-* skills are installed at user level and work in any repository. Every write to Jira or GitHub asks for confirmation.',
  },
  {
    seccao: 'Project 2', tipo: 'faca', min: 4,
    titulo: 'Bring your task',
    passos: ['Open Claude Code at the root of your project', 'Give it the Jira or GitHub issue', 'No access? Use the practice project'],
    comandos: [
      { rotulo: 'Your project', cmd: 'cd <your repository>\nclaude\n/task-intake ABC-123' },
      { rotulo: 'Practice project', cmd: 'cd ~/workshop-claude/exemplo-projeto-real\nclaude\n/task-intake issues/EX-1.json' },
    ],
    esperado: 'Title, acceptance criteria and the test command of the project',
    notas: 'For Jira you need to have logged in via /mcp (atlassian). GitHub uses gh. Intake only reads; it writes nothing.',
  },
  {
    seccao: 'Project 2', tipo: 'faca', min: 5,
    titulo: 'The planner decides how many agents',
    passos: ['Run /task-plan', 'Read why it picked that number of agents', 'Approve or adjust'],
    comandos: [{ rotulo: 'Terminal', cmd: '/task-plan' }],
    esperado: 'Small: 1–3 agents. Large: more, with a reason and an estimate',
    notas: 'The planner (Opus) proposes the graph and a script validates it: cycles, shared files, known agents. Integration and review are added automatically.',
  },
  {
    seccao: 'Project 2', tipo: 'faca', min: 10,
    titulo: 'Put the swarm to work',
    passos: ['Run /task-swarm', 'Watch the dashboard in another terminal', 'Stop with Esc and resume whenever you want'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: '/task-swarm' },
      { rotulo: 'Terminal 2', cmd: 'node ~/.workshop-claude/kit/orquestrador/painel.mjs' },
    ],
    esperado: 'Batches of agents finishing; never two on the same file at the same time',
    notas: 'The state lives in .workshop/. Running /task-swarm again resumes. Tasks that touch the same files go in different batches, or in git worktrees if the planner decides so.',
  },
  {
    seccao: 'Project 2', tipo: 'colunas', min: 1, saltar: true,
    titulo: 'Jira and GitHub',
    colunas: [
      { titulo: 'Jira (MCP + acli)', texto: 'MCP with login in /mcp; if it fails, the Atlassian CLI (acli auth login)' },
      { titulo: 'GitHub (gh)', texto: 'gh auth login: less context than an MCP and no shared tokens' },
      { titulo: 'Always with confirmation', texto: 'comments, worklog and PR only after your yes' },
    ],
    notas: 'Skip if running late. The Atlassian MCP spends the company Rovo credits and the admin can limit it. If the MCP fails, the skills use the official Atlassian CLI (acli), which the setup already installed: it reads the issue and posts the comments; hours are logged by hand.',
  },
  {
    seccao: 'Project 2', tipo: 'colunas', min: 2,
    titulo: 'After the workshop',
    colunas: [
      { titulo: '/task-gate', texto: 'tests, secrets, dangerous code and the Opus verdict' },
      { titulo: '/task-report', texto: 'Jira: one comment per subtask, with agent, model, time and cost, and the worklog. GitHub: the PR' },
      { titulo: '/memoria', texto: 'the lessons from this task stay for the next one' },
    ],
    notas: 'Example comment: agent ws-worker-07 · Haiku · 5 s · US$ 0.004.',
  },
  {
    seccao: 'Project 2', tipo: 'colunas', min: 1, saltar: true,
    titulo: 'Claude Desktop and mobile',
    colunas: [
      { titulo: 'Desktop', texto: 'for chatting, with a claude.ai account; the Code tab needs a subscription' },
      { titulo: 'Mobile', texto: 'Remote Control needs a subscription and does not accept API keys' },
      { titulo: 'Today', texto: 'everything in Claude Code, with your Console account' },
    ],
    notas: 'Skip if running late. With a subscription, the same session can continue on the phone and routines run in the cloud.',
  },

  // ---------------- Closing (85–90)
  {
    seccao: 'Closing', tipo: 'lista', min: 2,
    titulo: 'Five ideas to take with you',
    itens: [
      'Skills make work repeatable',
      'Subagents bring a clean context and the right model per piece',
      'A script decides the graph; the model executes',
      'Measure with hooks; cost is not guessed',
      'Memory makes each task teach the next one',
    ],
    notas: 'A summary in five sentences.',
  },
  {
    seccao: 'Closing', tipo: 'codigo', min: 1.5,
    titulo: 'Where everything is',
    intro: 'Install on another machine:',
    codigo: '{{ONE_LINER_MAC}}\n\n{{ONE_LINER_WIN}}',
    depois: 'Repository: {{WORKSHOP_REPO}} · version {{WORKSHOP_VERSION}} · update the memory: memoria update',
    notas: 'The commands are generated from repos.conf: they are always right for the published version.',
  },
  {
    seccao: 'Closing', tipo: 'lista', min: 1,
    titulo: 'Tomorrow',
    itens: [
      'Run /task-intake on the next issue assigned to you',
      'Write a skill for a task you repeat every week',
      'Open Memória before planning',
    ],
    notas: 'Three concrete actions.',
  },
  { seccao: 'Closing', tipo: 'titulo', min: 0.5, titulo: 'Questions', subtitulo: 'No time limit', notas: 'Questions can go past 90 minutes. Anyone who did not run the setup installs now.' },
];
