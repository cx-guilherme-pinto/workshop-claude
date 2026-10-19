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
| 9 | 1,5 | 12:30 | Conceitos | Uma skill é uma receita com nome |  |
| 10 | 1,5 | 14:00 | Conceitos | Subagentes: contexto e modelo próprios |  |
| 11 | 1,5 | 15:30 | Conceitos | A regra económica |  |
| 12 | 1 | 17:00 | Conceitos | O ciclo de cada tarefa |  |
| 13 | 1 | 18:00 | Preview | O que vamos construir: a Arena de Segurança |  |
| 14 | 0,5 | 19:00 | Preview | O swarm em ação |  |
| 15 | 2,5 | 19:30 | Preview | O swarm a construir a Arena |  |
| 16 | 1 | 22:00 | Preview | O resultado: o jogo pronto para usar |  |
| 17 | 0,5 | 23:00 | Projeto 1 | Projeto 1 |  |
| 18 | 1 | 23:30 | Projeto 1 | O que vamos fazer neste projeto hoje |  |
| 19 | 5 | 24:30 | Projeto 1 | Escreve o teu cartão |  |
| 20 | 1,5 | 29:30 | Projeto 1 | O que faz o /demo-plan |  |
| 21 | 1,5 | 31:00 | Projeto 1 | Tarefa → grafo → waves |  |
| 22 | 3 | 32:30 | Projeto 1 | Planeia o swarm |  |
| 23 | 1,5 | 35:30 | Projeto 1 | O que faz o /demo-swarm |  |
| 24 | 2 | 37:00 | Projeto 1 | Solta o swarm |  |
| 25 | 2 | 39:00 | Projeto 1 | Pergunta sem interromper |  |
| 26 | 3 | 41:00 | Projeto 1 | Num terceiro terminal: três funcionalidades |  |
| 27 | 2 | 44:00 | Projeto 1 | Cria um hook PostToolUse |  |
| 28 | 2 | 46:00 | Projeto 1 | Faz a tua statusline |  |
| 29 | 5 | 48:00 | Projeto 1 | Porque é que este cartão falhou? |  |
| 30 | 2 | 53:00 | Projeto 1 | O gate de segurança |  |
| 31 | 1 | 55:00 | Projeto 1 | Medir, não adivinhar |  |
| 32 | 2 | 56:00 | Projeto 1 | Quanto custou? |  |
| 33 | 2 | 58:00 | Projeto 1 | Joga o que o swarm construiu |  |
| 34 | 2 | 60:00 | Memória | A memória do que fizeste |  |
| 35 | 3 | 62:00 | Memória | Abre o teu primeiro grafo |  |
| 36 | 0,5 | 65:00 | Projeto 2 | Projeto 2 |  |
| 37 | 1,5 | 65:30 | Projeto 2 | O mesmo ciclo, noutro repositório |  |
| 38 | 3 | 67:00 | Projeto 2 | Começa pela issue EX-1 |  |
| 39 | 4 | 70:00 | Projeto 2 | O planner decide quantos agentes |  |
| 40 | 11 | 74:00 | Projeto 2 | Põe o swarm a trabalhar |  |
| 41 | 2 | 85:00 | Projeto 2 | Depois do workshop |  |
| 42 | 1,5 | 87:00 | Encerramento | Cinco ideias para levar |  |
| 43 | 1 | 88:30 | Encerramento | Amanhã |  |
| 44 | 0,5 | 89:30 | Encerramento | Perguntas |  |

Total: 90 min.

## Notas por slide

### 1. Orquestração de agentes com Claude

[0:00 → 1:00] 1 min · deves estar aqui aos 0 min

Boas-vindas. Em 90 minutos vamos pôr um swarm de agentes a construir um jogo e, depois, a trabalhar numa tarefa a sério, num repositório com testes.

### 2. Vais sair do workshop com isto

