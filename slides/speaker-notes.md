# Notas do apresentador — Orquestração de agentes com Claude

Relógio acumulado: "deves estar aqui aos X min". Os slides marcados com **PODE SALTAR** saltam-se se houver atraso.

| # | min | relógio | secção | slide | saltar |
|---|---|---|---|---|---|
| 1 | 1 | 0:00 | Abertura | Orquestração de agentes com Claude |  |
| 2 | 1.5 | 1:00 | Abertura | O que levas para casa |  |
| 3 | 1.5 | 2:30 | Abertura | As regras do custo |  |
| 4 | 3 | 4:00 | Verificar | Verifica a instalação |  |
| 5 | 2 | 7:00 | Verificar | Algum passo falhou? |  |
| 6 | 0.5 | 9:00 | Conceitos | Conceitos |  |
| 7 | 1.5 | 9:30 | Conceitos | O Claude Code trabalha no teu projeto |  |
| 8 | 2 | 11:00 | Conceitos | Uma skill é uma receita com nome |  |
| 9 | 2 | 13:00 | Conceitos | Subagentes: contexto e modelo próprios |  |
| 10 | 2 | 15:00 | Conceitos | A regra económica |  |
| 11 | 2 | 17:00 | Conceitos | Tarefa → grafo → ondas |  |
| 12 | 1.5 | 19:00 | Conceitos | Quem decide o grafo é um script |  |
| 13 | 1.5 | 20:30 | Conceitos | Medir, não adivinhar |  |
| 14 | 1 | 22:00 | Conceitos | O ciclo de cada tarefa |  |
| 15 | 0.5 | 23:00 | Preview | O swarm em ação |  |
| 16 | 3 | 23:30 | Preview | 100 agentes a construir a Arena |  |
| 17 | 1 | 26:30 | Preview | O resultado: um jogo para jogar |  |
| 18 | 0.5 | 27:30 | Projeto 1 | Projeto 1 |  |
| 19 | 1 | 28:00 | Projeto 1 | O que já está pronto e o que falta |  |
| 20 | 1.5 | 29:00 | Projeto 1 | O que faz o /demo-plan |  |
| 21 | 3 | 30:30 | Projeto 1 | Planeia o swarm |  |
| 22 | 1.5 | 33:30 | Projeto 1 | O teu plano: 4 ondas |  |
| 23 | 1.5 | 35:00 | Projeto 1 | O que faz o /demo-swarm |  |
| 24 | 2 | 36:30 | Projeto 1 | Solta o swarm |  |
| 25 | 2 | 38:30 | Projeto 1 | Pergunta sem interromper |  |
| 26 | 1.5 | 40:30 | Projeto 1 | Hooks: o Claude avisa, um script reage |  |
| 27 | 1 | 42:00 | Projeto 1 | Statusline: a linha de estado é um script |  |
| 28 | 3 | 43:00 | Projeto 1 | No Terminal 2: três funcionalidades |  |
| 29 | 2 | 46:00 | Projeto 1 | Worktrees e rotinas | PODE SALTAR |
| 30 | 2 | 48:00 | Projeto 1 | Até ficar tudo verde |  |
| 31 | 2 | 50:00 | Projeto 1 | O gate de segurança |  |
| 32 | 2 | 52:00 | Projeto 1 | Quanto custou? |  |
| 33 | 2 | 54:00 | Projeto 1 | Joga o que o swarm construiu |  |
| 34 | 2 | 56:00 | Memória | A memória do que fizeste |  |
| 35 | 3 | 58:00 | Memória | Abre o teu primeiro grafo |  |
| 36 | 0.5 | 61:00 | Projeto 2 | Projeto 2 |  |
| 37 | 1.5 | 61:30 | Projeto 2 | O mesmo ciclo, no teu repositório |  |
| 38 | 4 | 63:00 | Projeto 2 | Traz a tua tarefa |  |
| 39 | 5 | 67:00 | Projeto 2 | O planner decide quantos agentes |  |
| 40 | 10 | 72:00 | Projeto 2 | Põe o swarm a trabalhar |  |
| 41 | 1 | 82:00 | Projeto 2 | Jira e GitHub | PODE SALTAR |
| 42 | 2 | 83:00 | Projeto 2 | Depois do workshop |  |
| 43 | 2 | 85:00 | Encerramento | Cinco ideias para levar |  |
| 44 | 1.5 | 87:00 | Encerramento | Onde está tudo |  |
| 45 | 1 | 88:30 | Encerramento | Amanhã |  |
| 46 | 0.5 | 89:30 | Encerramento | Perguntas |  |

