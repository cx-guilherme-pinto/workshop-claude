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
      { icone: 'network', titulo: 'Um swarm', texto: 'que constrói um jogo de segurança com 15 agentes em paralelo' },
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
    rodape: 'Medido em {{BENCH_N}} execuções reais: média {{BENCH_MEDIA}}, máximo {{BENCH_MAX}}.',
    notas: 'O orçamento é garantido pelo benchmark, não por cortes. Se alguém passar o alvo, aparece um aviso e continua a trabalhar.',
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
    notas: 'Quase todos já instalaram antes (pré-trabalho): para esses, este slide é só para saberem onde está o comando. Quem ainda não instalou corre agora e segue com o vizinho enquanto instala (10 a 15 minutos). O mesmo comando serve para instalar noutra máquina. Os comandos são gerados a partir do repos.conf: estão sempre certos para a versão publicada ({{WORKSHOP_VERSION}}). Para atualizar só a app de memória: memoria update. Antes deste slide, enviar os comandos no Teams para todos copiarem.',
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
    esperado: '"Everything is ready for the workshop" (o setup fala inglês)',
    notas: 'Toda a gente corre o check. Demora 2 a 3 minutos e não instala nada. Quem não fez o setup segue com o vizinho e instala no intervalo das perguntas. O setup fala inglês, mas deteta a língua da máquina e grava a definição language do Claude Code (português, inglês, hindi ou hebraico): as skills respondem nessa língua. A Arena, as tabelas do orquestrador e as docs ficam em português ou inglês (as outras línguas ficam em inglês). Antes deste slide, enviar os comandos no Teams para todos copiarem.',
  },
  {
    seccao: 'Instalar', tipo: 'faca', min: 2,
    titulo: 'Algum passo falhou?',
    aviso: "Os comandos estão no Teams: copia-os de lá.",
    passos: ['Corre o modo doctor', 'Aceita a análise do Claude (menos de US$ 0,01)', 'Confirma os comandos um a um'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{DOCTOR_MAC}}' },
      { rotulo: 'Windows', cmd: '{{DOCTOR_WIN}}' },
    ],
    esperado: 'O passo que falhou é repetido e fica feito',
    notas: 'O Claude lê só o excerto do log daquele passo, sem segredos, e propõe comandos. Nunca executa nada sem confirmação. Se o Claude ainda não estiver instalado, aparece a mensagem pré-escrita do TROUBLESHOOTING. Antes deste slide, enviar os comandos no Teams para todos copiarem.',
  },

  // ---------------- Conceitos (10.5–24.5)
  { seccao: 'Conceitos', tipo: 'seccao', min: 0.5, titulo: 'Conceitos', subtitulo: 'Skills, agentes, grafos e dinheiro', notas: 'Quinze minutos de ideias, um conceito por slide.' },
  {
    seccao: 'Conceitos', tipo: 'colunas', min: 1.5,
    titulo: 'O Claude Code trabalha no teu projeto',
    colunas: [
      { icone: 'file-pen-line', titulo: 'Lê e escreve', texto: 'ficheiros do projeto, com permissões que tu controlas' },
      { icone: 'square-terminal', titulo: 'Corre comandos', texto: 'testes, git, scripts: vê o resultado e corrige' },
      { icone: 'plug', titulo: 'Liga-se a ferramentas', texto: 'Jira, GitHub e a tua memória, via MCP' },
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
3. Repeat until ESTADO: FIM
Answer in the participant's language.`,
    depois: '.claude/skills/ no projeto · ~/.claude/skills/ para todos os projetos · escritas em inglês, respondem na tua língua',
    notas: 'As skills substituíram os slash commands antigos. O frontmatter fixa o modelo e as ferramentas autorizadas. Hoje vamos usar dois sets: os /demo-* na Arena e os /task-* no dia a dia. As skills do kit estão em inglês e mandam o Claude responder na língua do participante.',
  },
  {
    seccao: 'Conceitos', tipo: 'modelos', min: 2,
    titulo: 'Subagentes: contexto e modelo próprios',
    modelos: [
      { nome: 'Opus', papel: 'planear e rever', icone: 'brain', preco: 'US$ 4 / 20' },
      { nome: 'Sonnet', papel: 'integrar e lógica difícil', icone: 'puzzle', preco: 'US$ 2 / 10' },
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
      { valor: '{{CUSTO_CARTAO}}', rotulo: 'custo médio de um cartão feito por um agente Haiku' },
      { valor: '{{PESO_ORQ}}', rotulo: 'do custo vai para a sessão principal, não para o swarm' },
    ],
    rodape: 'O máximo possível em Haiku. Sonnet só onde o Haiku falha. Opus só para pensar e rever.',
    notas: 'O swarm barato é o de muitos agentes pequenos com instruções claras. O que custa é a coordenação. Por isso o orquestrador é um script e os workers respondem com uma linha.',
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
      { icone: 'route', titulo: 'next-wave.mjs', texto: 'lê o plano e o estado e devolve o próximo lote de chamadas' },
      { icone: 'bot', titulo: 'o modelo', texto: 'lança exatamente essas chamadas, todas na mesma mensagem' },
      { icone: 'list-checks', titulo: 'grade.mjs', texto: 'corre o teste de cada tarefa e decide: verde ou vermelho' },
    ],
    notas: 'Com 15 chamadas em paralelo, um modelo esquece dependências ou reescreve prompts. O script é reproduzível: é isso que torna o custo previsível e o benchmark comparável.',
  },
  {
    seccao: 'Conceitos', tipo: 'fluxo', min: 1.5,
    titulo: 'Medir, não adivinhar',
    passos: [
      { titulo: 'O subagente termina', texto: 'cada agente do swarm, quando acaba' },
      { titulo: 'O hook SubagentStop corre', texto: 'um script do kit, chamado pelo Claude Code' },
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
      { titulo: 'plan', texto: 'o Opus parte a tarefa num grafo' },
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
    legendaImagem: 'Um cartão: clica na linha que expõe o segredo e confirma.',
    pontos: [
      { icone: 'gamepad-2', titulo: 'Um mini-jogo, pronto a jogar', texto: 'Desafios curtos de segurança, no browser, em 10 categorias: passwords, phishing, web, redes, criptografia e mais.' },
      { icone: 'layers', titulo: 'Cada cartão é um desafio', texto: 'Em 4 formatos: apontar a linha insegura, escolher a resposta, ordenar os passos ou escrevê-la.' },
      { icone: 'bot', titulo: 'Um agente por cartão', texto: 'Cada agente faz um cartão e o teste desse cartão diz se ficou certo. No vídeo: 100 cartões. No teu portátil: 15.' },
    ],
    estados: true,
    notas: 'Antes do vídeo, dizer o que vai ser construído. A Arena é um mini-jogo de segurança: cada cartão é um desafio pequeno (encontrar a linha que expõe um segredo, escolher o site verdadeiro, ordenar as partes de um URL, escrever uma resposta). A casca da app e os testes já existem; os agentes escrevem os cartões. Explicar as cores agora, porque vão aparecer em todo o lado: cada quadrado é um cartão, cinzento à espera, amarelo enquanto um agente trabalha nele, verde quando o teste passa, vermelho quando falha.',
  },
  {
    "seccao": "Preview",
    "tipo": "seccao",
    "min": 0.5,
    "titulo": "O swarm em ação",
    "subtitulo": "A Arena com 100 cartões, feita por agentes em paralelo. Depois fazes a tua, com 15.",
    "notas": "Ponte para o Projeto 1. O que vão ver é o ciclo do slide anterior (plan → swarm → review → cost → memória) numa execução real com 100 cartões. Logo a seguir cada pessoa faz o mesmo com 15."
  },
  {
    seccao: 'Preview', tipo: 'video', objeto: 'video-enxame', min: 2.5, estados: true,
    titulo: '100 agentes a construir a Arena',
    media: 'media/enxame-acelerado.mp4',
    poster: 'media/estado-final.png',
    legenda: 'Execução real gravada: {{APRES_DURACAO}} · {{APRES_CUSTO}} · {{APRES_AGENTES}} agentes',
    notas: "Vídeo acelerado de uma execução real com 100 cartões. À esquerda, a página /estado: cada quadrado é um cartão, amarelo enquanto um agente trabalha e verde quando o teste passa. À direita, o terminal com os lotes de agentes. O tempo e o custo são os reais. Plano B se o vídeo falhar: abrir /estado?replay=gravacao na Arena gravada.",
  },
  {
    "seccao": "Preview",
    "tipo": "video",
    "min": 1,
    "titulo": "O resultado: um jogo para jogar",
    "media": "media/arena-jogo.mp4",
    "poster": "media/arena-jogo.png",
    "objeto": "video-jogo",
    "legenda": "A Arena que o swarm construiu: desafios de segurança em 4 formatos, para jogar no browser.",
    "notas": "Gravação a jogar a Arena final: apontar a linha insegura, escolher a resposta certa, ordenar os passos e escrever a resposta. Cada cartão explica o porquê no fim. No fim do Projeto 1 cada pessoa joga a sua."
  },

  // ---------------- Projeto 1 (29.5–57.5)
  { seccao: 'Projeto 1', tipo: 'seccao', min: 0.5, titulo: 'Projeto 1', subtitulo: 'A Arena de Segurança', notas: '25 minutos de hands-on. No benchmark, o swarm de 15 cartões demorou 4 a 6 minutos; em modo interativo e com contas novas pode demorar mais. Usamos esse tempo para ver funcionalidades.' },
  {
    seccao: 'Projeto 1', tipo: 'colunas', min: 1,
    titulo: 'O que já está pronto e o que falta',
    colunas: [
      { titulo: 'Pronto', texto: 'a casca da app, 4 modelos de cartão e um teste para cada cartão', cor: 'verde' },
      { titulo: 'Por fazer', texto: '15 cartões, o lib/hash e duas páginas', cor: 'cinza' },
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
    "codigo": "---\nname: demo-plan\nmodel: sonnet\nallowed-tools: node tools/*, Agent\n---\n1. Procura lições na memória\n2. node tools/plan.mjs  → o grafo\n3. O agente planner (Opus) revê o plano\n4. Mostra as ondas, o diagrama e o custo",
    "pontos": [
      {
        "icone": "scroll-text",
        "titulo": "É uma skill",
        "texto": "Um ficheiro Markdown com passos. Escreves /demo-plan e o Claude segue a receita, sempre igual."
      },
      {
        "icone": "workflow",
        "titulo": "O que entra e o que sai",
        "texto": "Entra o TASKS.md, com as tarefas da Arena. Sai o plan.json e o PLANO.md: o grafo com as dependências, as ondas e a estimativa de custo."
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
    "seccao": "Projeto 1",
    "tipo": "anatomia",
    "min": 1.5,
    "titulo": "O que faz o /demo-swarm",
    "rotulo": ".claude/skills/demo-swarm/SKILL.md (resumo)",
    "codigo": "---\nname: demo-swarm\nmodel: sonnet\nallowed-tools: node tools/*, Agent\n---\nRepete até ESTADO: FIM\n  1. next-wave.mjs → o próximo lote\n  2. Lança os agentes do lote, em paralelo\n  3. Cada agente faz 1 cartão e corre o teste\n  4. Mostra a tabela: agente, modelo, custo",
    "pontos": [
      {
        "icone": "route",
        "titulo": "O script decide",
        "texto": "O grafo diz o que pode correr agora. O Claude lança só o lote que o script lhe dá: não improvisa."
      },
      {
        "icone": "bot",
        "titulo": "Um agente, uma tarefa",
        "texto": "Cada agente começa com o contexto limpo, tem um cartão e o teste desse cartão, e usa o modelo certo: Haiku no grosso."
      },
      {
        "icone": "folder-git-2",
        "titulo": "No teu projeto",
        "texto": "O /task-swarm faz o mesmo com as subtarefas da tua issue."
      }
    ],
    "notas": "Explicar antes de correr. O ponto importante: quem escolhe o que corre é um script, não o modelo. Por isso o custo e o tempo são previsíveis. Se um cartão falhar, o script repete-o com a mensagem de erro e, à terceira, com Sonnet."
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Solta o swarm',
    passos: ['Corre /demo-swarm', 'Abre um segundo terminal', 'Arranca o servidor e abre /estado'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: '/demo-swarm' },
      { rotulo: 'Terminal 2', cmd: 'cd ~/workshop-claude/demo-project\nnode server.js' },
    ],
    esperado: 'http://localhost:3000/estado: os quadrados ficam amarelos e depois verdes',
    notas: 'A partir daqui o swarm trabalha alguns minutos (4 a 6 no benchmark). Os próximos slides usam esse tempo; quem acabar primeiro joga a Arena.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Pergunta sem interromper',
    passos: ['Enquanto o swarm trabalha, no Terminal 1', 'Usa /btw para uma pergunta lateral'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/btw porque é que o cr-01 espera pelo lib-hash?' }],
    esperado: 'Uma resposta que não entra na conversa nem para o swarm',
    notas: 'O /btw responde ao lado. É a forma certa de tirar dúvidas durante uma execução longa.',
  },
  {
    "seccao": "Projeto 1",
    "tipo": "anatomia",
    "min": 1.5,
    "titulo": "Hooks: o Claude avisa, um script reage",
    "rotulo": "Evento → comando, no .claude/settings.json",
    "codigo": "SubagentStop      ← um agente terminou\n  └─ node hooks/subagent-stop.mjs\n       lê os tokens que esse agente gastou\n       grava o custo em .workshop/usage.jsonl\n\nOutros eventos: PreToolUse, PostToolUse,\nUserPromptSubmit, Stop, SessionStart",
    "pontos": [
      {
        "icone": "lightbulb",
        "titulo": "O que é",
        "texto": "Um comando que o Claude Code corre sozinho num momento certo: antes ou depois de uma ferramenta, quando um agente acaba, no fim da sessão."
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
    "codigo": "Claude Code ── JSON da sessão ──▶ statusline.mjs\nstatusline.mjs ──── uma linha ────▶ ecrã\n\nSonnet · sessão US$ 0,42 · projeto US$ 1,10 / 5\n· 3 min · swarm 12/15",
    "pontos": [
      {
        "icone": "lightbulb",
        "titulo": "O que é",
        "texto": "Um script que recebe o estado da sessão (modelo, pasta, custo) e devolve uma linha de texto."
      },
      {
        "icone": "gauge",
        "titulo": "No kit",
        "texto": "Lê o que o hook gravou e mostra o custo da sessão e do projeto, ao vivo, contra o alvo de US$ 5."
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
    seccao: 'Projeto 1', tipo: 'colunas', min: 1.5, saltar: true,
    titulo: 'Worktrees e rotinas',
    colunas: [
      { icone: 'git-fork', titulo: 'claude -w experiencia', texto: 'uma cópia isolada do repositório, num branch próprio, para trabalhar em paralelo' },
      { icone: 'git-branch', titulo: 'isolation: worktree', texto: 'um subagente no seu próprio worktree, quando as tarefas mexem nos mesmos ficheiros' },
      { icone: 'calendar-clock', titulo: 'Rotina local', texto: 'o agendador do sistema corre claude -p todos os dias. O /schedule na cloud exige assinatura' },
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
    titulo: 'Joga o que o swarm construiu',
    passos: ['Abre a galeria', 'Escolhe um cartão e joga', 'Carrega em "Correr testes"'],
    comandos: [{ rotulo: 'Browser', cmd: 'http://localhost:3000' }],
    esperado: 'Cartões verdes jogáveis; os vermelhos mostram porque falharam',
    notas: 'Os testes também correm no browser. É o mesmo teste que decidiu a cor do quadrado.',
  },

  // ---------------- Memória (57.5–62.5)
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
    notas: 'A app abre na tua língua nativa e tem um seletor de língua. Rotinas, worktrees e o modo headless já ficaram vistos nos momentos de espera.',
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
    titulo: 'Põe o swarm a trabalhar',
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
      { icone: 'ticket', titulo: 'Jira (MCP + acli)', texto: 'MCP com login no /mcp; se falhar, o Atlassian CLI (acli auth login)' },
      { icone: 'git-pull-request', titulo: 'GitHub (gh)', texto: 'gh auth login: menos contexto do que um MCP e sem tokens partilhados' },
      { icone: 'user-check', titulo: 'Sempre com confirmação', texto: 'comentários, worklog e PR só depois do teu sim' },
    ],
    notas: 'Saltar se houver atraso. O MCP da Atlassian gasta créditos Rovo da empresa e o administrador pode limitá-lo. Se o MCP falhar, as skills usam o Atlassian CLI oficial (acli), que o setup já instalou: lê a issue e publica os comentários; as horas registam-se à mão.',
  },
  {
    seccao: 'Projeto 2', tipo: 'colunas', min: 2,
    titulo: 'Depois do workshop',
    colunas: [
      { icone: 'shield-check', titulo: '/task-gate', texto: 'testes, segredos, código perigoso e o veredito do Opus' },
      { icone: 'message-square-text', titulo: '/task-report', texto: 'Jira: um comentário por subtarefa, com agente, modelo, tempo e custo, e o worklog. GitHub: o PR' },
      { icone: 'share-2', titulo: '/memoria', texto: 'as lições desta tarefa ficam para a próxima' },
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
      'Abre a Memória antes de planear',
    ],
    notas: 'Três ações concretas.',
  },
  { seccao: 'Encerramento', tipo: 'titulo', fecho: true, min: 0.5, titulo: 'Perguntas', subtitulo: 'Sem limite de tempo', rodape: '{{WORKSHOP_REPO}}', notas: 'As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora.' },
];