[1:00 → 2:30] 1,5 min · deves estar aqui aos 1 min

Três resultados concretos. Tudo fica instalado no portátil de cada um e continua a funcionar depois de hoje.

### 3. As regras do custo

[2:30 → 4:00] 1,5 min · deves estar aqui aos 3 min

O orçamento é garantido pelo benchmark, não por cortes. Se alguém passar o alvo, aparece um aviso e a pessoa continua a trabalhar. Os números do rodapé são os da execução de referência do Projeto 1 (8 agentes em paralelo, como no portátil de cada um): são os mesmos que aparecem no resto da apresentação.

### 4. Instala o kit

[4:00 → 5:30] 1,5 min · deves estar aqui aos 4 min

Quase todos já instalaram antes (pré-trabalho): para esses, este slide é só para saberem onde está o comando. Quem ainda não instalou corre agora e segue com o vizinho enquanto instala (10 a 20 minutos). O mesmo comando serve para instalar noutra máquina. Os comandos são gerados a partir do repos.conf: estão sempre certos para a versão publicada (v1.0.0-rc.3). Para atualizar só a app Agent Memory: agent-memory update. Antes deste slide, enviar os comandos no Teams para todos copiarem.

### 5. Verifica a instalação

[5:30 → 8:30] 3 min · deves estar aqui aos 6 min

Toda a gente corre o check. Demora 2 a 3 minutos e não instala nada. Quem não fez o setup segue com o vizinho e instala no intervalo das perguntas. O setup fala inglês, mas deteta a língua da máquina e grava a definição language do Claude Code (português, inglês, hindi ou hebraico): as skills respondem nessa língua. A Arena, as tabelas do orquestrador e as docs ficam em português ou inglês (as outras línguas ficam em inglês). Antes deste slide, enviar os comandos no Teams para todos copiarem.

### 6. Algum passo falhou?

[8:30 → 10:30] 2 min · deves estar aqui aos 9 min

O doctor verifica tudo e, se algum passo falhou, pede um diagnóstico ao Claude: envia o estado de cada passo e o fim do log, sem segredos. Não executa nada. Voltar a correr o comando de instalação repete só os passos que faltam; aí, em cada falha, o Claude propõe comandos e só os corre com confirmação, um a um. Se o Claude ainda não estiver instalado, aparece a ajuda pré-escrita do TROUBLESHOOTING. Antes deste slide, enviar os comandos no Teams para todos copiarem.

### 7. Conceitos

[10:30 → 11:00] 0,5 min · deves estar aqui aos 11 min

Sete minutos de ideias, um conceito por slide. O grafo de tarefas e a medição do custo ficam para o Projeto 1, ao lado do sítio onde se usam.

### 8. O Claude Code trabalha no teu projeto

[11:00 → 12:30] 1,5 min · deves estar aqui aos 11 min

O Claude Code não é um chat: é um agente que age no repositório. Tudo o que faz passa por permissões. Plan mode (Shift+Tab) faz com que só planeie, sem tocar em nada.

### 9. Uma skill é uma receita com nome

[12:30 → 14:00] 1,5 min · deves estar aqui aos 13 min

As skills substituíram os slash commands antigos. O frontmatter fixa o modelo e as ferramentas autorizadas. Hoje vamos usar dois conjuntos: os /demo-* na Arena e os /task-* no dia a dia. As skills do kit estão em inglês e mandam o Claude responder na língua do participante.

### 10. Subagentes: contexto e modelo próprios

[14:00 → 15:30] 1,5 min · deves estar aqui aos 14 min

Um subagente é uma instância do Claude com contexto limpo, ferramentas próprias e o modelo que quisermos. É definido num ficheiro .claude/agents/<nome>.md. O comando /agents já não abre um assistente: edita-se o ficheiro.

### 11. A regra económica

[15:30 → 17:00] 1,5 min · deves estar aqui aos 16 min

