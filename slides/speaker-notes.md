# Notas do apresentador — Orquestração de agentes com Claude

Relógio acumulado: "deves estar aqui aos X min". Os slides marcados com **PODE SALTAR** saltam-se se houver atraso.

| # | min | relógio | secção | slide | saltar |
|---|---|---|---|---|---|
| 1 | 1 | 0:00 | Abertura | Orquestração de agentes com Claude |  |
| 2 | 1.5 | 1:00 | Abertura | O que levas para casa |  |
| 3 | 1 | 2:30 | Abertura | 90 minutos |  |
| 4 | 1.5 | 3:30 | Abertura | As regras do custo |  |
| 5 | 3 | 5:00 | Verificar | Verifica a instalação |  |
| 6 | 2 | 8:00 | Verificar | Algum passo falhou? |  |
| 7 | 0.5 | 10:00 | Conceitos | Conceitos |  |
| 8 | 1.5 | 10:30 | Conceitos | O Claude Code trabalha no teu projeto |  |
| 9 | 2 | 12:00 | Conceitos | Uma skill é uma receita com nome |  |
| 10 | 2 | 14:00 | Conceitos | Subagentes: contexto e modelo próprios |  |
| 11 | 2 | 16:00 | Conceitos | A regra económica |  |
| 12 | 2 | 18:00 | Conceitos | Tarefa → grafo → ondas |  |
| 13 | 1.5 | 20:00 | Conceitos | Quem decide o grafo é um script |  |
| 14 | 1.5 | 21:30 | Conceitos | Medir, não adivinhar |  |
| 15 | 1 | 23:00 | Conceitos | O ciclo de cada tarefa |  |
| 16 | 1 | 24:00 | Conceitos | Limites que respeitamos | PODE SALTAR |
| 17 | 4 | 25:00 | Preview | 100 agentes a construir a Arena |  |
| 18 | 1 | 29:00 | Preview | O resultado: um jogo para jogar |  |
| 19 | 0.5 | 30:00 | Projeto 1 | Projeto 1 |  |
| 20 | 1 | 30:30 | Projeto 1 | O que já está pronto e o que falta |  |
| 21 | 3 | 31:30 | Projeto 1 | Planeia o swarm |  |
| 22 | 1.5 | 34:30 | Projeto 1 | O teu plano: 4 ondas |  |
| 23 | 2 | 36:00 | Projeto 1 | Solta o swarm |  |
| 24 | 2 | 38:00 | Projeto 1 | Pergunta sem interromper |  |
| 25 | 2 | 40:00 | Projeto 1 | A statusline e o hook que a alimenta |  |
| 26 | 3 | 42:00 | Projeto 1 | No Terminal 2: três funcionalidades |  |
| 27 | 2 | 45:00 | Projeto 1 | Worktrees e rotinas | PODE SALTAR |
| 28 | 2 | 47:00 | Projeto 1 | Até ficar tudo verde |  |
| 29 | 2 | 49:00 | Projeto 1 | O gate de segurança |  |
| 30 | 2 | 51:00 | Projeto 1 | Quanto custou? |  |
| 31 | 2 | 53:00 | Projeto 1 | Joga o que o swarm construiu |  |
| 32 | 2 | 55:00 | Memória | A memória do que fizeste |  |
| 33 | 3 | 57:00 | Memória | Abre o teu primeiro grafo |  |
| 34 | 0.5 | 60:00 | Projeto 2 | Projeto 2 |  |
| 35 | 1.5 | 60:30 | Projeto 2 | O mesmo ciclo, no teu repositório |  |
| 36 | 4 | 62:00 | Projeto 2 | Traz a tua tarefa |  |
| 37 | 5 | 66:00 | Projeto 2 | O planner decide quantos agentes |  |
| 38 | 10 | 71:00 | Projeto 2 | Põe o swarm a trabalhar |  |
| 39 | 1 | 81:00 | Projeto 2 | Jira e GitHub | PODE SALTAR |
| 40 | 2 | 82:00 | Projeto 2 | Depois do workshop |  |
| 41 | 1 | 84:00 | Projeto 2 | Claude Desktop e telemóvel | PODE SALTAR |
| 42 | 2 | 85:00 | Encerramento | Cinco ideias para levar |  |
| 43 | 1.5 | 87:00 | Encerramento | Onde está tudo |  |
| 44 | 1 | 88:30 | Encerramento | Amanhã |  |
| 45 | 0.5 | 89:30 | Encerramento | Perguntas |  |

