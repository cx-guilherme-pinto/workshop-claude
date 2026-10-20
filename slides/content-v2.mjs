// Conteudo do deck v2 (pt-PT), docs/pt/WORKSHOP-V2-SPEC.md seccao 8: 32 slides em 1280 x 1080, cada um com a fase do
// painel. O build-v2.mjs transforma isto em workshop-v2.pptx, speaker-notes-v2.md e palco.html. A versao inglesa
// (content-v2.en.mjs) tem a mesma forma: mudar um slide aqui = mudar o mesmo slide la.
//
// Campos de cada slide:
//   min, bloco, fase (opening | missions | p1 | p2 | closing: a vista do painel), tipo, titulo
//   tipo 'titulo' | 'regras' | 'perguntas'  as 3 excecoes da regra de interatividade (seccao 2.2)
//   tipo 'faca'    passos[], comandos[{rotulo, cmd}], esperado; opcional: intro, preve {pergunta, onde}, painel (frase)
//   tipo 'missao'  id (M1-M6), conceito, e o mesmo que 'faca'
//   tipo 'conceito' intro, blocos[{titulo, texto}], opcional: rodape, comandos[], esperado, faz (a etiqueta e "Faz agora")
//   tipo 'decide'  pergunta, opcoes[{titulo, efeito, cmd}] (no maximo 3), opcional: rodape, painel
//   tipo 'painel'  pergunta, opcional: apoio (frase), comandos[] (um comando pequeno para comecar)
//   saltar         pode saltar-se se houver atraso
//   notas          { objetivo, dizer[] (<= 3), painel[] (frases condicionais), falhas[{falha, resposta}] (<= 3) }
// {{...}} vem do repos.conf (installer/lib/conf.mjs).

export const BLOCOS = ['Abertura', 'Missões', 'Projeto 1', 'Projeto 2', 'Fecho'];

const MISSOES = 'cd ~/workshop-claude/missions-project\nclaude';
const CANIVETE = 'cd ~/workshop-claude/canivete-project\nclaude';
const TREINO = 'cd ~/workshop-claude/practice-project\nclaude';

