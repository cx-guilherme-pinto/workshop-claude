# Notas do apresentador — Orquestração de agentes com Claude

Relógio acumulado: "deves estar aqui aos X min". Os slides marcados com **PODE SALTAR** saltam-se se houver atraso.

| # | min | relógio | secção | slide | saltar |
|---|---|---|---|---|---|
| 1 | 1 | 0:00 | Abertura | Orquestração de agentes com Claude |  |
| 2 | 1,5 | 1:00 | Abertura | Vais sair do workshop com isto |  |
| 3 | 1,5 | 2:30 | Abertura | As regras do custo |  |
| 4 | 1,5 | 4:00 | Instalar | Instala o kit |  |
| 5 | 3 | 5:30 | Instalar | Verifica a instalação |  |
| 6 | 2 | 8:30 | Instalar | Algum passo falhou? |  |
| 7 | 0,5 | 10:30 | Conceitos | Conceitos |  |
| 8 | 1,5 | 11:00 | Conceitos | O Claude Code trabalha no teu projeto |  |
| 9 | 2 | 12:30 | Conceitos | Uma skill é uma receita com nome |  |
| 10 | 2 | 14:30 | Conceitos | Subagentes: contexto e modelo próprios |  |
| 11 | 2 | 16:30 | Conceitos | A regra económica |  |
| 12 | 2 | 18:30 | Conceitos | Tarefa → grafo → waves |  |
| 13 | 1,5 | 20:30 | Conceitos | Quem decide o grafo é um script |  |
| 14 | 1,5 | 22:00 | Conceitos | Medir, não adivinhar |  |
| 15 | 1 | 23:30 | Conceitos | O ciclo de cada tarefa |  |
| 16 | 1 | 24:30 | Preview | O que vamos construir: a Arena de Segurança |  |
| 17 | 0,5 | 25:30 | Preview | O swarm em ação |  |
| 18 | 2,5 | 26:00 | Preview | 100 agentes a construir a Arena |  |
| 19 | 1 | 28:30 | Preview | O resultado: o jogo pronto para usar |  |
| 20 | 0,5 | 29:30 | Projeto 1 | Projeto 1 |  |
| 21 | 1 | 30:00 | Projeto 1 | O que vamos fazer neste projeto hoje |  |
| 22 | 1,5 | 31:00 | Projeto 1 | O que faz o /demo-plan |  |
| 23 | 3 | 32:30 | Projeto 1 | Planeia o swarm |  |
| 24 | 1,5 | 35:30 | Projeto 1 | O teu plano: 4 waves |  |
| 25 | 1,5 | 37:00 | Projeto 1 | O que faz o /demo-swarm |  |
| 26 | 2 | 38:30 | Projeto 1 | Solta o swarm |  |
| 27 | 2 | 40:30 | Projeto 1 | Pergunta sem interromper |  |
| 28 | 1,5 | 42:30 | Projeto 1 | Hooks: o Claude Code avisa, um script reage |  |
| 29 | 1 | 44:00 | Projeto 1 | Statusline: a linha de estado é um script |  |
| 30 | 3 | 45:00 | Projeto 1 | Num terceiro terminal: três funcionalidades |  |
| 31 | 1,5 | 48:00 | Projeto 1 | Worktrees e rotinas | PODE SALTAR |
| 32 | 2 | 49:30 | Projeto 1 | Até ficar tudo verde |  |
| 33 | 2 | 51:30 | Projeto 1 | O gate de segurança |  |
| 34 | 2 | 53:30 | Projeto 1 | Quanto custou? |  |
| 35 | 2 | 55:30 | Projeto 1 | Joga o que o swarm construiu |  |
| 36 | 2 | 57:30 | Memória | A memória do que fizeste |  |
| 37 | 3 | 59:30 | Memória | Abre o teu primeiro grafo |  |
| 38 | 0,5 | 62:30 | Projeto 2 | Projeto 2 |  |
| 39 | 1,5 | 63:00 | Projeto 2 | O mesmo ciclo, no teu repositório |  |
| 40 | 4 | 64:30 | Projeto 2 | Traz a tua tarefa |  |
| 41 | 5 | 68:30 | Projeto 2 | O planner decide quantos agentes |  |
| 42 | 10 | 73:30 | Projeto 2 | Põe o swarm a trabalhar |  |
| 43 | 1 | 83:30 | Projeto 2 | Jira e GitHub | PODE SALTAR |
| 44 | 2 | 84:30 | Projeto 2 | Depois do workshop |  |
| 45 | 2 | 86:30 | Encerramento | Cinco ideias para levar |  |
| 46 | 1 | 88:30 | Encerramento | Amanhã |  |
| 47 | 0,5 | 89:30 | Encerramento | Perguntas |  |

