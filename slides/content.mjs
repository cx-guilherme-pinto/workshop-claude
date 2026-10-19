// Conteudo da apresentacao (pt-PT). O build.mjs transforma isto em workshop.pptx e speaker-notes.md.
// A versao inglesa (content.en.mjs) tem a mesma forma: mudar um slide aqui = mudar o mesmo slide la.
// {{...}} sao substituidos a partir do repos.conf, do pricing.json e do slides/dados.json (ver build.mjs).
// Os numeros do Projeto 1 (custo, tempos, agentes, estimativa) vem TODOS do dados.json (P1_*, ESTIMATIVA):
// uma so execucao de referencia. O video do swarm e outra execucao (modo apresentador) e usa os APRES_*.
// min = minutos do slide; saltar = pode ser saltado se houver atraso.

export const SECCOES = ['Abertura', 'Instalar', 'Conceitos', 'Preview', 'Projeto 1', 'Memória', 'Projeto 2', 'Encerramento'];

export const SLIDES = [
  // ---------------- Abertura (0–4)
  {
    seccao: 'Abertura', tipo: 'titulo', min: 1,
    titulo: 'Orquestração de agentes com Claude',
    subtitulo: 'Skills, subagentes e swarms paralelos, com custo medido',
    notas: 'Boas-vindas. Em 90 minutos vamos pôr um swarm de agentes a construir um jogo e, depois, a trabalhar numa tarefa a sério, num repositório com testes.',
  },
  {
    seccao: 'Abertura', tipo: 'colunas', min: 1.5,
    titulo: 'Vais sair do workshop com isto',
    colunas: [
      { icone: 'network', titulo: 'Um swarm', texto: 'que constrói um jogo de segurança com 100 desafios, até {{P1_PARALELO}} agentes em paralelo' },
      { icone: 'clipboard-check', titulo: 'Uma tarefa', texto: 'num repositório a sério, decomposta e a correr: a do projeto de treino ou uma tua' },
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
    rodape: 'Projeto 1, numa execução real completa: {{P1_CUSTO}}, {{P1_AGENTES}} agentes, swarm em {{P1_SWARM}}, sessão em {{P1_SESSAO}}.',
    notas: 'O orçamento é garantido pelo benchmark, não por cortes. Se alguém passar o alvo, aparece um aviso e a pessoa continua a trabalhar. Os números do rodapé são os da execução de referência do Projeto 1 ({{P1_PARALELO}} agentes em paralelo, como no portátil de cada um): são os mesmos que aparecem no resto da apresentação.',
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

  // ---------------- Conceitos (10.5–18)
  { seccao: 'Conceitos', tipo: 'seccao', min: 0.5, titulo: 'Conceitos', subtitulo: 'Skills, agentes e dinheiro', notas: 'Sete minutos de ideias, um conceito por slide. O grafo de tarefas e a medição do custo ficam para o Projeto 1, ao lado do sítio onde se usam.' },
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
    seccao: 'Conceitos', tipo: 'codigo', min: 1.5,
    titulo: 'Uma skill é uma receita com nome',
    intro: 'Um ficheiro SKILL.md numa pasta. Escreves /nome e o Claude segue a receita.',
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
    depois: '.claude/skills/ no projeto · ~/.claude/skills/ para todos os projetos · escritas em inglês, respondem na tua língua',
    notas: 'As skills substituíram os slash commands antigos. O frontmatter fixa o modelo e as ferramentas autorizadas. Hoje vamos usar dois conjuntos: os /demo-* na Arena e os /task-* no dia a dia. As skills do kit estão em inglês e mandam o Claude responder na língua do participante.',
  },
  {
    seccao: 'Conceitos', tipo: 'modelos', min: 1.5,
    titulo: 'Subagentes: contexto e modelo próprios',
    modelos: [
      { nome: 'Opus', papel: 'planeamento e revisão', icone: 'brain', preco: 'US$ 4 / 20' },
      { nome: 'Sonnet', papel: 'integração e lógica difícil', icone: 'puzzle', preco: 'US$ 2 / 10' },
      { nome: 'Haiku', papel: 'o grosso do swarm', icone: 'feather', preco: 'US$ 0,10 / 0,50' },
    ],
    rodape: 'Preço por milhão de tokens: entrada / saída.\nFonte: {{PRICING_URL}} ({{PRICING_DATA}})',
    notas: 'Um subagente é uma instância do Claude com contexto limpo, ferramentas próprias e o modelo que quisermos. É definido num ficheiro .claude/agents/<nome>.md. O comando /agents já não abre um assistente: edita-se o ficheiro.',
  },
  {
    seccao: 'Conceitos', tipo: 'stats', min: 1.5,
    titulo: 'A regra económica',
    stats: [
      { valor: '20×', rotulo: 'o Haiku é 20 vezes mais barato que o Sonnet' },
      { valor: '{{CUSTO_CARTAO}}', rotulo: 'custo médio de uma tarefa pequena feita por um agente Haiku' },
      { valor: '{{PESO_ORQ}}', rotulo: 'do custo vai para a sessão principal, não para o swarm' },
    ],
    rodape: 'O máximo possível em Haiku. Sonnet só onde o Haiku falha. Opus só para pensar e rever.',
    notas: 'O swarm barato é o de muitos agentes pequenos com instruções claras. O que custa é a coordenação. Por isso o orquestrador é um script e os workers respondem com uma linha. Os dois números vêm da execução de referência do Projeto 1.',
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
    notas: 'É o mesmo ciclo nos dois projetos: planear com Opus, executar em swarm, um gate de segurança, medir e guardar o que se aprendeu. Cada passo volta a aparecer no Projeto 1, no sítio em que se usa.',
  },

  // ---------------- Preview (18–23)
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
    seccao: 'Preview', tipo: 'seccao', min: 0.5,
    titulo: 'O swarm em ação',
    subtitulo: 'A Arena com 100 tarefas, feita por agentes em paralelo. Depois constróis a tua, igual.',
    notas: 'Ponte para o Projeto 1. O que vão ver é o ciclo dos conceitos (plan → swarm → review → cost → memória) numa execução real com 100 tarefas. Logo a seguir cada pessoa constrói a mesma Arena, com até {{P1_PARALELO}} agentes em paralelo.',
  },
  {
    seccao: 'Preview', tipo: 'video', objeto: 'video-swarm', min: 2.5, estados: true,
    titulo: 'O swarm a construir a Arena',
    media: 'media/enxame-acelerado.mp4',
    poster: 'media/estado-final.png',
    legenda: 'Outra execução, em modo apresentador ({{APRES_PARALELO}} agentes em paralelo): {{APRES_DURACAO}} · {{APRES_CUSTO}} · {{APRES_AGENTES}} agentes',
    notas: 'Vídeo acelerado de uma execução real com 100 tarefas, gravada em modo apresentador: {{APRES_PARALELO}} agentes em paralelo, por isso os números do rodapé não são os do Projeto 1 (no portátil de cada um correm {{P1_PARALELO}} em paralelo; ver o slide do custo). À esquerda, a página /status: cada quadrado é uma tarefa, amarelo enquanto um agente trabalha e verde quando o teste passa. À direita, o terminal com os lotes de agentes. Plano B se o vídeo falhar: abrir /status?replay=recording na Arena gravada.',
  },
  {
    seccao: 'Preview', tipo: 'video', min: 1,
    titulo: 'O resultado: o jogo pronto para usar',
    media: 'media/arena-jogo.mp4',
    poster: 'media/arena-jogo.png',
    objeto: 'video-game',
    legenda: 'A Arena que o swarm construiu: desafios de segurança em 4 formatos, para jogar no browser.',
    notas: 'Gravação a jogar a Arena final: apontar a linha insegura, escolher a resposta certa, ordenar os passos e escrever a resposta. Cada desafio explica o porquê no fim. No fim do Projeto 1 cada pessoa joga a sua.',
  },

  // ---------------- Projeto 1 (23–60)
  { seccao: 'Projeto 1', tipo: 'seccao', min: 0.5, titulo: 'Projeto 1', subtitulo: 'A Arena de Segurança', notas: '37 minutos de hands-on. Na execução de referência, o swarm das 100 tarefas demorou {{P1_SWARM}} (a sessão completa, {{P1_SESSAO}}); em modo interativo e com contas novas pode demorar mais. Os slides entre "Solta o swarm" e "Porque é que este cartão falhou?" (9 minutos) cobrem essa espera: são todos para fazer enquanto o swarm trabalha.' },
  {
    seccao: 'Projeto 1', tipo: 'colunas', min: 1,
    titulo: 'O que vamos fazer neste projeto hoje',
    colunas: [
      { titulo: 'Pronto', texto: 'a casca da app, 4 formatos de desafio e um teste para cada tarefa', cor: 'verde' },
      { titulo: 'Por fazer', texto: '100 desafios e o teu, o lib-hash, 2 páginas, a integração e a revisão', cor: 'cinza' },
      { titulo: 'Quem faz', texto: 'o teu swarm: Haiku, Sonnet e Opus', cor: 'amarelo' },
    ],
    notas: 'Os testes já existem: cada agente só tem de pôr o seu teste verde. É isto que deixa o Haiku fazer o grosso do trabalho com segurança. São 105 tarefas; com o cartão de cada um, 106.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 5,
    titulo: 'Escreve o teu cartão',
    intro: 'Antes de planear, junta um desafio teu aos 100: o swarm também o constrói.',
    passos: ['Copia o exemplo para specs/my-card.json', 'No editor, muda title, concept, prompt e template: spot-the-flaw, choice, order ou answer', 'Gera os ficheiros do cartão'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: 'cd ~/workshop-claude/demo-project\ncp specs/my-card.example.json specs/my-card.json\n# edita o specs/my-card.json e depois:\nnode tools/gen.mjs' },
    ],
    esperado: 'Depois do swarm: o cartão my-01 na galeria e no /status (101 cartões), feito por um agente Haiku',
    notas: 'O exemplo já tem todos os campos: basta mudar o texto. O template escolhe o formato: spot-the-flaw (apontar a linha insegura), choice (escolher a resposta), order (ordenar os passos) ou answer (escrever a resposta); cada um tem os seus campos, e o exemplo mostra-os. O gen.mjs escreve a spec e o teste do cartão (cards/my-01/), e o /demo-plan junta-o às outras tarefas: passam a ser 101 cartões. Quem não quiser escrever salta este passo e fica com 100. No Windows, o cp funciona no PowerShell.',
  },
  {
    seccao: 'Projeto 1', tipo: 'anatomia', min: 1.5,
    titulo: 'O que faz o /demo-plan',
    rotulo: '.claude/skills/demo-plan/SKILL.md (resumo)',
    codigo: '---\nname: demo-plan\nmodel: sonnet\nallowed-tools: Read, Agent,\n  node tools/*, memory_search\n---\n1. Procura lições na memória\n2. node tools/plan.mjs → o grafo\n3. O planner (Opus) revê o plano\n4. Mostra waves, diagrama e custo',
    pontos: [
      { icone: 'scroll-text', titulo: 'É uma skill', texto: 'Um ficheiro Markdown com passos: escreves /demo-plan e o Claude segue a receita.' },
      { icone: 'workflow', titulo: 'O que entra e o que sai', texto: 'Entram as specs da Arena. Saem o plan.json e o PLAN.md: o grafo e a estimativa.' },
      { icone: 'folder-git-2', titulo: 'No teu projeto', texto: 'O /task-plan faz o mesmo para uma issue do Jira ou do GitHub.' },
    ],
    notas: 'Explicar antes de correr. Uma skill não é magia: é uma receita em Markdown que o Claude segue. Aqui ela chama um script que gera o grafo (sempre o mesmo, a partir das tarefas, incluindo o teu cartão) e um agente Opus que só o revê. O resultado fica em ficheiros que podem abrir e ler (o PLAN.md tem as waves, as dependências e a estimativa).',
  },
  {
    seccao: 'Projeto 1', tipo: 'dag', min: 1.5,
    titulo: 'Tarefa → grafo → waves',
    notas: 'O plano é um grafo de dependências. Executamos por waves: tudo o que está pronto corre em paralelo. Na wave 1, o lib-hash e os desafios arrancam juntos; as três tarefas de criptografia esperam pelo lib-hash (uma dependência real dentro da wave 1) e entram assim que ele fica verde. É isto que o /demo-plan vai desenhar no slide seguinte.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 3,
    titulo: 'Planeia o swarm',
    passos: ['Na pasta da Arena, abre o Claude Code', 'Escolhe "Yes, I trust this folder" (↓ e Enter: a opção já selecionada é sair)', 'Corre /demo-plan'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: 'cd ~/workshop-claude/demo-project\nclaude\n/demo-plan' },
      { rotulo: 'Opcional: tu escolhes o modelo da criptografia', cmd: '/demo-plan --crypto haiku\n/demo-plan --crypto sonnet' },
    ],
    esperado: 'Um diagrama Mermaid, 4 waves e uma estimativa perto de {{ESTIMATIVA}}',
    notas: 'O diálogo de confiança é importante: sem ele, as permissões do projeto ficam desligadas. Nas versões recentes do Claude Code, como a Arena pré-aprova permissões, a opção já selecionada é "No, exit": quem carregar Enter sai. Mostrar a seta para baixo. O /demo-plan consulta a memória, gera o grafo e pede ao planner (Opus) para o rever. Depois, mostrar o plano de alguém no projetor. Decisão de custo opcional: com --crypto haiku ou --crypto sonnet cada pessoa escolhe o modelo das tarefas de criptografia; no fim, no /demo-cost, compara o custo e os verdes com o vizinho que escolheu o outro.',
  },
  {
    seccao: 'Projeto 1', tipo: 'anatomia', min: 1.5,
    titulo: 'O que faz o /demo-swarm',
    rotulo: '.claude/skills/demo-swarm/SKILL.md (resumo)',
    codigo: '---\nname: demo-swarm\nmodel: sonnet\nallowed-tools: node tools/*, Agent\n---\nRepete até STATE: DONE\n 1. next-wave.mjs → o próximo lote\n 2. Lança o lote, em paralelo\n 3. 1 agente = 1 tarefa + o teste\n 4. Mostra agente, modelo e custo',
    pontos: [
      { icone: 'route', titulo: 'Um script decide', texto: 'O next-wave.mjs lê o grafo e diz o que corre agora. O Claude lança esse lote e não improvisa.' },
      { icone: 'bot', titulo: 'Um agente, uma tarefa', texto: 'Contexto limpo, uma tarefa, o teste dela e o modelo certo: Haiku para o grosso.' },
      { icone: 'folder-git-2', titulo: 'No teu projeto', texto: 'O /task-swarm faz o mesmo com as subtarefas da tua issue.' },
    ],
    notas: 'Explicar antes de correr. O ponto importante: quem escolhe o que corre é um script, não o modelo. Com {{P1_PARALELO}} chamadas em paralelo, um modelo esquece dependências ou reescreve prompts; o script é reproduzível, e é isso que torna o custo previsível e o benchmark comparável. O grade.mjs corre o teste de cada tarefa e decide: verde ou vermelho. Se uma tarefa falhar, o script repete-a com a mensagem de erro e, à terceira, com Sonnet.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Solta o swarm',
    passos: ['Corre /demo-swarm', 'Abre um segundo terminal', 'Arranca o servidor e abre o endereço /status que ele mostra'],
    comandos: [
      { rotulo: 'Terminal 1', cmd: '/demo-swarm' },
      { rotulo: 'Terminal 2', cmd: 'cd ~/workshop-claude/demo-project\nnode server.js' },
    ],
    esperado: 'Em /status (normalmente http://localhost:3000/status; se a porta estiver ocupada, o node server.js mostra outra): os quadrados ficam amarelos e depois verdes',
    notas: 'Previsão, antes de carregar em Enter: cada pessoa escreve no Teams quanto acha que vai custar e quantos cartões vão ficar vermelhos. A partir daqui o swarm trabalha alguns minutos ({{P1_SWARM}} na execução de referência; mais com contas novas). Os próximos quatro slides (9 minutos) fazem-se durante essa espera; quem acabar primeiro joga a Arena.',
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
    seccao: 'Projeto 1', tipo: 'faca', saltar: true, min: 3,
    titulo: 'Num terceiro terminal: três funcionalidades',
    passos: ['Abre um terceiro terminal na pasta da Arena', 'Plan mode: Shift+Tab até "plan mode"', 'Headless: uma pergunta sem abrir sessão', 'Rewind: Esc Esc para voltar atrás'],
    comandos: [
      { rotulo: 'Plan mode', cmd: 'claude\n(Shift+Tab) Como acrescentarias uma 11.ª categoria?' },
      { rotulo: 'Headless', cmd: 'claude -p "Resume o PLAN.md numa frase" --model claude-haiku-5-5' },
    ],
    esperado: 'Um plano sem alterações, uma frase no terminal e um checkpoint para recuar',
    notas: 'Ainda durante o swarm. Plan mode só lê e propõe. O claude -p é a base dos scripts e do CI. Esc Esc abre o rewind: repõe código e conversa até um checkpoint, mas não o que foi feito por Bash nem a maior parte do que os subagentes fizeram. Se perguntarem por worktrees: claude -w <nome> abre uma cópia isolada do repositório num branch próprio, e isolation: worktree põe um subagente no seu worktree quando as tarefas mexem nos mesmos ficheiros.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Cria um hook PostToolUse',
    intro: 'Um hook é um comando que o Claude Code corre sozinho num evento. O kit mede o custo assim.',
    passos: ['No Terminal 3, abre o Claude no projeto de treino', 'Pede o hook por palavras tuas', 'Abre o /hooks e confirma que está lá'],
    comandos: [
      { rotulo: 'Terminal 3', cmd: 'cd ~/workshop-claude/practice-project\nclaude\n> Cria um hook PostToolUse em\n  .claude/settings.local.json: depois de\n  cada Edit ou Write, junta a hora e o\n  ficheiro a ~/workshop-claude/edits.log' },
    ],
    esperado: 'O /hooks mostra o teu PostToolUse; no Projeto 2, cada ficheiro editado aparece no edits.log',
    notas: 'Ainda durante o swarm, e fora da Arena, para não mexer na sessão do swarm. O hook é um "quando acontecer X, corre Y", configurado num settings.json; o Claude escreve hooks muito bem, basta descrever o que se quer. O settings.local.json é só desta pasta e não vai para o git. No Projeto 2 (o projeto de treino) o hook dispara também para os agentes do /task-swarm: abrir o edits.log e ver os ficheiros a aparecer. O kit usa o SubagentStop para gravar o custo de cada agente (ver "Medir, não adivinhar").',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Faz a tua statusline',
    intro: 'A linha por baixo da caixa de texto é um script: recebe a sessão em JSON e devolve uma linha.',
    passos: ['Ainda no Terminal 3, escreve /statusline e o que queres ver', 'Aceita o script que o Claude escreve', 'Vê a linha nova por baixo da caixa de texto'],
    comandos: [{ rotulo: 'Terminal 3', cmd: '/statusline mostra o modelo, o branch\n  do git e o custo da sessão; grava-a só\n  neste projeto, em\n  .claude/settings.local.json' }],
    esperado: 'A tua linha neste projeto; no Terminal 1, a statusline do kit continua com o custo do swarm',
    notas: 'Ainda durante o swarm. A statusline do kit lê o que o hook gravou e mostra o custo da sessão e do projeto, ao vivo, face ao alvo de US$ 5: mostrar a do Terminal 1 a mudar enquanto os agentes terminam. Pedir para gravar em .claude/settings.local.json é importante: sem isso, o /statusline grava nas definições do utilizador e substitui a do kit em todos os projetos. Para voltar à do kit neste projeto, apaga o statusLine do settings.local.json. O /usage do Claude Code pode mostrar mais, porque algumas versões ainda não conhecem os preços mais recentes; o /demo-cost usa os preços publicados.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 5,
    titulo: 'Porque é que este cartão falhou?',
    intro: '4 cartões falham de propósito: a spec deixa de fora um detalhe que o teste verifica.',
    passos: ['No /status, clica num quadrado vermelho', 'Lê a linha do teste que falhou', 'Acrescenta o detalhe que falta em cards/<id>/spec.md', 'Corre de novo só esse cartão'],
    comandos: [
      { rotulo: 'Browser', cmd: 'http://localhost:3000/status' },
      { rotulo: 'Terminal 1', cmd: '/demo-swarm --retry <id>' },
    ],
    esperado: 'Esse quadrado fica verde: a qualidade da spec decide o swarm',
    notas: 'A lição do Projeto 1: o agente não adivinha o que a spec não diz. O teste mostra o que esperava e o que recebeu; a spec do cartão não o dizia, por isso nem o Haiku nem o Sonnet (que entra à terceira tentativa) o acertam. Quem acabar repete para os outros vermelhos: o gate só aprova com tudo verde. Comparar com a previsão do Teams: quantos vermelhos esperavam? Extra opcional, para quem quiser automatizar: /loop 2m corre node tools/workshop/orchestrator/grade.mjs --all e corrige a primeira tarefa vermelha com o agente implementer; termina quando estiver tudo verde (o /loop repete um prompt a cada intervalo; Esc cancela).',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'O gate de segurança',
    passos: ['Corre /demo-review', 'Lê o veredito do revisor (Opus)'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/demo-review' }],
    esperado: 'GATE: APPROVED: testes verdes, CSP ativa, sem eval nem innerHTML, sem segredos',
    notas: 'Um jogo de segurança com falhas de segurança seria o pior exemplo. O gate liga cada verificação ao OWASP Top 10. Com cartões ainda vermelhos, o gate diz GATE: REJECTED e quais faltam: voltar ao slide anterior.',
  },
  {
    seccao: 'Projeto 1', tipo: 'fluxo', saltar: true, min: 1,
    titulo: 'Medir, não adivinhar',
    passos: [
      { titulo: 'O subagente termina', texto: 'cada agente do swarm, quando acaba' },
      { titulo: 'O hook SubagentStop corre', texto: 'um script do kit (o hook Stop mede a sessão principal)' },
      { titulo: 'Tokens × preço', texto: 'os tokens reais do transcript, com os preços publicados' },
      { titulo: 'Uma linha em usage.jsonl', texto: 'agente, modelo, tempo e custo' },
      { titulo: 'Statusline e /demo-cost', texto: 'o custo ao vivo e o relatório final' },
    ],
    notas: 'Antes do /demo-cost: de onde vêm os números. O hook do kit é como o que criaram, mas noutro evento: lê os tokens reais do transcript, multiplica pelos preços publicados e acrescenta uma linha. Nunca bloqueia nada. A statusline e o /demo-cost só leem essas linhas.',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Quanto custou?',
    passos: ['Corre /demo-cost', 'Compara os agentes Haiku com a sessão principal', 'Compara com o vizinho: custo e cartões verdes'],
    comandos: [{ rotulo: 'Terminal 1', cmd: '/demo-cost' }],
    esperado: 'Custo por agente, modelo e wave, perto de {{P1_CUSTO}}',
    notas: 'O relatório usa tokens reais e preços publicados. No fim grava as lições na app de memória. Quem usou --crypto haiku compara com quem usou --crypto sonnet: custo e verdes. Duelo: cada sala junta no Teams o custo e os cartões verdes de todos, e as duas salas comparam no fim (e com a previsão de antes do swarm).',
  },
  {
    seccao: 'Projeto 1', tipo: 'faca', min: 2,
    titulo: 'Joga o que o swarm construiu',
    passos: ['Abre a galeria', 'Escolhe um desafio e joga (o teu é o my-01)', 'Carrega em "Correr testes"'],
    comandos: [{ rotulo: 'Browser', cmd: 'http://localhost:3000' }],
    esperado: 'Os desafios das tarefas verdes jogam-se; os vermelhos mostram porque falharam',
    notas: 'Os testes também correm no browser. É o mesmo teste que decidiu a cor do quadrado.',
  },

  // ---------------- Memória (60–65)
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
    notas: 'A app abre na tua língua nativa e tem um seletor de língua. A lição sobre o cartão que falhou deve estar lá.',
  },

  // ---------------- Projeto 2 (65–87)
  { seccao: 'Projeto 2', tipo: 'seccao', min: 0.5, titulo: 'Projeto 2', subtitulo: 'Uma tarefa real: a Biblioteca Municipal ou a tua', notas: '22 minutos. O caminho de todos é o projeto de treino: a Biblioteca Municipal, uma API pequena com testes e as issues EX-1 a EX-3 em JSON, sem login no Jira nem MCP. Quem já tem o Jira ou o GitHub a funcionar pode trazer uma tarefa sua. A tarefa pode não terminar aqui: o objetivo é sair com a orquestração a correr e saber continuar.' },
  {
    seccao: 'Projeto 2', tipo: 'fluxo', min: 1.5,
    titulo: 'O mesmo ciclo, noutro repositório',
    passos: [
      { titulo: '/task-intake', texto: 'lê a issue: um JSON no projeto de treino, ou do Jira ou do GitHub' },
      { titulo: '/task-plan', texto: 'decide quantos agentes e porquê' },
      { titulo: '/task-swarm', texto: 'os agentes trabalham em lotes' },
      { titulo: '/task-gate', texto: 'testes, segredos e o veredito do Opus' },
      { titulo: '/task-report', texto: 'comentários, worklog e PR, depois do teu sim' },
    ],
    notas: 'Os /task-* estão instalados ao nível do utilizador e funcionam em qualquer repositório. Toda a escrita no Jira ou no GitHub pede confirmação; no projeto de treino não há nada para publicar.',
  },
  {
    seccao: 'Projeto 2', tipo: 'faca', min: 3,
    titulo: 'Começa pela issue EX-1',
    passos: ['No Terminal 3, no projeto de treino, abre o Claude Code', 'Lê a issue EX-1 (sem login: é um JSON)', 'Já tens o Jira ou o GitHub a funcionar? Podes usar uma issue tua'],
    comandos: [
      { rotulo: 'Terminal 3 · projeto de treino', cmd: 'cd ~/workshop-claude/practice-project\nclaude\n/task-intake issues/EX-1.json' },
      { rotulo: 'Opcional · o teu repositório', cmd: 'cd <o teu repositório>\nclaude\n/task-intake ABC-123' },
    ],
    esperado: 'Título, critérios de aceitação e o comando de teste do projeto (npm test)',
    notas: 'Quem ainda tem o Claude aberto no Terminal 3 (do hook) só escreve a última linha. A EX-1 é pequena: validar o ISBN e o email ao criar livros e leitores. O intake só lê; não escreve nada. Com um repositório próprio: o Jira precisa de login no /mcp (atlassian) e o GitHub usa o gh.',
  },
  {
    seccao: 'Projeto 2', tipo: 'faca', min: 4,
    titulo: 'O planner decide quantos agentes',
    passos: ['Corre /task-plan', 'Lê o porquê do número de agentes', 'Aprova ou ajusta'],
    comandos: [{ rotulo: 'Terminal 3', cmd: '/task-plan' }],
    esperado: 'A EX-1 é pequena: 1 a 3 agentes, com a justificação e a estimativa',
    notas: 'O planner (Opus) propõe o grafo e um script valida-o: ids, dependências, ciclos e agentes conhecidos. As tarefas que mexem nos mesmos ficheiros ficam em lotes diferentes, na altura do swarm. A integração e a revisão são acrescentadas automaticamente. Uma tarefa grande (a EX-2) dá mais agentes.',
  },
  {
    seccao: 'Projeto 2', tipo: 'faca', min: 11,
    titulo: 'Põe o swarm a trabalhar',
    passos: ['Corre /task-swarm', 'Noutro terminal, na pasta do projeto, abre o painel', 'Interrompe com Esc; corre /task-swarm de novo para retomar'],
    comandos: [
      { rotulo: 'Terminal 3', cmd: '/task-swarm' },
      { rotulo: 'Outro terminal', cmd: 'cd ~/workshop-claude/practice-project\nnode "$HOME/.workshop-claude/kit/orchestrator/dashboard.mjs"' },
    ],
    esperado: 'Lotes de agentes a terminar e o npm test verde; nunca dois no mesmo ficheiro ao mesmo tempo',
    notas: 'O estado fica em .workshop/. Voltar a correr /task-swarm retoma. Tarefas que mexem nos mesmos ficheiros vão em lotes diferentes, ou em git worktrees se o planner o decidir. O hook do Projeto 1 está a funcionar: abrir o ~/workshop-claude/edits.log e ver os ficheiros que os agentes editam. Quem acabar a EX-1 segue para a EX-3 (pequena, de segurança: um leitor vê os empréstimos de outro) ou para a EX-2 (média, mais agentes), e pode correr o /task-gate.',
  },
  {
    seccao: 'Projeto 2', tipo: 'colunas', min: 2,
    titulo: 'Depois do workshop',
    colunas: [
      { icone: 'shield-check', titulo: '/task-gate', texto: 'testes, segredos, código perigoso e o veredito do Opus' },
      { icone: 'message-square-text', titulo: '/task-report', texto: 'Jira (MCP ou acli) ou GitHub (gh): comentários, worklog e PR, só depois do teu sim' },
      { icone: 'share-2', titulo: '/memory', texto: 'as lições desta tarefa ficam para a próxima' },
    ],
    notas: 'Para usar com as tuas issues: o Jira usa o MCP da Atlassian, com login no /mcp; se falhar, o Atlassian CLI (acli auth login), que o setup já instalou, lê a issue e publica os comentários (as horas registam-se à mão). O MCP da Atlassian gasta créditos Rovo da empresa e o administrador pode limitá-lo. O GitHub usa o gh (gh auth login): gasta menos contexto do que um MCP e não partilha tokens. Exemplo de comentário: agente ws-worker-07 · Haiku · 5 s · US$ 0,004.',
  },

  // ---------------- Encerramento (87–90)
  {
    seccao: 'Encerramento', tipo: 'lista', min: 1.5,
    titulo: 'Cinco ideias para levar',
    itens: [
      'Skills tornam o trabalho repetível',
      'Subagentes dão contexto limpo e o modelo certo para cada peça',
      'Um script decide o grafo; a spec decide o resultado',
      'Mede-se com hooks; o custo não se adivinha',
      'A memória faz cada tarefa ensinar a próxima',
    ],
    notas: 'Resumo em cinco frases. A terceira junta as duas lições do Projeto 1: o orquestrador é um script e o cartão que falhou falhou pela spec.',
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
  { seccao: 'Encerramento', tipo: 'titulo', fecho: true, min: 0.5, titulo: 'Perguntas', subtitulo: 'Sem limite de tempo', rodape: '{{WORKSHOP_REPO}}', notas: 'As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora. Se der tempo: o resultado do duelo entre as duas salas.' },
];