export const SLIDES = [
  // ---------------- Abertura (0–11)
  {
    min: 0.5, bloco: 'Abertura', fase: 'opening', tipo: 'titulo',
    titulo: 'Orquestração de agentes com Claude',
    subtitulo: 'Missões, um swarm que constrói um canivete e uma tarefa a sério',
    notas: {
      objetivo: 'Abrir a sessão e apontar para o painel à direita.',
      dizer: ['Em 90 minutos vamos fazer, não ouvir: 10 missões curtas, um swarm de agentes e uma tarefa num repositório a sério.', 'O painel à direita mostra o que toda a gente já fez, ao vivo.'],
      painel: ['Se já houver nomes na classificação: "quem já está no painel fez o setup em casa, obrigado".'],
      falhas: [],
    },
  },
  {
    min: 1.5, bloco: 'Abertura', fase: 'opening', tipo: 'regras',
    titulo: 'As regras: custo e o que o painel vê',
    custo: [
      { valor: 'US$ 5', rotulo: 'alvo por pessoa, para o dia todo' },
      { valor: 'US$ 10', rotulo: 'teto de segurança, nunca o objetivo' },
      { valor: '0', rotulo: 'sessões cortadas por custo' },
    ],
    painelVe: [
      'Que missões fizeste e as tuas decisões (agentes, modelo)',
      'O teu nome do GitHub, na classificação',
      'Nunca os teus prompts, o teu código nem tokens',
      'Tudo é apagado à meia-noite',
    ],
    notas: {
      objetivo: 'Deixar claro que o custo é medido e não cortado, e o que o painel vê.',
      dizer: ['O alvo é US$ 5 por pessoa para o dia todo; a US$ 5 e a US$ 10 aparece um aviso, e ninguém é cortado.', 'O painel só recebe contagens e decisões, nunca prompts nem código. Os pontos vêm de cobertura e qualidade, nunca de gastar mais.', 'Tudo o que o painel guardou hoje é apagado à meia-noite.'],
      painel: ['Se alguém perguntar pela privacidade: "está tudo em docs/PRIVACY.md, e node ~/.workshop-claude/kit/telemetry/ctl.mjs show mostra os últimos 20 eventos tal como saem do teu portátil".'],
      falhas: [],
    },
  },
  {
    min: 1, bloco: 'Abertura', fase: 'opening', tipo: 'conceito',
    titulo: 'O que vamos fazer hoje',
    intro: 'Três blocos, sempre no teu portátil, sempre a fazer:',
    blocos: [
      { titulo: 'Missões · 15 min', texto: '10 missões curtas: plan mode, modelos, subagentes, skills, hooks e /loop, uma de cada vez.' },
      { titulo: 'Projeto 1 · 24 min', texto: 'Um swarm de agentes constrói o Canivete: 30 ferramentas e a tua. Tu decides quantos agentes e que modelo.' },
      { titulo: 'Projeto 2 · 37 min', texto: 'O mesmo ciclo numa tarefa a sério: uma issue do projeto de treino, ou do teu Jira ou GitHub.' },
    ],
    rodape: 'Levas para casa: o kit instalado, uma memória com o que aprendeste e um ciclo para usar amanhã.',
    notas: {
      objetivo: 'Dar o mapa do dia antes de começar.',
      dizer: ['Não há bloco de teoria: cada conceito aprende-se numa missão de 2 minutos.', 'Os dois projetos são o mesmo ciclo: primeiro num projeto feito para o workshop, depois numa tarefa a sério.', 'Tudo fica instalado e continua a funcionar depois de hoje.'],
      painel: ['O painel ainda está vazio: "vai encher-se à medida que fizerem cada coisa".'],
      falhas: [],
    },
  },
  {
    min: 1, bloco: 'Abertura', fase: 'opening', tipo: 'conceito',
    titulo: 'Como vamos trabalhar',
    intro: 'O mesmo ciclo nos dois projetos:',
    blocos: [
      { titulo: 'Tu decides', texto: 'a spec, quantos agentes e que modelo.' },
      { titulo: 'Os agentes fazem', texto: 'em paralelo, cada um com a sua tarefa e o seu teste.' },
      { titulo: 'O gate verifica', texto: 'os testes, os segredos, o código perigoso e a revisão do Opus.' },
      { titulo: 'O painel mostra', texto: 'o que a sala já fez, ao vivo (nunca os teus prompts).' },
      { titulo: 'A memória aprende', texto: 'as lições de cada projeto, para a próxima vez.' },
    ],
    notas: {
      objetivo: 'Explicar o ciclo que se repete nos dois projetos.',
      dizer: ['O teu trabalho é decidir e verificar; o dos agentes é fazer.', 'O custo é medido em cada passo, com os tokens reais.'],
      painel: [],
      falhas: [],
    },
  },
  {
    min: 1, bloco: 'Abertura', fase: 'opening', tipo: 'conceito', faz: true,
    titulo: 'A tua memória aprende contigo',
    intro: 'A app Agent Memory guarda, no teu portátil, o que aprendes ao longo do dia:',
    blocos: [
      { titulo: 'Lê antes de planear', texto: '/demo-plan, /task-intake e /task-plan procuram primeiro o que já sabes.' },
      { titulo: 'Guarda no fim', texto: '/demo-cost e /task-report guardam as lições de cada projeto; /memory guarda uma tua.' },
    ],
    comandos: [{ rotulo: 'Num terminal', cmd: 'agent-memory-gui' }],
    esperado: 'A app abre com o grafo ainda vazio; no fim do dia tem as lições do Canivete e da EX-1',
    notas: {
      objetivo: 'Apresentar a memória e explicar que vai crescer com o trabalho de cada um.',
      dizer: ['São ficheiros Markdown em ~/.agent-memory, com um índice: fica tudo só no teu portátil.', 'Cada lição fica ligada ao projeto, à tarefa e aos ficheiros: amanhã, o /task-intake de outra issue já a encontra.', 'Vamos voltar a esta janela no fim de cada projeto.'],
      painel: [],
      falhas: [
        { falha: 'agent-memory-gui não existe', resposta: 'o --check mostra o passo 10; sem a app, tudo o resto funciona (MEMORY UNAVAILABLE)' },
        { falha: 'A janela não abre (Windows sem WebView2)', resposta: 'a app abre a mesma interface no browser' },
      ],
    },
  },
  {
    min: 4, bloco: 'Abertura', fase: 'opening', tipo: 'faca',
    titulo: 'Verifica e liga-te ao painel',
    passos: ['Num terminal, corre o comando do teu sistema', 'Procura o teu nome na classificação do painel'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{CHECK_MAC}}' },
      { rotulo: 'Windows (PowerShell)', cmd: '{{CHECK_WIN}}' },
      { rotulo: 'Não estás no painel?', cmd: 'node "$HOME/.workshop-claude/kit/telemetry/ctl.mjs" register' },
    ],
    esperado: 'A tabela-resumo sem falhas e o teu nome no painel, em "Inscritas"',
    notas: {
      objetivo: 'Toda a gente com o kit verificado e registada no painel.',
      dizer: ['O --check não instala nada: só confirma cada passo e liga-te ao painel.', 'O registo usa o teu login do gh: confirma no teu portátil o email da empresa, e só o nome sai para o painel.'],
      painel: ['Se "Prontas" estiver abaixo de metade aos 3 min: "quem já tem a tabela verde, ajuda o vizinho".', 'Se "Inscritas" for bem menor do que a sala: "o register a seguir à tabela resolve; sem email @checkmarx.com verificado no GitHub, fazes o workshop na mesma, só não apareces na classificação".'],
      falhas: [
        { falha: 'E-TEL-03: o gh não pode ler os emails', resposta: 'gh auth refresh -h github.com -s user:email e volta a correr o register' },
        { falha: 'E-TEL-02: sem email verificado da empresa', resposta: 'acrescenta-o em github.com/settings/emails; o workshop funciona sem isso' },
        { falha: 'O comando não existe: o setup não foi feito', resposta: 'corre o one-liner do README agora e segue com o vizinho enquanto instala' },
      ],
    },
  },
  {
    min: 2, bloco: 'Abertura', fase: 'opening', tipo: 'faca',
    titulo: 'Algum passo falhou?',
    passos: ['Corre o --doctor do teu sistema', 'Segue o comando que ele sugere, um de cada vez', 'Continua sem resposta? Trabalha com o vizinho e chama-nos'],
    comandos: [
      { rotulo: 'Mac', cmd: '{{DOCTOR_MAC}}' },
      { rotulo: 'Windows (PowerShell)', cmd: '{{DOCTOR_WIN}}' },
    ],
    esperado: 'A causa provável e o comando que a resolve',
    notas: {
      objetivo: 'Resolver as falhas do setup sem parar a sala.',
      dizer: ['O --doctor pede ao Haiku um diagnóstico do excerto do log, já sem segredos, e só corre um comando se disseres que sim.', 'Ninguém fica parado: quem não resolver em 2 minutos trabalha com o vizinho.'],
      painel: ['Se "Prontas" não subir: "quem tem ❌ no Claude Code login, corre claude auth login --console".'],
      falhas: [
        { falha: 'Proxy ou rede da empresa', resposta: 'muda para a rede do evento ou um hotspot e repete o --check' },
        { falha: 'Login do Claude em falta', resposta: 'claude auth login --console' },
      ],
    },
  },

  // ---------------- Missões (11–26)
  {
    min: 1, bloco: 'Missões', fase: 'missions', tipo: 'painel',
    titulo: '10 missões, uma grelha vazia',
    pergunta: 'Quantas missões vai a sala acender em 15 minutos?',
    apoio: 'Cada missão valida-se sozinha: fazes, e o painel acende.',
    comandos: [{ rotulo: 'Terminal 1 · missões', cmd: MISSOES }],
    notas: {
      objetivo: 'Abrir o projeto das missões e lançar a corrida da sala.',
      dizer: ['São 6 missões guiadas, de 2 minutos cada, e 4 bónus para as esperas.', 'Ninguém carrega em "feito": o kit vê a funcionalidade a ser usada e acende a missão.', '/missions mostra a tua caderneta a qualquer momento.'],
      painel: ['A grelha está a 0 %: "vamos ver quantas acendemos até ao Projeto 1".'],
      falhas: [{ falha: 'A pasta missions-project não existe', resposta: 'corre o --check: o passo 9 monta-a' }],
    },
  },
  {
    min: 2, bloco: 'Missões', fase: 'missions', tipo: 'missao', id: 'M1',
    titulo: 'Planear sem tocar',
    conceito: 'O plan mode lê e planeia, mas não escreve nada.',
    passos: ['Carrega em Shift+Tab até aparecer "plan mode on"', 'Faz a pergunta', 'Lê o plano e sai do plan mode com Shift+Tab'],
    comandos: [{ rotulo: 'No Claude Code', cmd: 'Shift+Tab  →  plan mode on\nComo acrescentarias conversão de volume?' }],
    esperado: 'Um plano com passos, sem nenhum ficheiro mudado',
    notas: {
      objetivo: 'Mostrar que se pode pensar com o Claude sem risco.',
      dizer: ['O plan mode é a forma mais barata e segura de começar: o Claude lê o código e propõe, mas não toca em nada.', 'Se o plano te servir, aprovas e ele executa; aqui não aprovamos.'],
      painel: ['Se a M1 estiver abaixo de 50 % a meio: "Shift+Tab duas vezes; procura plan mode on por baixo da caixa".'],
      falhas: [
        { falha: 'Aparece "accept edits on" e não o plan mode', resposta: 'carrega outra vez em Shift+Tab' },
        { falha: 'O Claude pergunta "Would you like to proceed?"', resposta: 'Esc: não queremos executar' },
      ],
    },
  },
  {
    min: 2, bloco: 'Missões', fase: 'missions', tipo: 'missao', id: 'M2',
    titulo: 'O modelo certo',
    conceito: 'Cada modelo tem um preço: Haiku para o simples, Sonnet para o trabalho, Opus para decidir.',
    passos: ['Muda para o Haiku e confirma com Enter', 'Faz uma pergunta simples', 'Volta ao Sonnet'],
    comandos: [{ rotulo: 'No Claude Code', cmd: '/model haiku\nO que faz o units.js? Uma frase.\n/model sonnet' }],
    esperado: 'A resposta do Haiku, por uma fração do custo',
    notas: {
      objetivo: 'Escolher o modelo pela tarefa, não por hábito.',
      dizer: ['O Haiku custa cerca de 10 vezes menos do que o Sonnet e chega para perguntas simples.', 'No Projeto 1 vais escolher o modelo de 30 agentes: esta é a mesma decisão, em pequeno.'],
      painel: ['Se a M2 ficar atrás da M1: "o /model haiku pede uma confirmação; carrega em Enter".'],
      falhas: [{ falha: 'Fica a pedir confirmação', resposta: 'Enter na opção selecionada' }],
    },
  },
  {
    min: 2, bloco: 'Missões', fase: 'missions', tipo: 'missao', id: 'M3',
    titulo: 'Um subagente',
    conceito: 'Um subagente trabalha num contexto limpo e devolve só o resumo.',
    passos: ['Pede o trabalho a um subagente', 'Vê-o a trabalhar à parte', 'Recebe só o resultado'],
    comandos: [{ rotulo: 'No Claude Code', cmd: 'Usa um subagente Explore para listar as funções de src/units.js que não têm teste.' }],
    esperado: 'Uma lista curta; a tua sessão principal não ficou cheia de ficheiros',
    notas: {
      objetivo: 'Perceber a peça base de um swarm.',
      dizer: ['Um swarm é isto multiplicado: muitos subagentes, cada um com o seu contexto e a sua tarefa.', 'O contexto principal fica limpo, e isso também é custo.'],
      painel: ['Se a M3 estiver abaixo da M2: "escrevam a palavra subagente no pedido".'],
      falhas: [{ falha: 'O Claude responde sem lançar subagente', resposta: 'pede explicitamente: usa um subagente Explore' }],
    },
  },
  {
    min: 2, bloco: 'Missões', fase: 'missions', tipo: 'missao', id: 'M4',
    titulo: 'A tua skill',
    conceito: 'Uma skill é uma receita com nome: um SKILL.md que o Claude Code segue quando a chamas.',
    passos: ['Pede ao Claude para criar a skill', 'Sai e volta à mesma sessão', 'Usa a skill pelo nome'],
    comandos: [{ rotulo: 'No Claude Code', cmd: 'Cria .claude/skills/resumo/SKILL.md: resume um ficheiro em 3 linhas\n/exit\nclaude -c\n/resumo src/units.js' }],
    esperado: 'Um resumo em 3 linhas, feito pela tua skill',
    notas: {
      objetivo: 'Mostrar que uma skill é só um ficheiro que qualquer pessoa escreve.',
      dizer: ['As skills do workshop (/demo-plan, /task-swarm…) são exatamente isto: Markdown com instruções.', 'O claude -c retoma a conversa anterior: nada se perde ao sair.'],
      painel: ['Se a M4 ficar baixa: "a skill só aparece depois de sair e voltar; /exit e claude -c".'],
      falhas: [{ falha: '/resumo não existe', resposta: 'confirma o ficheiro .claude/skills/resumo/SKILL.md e reabre com claude -c' }],
    },
  },
  {
    min: 2, bloco: 'Missões', fase: 'missions', tipo: 'missao', id: 'M5',
    titulo: 'O teu hook',
    conceito: 'Um hook é um comando que o Claude Code corre num evento.',
    passos: ['Pede o hook ao Claude', 'Pede uma edição qualquer', 'Abre o edits.log'],
    comandos: [{ rotulo: 'No Claude Code', cmd: 'Acrescenta em .claude/settings.local.json um hook PostToolUse (Edit|Write) que junta a hora e o ficheiro a edits.log.\nAcrescenta um comentário no topo do README.md.' }],
    esperado: 'Uma linha nova no edits.log a cada edição. Estragou algo? Esc Esc volta atrás',
    notas: {
      objetivo: 'Perceber que os hooks automatizam sem pedir ao modelo.',
      dizer: ['É assim que o kit mede o custo: um hook no fim de cada subagente.', 'O settings.local.json é só teu e não vai para o git.', 'Esc Esc abre o rewind: voltas a antes da edição.'],
      painel: ['Se a M5 estiver abaixo de 50 %: "metade da sala ainda não tem um hook; quem já tem, ajuda o vizinho".'],
      falhas: [
        { falha: 'O edits.log não aparece', resposta: 'o hook só corre na edição seguinte: pede outra edição' },
        { falha: 'O hook ficou no settings.json do kit', resposta: 'pede para o mover para .claude/settings.local.json' },
      ],
    },
  },
  {
    min: 2, bloco: 'Missões', fase: 'missions', tipo: 'missao', id: 'M6',
    titulo: 'Até ficar verde',
    conceito: 'O /loop repete um pedido sozinho, até a condição ser verdade.',
    passos: ['Lança o loop', 'Deixa-o trabalhar: não escrevas nada', 'Para quando estiver tudo verde'],
    comandos: [{ rotulo: 'No Claude Code', cmd: '/loop 1m corre npm test e corrige o primeiro teste vermelho; quando estiver tudo verde, para o loop' }],
    esperado: 'Os 2 testes vermelhos passam a verde e o loop para',
    notas: {
      objetivo: 'Ver o Claude a trabalhar sozinho com uma condição de paragem.',
      dizer: ['O projeto vem com 2 testes partidos de propósito.', 'Um loop sem condição de paragem gasta dinheiro: diz sempre quando parar.'],
      painel: ['Se a M6 subir devagar: "o loop corre de minuto a minuto; enquanto esperam, façam uma bónus".'],
      falhas: [{ falha: 'O loop não para', resposta: 'Esc e diz: para o loop' }],
    },
  },
  {
    min: 2, bloco: 'Missões', fase: 'missions', tipo: 'painel',
    titulo: 'O que falta à sala (e as bónus M7 a M10)',
    pergunta: 'Qual é a missão que menos gente fez?',
    apoio: 'As bónus fazem-se nas esperas dos projetos:',
    comandos: [{ rotulo: 'Bónus', cmd: 'M7  /btw o que é um subagente?   (dica, sem validação)\nM8  /statusline mostra o modelo e a branch\nM9  claude -p "Resume o README" --model haiku > resumo.txt\nM10 /memory guarda uma lição sobre o conversor' }],
    notas: {
      objetivo: 'Fechar as missões guiadas e apontar as bónus para as esperas.',
      dizer: ['A missão que pisca no painel é a menos feita: é a que vale a pena ajudar agora.', 'As bónus não têm tempo de palco: fazem-se enquanto os swarms trabalham.'],
      painel: ['Lê em voz alta a missão que pisca e chama quem a tem para mostrar ao vizinho.', 'Se a cobertura média passar de 70 %: "esta sala está mais rápida do que o ensaio".'],
      falhas: [],
    },
  },

  // ---------------- Projeto 1 (26–50)
  {
    min: 2, bloco: 'Projeto 1', fase: 'p1', tipo: 'painel',
    titulo: 'O que vamos construir: o Canivete',
    pergunta: 'Quantos minutos demoram 8 agentes a construir 30 ferramentas?',
    apoio: '30 ferramentas do dia a dia, cada uma feita por um agente com o seu teste, mais a tua.',
    comandos: [{ rotulo: 'Terminal 2 · Canivete', cmd: CANIVETE }],
    notas: {
      objetivo: 'Apresentar o Canivete e plantar a previsão.',
      dizer: ['Contar palavras, dividir a conta, converter cores: 30 ferramentas que se usam a sério.', 'Cada uma é um agente e um teste; tu decides quantos agentes, que modelo e uma ferramenta tua.'],
      painel: ['Ainda vazio: "no fim do bloco este gráfico mostra o tempo e o custo de cada swarm da sala".'],
      falhas: [{ falha: 'A pasta canivete-project não existe', resposta: 'o --check monta-a no passo 9' }],
    },
  },
  {
    min: 4, bloco: 'Projeto 1', fase: 'p1', tipo: 'faca',
    titulo: 'Inventa a tua ferramenta',
    passos: ['Copia o exemplo', 'Muda o título, o conceito, o modelo e os exemplos', 'Gera a spec e o teste'],
    comandos: [
      { rotulo: 'Mac', cmd: 'cp specs/my-tool.example.json specs/my-tool.json\nnode tools/gen.mjs' },
      { rotulo: 'Windows', cmd: 'Copy-Item specs\\my-tool.example.json specs\\my-tool.json\nnode tools/gen.mjs' },
    ],
    esperado: 'A tua ferramenta my-01, com spec e teste, pronta para o swarm',
    painel: 'Olha para o painel: ferramentas inventadas pela sala',
    notas: {
      objetivo: 'Dar a cada pessoa uma ferramenta que é só dela.',
      dizer: ['Os modelos são 4: calc, convert, text e generate; o agente só escreve a função run().', 'O gen.mjs diz-te que campo está mal e dá um exemplo.'],
      painel: ['Lê os modelos mais escolhidos: "a sala prefere calc; quem fez um generate?".'],
      falhas: [
        { falha: 'O gen.mjs recusa o my-tool.json', resposta: 'lê a mensagem: diz o campo e dá um exemplo' },
        { falha: 'Sem ideias', resposta: 'usa o exemplo sem mudanças: funciona' },
      ],
    },
  },
  {
    min: 2, bloco: 'Projeto 1', fase: 'p1', tipo: 'decide',
    titulo: 'Quantos agentes e que modelo?',
    pergunta: 'Escolhe o paralelismo (e o modelo das ferramentas):',
    opcoes: [
      { titulo: '4 agentes', efeito: 'Mais lento; a sessão principal coordena pouco', cmd: '--parallel 4' },
      { titulo: '8 agentes', efeito: 'O meio-termo, por defeito', cmd: '--parallel 8' },
      { titulo: '12 agentes', efeito: 'Mais rápido, mas o custo não desce', cmd: '--parallel 12' },
    ],
    rodape: 'Modelo: --model haiku (por defeito, barato) ou --model sonnet (mais caro, quase os mesmos verdes)',
    notas: {
      objetivo: 'Fazer a sala dividir-se, para a comparação no painel ficar rica.',
      dizer: ['Sugestão: filas da frente 4, meio 8, trás 12.', 'Mais agentes acabam mais depressa, mas a sessão principal coordena mais: o custo não desce.'],
      painel: ['Ainda sem pontos: "daqui a 10 minutos vemos quem tinha razão".'],
      falhas: [],
    },
  },
  {
    min: 1, bloco: 'Projeto 1', fase: 'p1', tipo: 'faca',
    titulo: 'Planeia',
    passos: ['Corre o plano com a tua decisão', 'Responde à previsão de minutos', 'Lê as ondas e a estimativa de custo'],
    comandos: [{ rotulo: 'Terminal 2 · Claude Code', cmd: '/demo-plan --parallel 8 --model haiku' }],
    preve: { pergunta: 'Quantos minutos vai demorar o teu swarm?', onde: 'O /demo-plan pergunta; podes não responder' },
    esperado: 'O PLAN.md com 4 ondas e a estimativa de custo',
    notas: {
      objetivo: 'Registar a decisão e a previsão antes de ver o resultado.',
      dizer: ['O grafo é determinístico: vem das specs, não do modelo.', 'A previsão só vai para o painel, para comparar com o tempo real.'],
      painel: ['Se a mediana prevista aparecer: "a sala acha X minutos; vamos ver".'],
      falhas: [{ falha: 'ERROR: plan not found ao avançar', resposta: 'corre o /demo-plan primeiro, na pasta canivete-project' }],
    },
  },
  {
    min: 7, bloco: 'Projeto 1', fase: 'p1', tipo: 'faca',
    titulo: 'Solta o swarm',
    passos: ['Lança o swarm', 'Noutro terminal, abre o /status', 'Nas esperas: uma missão bónus'],
    comandos: [
      { rotulo: 'Terminal 2 · Claude Code', cmd: '/demo-swarm' },
      { rotulo: 'Outro terminal · o /status', cmd: 'cd ~/workshop-claude/canivete-project\nnode server.js\nhttp://localhost:3000/status' },
    ],
    esperado: 'A grelha enche-se de verdes; 2 ou 3 ferramentas ficam vermelhas',
    painel: 'Olha para o painel: cada ponto é um swarm acabado',
    notas: {
      objetivo: 'Ver um swarm a trabalhar e o efeito das decisões da sala.',
      dizer: ['Cada quadrado é uma ferramenta: amarelo a trabalhar, verde passou, vermelho falhou.', 'Os vermelhos são o próximo slide: não é azar.'],
      painel: ['Aos 4 min, quando aparecerem pontos: "os de 12 acabaram primeiro; vejam se gastaram menos".', 'Se a mediana real ficar longe da prevista: "prevemos X, demorou Y; quem acertou?".'],
      falhas: [
        { falha: 'Porta 3000 ocupada', resposta: 'o server.js usa a seguinte e diz qual' },
        { falha: 'Pede uma permissão a meio', resposta: 'o projeto tem de estar trusted: o setup trata disso; aceita e continua' },
        { falha: 'O swarm parou', resposta: 'corre /demo-swarm outra vez: retoma onde estava' },
      ],
    },
  },
  {
    min: 4, bloco: 'Projeto 1', fase: 'p1', tipo: 'faca',
    titulo: 'Porque é que esta ferramenta falhou?',
    passos: ['Lê a mensagem do teste vermelho', 'Decide tu a regra que a spec não diz', 'Escreve-a na spec e repete só essa'],
    comandos: [
      { rotulo: 'No Claude Code', cmd: 'Porque falhou o nm-03?' },
      { rotulo: 'No teu editor, depois', cmd: 'tools/nm-03/spec.md   (acrescenta a regra)\n/demo-swarm --retry nm-03' },
    ],
    esperado: 'O vermelho passa a verde à segunda tentativa',
    notas: {
      objetivo: 'Perceber que o que a spec não decide, o agente adivinha.',
      dizer: ['As 3 partidas de propósito (nm-03, dn-01, tx-02) omitem uma regra; o agente escolhe a resposta "óbvia", e é a errada.', 'A mensagem diz o que a ferramenta devolveu e o que a spec não decide, nunca o valor certo: és tu que decides.', 'Nenhum agente pode mudar uma spec: é o teu trabalho.'],
      painel: ['Se "specs corrigidas" ficar a 0 aos 2 min: "abram o spec.md do vermelho e escrevam uma linha com a regra".'],
      falhas: [
        { falha: 'Volta a ficar vermelho', resposta: 'a regra está ambígua: escreve um exemplo com o valor' },
        { falha: 'Não sabe qual é a regra', resposta: 'pensa como quem pediu a ferramenta: o que é correto para um contabilista?' },
      ],
    },
  },
  {
    min: 2, bloco: 'Projeto 1', fase: 'p1', tipo: 'faca',
    titulo: 'Gate e custo: que decisão ganhou?',
    passos: ['Corre a revisão', 'Corre o custo', 'Compara com a previsão e com o painel'],
    comandos: [{ rotulo: 'Terminal 2 · Claude Code', cmd: '/demo-review\n/demo-cost' }],
    esperado: 'GATE: APPROVED e o custo por ferramenta verde',
    painel: 'Olha para o painel: custo por verde, por paralelismo e modelo',
    notas: {
      objetivo: 'Fechar o ciclo: qualidade e custo, medidos.',
      dizer: ['O revisor é o Opus: lê um resumo, não a árvore toda, e diz APPROVED ou REJECTED.', 'O custo vem dos tokens reais e dos preços publicados.'],
      painel: ['Lê o custo por verde de 4, 8 e 12: "mais agentes não ficou mais barato".', 'Se houver swarms em Sonnet: "o Sonnet custou mais e quase não deu mais verdes".'],
      falhas: [{ falha: 'GATE: REJECTED', resposta: 'lê as reservas; normalmente é um vermelho por corrigir' }],
    },
  },
  {
    min: 2, bloco: 'Projeto 1', fase: 'p1', tipo: 'faca', saltar: true,
    titulo: 'Usa o teu Canivete',
    passos: ['Abre o Canivete no browser', 'Procura a tua ferramenta', 'Usa-a a sério'],
    comandos: [{ rotulo: 'Browser', cmd: 'http://localhost:3000' }],
    esperado: 'A tua ferramenta my-01 a funcionar ao lado das outras 30',
    notas: {
      objetivo: 'Ver o resultado e ganhar confiança no que foi feito.',
      dizer: ['Tudo o que está ali foi escrito por agentes nos últimos 15 minutos, com testes.'],
      painel: [],
      falhas: [{ falha: 'A página não abre', resposta: 'o node server.js tem de estar a correr no outro terminal' }],
    },
  },

  // ---------------- Projeto 2 (50–87)
  {
    min: 2, bloco: 'Projeto 2', fase: 'p2', tipo: 'painel',
    titulo: 'O mesmo ciclo, noutro repositório',
    pergunta: 'O que muda quando a tarefa é a sério?',
    apoio: 'intake → plan → swarm → gate → report → memória: a mesma orquestração, agora com as skills /task-*.',
    comandos: [
      { rotulo: 'Terminal 3 · projeto de treino', cmd: TREINO },
      { rotulo: 'Opcional · deixar de enviar ao painel', cmd: 'cd "$HOME/.workshop-claude/kit/telemetry"\nnode ctl.mjs unregister' },
    ],
    notas: {
      objetivo: 'Ligar o Projeto 2 ao que já fizeram.',
      dizer: ['O plan é o /demo-plan, o swarm é o /demo-swarm, o gate é o /demo-review: a diferença é que a tarefa vem de uma issue.', 'O caminho por defeito é a Biblioteca Municipal, sem login; quem tiver Jira ou GitHub a funcionar pode usar uma issue sua.'],
      painel: ['O funil está vazio: "daqui a 30 minutos queremos a sala toda no fim".', 'Quem vai trabalhar no seu repositório e prefere que nada saia do portátil: "o unregister para os envios; a caderneta fica, e o register --again volta a ligar".'],
      falhas: [],
    },
  },
  {
    min: 4, bloco: 'Projeto 2', fase: 'p2', tipo: 'faca',
    titulo: 'Lê a issue',
    passos: ['No projeto de treino, abre o Claude Code', 'Lê a issue EX-1 (é um JSON, sem login)', 'Já tens Jira ou GitHub? Usa uma tua'],
    comandos: [
      { rotulo: 'Terminal 3 · Claude Code', cmd: '/task-intake issues/EX-1.json' },
      { rotulo: 'Opcional · o teu repositório', cmd: '/task-intake ABC-123' },
    ],
    esperado: 'O .workshop/task.md com a issue, os critérios e o que a memória já sabe',
    notas: {
      objetivo: 'Pôr toda a gente com uma tarefa lida.',
      dizer: ['A EX-1 é pequena: validar o ISBN e o email ao criar livros e leitores.', 'O intake só lê: não escreve nada no Jira nem no GitHub.'],
      painel: ['Se o funil não sair de "intake" aos 3 min: "confirmem que estão na pasta practice-project".'],
      falhas: [{ falha: 'Issue não encontrada', resposta: 'corre na pasta practice-project: o caminho é issues/EX-1.json' }],
    },
  },
  {
    min: 6, bloco: 'Projeto 2', fase: 'p2', tipo: 'decide',
    titulo: 'Quantos agentes?',
    pergunta: 'O /task-plan propõe um número e diz porquê. Decide:',
    opcoes: [
      { titulo: 'Aprovar', efeito: 'Segue o plano como está', cmd: 'sim' },
      { titulo: 'Menos agentes', efeito: 'Mais barato, mais lento; menos conflitos', cmd: 'menos agentes' },
      { titulo: 'Mais agentes', efeito: 'Mais rápido, só se as tarefas não mexem nos mesmos ficheiros', cmd: 'mais agentes' },
    ],
    rodape: 'Primeiro corre /task-plan e lê o porquê do número.',
    painel: 'Olha para o painel: quantos agentes escolheu a sala',
    notas: {
      objetivo: 'Decidir com base no porquê, não no número.',
      dizer: ['O planner lê a issue e o código e propõe subtarefas: tarefas que mexem nos mesmos ficheiros vão em lotes diferentes.', 'Ajustar é normal: o plano é uma proposta.'],
      painel: ['Lê o histograma: "a maioria tem 2 ou 3; quem ajustou, porquê?".'],
      falhas: [{ falha: 'PLAN INVALID', resposta: 'pede ao planner para corrigir: a mensagem diz o que falta' }],
    },
  },
  {
    min: 12, bloco: 'Projeto 2', fase: 'p2', tipo: 'faca',
    titulo: 'Põe o swarm a trabalhar',
    passos: ['Lança o swarm', 'Noutro terminal, abre o dashboard', 'Nas esperas: as missões bónus que faltam'],
    comandos: [
      { rotulo: 'Terminal 3 · Claude Code', cmd: '/task-swarm' },
      { rotulo: 'Outro terminal · na pasta do projeto', cmd: 'node "$HOME/.workshop-claude/kit/orchestrator/dashboard.mjs"' },
    ],
    esperado: 'As subtarefas a verde; o estado fica em .workshop/',
    painel: 'Olha para o painel: o funil avança',
    notas: {
      objetivo: 'Ver o swarm numa tarefa real, com retoma.',
      dizer: ['Esc interrompe; /task-swarm de novo retoma onde estava.', 'Se o planner decidiu worktrees, cada agente trabalha numa cópia do repositório.'],
      painel: ['A meio, lê o funil: "metade já está no gate; quem ainda está no swarm, deixem correr".'],
      falhas: [
        { falha: 'Uma subtarefa falha 3 vezes', resposta: 'lê o motivo no dashboard; corrige a descrição e corre --retry' },
        { falha: 'O dashboard não mostra nada', resposta: 'tem de correr na pasta do projeto' },
      ],
    },
  },
  {
    min: 5, bloco: 'Projeto 2', fase: 'p2', tipo: 'faca',
    titulo: 'O gate',
    passos: ['Corre o gate', 'Lê o veredito e as reservas', 'Corrige o que ele pedir, se pedir'],
    comandos: [{ rotulo: 'Terminal 3 · Claude Code', cmd: '/task-gate' }],
    esperado: 'GATE: APPROVED, com os testes, os segredos e o código perigoso verificados',
    notas: {
      objetivo: 'Não entregar nada sem verificação.',
      dizer: ['O gate corre os testes, procura segredos e código perigoso, e pede o veredito ao Opus.', 'Um REJECTED não é um falhanço: é o gate a fazer o trabalho dele.'],
      painel: ['Se os gates aprovados ficarem baixos: "leiam as reservas; quase sempre é um teste por correr".'],
      falhas: [{ falha: 'GATE: REJECTED', resposta: 'corrige o que as reservas dizem e corre /task-gate outra vez' }],
    },
  },
  {
    min: 4, bloco: 'Projeto 2', fase: 'p2', tipo: 'faca',
    titulo: 'O relatório e a memória',
    passos: ['Gera o relatório', 'Guarda a lição na memória', 'No teu repositório: confirma antes de cada escrita'],
    comandos: [{ rotulo: 'Terminal 3 · Claude Code', cmd: '/task-report\n/memory guarda a lição da EX-1' }],
    esperado: 'O report.md no projeto de treino e uma memória nova',
    notas: {
      objetivo: 'Fechar a tarefa e guardar o que se aprendeu.',
      dizer: ['No projeto de treino o relatório fica em report.md; no Jira ou no GitHub, o /task-report só escreve depois do teu sim.', 'A memória fica no teu portátil e o próximo /task-intake vai lê-la.'],
      painel: ['Se o funil chegar a "report": "quem fechou, avança para a EX-3".'],
      falhas: [{ falha: 'MEMORY UNAVAILABLE', resposta: 'a app Agent Memory não está instalada: o resto funciona; --check mostra o passo 10' }],
    },
  },
  {
    min: 4, bloco: 'Projeto 2', fase: 'p2', tipo: 'faca',
    titulo: 'Agora sozinho: EX-3',
    passos: ['Repete o ciclo na EX-3, sem slides', 'intake → plan → swarm → gate → report', 'Ainda na EX-1? Continua nela'],
    comandos: [{ rotulo: 'Terminal 3 · Claude Code', cmd: '/task-intake issues/EX-3.json\n/task-plan\n/task-swarm\n/task-gate\n/task-report' }],
    esperado: 'A EX-3 fechada: um leitor deixa de ver os empréstimos de outro',
    notas: {
      objetivo: 'Fazer o ciclo sem ajuda.',
      dizer: ['A EX-3 é uma falha de segurança pequena (IDOR), com um teste de autorização já escrito.', 'É o teste final do workshop: se consegues sozinho, consegues amanhã no teu repositório.'],
      painel: ['Lê as issues fechadas: "já há N EX-3 fechadas".'],
      falhas: [{ falha: 'Não acabou a EX-1', resposta: 'continua na EX-1: a EX-3 é opcional' }],
    },
  },

  // ---------------- Fecho (87–90)
  {
    min: 2, bloco: 'Fecho', fase: 'closing', tipo: 'painel',
    titulo: 'O dia em números e 3 ideias para levar',
    pergunta: 'O que fazias diferente amanhã?',
    ideias: [
      'O que a spec não decide, o agente adivinha',
      'Mais agentes não é mais barato: decide o paralelismo',
      'Haiku para o simples, e mede sempre o custo',
    ],
    notas: {
      objetivo: 'Fechar com os números da sala e 3 ideias concretas.',
      dizer: ['Os 3 números do painel são de "fazer melhor": custo por verde, verdes à primeira, % em Haiku.', 'Tudo o que instalaram continua a funcionar amanhã: comecem pela próxima issue que vos atribuírem com /task-intake.'],
      painel: ['Lê o custo médio por pessoa contra o alvo de US$ 5.', 'Lê a % de verdes à primeira: "é isto que uma boa spec compra".'],
      falhas: [],
    },
  },
  {
    min: 1, bloco: 'Fecho', fase: 'closing', tipo: 'perguntas',
    titulo: 'Perguntas',
    subtitulo: 'Sem limite de tempo',
    rodape: '{{WORKSHOP_REPO}}',
    notas: {
      objetivo: 'Abrir as perguntas.',
      dizer: ['As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora.', 'O painel apaga tudo à meia-noite; a caderneta e as memórias ficam no vosso portátil.'],
      painel: ['Se der tempo: mostra a classificação final.'],
      falhas: [],
    },
  },
];
