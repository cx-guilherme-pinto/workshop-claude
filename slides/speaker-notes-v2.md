# Notas do apresentador — Orquestração de agentes com Claude (v2)

Cada slide: objetivo, o que dizer, o que ler no painel, falhas típicas e o relógio. Os slides marcados **PODE SALTAR** saltam-se se houver atraso. As respostas das 3 specs ambíguas estão em docs/pt/PRESENTER-ANSWERS.md (fora do kit).

| # | min | relógio | bloco | fase | tipo | slide |
|---|---|---|---|---|---|---|
| 1 | 0,5 | 0:00 | Abertura | opening | — | Orquestração de agentes com Claude |
| 2 | 1,5 | 0:30 | Abertura | opening | — | As regras: custo e o que o painel vê |
| 3 | 4 | 2:00 | Abertura | opening | Faz agora | Verifica e liga-te ao painel |
| 4 | 2 | 6:00 | Abertura | opening | Faz agora | Algum passo falhou? |
| 5 | 1 | 8:00 | Missões | missions | Painel | 10 missões, uma grelha vazia |
| 6 | 2 | 9:00 | Missões | missions | M1 | Planear sem tocar |
| 7 | 2 | 11:00 | Missões | missions | M2 | O modelo certo |
| 8 | 2 | 13:00 | Missões | missions | M3 | Um subagente |
| 9 | 2 | 15:00 | Missões | missions | M4 | A tua skill |
| 10 | 2 | 17:00 | Missões | missions | M5 | O teu hook |
| 11 | 2 | 19:00 | Missões | missions | M6 | Até ficar verde |
| 12 | 2 | 21:00 | Missões | missions | Painel | O que falta à sala (e as bónus M7 a M10) |
| 13 | 2 | 23:00 | Projeto 1 | p1 | Painel | O que vamos construir: o Canivete |
| 14 | 4 | 25:00 | Projeto 1 | p1 | Faz agora | Inventa a tua ferramenta |
| 15 | 2 | 29:00 | Projeto 1 | p1 | Decide | Quantos agentes e que modelo? |
| 16 | 1 | 31:00 | Projeto 1 | p1 | Faz agora | Planeia |
| 17 | 7 | 32:00 | Projeto 1 | p1 | Faz agora | Solta o swarm |
| 18 | 4 | 39:00 | Projeto 1 | p1 | Faz agora | Porque é que esta ferramenta falhou? |
| 19 | 2 | 43:00 | Projeto 1 | p1 | Faz agora | Gate e custo: que decisão ganhou? |
| 20 | 2 | 45:00 | Projeto 1 | p1 | Faz agora | Usa o teu Canivete |
| 21 | 2 | 47:00 | Projeto 2 | p2 | Painel | O mesmo ciclo, noutro repositório |
| 22 | 4 | 49:00 | Projeto 2 | p2 | Faz agora | Lê a issue |
| 23 | 6 | 53:00 | Projeto 2 | p2 | Decide | Quantos agentes? |
| 24 | 12 | 59:00 | Projeto 2 | p2 | Faz agora | Põe o swarm a trabalhar |
| 25 | 5 | 71:00 | Projeto 2 | p2 | Faz agora | O gate |
| 26 | 4 | 76:00 | Projeto 2 | p2 | Faz agora | O relatório e a memória |
| 27 | 7 | 80:00 | Projeto 2 | p2 | Faz agora | Agora sozinho: EX-3 |
| 28 | 2 | 87:00 | Fecho | closing | Painel | O dia em números e 3 ideias para levar |
| 29 | 1 | 89:00 | Fecho | closing | — | Perguntas |

Total: 90 min.

## Notas por slide

### 1. Orquestração de agentes com Claude

[0:00 → 0:30] 0,5 min · opening

Objetivo: Abrir a sessão e apontar para o painel à direita.

