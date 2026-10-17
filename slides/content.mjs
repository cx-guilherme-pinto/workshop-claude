// Conteudo da apresentacao (pt-PT). O build.mjs transforma isto em workshop.pptx e speaker-notes.md.
// A versao inglesa (content.en.mjs) tem a mesma forma: mudar um slide aqui = mudar o mesmo slide la.
// {{...}} sao substituidos a partir do repos.conf e do benchmark (ver build.mjs).
// min = minutos do slide; saltar = pode ser saltado se houver atraso.

export const SECCOES = ['Abertura', 'Instalar', 'Conceitos', 'Preview', 'Projeto 1', 'Memória', 'Projeto 2', 'Encerramento'];

export const SLIDES = [
  // ---------------- Abertura (0–4)
  {
    seccao: 'Abertura', tipo: 'titulo', min: 1,
    titulo: 'Orquestração de agentes com Claude',
    subtitulo: 'Skills, subagentes e swarms paralelos, com custo medido',
    notas: 'Boas-vindas. Em 90 minutos vamos pôr um swarm de agentes a construir um jogo e, depois, a trabalhar numa tarefa real de cada um.',
  },
  {
    seccao: 'Abertura', tipo: 'colunas', min: 1.5,
    titulo: 'Vais sair do workshop com isto',
    colunas: [
      { icone: 'network', titulo: 'Um swarm', texto: 'que constrói um jogo de segurança com 100 desafios, até 8 agentes em paralelo' },
      { icone: 'clipboard-check', titulo: 'A tua tarefa', texto: 'real, do Jira ou do GitHub, decomposta e a correr' },
      { icone: 'share-2', titulo: 'Uma memória', texto: 'em grafo do que aprendeste, para usar amanhã' },
    ],
    notas: 'Três resultados concretos. Tudo fica instalado no portátil de cada um e continua a funcionar depois de hoje.',
  },
  {
    seccao: 'Abertura', tipo: 'stats', min: 1.5,
    titulo: 'As regras do custo',
    stats: [
      { valor: 'US$ 5', rotulo: 'alvo por pessoa, para tudo o que fizeres hoje' },
      { valor: 'US$ 10', rotulo: 'teto de segurança, nunca o objetivo' },
      { valor: '0', rotulo: 'sessões interrompidas por custo' },
    ],
    rodape: 'Projeto 1, com as 100 tarefas: {{P1_CUSTO}} numa execução real completa ({{P1_SESSAO}}).',
    notas: 'O orçamento é garantido pelo benchmark, não por cortes. Se alguém passar o alvo, aparece um aviso e a pessoa continua a trabalhar.',
  },

  // ---------------- Instalar (4–10.5)
  {
    seccao: 'Instalar', tipo: 'faca', min: 1.5,
    titulo: 'Instala o kit',
    aviso: "Os comandos estão no Teams: copia-os de lá.",
    passos: ['Já instalaste? Passa ao slide seguinte', 'Copia o comando do teu sistema', 'Cola-o num terminal e responde às perguntas'],
    comandos: [
      { rotulo: 'Mac (Terminal)', cmd: '{{ONE_LINER_MAC}}' },
      { rotulo: 'Windows (PowerShell)', cmd: '{{ONE_LINER_WIN}}' },
    ],
    esperado: 'A tabela-resumo do setup, com cada passo feito',
    notas: 'Quase todos já instalaram antes (pré-trabalho): para esses, este slide é só para saberem onde está o comando. Quem ainda não instalou corre agora e segue com o vizinho enquanto instala (10 a 20 minutos). O mesmo comando serve para instalar noutra máquina. Os comandos são gerados a partir do repos.conf: estão sempre certos para a versão publicada ({{WORKSHOP_VERSION}}). Para atualizar só a app Agent Memory: agent-memory update. Antes deste slide, enviar os comandos no Teams para todos copiarem.',
  },
  {
    seccao: 'Instalar', tipo: 'faca', min: 3,
    titulo: 'Verifica a instalação',
    aviso: "Os comandos estão no Teams: copia-os de lá.",
    passos: ['Abre um terminal', 'Corre o comando do teu sistema', 'Espera pela tabela-resumo'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{CHECK_MAC}}' },
      { rotulo: 'Windows', cmd: '{{CHECK_WIN}}' },
    ],
    esperado: '"Check complete: everything is ready for the workshop." (o setup fala inglês)',
    notas: 'Toda a gente corre o check. Demora 2 a 3 minutos e não instala nada. Quem não fez o setup segue com o vizinho e instala no intervalo das perguntas. O setup fala inglês, mas deteta a língua da máquina e grava a definição language do Claude Code (português, inglês, hindi ou hebraico): as skills respondem nessa língua. A Arena, as tabelas do orquestrador e as docs ficam em português ou inglês (as outras línguas ficam em inglês). Antes deste slide, enviar os comandos no Teams para todos copiarem.',
  },
  {
    seccao: 'Instalar', tipo: 'faca', min: 2,
    titulo: 'Algum passo falhou?',
    aviso: "Os comandos estão no Teams: copia-os de lá.",
    passos: ['Corre o modo doctor', 'Lê o diagnóstico do Claude (menos de US$ 0,01)', 'Segue os passos e volta a correr o comando de instalação'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{DOCTOR_MAC}}' },
      { rotulo: 'Windows', cmd: '{{DOCTOR_WIN}}' },
    ],
    esperado: 'O que falhou, porquê e como resolver; a instalação repete só o que falta',
    notas: 'O doctor verifica tudo e, se algum passo falhou, pede um diagnóstico ao Claude: envia o estado de cada passo e o fim do log, sem segredos. Não executa nada. Voltar a correr o comando de instalação repete só os passos que faltam; aí, em cada falha, o Claude propõe comandos e só os corre com confirmação, um a um. Se o Claude ainda não estiver instalado, aparece a ajuda pré-escrita do TROUBLESHOOTING. Antes deste slide, enviar os comandos no Teams para todos copiarem.',
  },

  // ---------------- Conceitos (10.5–24.5)
  { seccao: 'Conceitos', tipo: 'seccao', min: 0.5, titulo: 'Conceitos', subtitulo: 'Skills, agentes, grafos e dinheiro', notas: 'Quinze minutos de ideias, um conceito por slide.' },
  {
    seccao: 'Conceitos', tipo: 'colunas', min: 1.5,
    titulo: 'O Claude Code trabalha no teu projeto',
    colunas: [
      { icone: 'file-pen-line', titulo: 'Lê e escreve', texto: 'ficheiros do projeto, com permissões que tu controlas' },
      { icone: 'square-terminal', titulo: 'Corre comandos', texto: 'testes, git, scripts: vê o resultado e corrige' },
      { icone: 'plug', titulo: 'Liga-se a ferramentas', texto: 'Jira e a tua memória via MCP; GitHub com o gh' },
    ],
    notas: 'O Claude Code não é um chat: é um agente que age no repositório. Tudo o que faz passa por permissões. Plan mode (Shift+Tab) faz com que só planeie, sem tocar em nada.',
  },
  {
    seccao: 'Conceitos', tipo: 'codigo', min: 2,
    titulo: 'Uma skill é uma receita com nome',
    intro: 'Um ficheiro SKILL.md numa pasta. Escreves /nome e o Claude segue a receita.',
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
3. Repeat until STATE: DONE
Answer in the participant's language.`,
    depois: '.claude/skills/ no projeto · ~/.claude/skills/ para todos os projetos · escritas em inglês, respondem na tua língua',
    notas: 'As skills substituíram os slash commands antigos. O frontmatter fixa o modelo e as ferramentas autorizadas. Hoje vamos usar dois conjuntos: os /demo-* na Arena e os /task-* no dia a dia. As skills do kit estão em inglês e mandam o Claude responder na língua do participante.',
  },
  {
    seccao: 'Conceitos', tipo: 'modelos', min: 2,
    titulo: 'Subagentes: contexto e modelo próprios',
    modelos: [
      { nome: 'Opus', papel: 'planeamento e revisão', icone: 'brain', preco: 'US$ 4 / 20' },
      { nome: 'Sonnet', papel: 'integração e lógica difícil', icone: 'puzzle', preco: 'US$ 2 / 10' },
      { nome: 'Haiku', papel: 'o grosso do swarm', icone: 'feather', preco: 'US$ 0,10 / 0,50' },
    ],
    rodape: 'Preço por milhão de tokens: entrada / saída. Fonte: {{PRICING_URL}} ({{PRICING_DATA}}).',
    notas: 'Um subagente é uma instância do Claude com contexto limpo, ferramentas próprias e o modelo que quisermos. É definido num ficheiro .claude/agents/<nome>.md. O comando /agents já não abre um assistente: edita-se o ficheiro.',
  },
  {
    seccao: 'Conceitos', tipo: 'stats', min: 2,
    titulo: 'A regra económica',
    stats: [
      { valor: '20×', rotulo: 'o Haiku é 20 vezes mais barato que o Sonnet' },
      { valor: '{{CUSTO_CARTAO}}', rotulo: 'custo médio de uma tarefa pequena feita por um agente Haiku' },
      { valor: '{{PESO_ORQ}}', rotulo: 'do custo vai para a sessão principal, não para o swarm' },
    ],
    rodape: 'O máximo possível em Haiku. Sonnet só onde o Haiku falha. Opus só para pensar e rever.',
    notas: 'O swarm barato é o de muitos agentes pequenos com instruções claras. O que custa é a coordenação. Por isso o orquestrador é um script e os workers respondem com uma linha.',
  },
  {
    seccao: 'Conceitos', tipo: 'dag', min: 2,
    titulo: 'Tarefa → grafo → waves',
    notas: 'O plano é um grafo de dependências. Executamos por waves: tudo o que está pronto corre em paralelo. As três tarefas de criptografia esperam pelo lib-hash, uma dependência real dentro da wave 1.',
  },
  {
    seccao: 'Conceitos', tipo: 'colunas', min: 1.5,
    titulo: 'Quem decide o grafo é um script',
    colunas: [
      { icone: 'route', titulo: 'next-wave.mjs', texto: 'lê o plano e o estado e devolve o próximo lote de chamadas (uma wave pode ter vários)' },
      { icone: 'bot', titulo: 'O modelo', texto: 'lança exatamente essas chamadas, todas na mesma mensagem' },
      { icone: 'list-checks', titulo: 'grade.mjs', texto: 'corre o teste de cada tarefa e decide: verde ou vermelho' },
    ],
    notas: 'Com 8 chamadas em paralelo, um modelo esquece dependências ou reescreve prompts. O script é reproduzível: é isso que torna o custo previsível e o benchmark comparável.',
  },
  {
    seccao: 'Conceitos', tipo: 'fluxo', min: 1.5,
    titulo: 'Medir, não adivinhar',
    passos: [
      { titulo: 'O subagente termina', texto: 'cada agente do swarm, quando acaba' },
      { titulo: 'O hook SubagentStop corre', texto: 'um script do kit (o hook Stop mede a sessão principal)' },
      { titulo: 'Tokens × preço', texto: 'os tokens reais do transcript, com os preços publicados' },
      { titulo: 'Uma linha em usage.jsonl', texto: 'agente, modelo, tempo e custo' },
      { titulo: 'Statusline e /demo-cost', texto: 'o custo ao vivo e o relatório final' },
    ],
    notas: 'Os hooks são comandos que o Claude Code corre em eventos. O nosso só mede: lê os tokens reais do transcript, multiplica pelos preços publicados e acrescenta uma linha. Nunca bloqueia nada.',
  },
  {
    seccao: 'Conceitos', tipo: 'fluxo', min: 1,
    titulo: 'O ciclo de cada tarefa',
    passos: [
      { titulo: 'plan', texto: 'a tarefa vira um grafo, revisto pelo Opus' },
      { titulo: 'swarm', texto: 'agentes Haiku fazem as peças em paralelo' },
      { titulo: 'review', texto: 'o Opus verifica os testes e a segurança' },
      { titulo: 'cost', texto: 'quanto custou, por agente e por modelo' },
      { titulo: 'memória', texto: 'as lições ficam para a próxima' },
    ],
    notas: 'É o mesmo ciclo nos dois projetos: planear com Opus, executar em swarm, um gate de segurança, medir e guardar o que se aprendeu.',
  },

  // ---------------- Preview (24.5–29.5)
  {
    seccao: 'Preview', tipo: 'apresenta', min: 1,
    titulo: 'O que vamos construir: a Arena de Segurança',
    media: 'media/arena-cartao.png',
    legendaImagem: 'Um desafio do jogo: clica na linha que expõe o segredo e confirma.',
    pontos: [
      { icone: 'gamepad-2', titulo: 'Um mini-jogo, pronto a jogar', texto: 'Desafios curtos de segurança, no browser, em 10 categorias: passwords, phishing, web, redes, criptografia e mais.' },
      { icone: 'layers', titulo: 'Cada tarefa cria um desafio', texto: 'Em 4 formatos: apontar a linha insegura, escolher a resposta, ordenar os passos ou escrever a resposta.' },
      { icone: 'bot', titulo: 'Um agente por tarefa', texto: 'Cada agente faz uma tarefa e o teste dessa tarefa diz se ficou certa. No vídeo e no teu portátil: as mesmas 100.' },
    ],
    estados: true,
    notas: 'Antes do vídeo, dizer o que vai ser construído. A Arena é um mini-jogo de segurança: cada tarefa cria um desafio pequeno (encontrar a linha que expõe um segredo, escolher o site verdadeiro, ordenar as partes de um URL, escrever uma resposta). A casca da app e os testes já existem; os agentes escrevem os desafios, uma tarefa cada. Explicar as cores agora, porque vão aparecer em todo o lado: cada quadrado é uma tarefa, cinzento à espera, amarelo enquanto um agente trabalha nele, verde quando o teste passa, vermelho quando falha.',
  },
  {
    "seccao": "Preview",
    "tipo": "seccao",
    "min": 0.5,
    "titulo": "O swarm em ação",
    "subtitulo": "A Arena com 100 tarefas, feita por agentes em paralelo. Depois constróis a tua, igual.",
    "notas": "Ponte para o Projeto 1. O que vão ver é o ciclo do slide anterior (plan → swarm → review → cost → memória) numa execução real com 100 tarefas. Logo a seguir cada pessoa constrói a mesma Arena, com até 8 agentes em paralelo."
  },
  {
    seccao: 'Preview', tipo: 'video', objeto: 'video-swarm', min: 2.5, estados: true,
    titulo: '100 agentes a construir a Arena',
    media: 'media/enxame-acelerado.mp4',
    poster: 'media/estado-final.png',
    legenda: 'Sessão real gravada (plan, swarm, review e cost): {{APRES_DURACAO}} · {{APRES_CUSTO}} · {{APRES_AGENTES}} agentes',
    notas: "Vídeo acelerado de uma execução real com 100 tarefas. À esquerda, a página /status: cada quadrado é uma tarefa, amarelo enquanto um agente trabalha e verde quando o teste passa. À direita, o terminal com os lotes de agentes. O tempo e o custo são os reais. Plano B se o vídeo falhar: abrir /status?replay=recording na Arena gravada.",
  },
  {
    "seccao": "Preview",
    "tipo": "video",
    "min": 1,
    "titulo": "O resultado: o jogo pronto para usar",
    "media": "media/arena-jogo.mp4",
    "poster": "media/arena-jogo.png",
    "objeto": "video-game",
    "legenda": "A Arena que o swarm construiu: desafios de segurança em 4 formatos, para jogar no browser.",
    "notas": "Gravação a jogar a Arena final: apontar a linha insegura, escolher a resposta certa, ordenar os passos e escrever a resposta. Cada desafio explica o porquê no fim. No fim do Projeto 1 cada pessoa joga a sua."
  },

  // ---------------- Projeto 1 (29.5–57.5)
  { seccao: 'Projeto 1', tipo: 'seccao', min: 0.5, titulo: 'Projeto 1', subtitulo: 'A Arena de Segurança', notas: '25 minutos de hands-on. Na medição, o swarm das 100 tarefas demorou {{P1_SWARM}} (a sessão completa, {{P1_SESSAO}}); em modo interativo e com contas novas pode demorar mais. Usamos esse tempo para ver funcionalidades.' },
  {
    seccao: 'Projeto 1', tipo: 'colunas', min: 1,
    titulo: 'O que vamos fazer neste projeto hoje',
    colunas: [
      { titulo: 'Pronto', texto: 'a casca da app, 4 formatos de desafio e um teste para cada tarefa', cor: 'verde' },
      { titulo: 'Por fazer', texto: '105 tarefas: 100 desafios, o lib-hash, 2 páginas, a integração e a revisão', cor: 'cinza' },
      { titulo: 'Quem faz', texto: 'o teu swarm: Haiku, Sonnet e Opus', cor: 'amarelo' },
    ],
    notas: 'Os testes já existem: cada agente só tem de pôr o seu teste verde. É isto que deixa o Haiku fazer o grosso do trabalho com segurança.',
  },
  {
    "seccao": "Projeto 1",
    "tipo": "anatomia",
    "min": 1.5,
    "titulo": "O que faz o /demo-plan",
    "rotulo": ".claude/skills/demo-plan/SKILL.md (resumo)",
    "codigo": "---\nname: demo-plan\nmodel: sonnet\nallowed-tools: Read, Agent,\n  node tools/*, memory_search\n---\n1. Procura lições na memória\n2. node tools/plan.mjs  → o grafo\n3. O agente planner (Opus) revê o plano\n4. Mostra as waves, o diagrama e o custo",
    "pontos": [
      {
        "icone": "scroll-text",
        "titulo": "É uma skill",
        "texto": "Um ficheiro Markdown com passos. Escreves /demo-plan e o Claude segue a receita, sempre igual."
      },
      {
        "icone": "workflow",
        "titulo": "O que entra e o que sai",
        "texto": "Entram as especificações da Arena (resumidas no TASKS.md). Saem o plan.json e o PLAN.md: o grafo com as dependências, as waves e a estimativa de custo."
      },
      {
        "icone": "folder-git-2",
        "titulo": "No teu projeto",
        "texto": "O /task-plan faz o mesmo para uma issue tua do Jira ou do GitHub."
      }
    ],
    "notas": "Explicar antes de correr. Uma skill não é magia: é uma receita em Markdown que o Claude segue. Aqui ela chama um script que gera o grafo (sempre o mesmo, a partir das tarefas) e um agente Opus que só o revê. O resultado fica em ficheiros que podem abrir e ler."
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 3,
    titulo: 'Planeia o swarm',
    passos: ['Entra na pasta da Arena', 'Abre o Claude Code e escolhe "Yes, I trust this folder" (↓ e Enter: a opção já selecionada é sair)', 'Corre /demo-plan'],
    comandos: [{ rotulo: 'Terminal 1', cmd: 'cd ~/workshop-claude/demo-project\nclaude\n/demo-plan' }],
    esperado: 'Um diagrama Mermaid, 4 waves e uma estimativa perto de {{ESTIMATIVA}}',
    notas: 'O diálogo de confiança é importante: sem ele, as permissões do projeto ficam desligadas. Nas versões recentes do Claude Code, como a Arena pré-aprova permissões, a opção já selecionada é "No, exit": quem carregar Enter sai. Mostrar a seta para baixo. O /demo-plan consulta a memória, gera o grafo e pede ao planner (Opus) para o rever.',
  },
  {
    seccao: 'Projeto 1', tipo: 'dag', min: 1.5,
    titulo: 'O teu plano: 4 waves',
    notas: 'Mostrar o plano de alguém no projetor. Na wave 1, o lib-hash e as tarefas dos desafios arrancam juntos; os de criptografia entram assim que o hash fica verde.',
  },
  {
    "seccao": "Projeto 1",
    "tipo": "anatomia",
    "min": 1.5,
    "titulo": "O que faz o /demo-swarm",
    "rotulo": ".claude/skills/demo-swarm/SKILL.md (resumo)",
    "codigo": "---\nname: demo-swarm\nmodel: sonnet\nallowed-tools: node tools/*, Agent\n---\nRepete até STATE: DONE\n  1. next-wave.mjs → o próximo lote\n  2. Lança os agentes do lote, em paralelo\n  3. Cada agente faz 1 tarefa e corre o teste\n  4. Mostra a tabela: agente, modelo, custo",
    "pontos": [
      {
        "icone": "route",
        "titulo": "O script decide",
        "texto": "O grafo diz o que pode correr agora. O Claude lança só o lote que o script lhe dá: não improvisa."
      },
      {
        "icone": "bot",
        "titulo": "Um agente, uma tarefa",
        "texto": "Cada agente começa com o contexto limpo, tem uma tarefa e o teste dessa tarefa, e usa o modelo certo: Haiku para o grosso do trabalho."
      },
      {
        "icone": "folder-git-2",
        "titulo": "No teu projeto",
        "texto": "O /task-swarm faz o mesmo com as subtarefas da tua issue."
      }
    ],
    "notas": "Explicar antes de correr. O ponto importante: quem escolhe o que corre é um script, não o modelo. Por isso o custo e o tempo são previsíveis. Se uma tarefa falhar, o script repete-o com a mensagem de erro e, à terceira, com Sonnet."
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Solta o swarm',
    passos: ['Corre /demo-swarm', 'Abre um segundo terminal', 'Arranca o servidor e abre a página /status no browser'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: '/demo-swarm' },
      { rotulo: 'Terminal 2', cmd: 'cd ~/workshop-claude/demo-project\nnode server.js' },
    ],
    esperado: 'http://localhost:3000/status: os quadrados ficam amarelos e depois verdes',
    notas: 'A partir daqui o swarm trabalha alguns minutos ({{P1_SWARM}} na medição; mais com contas novas). Os próximos slides usam esse tempo; quem acabar primeiro joga a Arena.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Pergunta sem interromper',
    passos: ['Volta ao Terminal 1 sem parar o swarm', 'Escreve /btw e a tua pergunta', 'Lê a resposta e fecha-a com Esc'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/btw porque é que a tarefa cr-01 espera pelo lib-hash?' }],
    esperado: 'Uma resposta à parte, fora da conversa; depois de Esc, o swarm segue',
    notas: 'O /btw responde ao lado, sem entrar na conversa. Atenção: enquanto o painel da resposta está aberto, os resultados dos agentes ficam à espera (o Claude Code mostra "background task updates waiting while this panel is open"). Lê e carrega em Esc para o swarm continuar.',
  },
  {
    "seccao": "Projeto 1",
    "tipo": "anatomia",
    "min": 1.5,
    "titulo": "Hooks: o Claude Code avisa, um script reage",
    "rotulo": "Evento → comando, no .claude/settings.json",
    "codigo": "SubagentStop      ← um agente terminou\n  └─ node tools/workshop/hooks/subagent-stop.mjs\n       lê os tokens que esse agente gastou\n       grava o custo em .workshop/usage.jsonl\n\nOutros eventos: PreToolUse, PostToolUse,\nUserPromptSubmit, Stop, SessionStart",
    "pontos": [
      {
        "icone": "lightbulb",
        "titulo": "O que é",
        "texto": "Um comando que o Claude Code corre sozinho num momento definido: antes ou depois de uma ferramenta, quando um agente acaba, no fim da sessão."
      },
      {
        "icone": "target",
        "titulo": "Para que serve",
        "texto": "Medir, validar, formatar ou bloquear, sempre, sem depender de o modelo se lembrar. Aqui, mede o custo de cada agente."
      },
      {
        "icone": "wand-sparkles",
        "titulo": "Faz o teu",
        "texto": "Pede ao Claude: \"Cria um hook PostToolUse que corre o prettier em cada ficheiro que editares.\" Ele escreve-o no settings.json; vês e aprovas no /hooks."
      }
    ],
    "notas": "Sem entrar no código. A ideia: o hook é um \"quando acontecer X, corre Y\", configurado no settings.json. O Claude escreve hooks muito bem: basta descrever o que se quer. Mostrar o /hooks para ver os que estão ativos."
  },
  {
    "seccao": "Projeto 1",
    "tipo": "anatomia",
    "min": 1,
    "titulo": "Statusline: a linha de estado é um script",
    "rotulo": "A linha por baixo da caixa de texto",
    "codigo": "Claude Code ── JSON da sessão ──▶ statusline.mjs\nstatusline.mjs ──── uma linha ────▶ ecrã\n\nSonnet 5.5 · sessão US$ 0,42\n· projeto US$ 1,10 de US$ 5,00\n· swarm 12✓ 2… 1✗ · 3 min",
    "pontos": [
      {
        "icone": "lightbulb",
        "titulo": "O que é",
        "texto": "Um script que recebe o estado da sessão (modelo, pasta, custo) e devolve uma linha de texto."
      },
      {
        "icone": "gauge",
        "titulo": "No kit",
        "texto": "Lê o que o hook gravou e mostra o custo da sessão e do projeto, ao vivo, face ao alvo de US$ 5."
      },
      {
        "icone": "wand-sparkles",
        "titulo": "Faz a tua",
        "texto": "Escreve /statusline e diz o que queres ver, por exemplo \"o branch do git e o custo da sessão\". O Claude gera o script."
      }
    ],
    "notas": "Mostrar a statusline a mudar enquanto os agentes terminam. O hook grava, a statusline mostra: as duas peças juntas dão o custo ao vivo. O /usage do Claude Code pode mostrar mais, porque algumas versões ainda não conhecem os preços mais recentes; o /demo-cost usa os preços publicados."
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 3,
    titulo: 'Num terceiro terminal: três funcionalidades',
    passos: ['Abre um terceiro terminal na pasta da Arena', 'Plan mode: Shift+Tab até "plan mode"', 'Headless: uma pergunta sem abrir sessão', 'Rewind: Esc Esc para voltar atrás'],
    comandos: [
      { rotulo: 'Plan mode', cmd: 'claude\n(Shift+Tab) Como acrescentarias uma 11.ª categoria?' },
      { rotulo: 'Headless', cmd: 'claude -p "Resume o PLAN.md numa frase" --model claude-haiku-5-5' },
    ],
    esperado: 'Um plano sem alterações, uma frase no terminal e um checkpoint para recuar',
    notas: 'Plan mode só lê e propõe. O claude -p é a base dos scripts e do CI. Esc Esc abre o rewind: repõe código e conversa até um checkpoint, mas não o que foi feito por Bash nem a maior parte do que os subagentes fizeram.',
  },
  {
    seccao: 'Projeto 1', tipo: 'colunas', min: 1.5, saltar: true,
    titulo: 'Worktrees e rotinas',
    colunas: [
      { icone: 'git-fork', titulo: 'claude -w experiencia', texto: 'uma cópia isolada do repositório, num branch próprio, para trabalhar em paralelo' },
      { icone: 'git-branch', titulo: 'isolation: worktree', texto: 'um subagente no seu próprio worktree, quando as tarefas mexem nos mesmos ficheiros' },
      { icone: 'calendar-clock', titulo: 'Rotina local', texto: 'o agendador do sistema corre claude -p todos os dias. O /schedule na cloud exige subscrição' },
    ],
    notas: 'Saltar se houver atraso. Exemplo de rotina: uma revisão de segurança diária com node tools/routine.mjs --install --yes (sem --yes só mostra o que faria), que regista no launchd ou no Agendador de Tarefas um claude -p "/demo-review --auto".',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Até ficar tudo verde',
    aviso: "O comando está no Teams: copia-o de lá.",
    passos: ['No fim, procura quadrados vermelhos', 'Se houver, deixa um /loop corrigi-los'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/loop 2m corre node tools/workshop/orchestrator/grade.mjs --all e corrige a primeira tarefa vermelha com o agente implementer; termina quando estiver tudo verde' }],
    esperado: 'O loop termina sozinho quando a suite de testes fica verde',
    notas: 'O /loop repete um prompt a cada intervalo, com a sessão aberta. Esc cancela.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'O gate de segurança',
    passos: ['Corre /demo-review', 'Lê o veredito do revisor (Opus)'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/demo-review' }],
    esperado: 'GATE: APPROVED: testes verdes, CSP ativa, sem eval nem innerHTML, sem segredos',
    notas: 'Um jogo de segurança com falhas de segurança seria o pior exemplo. O gate liga cada verificação ao OWASP Top 10.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Quanto custou?',
    passos: ['Corre /demo-cost', 'Compara os agentes Haiku com a sessão principal'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/demo-cost' }],
    esperado: 'Custo por agente, modelo e wave, perto de {{P1_CUSTO}}',
    notas: 'O relatório usa tokens reais e preços publicados. No fim grava as lições na app de memória.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Joga o que o swarm construiu',
    passos: ['Abre a galeria', 'Escolhe um desafio e joga', 'Carrega em "Correr testes"'],
    comandos: [{ rotulo: 'Browser', cmd: 'http://localhost:3000' }],
    esperado: 'Os desafios das tarefas verdes jogam-se; os vermelhos mostram porque falharam',
    notas: 'Os testes também correm no browser. É o mesmo teste que decidiu a cor do quadrado.',
  },

  // ---------------- Memória (57.5–62.5)
  {
    seccao: 'Memória', tipo: 'imagem', min: 2,
    titulo: 'A memória do que fizeste',
    media: 'media/memoria-procura.png',
    legenda: 'Procura por projeto, issue ou épico (ex.: arena ou EX-1): lições, "fazer", "não fazer" e histórico, ligados a projetos, épicos, tarefas e ficheiros',
    notas: 'São ficheiros Markdown em ~/.agent-memory, com um índice SQLite. Fica tudo só no teu portátil. Cada memória fica ligada ao ticket do Jira ou do GitHub e ao seu épico: procurar ABC-123 traz tudo desse ticket e do épico. O /task-intake e o /task-plan consultam-na antes de planear ("da última vez neste épico, não fazer X").',
  },
  {
    seccao: 'Memória', tipo: 'faca', min: 3,
    titulo: 'Abre o teu primeiro grafo',
    passos: ['Abre a app Agent Memory', 'Clica num nó para ler a lição', 'Arrasta o deslizador de tempo'],
    comandos: [
      { rotulo: 'Mac', cmd: 'open "$HOME/Applications/Agent Memory.app"\n# ou: agent-memory' },
      { rotulo: 'Windows', cmd: 'Menu Iniciar → Agent Memory\n# ou: agent-memory' },
    ],
    esperado: 'O grafo da sessão da Arena, com as lições ligadas ao projeto',
    notas: 'A app abre na tua língua nativa e tem um seletor de língua. Rotinas, worktrees e o modo headless já foram vistos nos momentos de espera.',
  },

  // ---------------- Projeto 2 (62.5–86.5)
  { seccao: 'Projeto 2', tipo: 'seccao', min: 0.5, titulo: 'Projeto 2', subtitulo: 'A tua tarefa real', notas: '25 minutos. A tarefa pode não terminar aqui: o objetivo é sair com a orquestração a correr e saber continuar.' },
  {
    seccao: 'Projeto 2', tipo: 'fluxo', min: 1.5,
    titulo: 'O mesmo ciclo, no teu repositório',
    passos: [
      { titulo: '/task-intake', texto: 'lê a issue do Jira ou do GitHub' },
      { titulo: '/task-plan', texto: 'decide quantos agentes e porquê' },
      { titulo: '/task-swarm', texto: 'os agentes trabalham em lotes' },
      { titulo: '/task-gate', texto: 'testes, segredos e o veredito do Opus' },
      { titulo: '/task-report', texto: 'comentários, worklog e PR, depois do teu sim' },
    ],
    notas: 'Os /task-* estão instalados ao nível do utilizador e funcionam em qualquer repositório. Toda a escrita no Jira ou no GitHub pede confirmação.',
  },
  {
    seccao: 'Projeto 2', tipo: 'faca', min: 4,
    titulo: 'Traz a tua tarefa',
    passos: ['Abre o Claude Code na raiz do teu projeto', 'Dá-lhe a issue do Jira (ABC-123) ou do GitHub (#42)', 'Sem acesso? Usa o projeto de treino'],
    comandos: [
      { rotulo: 'O teu projeto', cmd: 'cd <o teu repositório>\nclaude\n/task-intake ABC-123' },
      { rotulo: 'Projeto de treino', cmd: 'cd ~/workshop-claude/practice-project\nclaude\n/task-intake issues/EX-1.json' },
    ],
    esperado: 'Título, critérios de aceitação e o comando de teste do projeto',
    notas: 'Para o Jira é preciso ter feito login no /mcp (atlassian). O GitHub usa o gh. O intake só lê; não escreve nada.',
  },
  {
    seccao: 'Projeto 2', tipo: 'faca', min: 5,
    titulo: 'O planner decide quantos agentes',
    passos: ['Corre /task-plan', 'Lê o porquê do número de agentes', 'Aprova ou ajusta'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/task-plan' }],
    esperado: 'Pequena: 1–3 agentes. Grande: mais, com justificação e estimativa',
    notas: 'O planner (Opus) propõe o grafo e um script valida-o: ids, dependências, ciclos e agentes conhecidos. As tarefas que mexem nos mesmos ficheiros ficam em lotes diferentes, na altura do swarm. A integração e a revisão são acrescentadas automaticamente.',
  },
  {
    seccao: 'Projeto 2', tipo: 'faca', min: 10,
    titulo: 'Põe o swarm a trabalhar',
    passos: ['Corre /task-swarm', 'Noutro terminal, na pasta do projeto, abre o painel', 'Interrompe com Esc; corre /task-swarm de novo para retomar'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: '/task-swarm' },
      { rotulo: 'Terminal 2', cmd: 'cd <o teu repositório>\nnode "$HOME/.workshop-claude/kit/orchestrator/dashboard.mjs"' },
    ],
    esperado: 'Lotes de agentes a terminar; nunca dois no mesmo ficheiro ao mesmo tempo',
    notas: 'O estado fica em .workshop/. Voltar a correr /task-swarm retoma. Tarefas que mexem nos mesmos ficheiros vão em lotes diferentes, ou em git worktrees se o planner o decidir.',
  },
  {
    seccao: 'Projeto 2', tipo: 'colunas', min: 1, saltar: true,
    titulo: 'Jira e GitHub',
    colunas: [
      { icone: 'ticket', titulo: 'Jira (MCP + acli)', texto: 'MCP com login no /mcp; se falhar, o Atlassian CLI (acli auth login)' },
      { icone: 'git-pull-request', titulo: 'GitHub (gh)', texto: 'gh auth login: gasta menos contexto do que um MCP e não partilha tokens' },
      { icone: 'user-check', titulo: 'Sempre com confirmação', texto: 'comentários, worklog e PR só depois do teu sim' },
    ],
    notas: 'Saltar se houver atraso. O MCP da Atlassian gasta créditos Rovo da empresa e o administrador pode limitá-lo. Se o MCP falhar, as skills usam o Atlassian CLI oficial (acli), que o setup já instalou: lê a issue e publica os comentários; as horas registam-se à mão.',
  },
  {
    seccao: 'Projeto 2', tipo: 'colunas', min: 2,
    titulo: 'Depois do workshop',
    colunas: [
      { icone: 'shield-check', titulo: '/task-gate', texto: 'testes, segredos, código perigoso e o veredito do Opus' },
      { icone: 'message-square-text', titulo: '/task-report', texto: 'Jira: um comentário por subtarefa e o worklog. GitHub: o PR' },
      { icone: 'share-2', titulo: '/memory', texto: 'as lições desta tarefa ficam para a próxima' },
    ],
    notas: 'Exemplo de comentário: agente ws-worker-07 · Haiku · 5 s · US$ 0,004.',
  },

  // ---------------- Encerramento (86.5–90)
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
    seccao: 'Encerramento', tipo: 'lista', min: 1,
    titulo: 'Amanhã',
    itens: [
      'Corre /task-intake na próxima issue que te atribuírem',
      'Escreve uma skill para uma tarefa que repetes todas as semanas',
      'Abre a Agent Memory antes de planear',
    ],
    notas: 'Três ações concretas.',
  },
  { seccao: 'Encerramento', tipo: 'titulo', fecho: true, min: 0.5, titulo: 'Perguntas', subtitulo: 'Sem limite de tempo', rodape: '{{WORKSHOP_REPO}}', notas: 'As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora.' },
];
