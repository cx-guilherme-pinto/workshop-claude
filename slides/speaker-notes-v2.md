# Notas do apresentador — Orquestração de agentes com Claude (v2)

Cada slide: objetivo, o que dizer, o que ler no painel, falhas típicas e o relógio. Os slides marcados **PODE SALTAR** saltam-se se houver atraso. As respostas das 3 specs ambíguas estão em docs/pt/PRESENTER-ANSWERS.md (fora do kit).

| # | min | relógio | bloco | fase | tipo | slide |
|---|---|---|---|---|---|---|
| 1 | 0,5 | 0:00 | Abertura | opening | — | Orquestração de agentes com Claude |
| 2 | 1,5 | 0:30 | Abertura | opening | — | As regras: custo e o que o painel vê |
| 3 | 1 | 2:00 | Abertura | opening | Conceito | O que vamos fazer hoje |
| 4 | 1 | 3:00 | Abertura | opening | Conceito | Como vamos trabalhar |
| 5 | 1 | 4:00 | Abertura | opening | Conceito | A tua memória aprende contigo |
| 6 | 4 | 5:00 | Abertura | opening | Faz agora | Verifica e liga-te ao painel |
| 7 | 2 | 9:00 | Abertura | opening | Faz agora | Algum passo falhou? |
| 8 | 1 | 11:00 | Missões | missions | Painel | 11 missões, uma grelha vazia |
| 9 | 2 | 12:00 | Missões | missions | M1 | Planear sem tocar |
| 10 | 2 | 14:00 | Missões | missions | M2 | O modelo certo |
| 11 | 2 | 16:00 | Missões | missions | M3 | Um subagente |
| 12 | 1 | 18:00 | Missões | missions | Conceito | Tool ou skill? |
| 13 | 2 | 19:00 | Missões | missions | M4 | A tua skill |
| 14 | 2 | 21:00 | Missões | missions | M5 | O teu hook |
| 15 | 2 | 23:00 | Missões | missions | M6 | Até ficar verde |
| 16 | 1 | 25:00 | Missões | missions | Painel | O que falta à sala (e as bónus M7 a M10) |
| 17 | 2 | 26:00 | Projeto 1 | p1 | Painel | O que vamos construir: o Canivete |
| 18 | 4 | 28:00 | Projeto 1 | p1 | Faz agora | Inventa a tua ferramenta |
| 19 | 2 | 32:00 | Projeto 1 | p1 | Decide | Quantos agentes e que modelo? |
| 20 | 1 | 34:00 | Projeto 1 | p1 | Faz agora | Planeia |
| 21 | 7 | 35:00 | Projeto 1 | p1 | Faz agora | Solta o swarm |
| 22 | 4 | 42:00 | Projeto 1 | p1 | Faz agora | Porque é que esta ferramenta falhou? |
| 23 | 2 | 46:00 | Projeto 1 | p1 | Faz agora | Gate e custo: que decisão ganhou? |
| 24 | 2 | 48:00 | Projeto 1 | p1 | M11 | A tua ferramenta, pelo Claude |
| 25 | 2 | 50:00 | Projeto 2 | p2 | Painel | O mesmo ciclo, noutro repositório |
| 26 | 4 | 52:00 | Projeto 2 | p2 | Faz agora | Lê a issue |
| 27 | 6 | 56:00 | Projeto 2 | p2 | Decide | Quantos agentes? |
| 28 | 12 | 62:00 | Projeto 2 | p2 | Faz agora | Põe o swarm a trabalhar |
| 29 | 5 | 74:00 | Projeto 2 | p2 | Faz agora | O gate |
| 30 | 4 | 79:00 | Projeto 2 | p2 | Faz agora | O relatório e a memória |
| 31 | 4 | 83:00 | Projeto 2 | p2 | Faz agora | Agora sozinho: EX-3 |
| 32 | 2 | 87:00 | Fecho | closing | Painel | O dia em números e 3 ideias para levar |
| 33 | 1 | 89:00 | Fecho | closing | — | Perguntas |