O swarm barato é o de muitos agentes pequenos com instruções claras. O que custa é a coordenação. Por isso o orquestrador é um script e os workers respondem com uma linha. Os dois números vêm da execução de referência do Projeto 1.

### 12. O ciclo de cada tarefa

[17:00 → 18:00] 1 min · deves estar aqui aos 17 min

É o mesmo ciclo nos dois projetos: planear com Opus, executar em swarm, um gate de segurança, medir e guardar o que se aprendeu. Cada passo volta a aparecer no Projeto 1, no sítio em que se usa.

### 13. O que vamos construir: a Arena de Segurança

[18:00 → 19:00] 1 min · deves estar aqui aos 18 min

Antes do vídeo, dizer o que vai ser construído. A Arena é um mini-jogo de segurança: cada tarefa cria um desafio pequeno (encontrar a linha que expõe um segredo, escolher o site verdadeiro, ordenar as partes de um URL, escrever uma resposta). A casca da app e os testes já existem; os agentes escrevem os desafios, uma tarefa cada. Explicar as cores agora, porque vão aparecer em todo o lado: cada quadrado é uma tarefa, cinzento à espera, amarelo enquanto um agente trabalha nele, verde quando o teste passa, vermelho quando falha.

### 14. O swarm em ação

[19:00 → 19:30] 0,5 min · deves estar aqui aos 19 min

Ponte para o Projeto 1. O que vão ver é o ciclo dos conceitos (plan → swarm → review → cost → memória) numa execução real com 100 tarefas. Logo a seguir cada pessoa constrói a mesma Arena, com até 8 agentes em paralelo.

### 15. O swarm a construir a Arena

[19:30 → 22:00] 2,5 min · deves estar aqui aos 20 min

Vídeo acelerado de uma execução real com 100 tarefas, gravada em modo apresentador: 16 agentes em paralelo, por isso os números do rodapé não são os do Projeto 1 (no portátil de cada um correm 8 em paralelo; ver o slide do custo). À esquerda, a página /status: cada quadrado é uma tarefa, amarelo enquanto um agente trabalha e verde quando o teste passa. À direita, o terminal com os lotes de agentes. Plano B se o vídeo falhar: abrir /status?replay=recording na Arena gravada.

### 16. O resultado: o jogo pronto para usar

[22:00 → 23:00] 1 min · deves estar aqui aos 22 min

Gravação a jogar a Arena final: apontar a linha insegura, escolher a resposta certa, ordenar os passos e escrever a resposta. Cada desafio explica o porquê no fim. No fim do Projeto 1 cada pessoa joga a sua.

### 17. Projeto 1

[23:00 → 23:30] 0,5 min · deves estar aqui aos 23 min

37 minutos de hands-on. Na execução de referência, o swarm das 100 tarefas demorou 6,5 min (a sessão completa, 9 min); em modo interativo e com contas novas pode demorar mais. Os slides entre "Solta o swarm" e "Porque é que este cartão falhou?" (9 minutos) cobrem essa espera: são todos para fazer enquanto o swarm trabalha.

### 18. O que vamos fazer neste projeto hoje

[23:30 → 24:30] 1 min · deves estar aqui aos 24 min

Os testes já existem: cada agente só tem de pôr o seu teste verde. É isto que deixa o Haiku fazer o grosso do trabalho com segurança. São 105 tarefas; com o cartão de cada um, 106.

### 19. Escreve o teu cartão

[24:30 → 29:30] 5 min · deves estar aqui aos 25 min

O exemplo já tem todos os campos: basta mudar o texto. O template escolhe o formato: spot-the-flaw (apontar a linha insegura), choice (escolher a resposta), order (ordenar os passos) ou answer (escrever a resposta); cada um tem os seus campos, e o exemplo mostra-os. O gen.mjs escreve a spec e o teste do cartão (cards/my-01/), e o /demo-plan junta-o às outras tarefas: passam a ser 101 cartões. Quem não quiser escrever salta este passo e fica com 100. No Windows, o cp funciona no PowerShell.