Total: 90 min.

## Notas por slide

### 1. Orquestração de agentes com Claude

[0:00 → 1:00] 1 min · deves estar aqui aos 0 min

Boas-vindas. Em 90 minutos vamos pôr um swarm de agentes a construir um jogo e, depois, a trabalhar numa tarefa real de cada um.

### 2. Vais sair do workshop com isto

[1:00 → 2:30] 1,5 min · deves estar aqui aos 1 min

Três resultados concretos. Tudo fica instalado no portátil de cada um e continua a funcionar depois de hoje.

### 3. As regras do custo

[2:30 → 4:00] 1,5 min · deves estar aqui aos 3 min

O orçamento é garantido pelo benchmark, não por cortes. Se alguém passar o alvo, aparece um aviso e a pessoa continua a trabalhar.

### 4. Instala o kit

[4:00 → 5:30] 1,5 min · deves estar aqui aos 4 min

Quase todos já instalaram antes (pré-trabalho): para esses, este slide é só para saberem onde está o comando. Quem ainda não instalou corre agora e segue com o vizinho enquanto instala (10 a 20 minutos). O mesmo comando serve para instalar noutra máquina. Os comandos são gerados a partir do repos.conf: estão sempre certos para a versão publicada (v1.0.0-rc.2). Para atualizar só a app Agent Memory: agent-memory update. Antes deste slide, enviar os comandos no Teams para todos copiarem.

### 5. Verifica a instalação

[5:30 → 8:30] 3 min · deves estar aqui aos 6 min

Toda a gente corre o check. Demora 2 a 3 minutos e não instala nada. Quem não fez o setup segue com o vizinho e instala no intervalo das perguntas. O setup fala inglês, mas deteta a língua da máquina e grava a definição language do Claude Code (português, inglês, hindi ou hebraico): as skills respondem nessa língua. A Arena, as tabelas do orquestrador e as docs ficam em português ou inglês (as outras línguas ficam em inglês). Antes deste slide, enviar os comandos no Teams para todos copiarem.

### 6. Algum passo falhou?

[8:30 → 10:30] 2 min · deves estar aqui aos 9 min

O doctor verifica tudo e, se algum passo falhou, pede um diagnóstico ao Claude: envia o estado de cada passo e o fim do log, sem segredos. Não executa nada. Voltar a correr o comando de instalação repete só os passos que faltam; aí, em cada falha, o Claude propõe comandos e só os corre com confirmação, um a um. Se o Claude ainda não estiver instalado, aparece a ajuda pré-escrita do TROUBLESHOOTING. Antes deste slide, enviar os comandos no Teams para todos copiarem.

### 7. Conceitos

[10:30 → 11:00] 0,5 min · deves estar aqui aos 11 min

Quinze minutos de ideias, um conceito por slide.

### 8. O Claude Code trabalha no teu projeto

[11:00 → 12:30] 1,5 min · deves estar aqui aos 11 min

O Claude Code não é um chat: é um agente que age no repositório. Tudo o que faz passa por permissões. Plan mode (Shift+Tab) faz com que só planeie, sem tocar em nada.

### 9. Uma skill é uma receita com nome

[12:30 → 14:30] 2 min · deves estar aqui aos 13 min

As skills substituíram os slash commands antigos. O frontmatter fixa o modelo e as ferramentas autorizadas. Hoje vamos usar dois conjuntos: os /demo-* na Arena e os /task-* no dia a dia. As skills do kit estão em inglês e mandam o Claude responder na língua do participante.