Total: 90 min.

## Notas por slide

### 1. Orquestração de agentes com Claude

[0:00 → 0:30] 0,5 min · opening

Objetivo: Abrir a sessão e apontar para o painel à direita.

O que dizer:
- Em 90 minutos vamos fazer, não ouvir: 11 missões curtas, um swarm de agentes e uma tarefa num repositório a sério.
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

### 3. O que vamos fazer hoje

[2:00 → 3:00] 1 min · opening

Objetivo: Dar o mapa do dia antes de começar.

O que dizer:
- Não há bloco de teoria: cada conceito aprende-se numa missão de 2 minutos.
- Os dois projetos são o mesmo ciclo: primeiro num projeto feito para o workshop, depois numa tarefa a sério.
- Tudo fica instalado e continua a funcionar depois de hoje.

Olha para o painel:
- O painel ainda está vazio: "vai encher-se à medida que fizerem cada coisa".

Relógio: deves estar aqui aos 2 min.

### 4. Como vamos trabalhar

[3:00 → 4:00] 1 min · opening

Objetivo: Explicar o ciclo que se repete nos dois projetos.

O que dizer:
- O teu trabalho é decidir e verificar; o dos agentes é fazer.
- O custo é medido em cada passo, com os tokens reais.

Relógio: deves estar aqui aos 3 min.

### 5. A tua memória aprende contigo

[4:00 → 5:00] 1 min · opening

Objetivo: Apresentar a memória e explicar que vai crescer com o trabalho de cada um.

O que dizer:
- São ficheiros Markdown em ~/.agent-memory, com um índice: fica tudo só no teu portátil.
- Cada lição fica ligada ao projeto, à tarefa e aos ficheiros: amanhã, o /task-intake de outra issue já a encontra.
- Vamos voltar a esta janela no fim de cada projeto.

Falhas típicas e resposta:
- agent-memory-gui não existe → o --check mostra o passo 10; sem a app, tudo o resto funciona (MEMORY UNAVAILABLE)
- A janela não abre (Windows sem WebView2) → a app abre a mesma interface no browser

Relógio: deves estar aqui aos 4 min.

### 6. Verifica e liga-te ao painel

[5:00 → 9:00] 4 min · opening

Objetivo: Toda a gente com o kit verificado e registada no painel.

O que dizer:
- Primeiro o workshop-register, depois o workshop-check: o check não instala nada, só confirma cada passo.
- O registo usa o teu login do gh: confirma no teu portátil o email da empresa, e só o nome sai para o painel.

Olha para o painel:
- Se "Prontas" estiver abaixo de metade aos 3 min: "quem já tem a tabela verde, ajuda o vizinho".
- Se "Inscritas" for bem menor do que a sala: "o register a seguir à tabela resolve; sem email @checkmarx.com verificado no GitHub, fazes o workshop na mesma, só não apareces na classificação".

Falhas típicas e resposta:
- E-TEL-03: o gh não pode ler os emails → gh auth refresh -h github.com -s user:email e volta a correr o register
- E-TEL-02: sem email verificado da empresa → acrescenta-o em github.com/settings/emails; o workshop funciona sem isso
- command not found: workshop-register → o setup é anterior à rc.4: volta a correr o one-liner do setup, ou usa o comando longo do Teams

Relógio: deves estar aqui aos 5 min.

### 7. Algum passo falhou?

[9:00 → 11:00] 2 min · opening

Objetivo: Resolver as falhas do setup sem parar a sala.

O que dizer:
- O --doctor pede ao Haiku um diagnóstico do excerto do log, já sem segredos, e só corre um comando se disseres que sim.
- Ninguém fica parado: quem não resolver em 2 minutos trabalha com o vizinho.

Olha para o painel:
- Se "Prontas" não subir: "quem tem ❌ no Claude Code login, corre claude auth login --console".

Falhas típicas e resposta:
- Proxy ou rede da empresa → muda para a rede do evento ou um hotspot e repete o --check
- Login do Claude em falta → claude auth login --console