Total: 90 min.

## Notas por slide

### 1. Orquestração de agentes com Claude

[0:00 → 1:00] 1 min · deves estar aqui aos 0 min

Boas-vindas. Em 90 minutos vamos pôr um swarm de agentes a construir um jogo e, depois, a trabalhar numa tarefa real de cada um.

### 2. O que levas para casa

[1:00 → 2:30] 1.5 min · deves estar aqui aos 1 min

Três resultados concretos. Tudo fica instalado no portátil de cada um e continua a funcionar depois de hoje.

### 3. As regras do custo

[2:30 → 4:00] 1.5 min · deves estar aqui aos 3 min

O orçamento é garantido pelo benchmark, não por cortes. Se alguém passar o alvo, aparece um aviso e continua a trabalhar.

### 4. Verifica a instalação

[4:00 → 7:00] 3 min · deves estar aqui aos 4 min

Toda a gente corre o check. Demora 2 a 3 minutos e não instala nada. Quem não fez o setup segue com o vizinho e instala no intervalo das perguntas. O setup fala inglês, mas deteta a língua da máquina e grava a definição language do Claude Code (português, inglês, hindi ou hebraico): as skills respondem nessa língua. A Arena, as tabelas do orquestrador e as docs ficam em português ou inglês (as outras línguas ficam em inglês). Antes deste slide, enviar os comandos no Teams para todos copiarem.

### 5. Algum passo falhou?

[7:00 → 9:00] 2 min · deves estar aqui aos 7 min

O Claude lê só o excerto do log daquele passo, sem segredos, e propõe comandos. Nunca executa nada sem confirmação. Se o Claude ainda não estiver instalado, aparece a mensagem pré-escrita do TROUBLESHOOTING. Antes deste slide, enviar os comandos no Teams para todos copiarem.

### 6. Conceitos

[9:00 → 9:30] 0.5 min · deves estar aqui aos 9 min

Quinze minutos de ideias, um conceito por slide.

### 7. O Claude Code trabalha no teu projeto

[9:30 → 11:00] 1.5 min · deves estar aqui aos 10 min

O Claude Code não é um chat: é um agente que age no repositório. Tudo o que faz passa por permissões. Plan mode (Shift+Tab) faz com que só planeie, sem tocar em nada.

### 8. Uma skill é uma receita com nome

[11:00 → 13:00] 2 min · deves estar aqui aos 11 min

As skills substituíram os slash commands antigos. O frontmatter fixa o modelo e as ferramentas autorizadas. Hoje vamos usar dois sets: os /demo-* na Arena e os /task-* no dia a dia. As skills do kit estão em inglês e mandam o Claude responder na língua do participante.

### 9. Subagentes: contexto e modelo próprios

[13:00 → 15:00] 2 min · deves estar aqui aos 13 min

Um subagente é uma instância do Claude com contexto limpo, ferramentas próprias e o modelo que quisermos. É definido num ficheiro .claude/agents/<nome>.md. O comando /agents já não abre um assistente: edita-se o ficheiro.

### 10. A regra económica

[15:00 → 17:00] 2 min · deves estar aqui aos 15 min

O swarm barato é o de muitos agentes pequenos com instruções claras. O que custa é a coordenação. Por isso o orquestrador é um script e os workers respondem com uma linha.

### 11. Tarefa → grafo → ondas

[17:00 → 19:00] 2 min · deves estar aqui aos 17 min

O plano é um grafo de dependências. Executamos por ondas: tudo o que está pronto corre em paralelo. Os três cartões de criptografia esperam pelo lib/hash, uma dependência real dentro da onda 1.

### 12. Quem decide o grafo é um script

[19:00 → 20:30] 1.5 min · deves estar aqui aos 19 min

Com 15 chamadas em paralelo, um modelo esquece dependências ou reescreve prompts. O script é reproduzível: é isso que torna o custo previsível e o benchmark comparável.

### 13. Medir, não adivinhar

[20:30 → 22:00] 1.5 min · deves estar aqui aos 21 min

Os hooks são comandos que o Claude Code corre em eventos. O nosso só mede: lê os tokens reais do transcript, multiplica pelos preços publicados e acrescenta uma linha. Nunca bloqueia nada.

### 14. O ciclo de cada tarefa

[22:00 → 23:00] 1 min · deves estar aqui aos 22 min

É o mesmo ciclo nos dois projetos: planear com Opus, executar em swarm, um gate de segurança, medir e guardar o que se aprendeu.

### 15. O swarm em ação

[23:00 → 23:30] 0.5 min · deves estar aqui aos 23 min

