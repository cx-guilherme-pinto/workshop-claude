// Conteudo da apresentacao (pt-PT). O build.mjs transforma isto em workshop.pptx e speaker-notes.md.
// {{...}} sao substituidos a partir do repos.conf e do benchmark (ver build.mjs).
// min = minutos do slide; saltar = pode ser saltado se houver atraso.

export const SECCOES = ['Abertura', 'Verificar', 'Conceitos', 'Preview', 'Projeto 1', 'Memória', 'Projeto 2', 'Encerramento'];

export const SLIDES = [
  // ---------------- Abertura (0–5)
  {
    seccao: 'Abertura', tipo: 'titulo', min: 1,
    titulo: 'Orquestração de agentes com Claude',
    subtitulo: 'Skills, subagentes e enxames paralelos, com custo medido',
    notas: 'Boas-vindas. Em 90 minutos vamos pôr um enxame de agentes a construir um jogo e, depois, a trabalhar numa tarefa real de cada um.',
  },
  {
    seccao: 'Abertura', tipo: 'colunas', min: 1.5,
    titulo: 'O que levas para casa',
    colunas: [
      { titulo: 'Um enxame', texto: 'que constrói um jogo de segurança com 15 agentes em paralelo', cor: 'verde' },
      { titulo: 'A tua tarefa', texto: 'real, do Jira ou do GitHub, decomposta e a correr', cor: 'accent' },
      { titulo: 'Uma memória', texto: 'em grafo do que aprendeste, para usar amanhã', cor: 'amarelo' },
    ],
    notas: 'Três resultados concretos. Tudo fica instalado no portátil de cada um e continua a funcionar depois de hoje.',
  },
  {
    seccao: 'Abertura', tipo: 'agenda', min: 1,
    titulo: '90 minutos',
    blocos: [
      ['0', 'Abertura'], ['5', 'Verificar'], ['10', 'Conceitos'], ['25', 'Preview'],
      ['30', 'Projeto 1'], ['55', 'Memória'], ['60', 'Projeto 2'], ['85', 'Fecho'],
    ],
    notas: 'O relógio está nas notas de cada slide. As perguntas ficam para o fim, sem limite de tempo.',
  },
  {
    seccao: 'Abertura', tipo: 'stats', min: 1.5,
    titulo: 'As regras do custo',
    stats: [
      { valor: 'US$ 5', rotulo: 'alvo por pessoa, para tudo o que fizeres hoje' },
      { valor: 'US$ 10', rotulo: 'teto de segurança, nunca o objetivo' },
      { valor: '0', rotulo: 'sessões interrompidas por custo' },
    ],
    rodape: 'Medido em {{BENCH_N}} execuções reais: média {{BENCH_MEDIA}}, máximo {{BENCH_MAX}}.',
    notas: 'O orçamento é garantido pelo benchmark, não por cortes. Se alguém passar o alvo, aparece um aviso e continua a trabalhar.',
  },

  // ---------------- Verificar (5–10)
  {
    seccao: 'Verificar', tipo: 'faca', min: 3,
    titulo: 'Verifica a instalação',
    passos: ['Abre um terminal', 'Corre o comando do teu sistema', 'Espera pela tabela-resumo'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{CHECK_MAC}}' },
      { rotulo: 'Windows', cmd: '{{CHECK_WIN}}' },
    ],
    esperado: '"Está tudo pronto para o workshop"',
    notas: 'Toda a gente corre o check. Demora 2 a 3 minutos e não instala nada. Quem não fez o setup segue com o vizinho e instala no intervalo das perguntas.',
  },
  {
    seccao: 'Verificar', tipo: 'faca', min: 2,
    titulo: 'Algum passo falhou?',
    passos: ['Corre o modo doctor', 'Aceita a análise do Claude (menos de US$ 0,01)', 'Confirma os comandos um a um'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{DOCTOR_MAC}}' },
      { rotulo: 'Windows', cmd: '{{DOCTOR_WIN}}' },
    ],
    esperado: 'O passo que falhou é repetido e fica feito',
    notas: 'O Claude lê só o excerto do log daquele passo, sem segredos, e propõe comandos. Nunca executa nada sem confirmação. Se o Claude ainda não estiver instalado, aparece a mensagem pré-escrita do TROUBLESHOOTING.',
  },

  // ---------------- Conceitos (10–25)
  { seccao: 'Conceitos', tipo: 'seccao', min: 0.5, titulo: 'Conceitos', subtitulo: 'Skills, agentes, grafos e dinheiro', notas: 'Quinze minutos de ideias, um conceito por slide.' },
  {
    seccao: 'Conceitos', tipo: 'colunas', min: 1.5,
    titulo: 'O Claude Code trabalha no teu projeto',
    colunas: [
      { titulo: 'Lê e escreve', texto: 'ficheiros do projeto, com permissões que tu controlas' },
      { titulo: 'Corre comandos', texto: 'testes, git, scripts: vê o resultado e corrige' },
      { titulo: 'Liga-se a ferramentas', texto: 'Jira, GitHub e a tua memória, via MCP' },
    ],
    notas: 'O Claude Code não é um chat: é um agente que age no repositório. Tudo o que faz passa por permissões. Plan mode (Shift+Tab) faz com que só planeie, sem tocar em nada.',
  },
  {
    seccao: 'Conceitos', tipo: 'codigo', min: 2,
    titulo: 'Uma skill é uma receita com nome',
    intro: 'Um ficheiro SKILL.md numa pasta. Escreves /nome e o Claude segue a receita.',
    codigo: `---
name: demo-swarm
description: Executa o enxame da Arena em ondas
model: sonnet
allowed-tools:
  - Bash(node tools/*)
  - Agent
---
1. Corre next-wave.mjs
2. Lança exatamente as chamadas que ele devolve
3. Repete até ESTADO: FIM`,
    depois: '.claude/skills/ no projeto · ~/.claude/skills/ para todos os projetos',
    notas: 'As skills substituíram os slash commands antigos. O frontmatter fixa o modelo e as ferramentas autorizadas. Hoje vamos usar dois sets: os /demo-* na Arena e os /task-* no dia a dia.',
  },
  {
    seccao: 'Conceitos', tipo: 'modelos', min: 2,
    titulo: 'Subagentes: contexto e modelo próprios',
    modelos: [
      { nome: 'Opus', papel: 'planear e rever', cor: 'accent', preco: 'US$ 4 / 20' },
      { nome: 'Sonnet', papel: 'integrar e lógica difícil', cor: 'verde', preco: 'US$ 2 / 10' },
      { nome: 'Haiku', papel: 'o grosso do enxame', cor: 'amarelo', preco: 'US$ 0,10 / 0,50' },
    ],
    rodape: 'Preço por milhão de tokens: entrada / saída. Fonte: pricing.json ({{PRICING_DATA}}).',
    notas: 'Um subagente é uma instância do Claude com contexto limpo, ferramentas próprias e o modelo que quisermos. É definido num ficheiro .claude/agents/<nome>.md. O comando /agents já não abre um assistente: edita-se o ficheiro.',
  },
  {
    seccao: 'Conceitos', tipo: 'stats', min: 2,
    titulo: 'A regra económica',
    stats: [
      { valor: '20×', rotulo: 'o Haiku é 20 vezes mais barato que o Sonnet' },
      { valor: '{{CUSTO_CARTAO}}', rotulo: 'custo médio de um cartão feito por um agente Haiku' },
      { valor: '{{PESO_ORQ}}', rotulo: 'do custo vai para a sessão principal, não para o enxame' },
    ],
    rodape: 'O máximo possível em Haiku. Sonnet só onde o Haiku falha. Opus só para pensar e rever.',
    notas: 'O enxame barato é o de muitos agentes pequenos com instruções claras. O que custa é a coordenação. Por isso o orquestrador é um script e os workers respondem com uma linha.',
  },
  {
    seccao: 'Conceitos', tipo: 'dag', min: 2,
    titulo: 'Tarefa → grafo → ondas',
    notas: 'O plano é um grafo de dependências. Executamos por ondas: tudo o que está pronto corre em paralelo. Os três cartões de criptografia esperam pelo lib/hash, uma dependência real dentro da onda 1.',
  },
  {
    seccao: 'Conceitos', tipo: 'colunas', min: 1.5,
    titulo: 'Quem decide o grafo é um script',
    colunas: [
      { titulo: 'next-wave.mjs', texto: 'lê o plano e o estado e devolve o próximo lote de chamadas' },
      { titulo: 'o modelo', texto: 'lança exatamente essas chamadas, todas na mesma mensagem' },
      { titulo: 'grade.mjs', texto: 'corre o teste de cada tarefa e decide: verde ou vermelho' },
    ],
    notas: 'Com 15 chamadas em paralelo, um modelo esquece dependências ou reescreve prompts. O script é reproduzível: é isso que torna o custo previsível e o benchmark comparável.',
  },
  {
    seccao: 'Conceitos', tipo: 'fluxo', min: 1.5,
    titulo: 'Medir, não adivinhar',
    passos: ['O subagente termina', 'O hook SubagentStop corre', 'Tokens do transcript × preço', 'Uma linha em usage.jsonl', 'Statusline e /demo-cost'],
    notas: 'Os hooks são comandos que o Claude Code corre em eventos. O nosso só mede: lê os tokens reais do transcript, multiplica pelos preços publicados e acrescenta uma linha. Nunca bloqueia nada.',
  },
  {
    seccao: 'Conceitos', tipo: 'fluxo', min: 1,
    titulo: 'O ciclo de cada tarefa',
    passos: ['plan', 'swarm', 'review', 'cost', 'memória'],
    notas: 'É o mesmo ciclo nos dois projetos: planear com Opus, executar em enxame, um gate de segurança, medir e guardar o que se aprendeu.',
  },
  {
    seccao: 'Conceitos', tipo: 'stats', min: 1, saltar: true,
    titulo: 'Limites que respeitamos',
    stats: [
      { valor: '20', rotulo: 'subagentes em simultâneo, no máximo, por sessão' },
      { valor: '8', rotulo: 'em paralelo por defeito hoje, para contas novas' },
      { valor: '16', rotulo: 'no modo apresentador (100 agentes em lotes)' },
    ],
    notas: 'Saltar se houver atraso. O Claude Code recusa o 21.º subagente em simultâneo. Os limites de taxa da API são por organização. Por isso trabalhamos em lotes.',
  },

  // ---------------- Preview (25–30)
  {
    seccao: 'Preview', tipo: 'video', min: 4,
    titulo: '100 agentes a construir a Arena',
    media: 'media/enxame-acelerado.mp4',
    poster: 'media/estado-final.png',
    legenda: 'Execução real gravada: {{APRES_DURACAO}} · {{APRES_CUSTO}} · {{APRES_AGENTES}} agentes',
    notas: 'Vídeo acelerado de uma execução real do modo apresentador. O tempo e o custo que aparecem no ecrã são os reais. Plano B se o vídeo falhar: abrir /estado?replay=gravacao na Arena gravada.',
  },
  {
    seccao: 'Preview', tipo: 'imagem', min: 1,
    titulo: 'O resultado: um jogo para jogar',
    media: 'media/arena.png',
    legenda: 'Verde: o teste passou · vermelho: falhou. O que não funcionou também se vê.',
    notas: 'Abrir a Arena final no browser e jogar um cartão. É uma app estática, sem risco.',
  },

  // ---------------- Projeto 1 (30–55)
  { seccao: 'Projeto 1', tipo: 'seccao', min: 0.5, titulo: 'Projeto 1', subtitulo: 'A Arena de Segurança', notas: '25 minutos de hands-on. No benchmark, o enxame de 15 cartões demorou 4 a 6 minutos; em modo interativo e com contas novas pode demorar mais. Usamos esse tempo para ver funcionalidades.' },
  {
    seccao: 'Projeto 1', tipo: 'colunas', min: 1,
    titulo: 'O que já está pronto e o que falta',
    colunas: [
      { titulo: 'Pronto', texto: 'a casca da app, 4 modelos de cartão e um teste para cada cartão', cor: 'verde' },
      { titulo: 'Por fazer', texto: '15 cartões, o lib/hash e duas páginas', cor: 'cinza' },
      { titulo: 'Quem faz', texto: 'o teu enxame: Haiku, Sonnet e Opus', cor: 'amarelo' },
    ],
    notas: 'Os testes já existem: cada agente só tem de pôr o seu teste verde. É isto que deixa o Haiku fazer o grosso do trabalho com segurança.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 3,
    titulo: 'Planeia o enxame',
    passos: ['Entra na pasta da Arena', 'Abre o Claude Code e aceita confiar na pasta', 'Corre /demo-plan'],
    comandos: [{ rotulo: 'Terminal 1', cmd: 'cd ~/workshop-claude/demo-project\nclaude\n/demo-plan' }],
    esperado: 'Um diagrama Mermaid, 4 ondas e uma estimativa perto de {{ESTIMATIVA}}',
    notas: 'O diálogo de confiança é importante: sem ele, as permissões do projeto ficam desligadas. O /demo-plan consulta a memória, gera o grafo e pede ao planner (Opus) para o rever.',
  },
  {
    seccao: 'Projeto 1', tipo: 'dag', min: 1.5,
    titulo: 'O teu plano: 4 ondas',
    notas: 'Mostrar o plano de alguém no projetor. Na onda 1, o lib/hash e os cartões arrancam juntos; os de criptografia entram assim que o hash fica verde.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Solta o enxame',
    passos: ['Corre /demo-swarm', 'Abre um segundo terminal', 'Arranca o servidor e abre /estado'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: '/demo-swarm' },
      { rotulo: 'Terminal 2', cmd: 'cd ~/workshop-claude/demo-project\nnode server.js' },
    ],
    esperado: 'http://localhost:3000/estado: os quadrados ficam amarelos e depois verdes',
    notas: 'A partir daqui o enxame trabalha alguns minutos (4 a 6 no benchmark). Os próximos slides usam esse tempo; quem acabar primeiro joga a Arena.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Pergunta sem interromper',
    passos: ['Enquanto o enxame trabalha, no Terminal 1', 'Usa /btw para uma pergunta lateral'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/btw porque é que o cr-01 espera pelo lib-hash?' }],
    esperado: 'Uma resposta que não entra na conversa nem para o enxame',
    notas: 'O /btw responde ao lado. É a forma certa de tirar dúvidas durante uma execução longa.',
  },
  {
    seccao: 'Projeto 1', tipo: 'codigo', min: 2,
    titulo: 'A statusline e o hook que a alimenta',
    intro: 'Em baixo: modelo · sessão · projeto contra o alvo · tempo · enxame.',
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
    depois: '.claude/settings.json da Arena. O /usage do Claude Code dá outra estimativa; o /demo-cost usa os preços publicados.',
    notas: 'Mostrar a statusline a mudar enquanto os agentes terminam. Explicar porque é que o /usage pode mostrar mais: versões que ainda não conhecem os preços mais recentes.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 3,
    titulo: 'No Terminal 2: três funcionalidades',
    passos: ['Plan mode: Shift+Tab até "plan mode"', 'Headless: uma pergunta sem abrir sessão', 'Rewind: Esc Esc para voltar atrás'],
    comandos: [
      { rotulo: 'Plan mode', cmd: 'claude\n(Shift+Tab) Como acrescentavas uma 11.ª categoria?' },
      { rotulo: 'Headless', cmd: 'claude -p "Resume o PLANO.md numa frase" --model claude-haiku-5-5' },
    ],
    esperado: 'Um plano sem alterações, uma frase no terminal e um checkpoint para recuar',
    notas: 'Plan mode só lê e propõe. O claude -p é a base dos scripts e do CI. Esc Esc abre o rewind: repõe código e conversa até um checkpoint, mas não o que foi feito por Bash nem a maior parte do que os subagentes fizeram.',
  },
  {
    seccao: 'Projeto 1', tipo: 'colunas', min: 2, saltar: true,
    titulo: 'Worktrees e rotinas',
    colunas: [
      { titulo: 'claude -w experiencia', texto: 'uma cópia isolada do repositório, num branch próprio, para trabalhar em paralelo' },
      { titulo: 'isolation: worktree', texto: 'um subagente no seu próprio worktree, quando as tarefas mexem nos mesmos ficheiros' },
      { titulo: 'Rotina local', texto: 'o agendador do sistema corre claude -p todos os dias. O /schedule na cloud exige assinatura' },
    ],
    notas: 'Saltar se houver atraso. Exemplo de rotina: uma revisão de segurança diária com node tools/rotina.mjs --instalar, que regista no launchd ou no Agendador de Tarefas um claude -p "/demo-review --auto".',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Até ficar tudo verde',
    passos: ['Se houver quadrados vermelhos no fim', 'Deixa um /loop a trabalhar por ti'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/loop 2m corre node tools/check-integracao.mjs e corrige o primeiro teste vermelho com o implementer; para quando estiver tudo verde' }],
    esperado: 'O loop pára sozinho quando a suite fica verde',
    notas: 'O /loop repete um prompt a cada intervalo, com a sessão aberta. Esc cancela.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'O gate de segurança',
    passos: ['Corre /demo-review', 'Lê o veredito do revisor (Opus)'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/demo-review' }],
    esperado: 'GATE: APROVADO, com testes, CSP, sem eval nem innerHTML, sem segredos',
    notas: 'Um jogo de segurança com falhas de segurança seria o pior exemplo. O gate liga cada verificação ao OWASP Top 10.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Quanto custou?',
    passos: ['Corre /demo-cost', 'Compara o Haiku com o orquestrador'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/demo-cost' }],
    esperado: 'Custo por agente, modelo e onda, perto de {{BENCH_MEDIA}}',
    notas: 'O relatório usa tokens reais e preços publicados. No fim grava as lições na app de memória.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Joga o que o enxame construiu',
    passos: ['Abre a galeria', 'Escolhe um cartão e joga', 'Carrega em "Correr testes"'],
    comandos: [{ rotulo: 'Browser', cmd: 'http://localhost:3000' }],
    esperado: 'Cartões verdes jogáveis; os vermelhos mostram porque falharam',
    notas: 'Os testes também correm no browser. É o mesmo teste que decidiu a cor do quadrado.',
  },

  // ---------------- Memória (55–60)
  {
    seccao: 'Memória', tipo: 'imagem', min: 2,
    titulo: 'A memória do que fizeste',
    media: 'media/memoria-procura.png',
    legenda: 'Procura por ticket ou épico (ex.: ARENA-1): lições, fazer, não fazer e histórico ligados a projetos, épicos, tarefas e ficheiros',
    notas: 'São ficheiros Markdown em ~/.memoria, com um índice SQLite. Fica tudo só no teu PC. Cada memória fica ligada ao ticket do Jira ou do GitHub e ao seu épico: procurar ABC-123 traz tudo desse ticket e do épico. O /task-intake e o /task-plan consultam-na antes de planear ("da última vez neste épico, não fazer X").',
  },
  {
    seccao: 'Memória', tipo: 'faca', min: 3,
    titulo: 'Abre o teu primeiro grafo',
    passos: ['Abre a app Memória', 'Clica num nó para ler a lição', 'Arrasta o deslizador de tempo'],
    comandos: [
      { rotulo: 'Mac', cmd: 'open ~/Applications/Memória.app   (ou: memoria)' },
      { rotulo: 'Windows', cmd: 'Menu Iniciar → Memória   (ou: memoria)' },
    ],
    esperado: 'O grafo da sessão da Arena, com as lições ligadas ao projeto',
    notas: 'Rotinas, worktrees e o modo headless já ficaram vistos nos momentos de espera.',
  },

  // ---------------- Projeto 2 (60–85)
  { seccao: 'Projeto 2', tipo: 'seccao', min: 0.5, titulo: 'Projeto 2', subtitulo: 'A tua tarefa real', notas: '25 minutos. A tarefa pode não terminar aqui: o objetivo é sair com a orquestração a correr e saber continuar.' },
  {
    seccao: 'Projeto 2', tipo: 'fluxo', min: 1.5,
    titulo: 'O mesmo ciclo, no teu repositório',
    passos: ['/task-intake', '/task-plan', '/task-swarm', '/task-gate', '/task-report'],
    notas: 'Os /task-* estão instalados ao nível do utilizador e funcionam em qualquer repositório. Toda a escrita no Jira ou no GitHub pede confirmação.',
  },
  {
    seccao: 'Projeto 2', tipo: 'faca', min: 4,
    titulo: 'Traz a tua tarefa',
    passos: ['Abre o Claude Code na raiz do teu projeto', 'Dá-lhe a issue do Jira ou do GitHub', 'Sem acesso? Usa o projeto de treino'],
    comandos: [
      { rotulo: 'O teu projeto', cmd: 'cd <o teu repositório>\nclaude\n/task-intake ABC-123' },
      { rotulo: 'Projeto de treino', cmd: 'cd ~/workshop-claude/exemplo-projeto-real\nclaude\n/task-intake issues/EX-1.json' },
    ],
    esperado: 'Título, critérios de aceitação e o comando de teste do projeto',
    notas: 'Para o Jira é preciso ter feito login no /mcp (atlassian). O GitHub usa o gh. O intake só lê; não escreve nada.',
  },
  {
    seccao: 'Projeto 2', tipo: 'faca', min: 5,
    titulo: 'O planner decide quantos agentes',
    passos: ['Corre /task-plan', 'Lê o porquê do número de agentes', 'Aprova ou ajusta'],
    comandos: [{ rotulo: 'Terminal', cmd: '/task-plan' }],
    esperado: 'Pequena: 1–3 agentes. Grande: mais, com justificação e estimativa',
    notas: 'O planner (Opus) propõe o grafo e um script valida-o: ciclos, ficheiros em comum, agentes conhecidos. A integração e a revisão são acrescentadas sozinhas.',
  },
  {
    seccao: 'Projeto 2', tipo: 'faca', min: 10,
    titulo: 'Põe o enxame a trabalhar',
    passos: ['Corre /task-swarm', 'Vê o painel noutro terminal', 'Pára com Esc e retoma quando quiseres'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: '/task-swarm' },
      { rotulo: 'Terminal 2', cmd: 'node ~/.workshop-claude/kit/orquestrador/painel.mjs' },
    ],
    esperado: 'Lotes de agentes a terminar; nunca dois no mesmo ficheiro ao mesmo tempo',
    notas: 'O estado fica em .workshop/. Voltar a correr /task-swarm retoma. Tarefas que mexem nos mesmos ficheiros vão em lotes diferentes, ou em git worktrees se o planner o decidir.',
  },
  {
    seccao: 'Projeto 2', tipo: 'colunas', min: 1, saltar: true,
    titulo: 'Jira e GitHub',
    colunas: [
      { titulo: 'Jira (MCP)', texto: 'claude mcp add --transport http atlassian … e login com /mcp' },
      { titulo: 'GitHub (gh)', texto: 'gh auth login: menos contexto do que um MCP e sem tokens partilhados' },
      { titulo: 'Sempre com confirmação', texto: 'comentários, worklog e PR só depois do teu sim' },
    ],
    notas: 'Saltar se houver atraso. O MCP da Atlassian gasta créditos Rovo da empresa e o administrador pode limitá-lo.',
  },
  {
    seccao: 'Projeto 2', tipo: 'colunas', min: 2,
    titulo: 'Depois do workshop',
    colunas: [
      { titulo: '/task-gate', texto: 'testes, segredos, código perigoso e o veredito do Opus' },
      { titulo: '/task-report', texto: 'Jira: um comentário por subtarefa, com agente, modelo, tempo e custo, e o worklog. GitHub: o PR' },
      { titulo: '/memoria', texto: 'as lições desta tarefa ficam para a próxima' },
    ],
    notas: 'Exemplo de comentário: agente ws-worker-07 · Haiku · 5 s · US$ 0,004.',
  },
  {
    seccao: 'Projeto 2', tipo: 'colunas', min: 1, saltar: true,
    titulo: 'Claude Desktop e telemóvel',
    colunas: [
      { titulo: 'Desktop', texto: 'para conversar, com conta claude.ai; o separador Code exige assinatura' },
      { titulo: 'Telemóvel', texto: 'o Remote Control exige assinatura e não aceita API keys' },
      { titulo: 'Hoje', texto: 'tudo no Claude Code, com a tua conta Console' },
    ],
    notas: 'Saltar se houver atraso. Com assinatura, a mesma sessão pode continuar no telemóvel e as rotinas correm na cloud.',
  },

  // ---------------- Encerramento (85–90)
  {
    seccao: 'Encerramento', tipo: 'lista', min: 2,
    titulo: 'Cinco ideias para levar',
    itens: [
      'Skills tornam o trabalho repetível',
      'Subagentes dão contexto limpo e o modelo certo para cada peça',
      'Um script decide o grafo; o modelo executa',
      'Mede-se com hooks; o custo não se adivinha',
      'A memória faz cada tarefa ensinar a próxima',
    ],
    notas: 'Resumo em cinco frases.',
  },
  {
    seccao: 'Encerramento', tipo: 'codigo', min: 1.5,
    titulo: 'Onde está tudo',
    intro: 'Instalar noutra máquina:',
    codigo: '{{ONE_LINER_MAC}}\n\n{{ONE_LINER_WIN}}',
    depois: 'Repositório: {{WORKSHOP_REPO}} · versão {{WORKSHOP_VERSION}} · atualizar a memória: memoria update',
    notas: 'Os comandos são gerados a partir do repos.conf: estão sempre certos para a versão publicada.',
  },
  {
    seccao: 'Encerramento', tipo: 'lista', min: 1,
    titulo: 'Amanhã',
    itens: [
      'Corre /task-intake na próxima issue que te atribuírem',
      'Escreve uma skill para uma tarefa que repetes todas as semanas',
      'Abre a Memória antes de planear',
    ],
    notas: 'Três ações concretas.',
  },
  { seccao: 'Encerramento', tipo: 'titulo', min: 0.5, titulo: 'Perguntas', subtitulo: 'Sem limite de tempo', notas: 'As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora.' },
];