Relógio: deves estar aqui aos 9 min.

### 8. 11 missões, uma grelha vazia

[11:00 → 12:00] 1 min · missions

Objetivo: Abrir o projeto das missões e lançar a corrida da sala.

O que dizer:
- São 7 missões guiadas de 2 minutos (6 aqui, a última no Projeto 1) e 4 bónus para as esperas.
- Ninguém carrega em "feito": o kit vê a funcionalidade a ser usada e acende a missão.
- /missions mostra a tua caderneta a qualquer momento.

Olha para o painel:
- A grelha está a 0 %: "vamos ver quantas acendemos até ao Projeto 1".

Falhas típicas e resposta:
- A pasta missions-project não existe → corre o --check: o passo 9 monta-a

Relógio: deves estar aqui aos 11 min.

### 9. Planear sem tocar

[12:00 → 14:00] 2 min · missions

Objetivo: Mostrar que se pode pensar com o Claude sem risco.

O que dizer:
- O plan mode é a forma mais barata e segura de começar: o Claude lê o código e propõe, mas não toca em nada.
- Se o plano te servir, aprovas e ele executa; aqui não aprovamos.

Olha para o painel:
- Se a M1 estiver abaixo de 50 % a meio: "Shift+Tab duas vezes; procura plan mode on por baixo da caixa".

Falhas típicas e resposta:
- Aparece "accept edits on" e não o plan mode → carrega outra vez em Shift+Tab
- O Claude pergunta "Would you like to proceed?" → Esc: não queremos executar

Relógio: deves estar aqui aos 12 min.

### 10. O modelo certo

[14:00 → 16:00] 2 min · missions

Objetivo: Escolher o modelo pela tarefa, não por hábito.

O que dizer:
- O Haiku custa cerca de 10 vezes menos do que o Sonnet e chega para perguntas simples.
- No Projeto 1 vais escolher o modelo de 30 agentes: esta é a mesma decisão, em pequeno.

Olha para o painel:
- Se a M2 ficar atrás da M1: "o /model haiku pede uma confirmação; carrega em Enter".

Falhas típicas e resposta:
- Fica a pedir confirmação → Enter na opção selecionada

Relógio: deves estar aqui aos 14 min.

### 11. Um subagente

[16:00 → 18:00] 2 min · missions

Objetivo: Perceber a peça base de um swarm.

O que dizer:
- Um swarm é isto multiplicado: muitos subagentes, cada um com o seu contexto e a sua tarefa.
- O contexto principal fica limpo, e isso também é custo.

Olha para o painel:
- Se a M3 estiver abaixo da M2: "escrevam a palavra subagente no pedido".

Falhas típicas e resposta:
- O Claude responde sem lançar subagente → pede explicitamente: usa um subagente Explore

Relógio: deves estar aqui aos 16 min.

### 12. Tool ou skill?

[18:00 → 19:00] 1 min · missions

Objetivo: Separar tool de skill antes de a M4 criar uma skill e a M11 usar uma tool.

O que dizer:
- Uma tool é código: mesma entrada, mesma saída, e custa quase nada em tokens.
- Uma skill é texto: escreve-se em minutos, mas o modelo interpreta-a e pode desviar-se.
- As melhores skills chamam tools para as partes que têm de ser exatas.

Olha para o painel:
- Sem painel nesta: avança para a M4 em 1 minuto.

Falhas típicas e resposta:
- Perguntam se um MCP é uma tool ou uma skill → um servidor MCP oferece tools; a skill é só um ficheiro Markdown

Relógio: deves estar aqui aos 18 min.

### 13. A tua skill

[19:00 → 21:00] 2 min · missions

Objetivo: Mostrar que uma skill é só um ficheiro que qualquer pessoa escreve.

O que dizer:
- As skills do workshop (/demo-plan, /task-swarm…) são exatamente isto: Markdown com instruções.
- O claude -c retoma a conversa anterior: nada se perde ao sair.
- Lembra o slide anterior: a skill é a receita em texto, a tool é a função em código.