### 20. O que faz o /demo-plan

[29:30 → 31:00] 1,5 min · deves estar aqui aos 30 min

Explicar antes de correr. Uma skill não é magia: é uma receita em Markdown que o Claude segue. Aqui ela chama um script que gera o grafo (sempre o mesmo, a partir das tarefas, incluindo o teu cartão) e um agente Opus que só o revê. O resultado fica em ficheiros que podem abrir e ler (o PLAN.md tem as waves, as dependências e a estimativa).

### 21. Tarefa → grafo → waves

[31:00 → 32:30] 1,5 min · deves estar aqui aos 31 min

O plano é um grafo de dependências. Executamos por waves: tudo o que está pronto corre em paralelo. Na wave 1, o lib-hash e os desafios arrancam juntos; as três tarefas de criptografia esperam pelo lib-hash (uma dependência real dentro da wave 1) e entram assim que ele fica verde. É isto que o /demo-plan vai desenhar no slide seguinte.

### 22. Planeia o swarm

[32:30 → 35:30] 3 min · deves estar aqui aos 33 min

O diálogo de confiança é importante: sem ele, as permissões do projeto ficam desligadas. Nas versões recentes do Claude Code, como a Arena pré-aprova permissões, a opção já selecionada é "No, exit": quem carregar Enter sai. Mostrar a seta para baixo. O /demo-plan consulta a memória, gera o grafo e pede ao planner (Opus) para o rever. Depois, mostrar o plano de alguém no projetor. Decisão de custo opcional: com --crypto haiku ou --crypto sonnet cada pessoa escolhe o modelo das tarefas de criptografia; no fim, no /demo-cost, compara o custo e os verdes com o vizinho que escolheu o outro.

### 23. O que faz o /demo-swarm

[35:30 → 37:00] 1,5 min · deves estar aqui aos 36 min

Explicar antes de correr. O ponto importante: quem escolhe o que corre é um script, não o modelo. Com 8 chamadas em paralelo, um modelo esquece dependências ou reescreve prompts; o script é reproduzível, e é isso que torna o custo previsível e o benchmark comparável. O grade.mjs corre o teste de cada tarefa e decide: verde ou vermelho. Se uma tarefa falhar, o script repete-a com a mensagem de erro e, à terceira, com Sonnet.

### 24. Solta o swarm

[37:00 → 39:00] 2 min · deves estar aqui aos 37 min

Previsão, antes de carregar em Enter: cada pessoa escreve no Teams quanto acha que vai custar e quantos cartões vão ficar vermelhos. A partir daqui o swarm trabalha alguns minutos (6,5 min na execução de referência; mais com contas novas). Os próximos quatro slides (9 minutos) fazem-se durante essa espera; quem acabar primeiro joga a Arena.

### 25. Pergunta sem interromper

[39:00 → 41:00] 2 min · deves estar aqui aos 39 min

O /btw responde ao lado, sem entrar na conversa. Atenção: enquanto o painel da resposta está aberto, os resultados dos agentes ficam à espera (o Claude Code mostra "background task updates waiting while this panel is open"). Lê e carrega em Esc para o swarm continuar.

### 26. Num terceiro terminal: três funcionalidades

[41:00 → 44:00] 3 min · deves estar aqui aos 41 min

Ainda durante o swarm. Plan mode só lê e propõe. O claude -p é a base dos scripts e do CI. Esc Esc abre o rewind: repõe código e conversa até um checkpoint, mas não o que foi feito por Bash nem a maior parte do que os subagentes fizeram. Se perguntarem por worktrees: claude -w <nome> abre uma cópia isolada do repositório num branch próprio, e isolation: worktree põe um subagente no seu worktree quando as tarefas mexem nos mesmos ficheiros.