Total: 90 min.

## Notas por slide

### 1. Orquestração de agentes com Claude

[0:00 → 1:00] 1 min · deves estar aqui aos 0 min

Boas-vindas. Em 90 minutos vamos pôr um swarm de agentes a construir um jogo e, depois, a trabalhar numa tarefa real de cada um.

### 2. O que levas para casa

[1:00 → 2:30] 1.5 min · deves estar aqui aos 1 min

Três resultados concretos. Tudo fica instalado no portátil de cada um e continua a funcionar depois de hoje.

### 3. 90 minutos

[2:30 → 3:30] 1 min · deves estar aqui aos 3 min

O relógio está nas notas de cada slide. As perguntas ficam para o fim, sem limite de tempo.

### 4. As regras do custo

[3:30 → 5:00] 1.5 min · deves estar aqui aos 4 min

O orçamento é garantido pelo benchmark, não por cortes. Se alguém passar o alvo, aparece um aviso e continua a trabalhar.

### 5. Verifica a instalação

[5:00 → 8:00] 3 min · deves estar aqui aos 5 min

Toda a gente corre o check. Demora 2 a 3 minutos e não instala nada. Quem não fez o setup segue com o vizinho e instala no intervalo das perguntas. O setup fala inglês, mas deteta a língua da máquina e grava a definição language do Claude Code (português, inglês, hindi ou hebraico): as skills respondem nessa língua. A Arena, as tabelas do orquestrador e as docs ficam em português ou inglês (as outras línguas ficam em inglês).

### 6. Algum passo falhou?

[8:00 → 10:00] 2 min · deves estar aqui aos 8 min

O Claude lê só o excerto do log daquele passo, sem segredos, e propõe comandos. Nunca executa nada sem confirmação. Se o Claude ainda não estiver instalado, aparece a mensagem pré-escrita do TROUBLESHOOTING.

### 7. Conceitos

[10:00 → 10:30] 0.5 min · deves estar aqui aos 10 min

Quinze minutos de ideias, um conceito por slide.

### 8. O Claude Code trabalha no teu projeto

[10:30 → 12:00] 1.5 min · deves estar aqui aos 11 min

O Claude Code não é um chat: é um agente que age no repositório. Tudo o que faz passa por permissões. Plan mode (Shift+Tab) faz com que só planeie, sem tocar em nada.

### 9. Uma skill é uma receita com nome

[12:00 → 14:00] 2 min · deves estar aqui aos 12 min

As skills substituíram os slash commands antigos. O frontmatter fixa o modelo e as ferramentas autorizadas. Hoje vamos usar dois sets: os /demo-* na Arena e os /task-* no dia a dia. As skills do kit estão em inglês e mandam o Claude responder na língua do participante.

### 10. Subagentes: contexto e modelo próprios

[14:00 → 16:00] 2 min · deves estar aqui aos 14 min

Um subagente é uma instância do Claude com contexto limpo, ferramentas próprias e o modelo que quisermos. É definido num ficheiro .claude/agents/<nome>.md. O comando /agents já não abre um assistente: edita-se o ficheiro.

### 11. A regra económica

[16:00 → 18:00] 2 min · deves estar aqui aos 16 min

O swarm barato é o de muitos agentes pequenos com instruções claras. O que custa é a coordenação. Por isso o orquestrador é um script e os workers respondem com uma linha.

### 12. Tarefa → grafo → ondas

[18:00 → 20:00] 2 min · deves estar aqui aos 18 min

O plano é um grafo de dependências. Executamos por ondas: tudo o que está pronto corre em paralelo. Os três cartões de criptografia esperam pelo lib/hash, uma dependência real dentro da onda 1.

### 13. Quem decide o grafo é um script

[20:00 → 21:30] 1.5 min · deves estar aqui aos 20 min

Com 15 chamadas em paralelo, um modelo esquece dependências ou reescreve prompts. O script é reproduzível: é isso que torna o custo previsível e o benchmark comparável.

### 14. Medir, não adivinhar