### 10. Subagentes: contexto e modelo próprios

[14:30 → 16:30] 2 min · deves estar aqui aos 15 min

Um subagente é uma instância do Claude com contexto limpo, ferramentas próprias e o modelo que quisermos. É definido num ficheiro .claude/agents/<nome>.md. O comando /agents já não abre um assistente: edita-se o ficheiro.

### 11. A regra económica

[16:30 → 18:30] 2 min · deves estar aqui aos 17 min

O swarm barato é o de muitos agentes pequenos com instruções claras. O que custa é a coordenação. Por isso o orquestrador é um script e os workers respondem com uma linha.

### 12. Tarefa → grafo → waves

[18:30 → 20:30] 2 min · deves estar aqui aos 19 min

O plano é um grafo de dependências. Executamos por waves: tudo o que está pronto corre em paralelo. As três tarefas de criptografia esperam pelo lib-hash, uma dependência real dentro da wave 1.

### 13. Quem decide o grafo é um script

[20:30 → 22:00] 1,5 min · deves estar aqui aos 21 min

Com 8 chamadas em paralelo, um modelo esquece dependências ou reescreve prompts. O script é reproduzível: é isso que torna o custo previsível e o benchmark comparável.

### 14. Medir, não adivinhar

[22:00 → 23:30] 1,5 min · deves estar aqui aos 22 min

Os hooks são comandos que o Claude Code corre em eventos. O nosso só mede: lê os tokens reais do transcript, multiplica pelos preços publicados e acrescenta uma linha. Nunca bloqueia nada.

### 15. O ciclo de cada tarefa

[23:30 → 24:30] 1 min · deves estar aqui aos 24 min

É o mesmo ciclo nos dois projetos: planear com Opus, executar em swarm, um gate de segurança, medir e guardar o que se aprendeu.

### 16. O que vamos construir: a Arena de Segurança

[24:30 → 25:30] 1 min · deves estar aqui aos 25 min

Antes do vídeo, dizer o que vai ser construído. A Arena é um mini-jogo de segurança: cada tarefa cria um desafio pequeno (encontrar a linha que expõe um segredo, escolher o site verdadeiro, ordenar as partes de um URL, escrever uma resposta). A casca da app e os testes já existem; os agentes escrevem os desafios, uma tarefa cada. Explicar as cores agora, porque vão aparecer em todo o lado: cada quadrado é uma tarefa, cinzento à espera, amarelo enquanto um agente trabalha nele, verde quando o teste passa, vermelho quando falha.

### 17. O swarm em ação

[25:30 → 26:00] 0,5 min · deves estar aqui aos 26 min

Ponte para o Projeto 1. O que vão ver é o ciclo do slide anterior (plan → swarm → review → cost → memória) numa execução real com 100 tarefas. Logo a seguir cada pessoa constrói a mesma Arena, com até 8 agentes em paralelo.

### 18. 100 agentes a construir a Arena

[26:00 → 28:30] 2,5 min · deves estar aqui aos 26 min

Vídeo acelerado de uma execução real com 100 tarefas. À esquerda, a página /status: cada quadrado é uma tarefa, amarelo enquanto um agente trabalha e verde quando o teste passa. À direita, o terminal com os lotes de agentes. O tempo e o custo são os reais. Plano B se o vídeo falhar: abrir /status?replay=recording na Arena gravada.

### 19. O resultado: o jogo pronto para usar

[28:30 → 29:30] 1 min · deves estar aqui aos 29 min

Gravação a jogar a Arena final: apontar a linha insegura, escolher a resposta certa, ordenar os passos e escrever a resposta. Cada desafio explica o porquê no fim. No fim do Projeto 1 cada pessoa joga a sua.

### 20. Projeto 1

[29:30 → 30:00] 0,5 min · deves estar aqui aos 30 min

25 minutos de hands-on. Na medição, o swarm das 100 tarefas demorou 6,5 min (a sessão completa, 9 min); em modo interativo e com contas novas pode demorar mais. Usamos esse tempo para ver funcionalidades.