Olha para o painel:
- Se a M4 ficar baixa: "a skill só aparece depois de sair e voltar; /exit e claude -c".

Falhas típicas e resposta:
- /resumo não existe → confirma o ficheiro .claude/skills/resumo/SKILL.md e reabre com claude -c

Relógio: deves estar aqui aos 19 min.

### 14. O teu hook

[21:00 → 23:00] 2 min · missions

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

Relógio: deves estar aqui aos 21 min.

### 15. Até ficar verde

[23:00 → 25:00] 2 min · missions

Objetivo: Ver o Claude a trabalhar sozinho com uma condição de paragem.

O que dizer:
- O projeto vem com 2 testes partidos de propósito.
- Um loop sem condição de paragem gasta dinheiro: diz sempre quando parar.

Olha para o painel:
- Se a M6 subir devagar: "o loop corre de minuto a minuto; enquanto esperam, façam uma bónus".

Falhas típicas e resposta:
- O loop não para → Esc e diz: para o loop

Relógio: deves estar aqui aos 23 min.

### 16. O que falta à sala (e as bónus M7 a M10)

[25:00 → 26:00] 1 min · missions

Objetivo: Fechar as missões guiadas e apontar as bónus para as esperas.

O que dizer:
- A missão que pisca no painel é a menos feita: é a que vale a pena ajudar agora.
- As bónus não têm tempo de palco: fazem-se enquanto os swarms trabalham.

Olha para o painel:
- Lê em voz alta a missão que pisca e chama quem a tem para mostrar ao vizinho.
- Se a cobertura média passar de 70 %: "esta sala está mais rápida do que o ensaio".

Relógio: deves estar aqui aos 25 min.

### 17. O que vamos construir: o Canivete

[26:00 → 28:00] 2 min · p1

Objetivo: Apresentar o Canivete e plantar a previsão.

O que dizer:
- Contar palavras, dividir a conta, converter cores: 30 ferramentas que se usam a sério.
- Cada uma é um agente e um teste; tu decides quantos agentes, que modelo e uma ferramenta tua.

Olha para o painel:
- Ainda vazio: "no fim do bloco este gráfico mostra o tempo e o custo de cada swarm da sala".

Falhas típicas e resposta:
- A pasta canivete-project não existe → o --check monta-a no passo 9

Relógio: deves estar aqui aos 26 min.

### 18. Inventa a tua ferramenta

[28:00 → 32:00] 4 min · p1

Objetivo: Dar a cada pessoa uma ferramenta que é só dela.

O que dizer:
- Os modelos são 4: calc, convert, text e generate; o agente só escreve a função run().
- O gen.mjs diz-te que campo está mal e dá um exemplo.

Olha para o painel:
- Lê os modelos mais escolhidos: "a sala prefere calc; quem fez um generate?".

Falhas típicas e resposta:
- O gen.mjs recusa o my-tool.json → lê a mensagem: diz o campo e dá um exemplo
- Sem ideias → usa o exemplo sem mudanças: funciona

Relógio: deves estar aqui aos 28 min.

### 19. Quantos agentes e que modelo?

[32:00 → 34:00] 2 min · p1

Objetivo: Fazer a sala dividir-se, para a comparação no painel ficar rica.

O que dizer:
- Sugestão: filas da frente 4, meio 8, trás 12.
- Mais agentes acabam mais depressa, mas a sessão principal coordena mais: o custo não desce.

Olha para o painel:
- Ainda sem pontos: "daqui a 10 minutos vemos quem tinha razão".

Relógio: deves estar aqui aos 32 min.

### 20. Planeia

[34:00 → 35:00] 1 min · p1

Objetivo: Registar a decisão e a previsão antes de ver o resultado.

O que dizer:
- O grafo é determinístico: vem das specs, não do modelo.
- A previsão só vai para o painel, para comparar com o tempo real.

Olha para o painel:
- Se a mediana prevista aparecer: "a sala acha X minutos; vamos ver".