O que dizer:
- Em 90 minutos vamos fazer, não ouvir: 10 missões curtas, um swarm de agentes e uma tarefa num repositório a sério.
- O painel à direita mostra o que toda a gente já fez, ao vivo.

Olha para o painel:
- Se já houver nomes na classificação: "quem já está no painel fez o setup em casa, obrigado".

Relógio: deves estar aqui aos 0 min.

### 2. As regras: custo e o que o painel vê

[0:30 → 2:00] 1,5 min · opening

Objetivo: Deixar claro que o custo é medido e não cortado, e o que o painel vê.

O que dizer:
- O alvo é US$ 5 por pessoa para o dia todo; a US$ 5 e a US$ 10 aparece um aviso, e ninguém é cortado.
- O painel só recebe contagens e decisões, nunca prompts nem código. Os pontos vêm de cobertura e qualidade, nunca de gastar mais.
- Tudo o que o painel guardou hoje é apagado à meia-noite.

Olha para o painel:
- Se alguém perguntar pela privacidade: "está tudo em docs/PRIVACY.md, e node ~/.workshop-claude/kit/telemetry/ctl.mjs show mostra os últimos 20 eventos tal como saem do teu portátil".

Relógio: deves estar aqui aos 1 min.

### 3. Verifica e liga-te ao painel

[2:00 → 6:00] 4 min · opening

Objetivo: Toda a gente com o kit verificado e registada no painel.

O que dizer:
- O --check não instala nada: só confirma cada passo e liga-te ao painel.
- O registo usa o teu login do gh: confirma no teu portátil o email da empresa, e só o nome sai para o painel.

Olha para o painel:
- Se "Prontas" estiver abaixo de metade aos 3 min: "quem já tem a tabela verde, ajuda o vizinho".
- Se "Inscritas" for bem menor do que a sala: "o register a seguir à tabela resolve; sem email @checkmarx.com verificado no GitHub, fazes o workshop na mesma, só não apareces na classificação".

Falhas típicas e resposta:
- E-TEL-03: o gh não pode ler os emails → gh auth refresh -h github.com -s user:email e volta a correr o register
- E-TEL-02: sem email verificado da empresa → acrescenta-o em github.com/settings/emails; o workshop funciona sem isso
- O comando não existe: o setup não foi feito → corre o one-liner do README agora e segue com o vizinho enquanto instala

Relógio: deves estar aqui aos 2 min.

### 4. Algum passo falhou?

[6:00 → 8:00] 2 min · opening

Objetivo: Resolver as falhas do setup sem parar a sala.

O que dizer:
- O --doctor pede ao Haiku um diagnóstico do excerto do log, já sem segredos, e só corre um comando se disseres que sim.
- Ninguém fica parado: quem não resolver em 2 minutos trabalha com o vizinho.

Olha para o painel:
- Se "Prontas" não subir: "quem tem ❌ no Claude Code login, corre claude auth login --console".

Falhas típicas e resposta:
- Proxy ou rede da empresa → muda para a rede do evento ou um hotspot e repete o --check
- Login do Claude em falta → claude auth login --console

Relógio: deves estar aqui aos 6 min.

### 5. 10 missões, uma grelha vazia

[8:00 → 9:00] 1 min · missions

Objetivo: Abrir o projeto das missões e lançar a corrida da sala.

O que dizer:
- São 6 missões guiadas, de 2 minutos cada, e 4 bónus para as esperas.
- Ninguém carrega em "feito": o kit vê a funcionalidade a ser usada e acende a missão.
- /missions mostra a tua caderneta a qualquer momento.

Olha para o painel:
- A grelha está a 0 %: "vamos ver quantas acendemos até ao Projeto 1".

Falhas típicas e resposta:
- A pasta missions-project não existe → corre o --check: o passo 9 monta-a

Relógio: deves estar aqui aos 8 min.

### 6. Planear sem tocar

[9:00 → 11:00] 2 min · missions