Ponte para o Projeto 1. O que vão ver é o ciclo do slide anterior (plan → swarm → review → cost → memória) numa execução real com 100 cartões. Logo a seguir cada pessoa faz o mesmo com 15.

### 16. 100 agentes a construir a Arena

[23:30 → 26:30] 3 min · deves estar aqui aos 24 min

Vídeo acelerado de uma execução real com 100 cartões. À esquerda, a página /estado: cada quadrado é um cartão, amarelo enquanto um agente trabalha e verde quando o teste passa. À direita, o terminal com os lotes de agentes. O tempo e o custo são os reais. Plano B se o vídeo falhar: abrir /estado?replay=gravacao na Arena gravada.

### 17. O resultado: um jogo para jogar

[26:30 → 27:30] 1 min · deves estar aqui aos 27 min

Gravação a jogar a Arena final: apontar a linha insegura, escolher a resposta certa, ordenar os passos e escrever a resposta. Cada cartão explica o porquê no fim. No fim do Projeto 1 cada pessoa joga a sua.

### 18. Projeto 1

[27:30 → 28:00] 0.5 min · deves estar aqui aos 28 min

25 minutos de hands-on. No benchmark, o swarm de 15 cartões demorou 4 a 6 minutos; em modo interativo e com contas novas pode demorar mais. Usamos esse tempo para ver funcionalidades.

### 19. O que já está pronto e o que falta

[28:00 → 29:00] 1 min · deves estar aqui aos 28 min

Os testes já existem: cada agente só tem de pôr o seu teste verde. É isto que deixa o Haiku fazer o grosso do trabalho com segurança.

### 20. O que faz o /demo-plan

[29:00 → 30:30] 1.5 min · deves estar aqui aos 29 min

Explicar antes de correr. Uma skill não é magia: é uma receita em Markdown que o Claude segue. Aqui ela chama um script que gera o grafo (sempre o mesmo, a partir das tarefas) e um agente Opus que só o revê. O resultado fica em ficheiros que podem abrir e ler.

### 21. Planeia o swarm

[30:30 → 33:30] 3 min · deves estar aqui aos 31 min

O diálogo de confiança é importante: sem ele, as permissões do projeto ficam desligadas. O /demo-plan consulta a memória, gera o grafo e pede ao planner (Opus) para o rever.

### 22. O teu plano: 4 ondas

[33:30 → 35:00] 1.5 min · deves estar aqui aos 34 min

Mostrar o plano de alguém no projetor. Na onda 1, o lib/hash e os cartões arrancam juntos; os de criptografia entram assim que o hash fica verde.

### 23. O que faz o /demo-swarm

[35:00 → 36:30] 1.5 min · deves estar aqui aos 35 min

Explicar antes de correr. O ponto importante: quem escolhe o que corre é um script, não o modelo. Por isso o custo e o tempo são previsíveis. Se um cartão falhar, o script repete-o com a mensagem de erro e, à terceira, com Sonnet.

### 24. Solta o swarm

[36:30 → 38:30] 2 min · deves estar aqui aos 37 min

A partir daqui o swarm trabalha alguns minutos (4 a 6 no benchmark). Os próximos slides usam esse tempo; quem acabar primeiro joga a Arena.

### 25. Pergunta sem interromper

[38:30 → 40:30] 2 min · deves estar aqui aos 39 min

O /btw responde ao lado. É a forma certa de tirar dúvidas durante uma execução longa.

### 26. Hooks: o Claude avisa, um script reage

[40:30 → 42:00] 1.5 min · deves estar aqui aos 41 min

Sem entrar no código. A ideia: o hook é um "quando acontecer X, corre Y", configurado no settings.json. O Claude escreve hooks muito bem: basta descrever o que se quer. Mostrar o /hooks para ver os que estão ativos.

### 27. Statusline: a linha de estado é um script

[42:00 → 43:00] 1 min · deves estar aqui aos 42 min

Mostrar a statusline a mudar enquanto os agentes terminam. O hook grava, a statusline mostra: as duas peças juntas dão o custo ao vivo. O /usage do Claude Code pode mostrar mais, porque algumas versões ainda não conhecem os preços mais recentes; o /demo-cost usa os preços publicados.

### 28. No Terminal 2: três funcionalidades

[43:00 → 46:00] 3 min · deves estar aqui aos 43 min

Plan mode só lê e propõe. O claude -p é a base dos scripts e do CI. Esc Esc abre o rewind: repõe código e conversa até um checkpoint, mas não o que foi feito por Bash nem a maior parte do que os subagentes fizeram.