[21:30 → 23:00] 1.5 min · deves estar aqui aos 22 min

Os hooks são comandos que o Claude Code corre em eventos. O nosso só mede: lê os tokens reais do transcript, multiplica pelos preços publicados e acrescenta uma linha. Nunca bloqueia nada.

### 15. O ciclo de cada tarefa

[23:00 → 24:00] 1 min · deves estar aqui aos 23 min

É o mesmo ciclo nos dois projetos: planear com Opus, executar em swarm, um gate de segurança, medir e guardar o que se aprendeu.

### 16. Limites que respeitamos

[24:00 → 25:00] 1 min · PODE SALTAR · deves estar aqui aos 24 min

Saltar se houver atraso. O Claude Code recusa o 21.º subagente em simultâneo. Os limites de taxa da API são por organização. Por isso trabalhamos em lotes.

### 17. 100 agentes a construir a Arena

[25:00 → 29:00] 4 min · deves estar aqui aos 25 min

Vídeo acelerado de uma execução real do modo apresentador. O tempo e o custo que aparecem no ecrã são os reais. Plano B se o vídeo falhar: abrir /estado?replay=gravacao na Arena gravada.

### 18. O resultado: um jogo para jogar

[29:00 → 30:00] 1 min · deves estar aqui aos 29 min

Abrir a Arena final no browser e jogar um cartão. É uma app estática, sem risco. O jogo vem em português ou inglês, conforme a língua da máquina.

### 19. Projeto 1

[30:00 → 30:30] 0.5 min · deves estar aqui aos 30 min

25 minutos de hands-on. No benchmark, o swarm de 15 cartões demorou 4 a 6 minutos; em modo interativo e com contas novas pode demorar mais. Usamos esse tempo para ver funcionalidades.

### 20. O que já está pronto e o que falta

[30:30 → 31:30] 1 min · deves estar aqui aos 31 min

Os testes já existem: cada agente só tem de pôr o seu teste verde. É isto que deixa o Haiku fazer o grosso do trabalho com segurança.

### 21. Planeia o swarm

[31:30 → 34:30] 3 min · deves estar aqui aos 32 min

O diálogo de confiança é importante: sem ele, as permissões do projeto ficam desligadas. O /demo-plan consulta a memória, gera o grafo e pede ao planner (Opus) para o rever.

### 22. O teu plano: 4 ondas

[34:30 → 36:00] 1.5 min · deves estar aqui aos 35 min

Mostrar o plano de alguém no projetor. Na onda 1, o lib/hash e os cartões arrancam juntos; os de criptografia entram assim que o hash fica verde.

### 23. Solta o swarm

[36:00 → 38:00] 2 min · deves estar aqui aos 36 min

A partir daqui o swarm trabalha alguns minutos (4 a 6 no benchmark). Os próximos slides usam esse tempo; quem acabar primeiro joga a Arena.

### 24. Pergunta sem interromper

[38:00 → 40:00] 2 min · deves estar aqui aos 38 min

O /btw responde ao lado. É a forma certa de tirar dúvidas durante uma execução longa.

### 25. A statusline e o hook que a alimenta

[40:00 → 42:00] 2 min · deves estar aqui aos 40 min

Mostrar a statusline a mudar enquanto os agentes terminam. Explicar porque é que o /usage pode mostrar mais: versões que ainda não conhecem os preços mais recentes.

### 26. No Terminal 2: três funcionalidades

[42:00 → 45:00] 3 min · deves estar aqui aos 42 min

Plan mode só lê e propõe. O claude -p é a base dos scripts e do CI. Esc Esc abre o rewind: repõe código e conversa até um checkpoint, mas não o que foi feito por Bash nem a maior parte do que os subagentes fizeram.

### 27. Worktrees e rotinas

[45:00 → 47:00] 2 min · PODE SALTAR · deves estar aqui aos 45 min

Saltar se houver atraso. Exemplo de rotina: uma revisão de segurança diária com node tools/rotina.mjs --instalar, que regista no launchd ou no Agendador de Tarefas um claude -p "/demo-review --auto".

### 28. Até ficar tudo verde

[47:00 → 49:00] 2 min · deves estar aqui aos 47 min