Objetivo: Mostrar que se pode pensar com o Claude sem risco.

O que dizer:
- O plan mode é a forma mais barata e segura de começar: o Claude lê o código e propõe, mas não toca em nada.
- Se o plano te servir, aprovas e ele executa; aqui não aprovamos.

Olha para o painel:
- Se a M1 estiver abaixo de 50 % a meio: "Shift+Tab duas vezes; procura plan mode on por baixo da caixa".

Falhas típicas e resposta:
- Aparece "accept edits on" e não o plan mode → carrega outra vez em Shift+Tab
- O Claude pergunta "Would you like to proceed?" → Esc: não queremos executar

Relógio: deves estar aqui aos 9 min.

### 7. O modelo certo

[11:00 → 13:00] 2 min · missions

Objetivo: Escolher o modelo pela tarefa, não por hábito.

O que dizer:
- O Haiku custa cerca de 10 vezes menos do que o Sonnet e chega para perguntas simples.
- No Projeto 1 vais escolher o modelo de 30 agentes: esta é a mesma decisão, em pequeno.

Olha para o painel:
- Se a M2 ficar atrás da M1: "o /model haiku pede uma confirmação; carrega em Enter".

Falhas típicas e resposta:
- Fica a pedir confirmação → Enter na opção selecionada

Relógio: deves estar aqui aos 11 min.

### 8. Um subagente

[13:00 → 15:00] 2 min · missions

Objetivo: Perceber a peça base de um swarm.

O que dizer:
- Um swarm é isto multiplicado: muitos subagentes, cada um com o seu contexto e a sua tarefa.
- O contexto principal fica limpo, e isso também é custo.

Olha para o painel:
- Se a M3 estiver abaixo da M2: "escrevam a palavra subagente no pedido".

Falhas típicas e resposta:
- O Claude responde sem lançar subagente → pede explicitamente: usa um subagente Explore

Relógio: deves estar aqui aos 13 min.

### 9. A tua skill

[15:00 → 17:00] 2 min · missions

Objetivo: Mostrar que uma skill é só um ficheiro que qualquer pessoa escreve.

O que dizer:
- As skills do workshop (/demo-plan, /task-swarm…) são exatamente isto: Markdown com instruções.
- O claude -c retoma a conversa anterior: nada se perde ao sair.

Olha para o painel:
- Se a M4 ficar baixa: "a skill só aparece depois de sair e voltar; /exit e claude -c".

Falhas típicas e resposta:
- /resumo não existe → confirma o ficheiro .claude/skills/resumo/SKILL.md e reabre com claude -c

Relógio: deves estar aqui aos 15 min.

### 10. O teu hook

[17:00 → 19:00] 2 min · missions

Objetivo: Perceber que os hooks automatizam sem pedir ao modelo.

O que dizer:
- É assim que o kit mede o custo: um hook no fim de cada subagente.
- O settings.local.json é só teu e não vai para o git.
- Esc Esc abre o rewind: voltas a antes da edição.

Olha para o painel:
- Se a M5 estiver abaixo de 50 %: "metade da sala ainda não tem um hook; quem já tem, ajuda o vizinho".

Falhas típicas e resposta:
- O edits.log não aparece → o hook só corre na edição seguinte: pede outra edição
- O hook ficou no settings.json do kit → pede para o mover para .claude/settings.local.json

Relógio: deves estar aqui aos 17 min.

### 11. Até ficar verde

[19:00 → 21:00] 2 min · missions

Objetivo: Ver o Claude a trabalhar sozinho com uma condição de paragem.

O que dizer:
- O projeto vem com 2 testes partidos de propósito.
- Um loop sem condição de paragem gasta dinheiro: diz sempre quando parar.

Olha para o painel:
- Se a M6 subir devagar: "o loop corre de minuto a minuto; enquanto esperam, façam uma bónus".

Falhas típicas e resposta:
- O loop não para → Esc e diz: para o loop