### 27. Cria um hook PostToolUse

[44:00 → 46:00] 2 min · deves estar aqui aos 44 min

Ainda durante o swarm, e fora da Arena, para não mexer na sessão do swarm. O hook é um "quando acontecer X, corre Y", configurado num settings.json; o Claude escreve hooks muito bem, basta descrever o que se quer. O settings.local.json é só desta pasta e não vai para o git. No Projeto 2 (o projeto de treino) o hook dispara também para os agentes do /task-swarm: abrir o edits.log e ver os ficheiros a aparecer. O kit usa o SubagentStop para gravar o custo de cada agente (ver "Medir, não adivinhar").

### 28. Faz a tua statusline

[46:00 → 48:00] 2 min · deves estar aqui aos 46 min

Ainda durante o swarm. A statusline do kit lê o que o hook gravou e mostra o custo da sessão e do projeto, ao vivo, face ao alvo de US$ 5: mostrar a do Terminal 1 a mudar enquanto os agentes terminam. Pedir para gravar em .claude/settings.local.json é importante: sem isso, o /statusline grava nas definições do utilizador e substitui a do kit em todos os projetos. Para voltar à do kit neste projeto, apaga o statusLine do settings.local.json. O /usage do Claude Code pode mostrar mais, porque algumas versões ainda não conhecem os preços mais recentes; o /demo-cost usa os preços publicados.

### 29. Porque é que este cartão falhou?

[48:00 → 53:00] 5 min · deves estar aqui aos 48 min

A lição do Projeto 1: o agente não adivinha o que a spec não diz. O teste mostra o que esperava e o que recebeu; a spec do cartão não o dizia, por isso nem o Haiku nem o Sonnet (que entra à terceira tentativa) o acertam. Quem acabar repete para os outros vermelhos: o gate só aprova com tudo verde. Comparar com a previsão do Teams: quantos vermelhos esperavam? Extra opcional, para quem quiser automatizar: /loop 2m corre node tools/workshop/orchestrator/grade.mjs --all e corrige a primeira tarefa vermelha com o agente implementer; termina quando estiver tudo verde (o /loop repete um prompt a cada intervalo; Esc cancela).

### 30. O gate de segurança

[53:00 → 55:00] 2 min · deves estar aqui aos 53 min

Um jogo de segurança com falhas de segurança seria o pior exemplo. O gate liga cada verificação ao OWASP Top 10. Com cartões ainda vermelhos, o gate diz GATE: REJECTED e quais faltam: voltar ao slide anterior.

### 31. Medir, não adivinhar

[55:00 → 56:00] 1 min · deves estar aqui aos 55 min

Antes do /demo-cost: de onde vêm os números. O hook do kit é como o que criaram, mas noutro evento: lê os tokens reais do transcript, multiplica pelos preços publicados e acrescenta uma linha. Nunca bloqueia nada. A statusline e o /demo-cost só leem essas linhas.

### 32. Quanto custou?

[56:00 → 58:00] 2 min · deves estar aqui aos 56 min

O relatório usa tokens reais e preços publicados. No fim grava as lições na app de memória. Quem usou --crypto haiku compara com quem usou --crypto sonnet: custo e verdes. Duelo: cada sala junta no Teams o custo e os cartões verdes de todos, e as duas salas comparam no fim (e com a previsão de antes do swarm).

### 33. Joga o que o swarm construiu

[58:00 → 60:00] 2 min · deves estar aqui aos 58 min

Os testes também correm no browser. É o mesmo teste que decidiu a cor do quadrado.

### 34. A memória do que fizeste

[60:00 → 62:00] 2 min · deves estar aqui aos 60 min

São ficheiros Markdown em ~/.agent-memory, com um índice SQLite. Fica tudo só no teu portátil. Cada memória fica ligada ao ticket do Jira ou do GitHub e ao seu épico: procurar ABC-123 traz tudo desse ticket e do épico. O /task-intake e o /task-plan consultam-na antes de planear ("da última vez neste épico, não fazer X").