O /loop repete um prompt a cada intervalo, com a sessão aberta. Esc cancela.

### 29. O gate de segurança

[49:00 → 51:00] 2 min · deves estar aqui aos 49 min

Um jogo de segurança com falhas de segurança seria o pior exemplo. O gate liga cada verificação ao OWASP Top 10.

### 30. Quanto custou?

[51:00 → 53:00] 2 min · deves estar aqui aos 51 min

O relatório usa tokens reais e preços publicados. No fim grava as lições na app de memória.

### 31. Joga o que o swarm construiu

[53:00 → 55:00] 2 min · deves estar aqui aos 53 min

Os testes também correm no browser. É o mesmo teste que decidiu a cor do quadrado.

### 32. A memória do que fizeste

[55:00 → 57:00] 2 min · deves estar aqui aos 55 min

São ficheiros Markdown em ~/.memoria, com um índice SQLite. Fica tudo só no teu PC. Cada memória fica ligada ao ticket do Jira ou do GitHub e ao seu épico: procurar ABC-123 traz tudo desse ticket e do épico. O /task-intake e o /task-plan consultam-na antes de planear ("da última vez neste épico, não fazer X").

### 33. Abre o teu primeiro grafo

[57:00 → 60:00] 3 min · deves estar aqui aos 57 min

A app abre na tua língua nativa e tem um seletor de língua. Rotinas, worktrees e o modo headless já ficaram vistos nos momentos de espera.

### 34. Projeto 2

[60:00 → 60:30] 0.5 min · deves estar aqui aos 60 min

25 minutos. A tarefa pode não terminar aqui: o objetivo é sair com a orquestração a correr e saber continuar.

### 35. O mesmo ciclo, no teu repositório

[60:30 → 62:00] 1.5 min · deves estar aqui aos 61 min

Os /task-* estão instalados ao nível do utilizador e funcionam em qualquer repositório. Toda a escrita no Jira ou no GitHub pede confirmação.

### 36. Traz a tua tarefa

[62:00 → 66:00] 4 min · deves estar aqui aos 62 min

Para o Jira é preciso ter feito login no /mcp (atlassian). O GitHub usa o gh. O intake só lê; não escreve nada.

### 37. O planner decide quantos agentes

[66:00 → 71:00] 5 min · deves estar aqui aos 66 min

O planner (Opus) propõe o grafo e um script valida-o: ciclos, ficheiros em comum, agentes conhecidos. A integração e a revisão são acrescentadas sozinhas.

### 38. Põe o swarm a trabalhar

[71:00 → 81:00] 10 min · deves estar aqui aos 71 min

O estado fica em .workshop/. Voltar a correr /task-swarm retoma. Tarefas que mexem nos mesmos ficheiros vão em lotes diferentes, ou em git worktrees se o planner o decidir.

### 39. Jira e GitHub

[81:00 → 82:00] 1 min · PODE SALTAR · deves estar aqui aos 81 min

Saltar se houver atraso. O MCP da Atlassian gasta créditos Rovo da empresa e o administrador pode limitá-lo. Se o MCP falhar, as skills usam o Atlassian CLI oficial (acli), que o setup já instalou: lê a issue e publica os comentários; as horas registam-se à mão.

### 40. Depois do workshop

[82:00 → 84:00] 2 min · deves estar aqui aos 82 min

Exemplo de comentário: agente ws-worker-07 · Haiku · 5 s · US$ 0,004.

### 41. Claude Desktop e telemóvel

[84:00 → 85:00] 1 min · PODE SALTAR · deves estar aqui aos 84 min

Saltar se houver atraso. Com assinatura, a mesma sessão pode continuar no telemóvel e as rotinas correm na cloud.

### 42. Cinco ideias para levar

[85:00 → 87:00] 2 min · deves estar aqui aos 85 min

Resumo em cinco frases.

### 43. Onde está tudo

[87:00 → 88:30] 1.5 min · deves estar aqui aos 87 min

Os comandos são gerados a partir do repos.conf: estão sempre certos para a versão publicada.

### 44. Amanhã

[88:30 → 89:30] 1 min · deves estar aqui aos 89 min

Três ações concretas.

### 45. Perguntas

[89:30 → 90:00] 0.5 min · deves estar aqui aos 90 min

As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora.