Relógio: deves estar aqui aos 19 min.

### 12. O que falta à sala (e as bónus M7 a M10)

[21:00 → 23:00] 2 min · missions

Objetivo: Fechar as missões guiadas e apontar as bónus para as esperas.

O que dizer:
- A missão que pisca no painel é a menos feita: é a que vale a pena ajudar agora.
- As bónus não têm tempo de palco: fazem-se enquanto os swarms trabalham.

Olha para o painel:
- Lê em voz alta a missão que pisca e chama quem a tem para mostrar ao vizinho.
- Se a cobertura média passar de 70 %: "esta sala está mais rápida do que o ensaio".

Relógio: deves estar aqui aos 21 min.

### 13. O que vamos construir: o Canivete

[23:00 → 25:00] 2 min · p1

Objetivo: Apresentar o Canivete e plantar a previsão.

O que dizer:
- Contar palavras, dividir a conta, converter cores: 30 ferramentas que se usam a sério.
- Cada uma é um agente e um teste; tu decides quantos agentes, que modelo e uma ferramenta tua.

Olha para o painel:
- Ainda vazio: "no fim do bloco este gráfico mostra o tempo e o custo de cada swarm da sala".

Falhas típicas e resposta:
- A pasta canivete-project não existe → o --check monta-a no passo 9

Relógio: deves estar aqui aos 23 min.

### 14. Inventa a tua ferramenta

[25:00 → 29:00] 4 min · p1

Objetivo: Dar a cada pessoa uma ferramenta que é só dela.

O que dizer:
- Os modelos são 4: calc, convert, text e generate; o agente só escreve a função run().
- O gen.mjs diz-te que campo está mal e dá um exemplo.

Olha para o painel:
- Lê os modelos mais escolhidos: "a sala prefere calc; quem fez um generate?".

Falhas típicas e resposta:
- O gen.mjs recusa o my-tool.json → lê a mensagem: diz o campo e dá um exemplo
- Sem ideias → usa o exemplo sem mudanças: funciona

Relógio: deves estar aqui aos 25 min.

### 15. Quantos agentes e que modelo?

[29:00 → 31:00] 2 min · p1

Objetivo: Fazer a sala dividir-se, para a comparação no painel ficar rica.

O que dizer:
- Sugestão: filas da frente 4, meio 8, trás 12.
- Mais agentes acabam mais depressa, mas a sessão principal coordena mais: o custo não desce.

Olha para o painel:
- Ainda sem pontos: "daqui a 10 minutos vemos quem tinha razão".

Relógio: deves estar aqui aos 29 min.

### 16. Planeia

[31:00 → 32:00] 1 min · p1

Objetivo: Registar a decisão e a previsão antes de ver o resultado.

O que dizer:
- O grafo é determinístico: vem das specs, não do modelo.
- A previsão só vai para o painel, para comparar com o tempo real.

Olha para o painel:
- Se a mediana prevista aparecer: "a sala acha X minutos; vamos ver".

Falhas típicas e resposta:
- ERROR: plan not found ao avançar → corre o /demo-plan primeiro, na pasta canivete-project

Relógio: deves estar aqui aos 31 min.

### 17. Solta o swarm

[32:00 → 39:00] 7 min · p1

Objetivo: Ver um swarm a trabalhar e o efeito das decisões da sala.

O que dizer:
- Cada quadrado é uma ferramenta: amarelo a trabalhar, verde passou, vermelho falhou.
- Os vermelhos são o próximo slide: não é azar.

Olha para o painel:
- Aos 4 min, quando aparecerem pontos: "os de 12 acabaram primeiro; vejam se gastaram menos".
- Se a mediana real ficar longe da prevista: "prevemos X, demorou Y; quem acertou?".

Falhas típicas e resposta:
- Porta 3000 ocupada → o server.js usa a seguinte e diz qual
- Pede uma permissão a meio → o projeto tem de estar trusted: o setup trata disso; aceita e continua
- O swarm parou → corre /demo-swarm outra vez: retoma onde estava