### 21. O que vamos fazer neste projeto hoje

[30:00 → 31:00] 1 min · deves estar aqui aos 30 min

Os testes já existem: cada agente só tem de pôr o seu teste verde. É isto que deixa o Haiku fazer o grosso do trabalho com segurança.

### 22. O que faz o /demo-plan

[31:00 → 32:30] 1,5 min · deves estar aqui aos 31 min

Explicar antes de correr. Uma skill não é magia: é uma receita em Markdown que o Claude segue. Aqui ela chama um script que gera o grafo (sempre o mesmo, a partir das tarefas) e um agente Opus que só o revê. O resultado fica em ficheiros que podem abrir e ler.

### 23. Planeia o swarm

[32:30 → 35:30] 3 min · deves estar aqui aos 33 min

O diálogo de confiança é importante: sem ele, as permissões do projeto ficam desligadas. Nas versões recentes do Claude Code, como a Arena pré-aprova permissões, a opção já selecionada é "No, exit": quem carregar Enter sai. Mostrar a seta para baixo. O /demo-plan consulta a memória, gera o grafo e pede ao planner (Opus) para o rever.

### 24. O teu plano: 4 waves

[35:30 → 37:00] 1,5 min · deves estar aqui aos 36 min

Mostrar o plano de alguém no projetor. Na wave 1, o lib-hash e as tarefas dos desafios arrancam juntos; os de criptografia entram assim que o hash fica verde.

### 25. O que faz o /demo-swarm

[37:00 → 38:30] 1,5 min · deves estar aqui aos 37 min

Explicar antes de correr. O ponto importante: quem escolhe o que corre é um script, não o modelo. Por isso o custo e o tempo são previsíveis. Se uma tarefa falhar, o script repete-o com a mensagem de erro e, à terceira, com Sonnet.

### 26. Solta o swarm

[38:30 → 40:30] 2 min · deves estar aqui aos 39 min

A partir daqui o swarm trabalha alguns minutos (6,5 min na medição; mais com contas novas). Os próximos slides usam esse tempo; quem acabar primeiro joga a Arena.

### 27. Pergunta sem interromper

[40:30 → 42:30] 2 min · deves estar aqui aos 41 min

O /btw responde ao lado, sem entrar na conversa. Atenção: enquanto o painel da resposta está aberto, os resultados dos agentes ficam à espera (o Claude Code mostra "background task updates waiting while this panel is open"). Lê e carrega em Esc para o swarm continuar.

### 28. Hooks: o Claude Code avisa, um script reage

[42:30 → 44:00] 1,5 min · deves estar aqui aos 43 min

Sem entrar no código. A ideia: o hook é um "quando acontecer X, corre Y", configurado no settings.json. O Claude escreve hooks muito bem: basta descrever o que se quer. Mostrar o /hooks para ver os que estão ativos.

### 29. Statusline: a linha de estado é um script

[44:00 → 45:00] 1 min · deves estar aqui aos 44 min

Mostrar a statusline a mudar enquanto os agentes terminam. O hook grava, a statusline mostra: as duas peças juntas dão o custo ao vivo. O /usage do Claude Code pode mostrar mais, porque algumas versões ainda não conhecem os preços mais recentes; o /demo-cost usa os preços publicados.

### 30. Num terceiro terminal: três funcionalidades

[45:00 → 48:00] 3 min · deves estar aqui aos 45 min

Plan mode só lê e propõe. O claude -p é a base dos scripts e do CI. Esc Esc abre o rewind: repõe código e conversa até um checkpoint, mas não o que foi feito por Bash nem a maior parte do que os subagentes fizeram.

### 31. Worktrees e rotinas

[48:00 → 49:30] 1,5 min · PODE SALTAR · deves estar aqui aos 48 min

Saltar se houver atraso. Exemplo de rotina: uma revisão de segurança diária com node tools/routine.mjs --install --yes (sem --yes só mostra o que faria), que regista no launchd ou no Agendador de Tarefas um claude -p "/demo-review --auto".