### 29. Worktrees e rotinas

[46:00 → 48:00] 2 min · PODE SALTAR · deves estar aqui aos 46 min

Saltar se houver atraso. Exemplo de rotina: uma revisão de segurança diária com node tools/rotina.mjs --instalar, que regista no launchd ou no Agendador de Tarefas um claude -p "/demo-review --auto".

### 30. Até ficar tudo verde

[48:00 → 50:00] 2 min · deves estar aqui aos 48 min

O /loop repete um prompt a cada intervalo, com a sessão aberta. Esc cancela.

### 31. O gate de segurança

[50:00 → 52:00] 2 min · deves estar aqui aos 50 min

Um jogo de segurança com falhas de segurança seria o pior exemplo. O gate liga cada verificação ao OWASP Top 10.

### 32. Quanto custou?

[52:00 → 54:00] 2 min · deves estar aqui aos 52 min

O relatório usa tokens reais e preços publicados. No fim grava as lições na app de memória.

### 33. Joga o que o swarm construiu

[54:00 → 56:00] 2 min · deves estar aqui aos 54 min

Os testes também correm no browser. É o mesmo teste que decidiu a cor do quadrado.

### 34. A memória do que fizeste

[56:00 → 58:00] 2 min · deves estar aqui aos 56 min

São ficheiros Markdown em ~/.memoria, com um índice SQLite. Fica tudo só no teu PC. Cada memória fica ligada ao ticket do Jira ou do GitHub e ao seu épico: procurar ABC-123 traz tudo desse ticket e do épico. O /task-intake e o /task-plan consultam-na antes de planear ("da última vez neste épico, não fazer X").

### 35. Abre o teu primeiro grafo

[58:00 → 61:00] 3 min · deves estar aqui aos 58 min

A app abre na tua língua nativa e tem um seletor de língua. Rotinas, worktrees e o modo headless já ficaram vistos nos momentos de espera.

### 36. Projeto 2

[61:00 → 61:30] 0.5 min · deves estar aqui aos 61 min

25 minutos. A tarefa pode não terminar aqui: o objetivo é sair com a orquestração a correr e saber continuar.

### 37. O mesmo ciclo, no teu repositório

[61:30 → 63:00] 1.5 min · deves estar aqui aos 62 min

Os /task-* estão instalados ao nível do utilizador e funcionam em qualquer repositório. Toda a escrita no Jira ou no GitHub pede confirmação.

### 38. Traz a tua tarefa

[63:00 → 67:00] 4 min · deves estar aqui aos 63 min

Para o Jira é preciso ter feito login no /mcp (atlassian). O GitHub usa o gh. O intake só lê; não escreve nada.

### 39. O planner decide quantos agentes

[67:00 → 72:00] 5 min · deves estar aqui aos 67 min

O planner (Opus) propõe o grafo e um script valida-o: ciclos, ficheiros em comum, agentes conhecidos. A integração e a revisão são acrescentadas sozinhas.

### 40. Põe o swarm a trabalhar

[72:00 → 82:00] 10 min · deves estar aqui aos 72 min

O estado fica em .workshop/. Voltar a correr /task-swarm retoma. Tarefas que mexem nos mesmos ficheiros vão em lotes diferentes, ou em git worktrees se o planner o decidir.

### 41. Jira e GitHub

[82:00 → 83:00] 1 min · PODE SALTAR · deves estar aqui aos 82 min

Saltar se houver atraso. O MCP da Atlassian gasta créditos Rovo da empresa e o administrador pode limitá-lo. Se o MCP falhar, as skills usam o Atlassian CLI oficial (acli), que o setup já instalou: lê a issue e publica os comentários; as horas registam-se à mão.

### 42. Depois do workshop

[83:00 → 85:00] 2 min · deves estar aqui aos 83 min

Exemplo de comentário: agente ws-worker-07 · Haiku · 5 s · US$ 0,004.

### 43. Cinco ideias para levar

[85:00 → 87:00] 2 min · deves estar aqui aos 85 min

Resumo em cinco frases.

### 44. Onde está tudo

[87:00 → 88:30] 1.5 min · deves estar aqui aos 87 min

Os comandos são gerados a partir do repos.conf: estão sempre certos para a versão publicada. Antes deste slide, enviar os comandos no Teams para todos copiarem.

### 45. Amanhã

[88:30 → 89:30] 1 min · deves estar aqui aos 89 min

Três ações concretas.

### 46. Perguntas

[89:30 → 90:00] 0.5 min · deves estar aqui aos 90 min

As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora.