Falhas típicas e resposta:
- ERROR: plan not found ao avançar → corre o /demo-plan primeiro, na pasta canivete-project

Relógio: deves estar aqui aos 34 min.

### 21. Solta o swarm

[35:00 → 42:00] 7 min · p1

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

Relógio: deves estar aqui aos 35 min.

### 22. Porque é que esta ferramenta falhou?

[42:00 → 46:00] 4 min · p1

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

Relógio: deves estar aqui aos 42 min.

### 23. Gate e custo: que decisão ganhou?

[46:00 → 48:00] 2 min · p1

Objetivo: Fechar o ciclo: qualidade e custo, medidos.

O que dizer:
- O revisor é o Opus: lê um resumo, não a árvore toda, e diz APPROVED ou REJECTED.
- O custo vem dos tokens reais e dos preços publicados.

Olha para o painel:
- Lê o custo por verde de 4, 8 e 12: "mais agentes não ficou mais barato".
- Se houver swarms em Sonnet: "o Sonnet custou mais e quase não deu mais verdes".

Falhas típicas e resposta:
- GATE: REJECTED → lê as reservas; normalmente é um vermelho por corrigir

Relógio: deves estar aqui aos 46 min.

### 24. A tua ferramenta, pelo Claude

[48:00 → 50:00] 2 min · p1

Objetivo: Fechar a ideia tool ou skill: o que o swarm construiu o Claude chama como tool.

O que dizer:
- Esta é uma tool: código com entradas tipadas, que o Claude chama pelo nome, sem ler uma receita.
- Mesma ferramenta, duas formas de a usar: a página no browser e o Claude.

Olha para o painel:
- Se a M11 ficar baixa: "o Claude Code tem de estar aberto na pasta do Canivete; /mcp mostra se o servidor canivete está ligado".

Falhas típicas e resposta:
- O Claude não encontra a ferramenta → /mcp: o servidor canivete tem de estar ligado. Plano B: /exit e claude -c, e volta a pedir (a sessão nova lê as ferramentas todas)
- Responde sem chamar a tool (lê o tool.js com cat) → pede pelo nome: usa a ferramenta my-01; se continuar, /exit e claude -c

Relógio: deves estar aqui aos 48 min.

### 25. O mesmo ciclo, noutro repositório

[50:00 → 52:00] 2 min · p2

Objetivo: Ligar o Projeto 2 ao que já fizeram.

O que dizer:
- O plan é o /demo-plan, o swarm é o /demo-swarm, o gate é o /demo-review: a diferença é que a tarefa vem de uma issue.
- O caminho por defeito é a Biblioteca Municipal, sem login; quem tiver Jira ou GitHub a funcionar pode usar uma issue sua.

Olha para o painel:
- O funil está vazio: "daqui a 30 minutos queremos a sala toda no fim".
- Quem vai trabalhar no seu repositório e prefere que nada saia do portátil: "o unregister para os envios; a caderneta fica, e o register --again volta a ligar".

Relógio: deves estar aqui aos 50 min.

### 26. Lê a issue

[52:00 → 56:00] 4 min · p2

Objetivo: Pôr toda a gente com uma tarefa lida.

O que dizer:
- A EX-1 é pequena: validar o ISBN e o email ao criar livros e leitores.
- O intake só lê: não escreve nada no Jira nem no GitHub.

Olha para o painel:
- Se o funil não sair de "intake" aos 3 min: "confirmem que estão na pasta practice-project".

Falhas típicas e resposta:
- Issue não encontrada → corre na pasta practice-project: o caminho é issues/EX-1.json

Relógio: deves estar aqui aos 52 min.

### 27. Quantos agentes?

[56:00 → 62:00] 6 min · p2

Objetivo: Decidir com base no porquê, não no número.

O que dizer:
- O planner lê a issue e o código e propõe subtarefas: tarefas que mexem nos mesmos ficheiros vão em lotes diferentes.
- Ajustar é normal: o plano é uma proposta.