### 32. Até ficar tudo verde

[49:30 → 51:30] 2 min · deves estar aqui aos 50 min

O /loop repete um prompt a cada intervalo, com a sessão aberta. Esc cancela.

### 33. O gate de segurança

[51:30 → 53:30] 2 min · deves estar aqui aos 52 min

Um jogo de segurança com falhas de segurança seria o pior exemplo. O gate liga cada verificação ao OWASP Top 10.

### 34. Quanto custou?

[53:30 → 55:30] 2 min · deves estar aqui aos 54 min

O relatório usa tokens reais e preços publicados. No fim grava as lições na app de memória.

### 35. Joga o que o swarm construiu

[55:30 → 57:30] 2 min · deves estar aqui aos 56 min

Os testes também correm no browser. É o mesmo teste que decidiu a cor do quadrado.

### 36. A memória do que fizeste

[57:30 → 59:30] 2 min · deves estar aqui aos 58 min

São ficheiros Markdown em ~/.agent-memory, com um índice SQLite. Fica tudo só no teu portátil. Cada memória fica ligada ao ticket do Jira ou do GitHub e ao seu épico: procurar ABC-123 traz tudo desse ticket e do épico. O /task-intake e o /task-plan consultam-na antes de planear ("da última vez neste épico, não fazer X").

### 37. Abre o teu primeiro grafo

[59:30 → 62:30] 3 min · deves estar aqui aos 60 min

A app abre na tua língua nativa e tem um seletor de língua. Rotinas, worktrees e o modo headless já foram vistos nos momentos de espera.

### 38. Projeto 2

[62:30 → 63:00] 0,5 min · deves estar aqui aos 63 min

25 minutos. A tarefa pode não terminar aqui: o objetivo é sair com a orquestração a correr e saber continuar.

### 39. O mesmo ciclo, no teu repositório

[63:00 → 64:30] 1,5 min · deves estar aqui aos 63 min

Os /task-* estão instalados ao nível do utilizador e funcionam em qualquer repositório. Toda a escrita no Jira ou no GitHub pede confirmação.

### 40. Traz a tua tarefa

[64:30 → 68:30] 4 min · deves estar aqui aos 65 min

Para o Jira é preciso ter feito login no /mcp (atlassian). O GitHub usa o gh. O intake só lê; não escreve nada.

### 41. O planner decide quantos agentes

[68:30 → 73:30] 5 min · deves estar aqui aos 69 min

O planner (Opus) propõe o grafo e um script valida-o: ids, dependências, ciclos e agentes conhecidos. As tarefas que mexem nos mesmos ficheiros ficam em lotes diferentes, na altura do swarm. A integração e a revisão são acrescentadas automaticamente.

### 42. Põe o swarm a trabalhar

[73:30 → 83:30] 10 min · deves estar aqui aos 74 min

O estado fica em .workshop/. Voltar a correr /task-swarm retoma. Tarefas que mexem nos mesmos ficheiros vão em lotes diferentes, ou em git worktrees se o planner o decidir.

### 43. Jira e GitHub

[83:30 → 84:30] 1 min · PODE SALTAR · deves estar aqui aos 84 min

Saltar se houver atraso. O MCP da Atlassian gasta créditos Rovo da empresa e o administrador pode limitá-lo. Se o MCP falhar, as skills usam o Atlassian CLI oficial (acli), que o setup já instalou: lê a issue e publica os comentários; as horas registam-se à mão.

### 44. Depois do workshop

[84:30 → 86:30] 2 min · deves estar aqui aos 85 min

Exemplo de comentário: agente ws-worker-07 · Haiku · 5 s · US$ 0,004.

### 45. Cinco ideias para levar

[86:30 → 88:30] 2 min · deves estar aqui aos 87 min

Resumo em cinco frases.

### 46. Amanhã

[88:30 → 89:30] 1 min · deves estar aqui aos 89 min

Três ações concretas.

### 47. Perguntas

[89:30 → 90:00] 0,5 min · deves estar aqui aos 90 min

As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora.