Relógio: deves estar aqui aos 32 min.

### 18. Porque é que esta ferramenta falhou?

[39:00 → 43:00] 4 min · p1

Objetivo: Perceber que o que a spec não decide, o agente adivinha.

O que dizer:
- As 3 partidas de propósito (nm-03, dn-01, tx-02) omitem uma regra; o agente escolhe a resposta "óbvia", e é a errada.
- A mensagem diz o que a ferramenta devolveu e o que a spec não decide, nunca o valor certo: és tu que decides.
- Nenhum agente pode mudar uma spec: é o teu trabalho.

Olha para o painel:
- Se "specs corrigidas" ficar a 0 aos 2 min: "abram o spec.md do vermelho e escrevam uma linha com a regra".

Falhas típicas e resposta:
- Volta a ficar vermelho → a regra está ambígua: escreve um exemplo com o valor
- Não sabe qual é a regra → pensa como quem pediu a ferramenta: o que é correto para um contabilista?

Relógio: deves estar aqui aos 39 min.

### 19. Gate e custo: que decisão ganhou?

[43:00 → 45:00] 2 min · p1

Objetivo: Fechar o ciclo: qualidade e custo, medidos.

O que dizer:
- O revisor é o Opus: lê um resumo, não a árvore toda, e diz APPROVED ou REJECTED.
- O custo vem dos tokens reais e dos preços publicados.

Olha para o painel:
- Lê o custo por verde de 4, 8 e 12: "mais agentes não ficou mais barato".
- Se houver swarms em Sonnet: "o Sonnet custou mais e quase não deu mais verdes".

Falhas típicas e resposta:
- GATE: REJECTED → lê as reservas; normalmente é um vermelho por corrigir

Relógio: deves estar aqui aos 43 min.

### 20. Usa o teu Canivete

[45:00 → 47:00] 2 min · p1 · PODE SALTAR

Objetivo: Ver o resultado e ganhar confiança no que foi feito.

O que dizer:
- Tudo o que está ali foi escrito por agentes nos últimos 15 minutos, com testes.

Falhas típicas e resposta:
- A página não abre → o node server.js tem de estar a correr no outro terminal

Relógio: deves estar aqui aos 45 min.

### 21. O mesmo ciclo, noutro repositório

[47:00 → 49:00] 2 min · p2

Objetivo: Ligar o Projeto 2 ao que já fizeram.

O que dizer:
- O plan é o /demo-plan, o swarm é o /demo-swarm, o gate é o /demo-review: a diferença é que a tarefa vem de uma issue.
- O caminho por defeito é a Biblioteca Municipal, sem login; quem tiver Jira ou GitHub a funcionar pode usar uma issue sua.

Olha para o painel:
- O funil está vazio: "daqui a 30 minutos queremos a sala toda no fim".

Relógio: deves estar aqui aos 47 min.

### 22. Lê a issue

[49:00 → 53:00] 4 min · p2

Objetivo: Pôr toda a gente com uma tarefa lida.

O que dizer:
- A EX-1 é pequena: validar o ISBN e o email ao criar livros e leitores.
- O intake só lê: não escreve nada no Jira nem no GitHub.

Olha para o painel:
- Se o funil não sair de "intake" aos 3 min: "confirmem que estão na pasta practice-project".

Falhas típicas e resposta:
- Issue não encontrada → corre na pasta practice-project: o caminho é issues/EX-1.json

Relógio: deves estar aqui aos 49 min.

### 23. Quantos agentes?

[53:00 → 59:00] 6 min · p2

Objetivo: Decidir com base no porquê, não no número.

O que dizer:
- O planner lê a issue e o código e propõe subtarefas: tarefas que mexem nos mesmos ficheiros vão em lotes diferentes.
- Ajustar é normal: o plano é uma proposta.