### 35. Abre o teu primeiro grafo

[62:00 → 65:00] 3 min · deves estar aqui aos 62 min

A app abre na tua língua nativa e tem um seletor de língua. A lição sobre o cartão que falhou deve estar lá.

### 36. Projeto 2

[65:00 → 65:30] 0,5 min · deves estar aqui aos 65 min

22 minutos. O caminho de todos é o projeto de treino: a Biblioteca Municipal, uma API pequena com testes e as issues EX-1 a EX-3 em JSON, sem login no Jira nem MCP. Quem já tem o Jira ou o GitHub a funcionar pode trazer uma tarefa sua. A tarefa pode não terminar aqui: o objetivo é sair com a orquestração a correr e saber continuar.

### 37. O mesmo ciclo, noutro repositório

[65:30 → 67:00] 1,5 min · deves estar aqui aos 66 min

Os /task-* estão instalados ao nível do utilizador e funcionam em qualquer repositório. Toda a escrita no Jira ou no GitHub pede confirmação; no projeto de treino não há nada para publicar.

### 38. Começa pela issue EX-1

[67:00 → 70:00] 3 min · deves estar aqui aos 67 min

Quem ainda tem o Claude aberto no Terminal 3 (do hook) só escreve a última linha. A EX-1 é pequena: validar o ISBN e o email ao criar livros e leitores. O intake só lê; não escreve nada. Com um repositório próprio: o Jira precisa de login no /mcp (atlassian) e o GitHub usa o gh.

### 39. O planner decide quantos agentes

[70:00 → 74:00] 4 min · deves estar aqui aos 70 min

O planner (Opus) propõe o grafo e um script valida-o: ids, dependências, ciclos e agentes conhecidos. As tarefas que mexem nos mesmos ficheiros ficam em lotes diferentes, na altura do swarm. A integração e a revisão são acrescentadas automaticamente. Uma tarefa grande (a EX-2) dá mais agentes.

### 40. Põe o swarm a trabalhar

[74:00 → 85:00] 11 min · deves estar aqui aos 74 min

O estado fica em .workshop/. Voltar a correr /task-swarm retoma. Tarefas que mexem nos mesmos ficheiros vão em lotes diferentes, ou em git worktrees se o planner o decidir. O hook do Projeto 1 está a funcionar: abrir o ~/workshop-claude/edits.log e ver os ficheiros que os agentes editam. Quem acabar a EX-1 segue para a EX-3 (pequena, de segurança: um leitor vê os empréstimos de outro) ou para a EX-2 (média, mais agentes), e pode correr o /task-gate.

### 41. Depois do workshop

[85:00 → 87:00] 2 min · deves estar aqui aos 85 min

Para usar com as tuas issues: o Jira usa o MCP da Atlassian, com login no /mcp; se falhar, o Atlassian CLI (acli auth login), que o setup já instalou, lê a issue e publica os comentários (as horas registam-se à mão). O MCP da Atlassian gasta créditos Rovo da empresa e o administrador pode limitá-lo. O GitHub usa o gh (gh auth login): gasta menos contexto do que um MCP e não partilha tokens. Exemplo de comentário: agente ws-worker-07 · Haiku · 5 s · US$ 0,004.

### 42. Cinco ideias para levar

[87:00 → 88:30] 1,5 min · deves estar aqui aos 87 min

Resumo em cinco frases. A terceira junta as duas lições do Projeto 1: o orquestrador é um script e o cartão que falhou falhou pela spec.

### 43. Amanhã

[88:30 → 89:30] 1 min · deves estar aqui aos 89 min

Três ações concretas.

### 44. Perguntas

[89:30 → 90:00] 0,5 min · deves estar aqui aos 90 min

As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora. Se der tempo: o resultado do duelo entre as duas salas.