Olha para o painel:
- Lê o histograma: "a maioria tem 2 ou 3; quem ajustou, porquê?".

Falhas típicas e resposta:
- PLAN INVALID → pede ao planner para corrigir: a mensagem diz o que falta

Relógio: deves estar aqui aos 56 min.

### 28. Põe o swarm a trabalhar

[62:00 → 74:00] 12 min · p2

Objetivo: Ver o swarm numa tarefa real, com retoma.

O que dizer:
- Esc interrompe; /task-swarm de novo retoma onde estava.
- Se o planner decidiu worktrees, cada agente trabalha numa cópia do repositório.

Olha para o painel:
- A meio, lê o funil: "metade já está no gate; quem ainda está no swarm, deixem correr".

Falhas típicas e resposta:
- Uma subtarefa falha 3 vezes → lê o motivo no dashboard; corrige a descrição e corre --retry
- O dashboard não mostra nada → tem de correr na pasta do projeto

Relógio: deves estar aqui aos 62 min.

### 29. O gate

[74:00 → 79:00] 5 min · p2

Objetivo: Não entregar nada sem verificação.

O que dizer:
- O gate corre os testes, procura segredos e código perigoso, e pede o veredito ao Opus.
- Um REJECTED não é um falhanço: é o gate a fazer o trabalho dele.

Olha para o painel:
- Se os gates aprovados ficarem baixos: "leiam as reservas; quase sempre é um teste por correr".

Falhas típicas e resposta:
- GATE: REJECTED → corrige o que as reservas dizem e corre /task-gate outra vez

Relógio: deves estar aqui aos 74 min.

### 30. O relatório e a memória

[79:00 → 83:00] 4 min · p2

Objetivo: Fechar a tarefa e guardar o que se aprendeu.

O que dizer:
- No projeto de treino o relatório fica em report.md; no Jira ou no GitHub, o /task-report só escreve depois do teu sim.
- A memória fica no teu portátil e o próximo /task-intake vai lê-la.

Olha para o painel:
- Se o funil chegar a "report": "quem fechou, avança para a EX-3".

Falhas típicas e resposta:
- MEMORY UNAVAILABLE → a app Agent Memory não está instalada: o resto funciona; --check mostra o passo 10

Relógio: deves estar aqui aos 79 min.

### 31. Agora sozinho: EX-3

[83:00 → 87:00] 4 min · p2

Objetivo: Fazer o ciclo sem ajuda.

O que dizer:
- A EX-3 é uma falha de segurança pequena (IDOR), com um teste de autorização já escrito.
- É o teste final do workshop: se consegues sozinho, consegues amanhã no teu repositório.

Olha para o painel:
- Lê as issues fechadas: "já há N EX-3 fechadas".

Falhas típicas e resposta:
- Não acabou a EX-1 → continua na EX-1: a EX-3 é opcional

Relógio: deves estar aqui aos 83 min.

### 32. O dia em números e 3 ideias para levar

[87:00 → 89:00] 2 min · closing

Objetivo: Fechar com os números da sala e 3 ideias concretas.

O que dizer:
- Os 3 números do painel são de "fazer melhor": custo por verde, verdes à primeira, % em Haiku.
- Tudo o que instalaram continua a funcionar amanhã: comecem pela próxima issue que vos atribuírem com /task-intake.

Olha para o painel:
- Lê o custo médio por pessoa contra o alvo de US$ 5.
- Lê a % de verdes à primeira: "é isto que uma boa spec compra".

Relógio: deves estar aqui aos 87 min.

### 33. Perguntas

[89:00 → 90:00] 1 min · closing

Objetivo: Abrir as perguntas.

O que dizer:
- As perguntas podem passar dos 90 minutos. Quem não fez o setup instala agora.
- O painel apaga tudo à meia-noite; a caderneta e as memórias ficam no vosso portátil.

Olha para o painel:
- Se der tempo: mostra a classificação final.

Relógio: deves estar aqui aos 89 min.