Olha para o painel:
- Lê o histograma: "a maioria tem 2 ou 3; quem ajustou, porquê?".

Falhas típicas e resposta:
- PLAN INVALID → pede ao planner para corrigir: a mensagem diz o que falta

Relógio: deves estar aqui aos 53 min.

### 24. Põe o swarm a trabalhar

[59:00 → 71:00] 12 min · p2

Objetivo: Ver o swarm numa tarefa real, com retoma.

O que dizer:
- Esc interrompe; /task-swarm de novo retoma onde estava.
- Se o planner decidiu worktrees, cada agente trabalha numa cópia do repositório.

Olha para o painel:
- A meio, lê o funil: "metade já está no gate; quem ainda está no swarm, deixem correr".

Falhas típicas e resposta:
- Uma subtarefa falha 3 vezes → lê o motivo no dashboard; corrige a descrição e corre --retry
- O dashboard não mostra nada → tem de correr na pasta do projeto

Relógio: deves estar aqui aos 59 min.

### 25. O gate

[71:00 → 76:00] 5 min · p2

Objetivo: Não entregar nada sem verificação.

O que dizer:
- O gate corre os testes, procura segredos e código perigoso, e pede o veredito ao Opus.
- Um REJECTED não é um falhanço: é o gate a fazer o trabalho dele.

Olha para o painel:
- Se os gates aprovados ficarem baixos: "leiam as reservas; quase sempre é um teste por correr".

Falhas típicas e resposta:
- GATE: REJECTED → corrige o que as reservas dizem e corre /task-gate outra vez

Relógio: deves estar aqui aos 71 min.

### 26. O relatório e a memória

[76:00 → 80:00] 4 min · p2

Objetivo: Fechar a tarefa e guardar o que se aprendeu.

O que dizer:
- No projeto de treino o relatório fica em report.md; no Jira ou no GitHub, o /task-report só escreve depois do teu sim.
- A memória fica no teu portátil e o próximo /task-intake vai lê-la.

Olha para o painel:
- Se o funil chegar a "report": "quem fechou, avança para a EX-3".

Falhas típicas e resposta:
- MEMORY UNAVAILABLE → a app Agent Memory não está instalada: o resto funciona; --check mostra o passo 10

Relógio: deves estar aqui aos 76 min.

### 27. Agora sozinho: EX-3

[80:00 → 87:00] 7 min · p2

Objetivo: Fazer o ciclo sem ajuda.

O que dizer:
- A EX-3 é uma falha de segurança pequena (IDOR), com um teste de autorização já escrito.
- É o teste final do workshop: se consegues sozinho, consegues amanhã no teu repositório.

Olha para o painel:
- Lê as issues fechadas: "já há N EX-3 fechadas".

Falhas típicas e resposta:
- Não acabou a EX-1 → continua na EX-1: a EX-3 é opcional

Relógio: deves estar aqui aos 80 min.

### 28. O dia em números e 3 ideias para levar

[87:00 → 89:00] 2 min · closing

Objetivo: Fechar com os números da sala e 3 ideias concretas.

O que dizer:
- Os 3 números do painel são de "fazer melhor": custo por verde, verdes à primeira, % em Haiku.
- Tudo o que instalaram continua a funcionar amanhã: comecem pela próxima issue que vos atribuírem com /task-intake.

Olha para o painel:
- Lê o custo médio por pessoa contra o alvo de US$ 5.
- Lê a % de verdes à primeira: "é isto que uma boa spec compra".

Relógio: deves estar aqui aos 87 min.

### 29. Perguntas

[89:00 → 90:00] 1 min · closing

Objetivo: Abrir as perguntas.

O que dizer:
- As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora.
- O painel apaga tudo à meia-noite; a caderneta e as memórias ficam no vosso portátil.

Olha para o painel:
- Se der tempo: mostra a classificação final.

Relógio: deves estar aqui aos 89 min.

