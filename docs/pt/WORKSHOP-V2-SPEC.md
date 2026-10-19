# Workshop v2 — especificação e prompt para o Claude Code

19 out. 2026 · @Guilherme

O workshop passa a ter três blocos interativos: Missões (15 min), Projeto 1 "Canivete" (24 min) e Projeto 2 (40 min). Ao lado dos slides há um painel ao vivo. A Arena de Segurança fica como Projeto 1 alternativo. Este documento é a fonte única: a sessão do Claude Code não decide sem perguntar nada que não esteja aqui.

## 1. Prompt para o Claude Code

Antes de colar, exporta este documento em Markdown para `docs/pt/WORKSHOP-V2-SPEC.md` no repositório `workshop-claude`, numa branch nova `workshop-v2`. Depois abre o Claude Code na raiz do repositório e cola o texto abaixo.

```text
Vais construir a versão 2 do workshop "Orquestração de agentes com Claude" neste repositório (workshop-claude, kit v1.0.0-rc.5).

FONTE ÚNICA: docs/pt/WORKSHOP-V2-SPEC.md. Lê-o inteiro antes de qualquer outra coisa. Lê também CLAUDE.md, DECISIONS.md (sobretudo D-18 a D-29), demo-project/README.md e slides/content.mjs.

REGRAS
1. Não inventes nada fora da especificação. Se algo não estiver especificado ou for contraditório, para e pergunta-me, com 2 ou 3 opções e a tua recomendação.
2. Usa os "valores por defeito" da secção 11 sempre que uma decisão em aberto ainda não tiver resposta minha, e regista-o em DECISIONS.md.
3. Trabalha por fases (secção 10). No fim de cada fase: testes verdes, uma entrada D-xx em DECISIONS.md, um commit, e um resumo curto para mim. Não avances para a fase seguinte sem a minha aprovação.
4. A Fase 0 (spike de observabilidade) vem primeiro e decide que missões são validadas por hook. Mostra-me a tabela de resultados antes de construir o painel.
5. A Arena de Segurança não é apagada: passa a Projeto 1 alternativo (secção 9). Tudo o que existe e funciona (setup, hooks de custo, statusline, orquestrador, next-wave, grade, gen, benchmark, Agent Memory) é reaproveitado, não reescrito.
6. Mantém as convenções do repositório: Node ≥ 22 sem dependências no kit do participante, skills e agentes em inglês que respondem na língua da pessoa, textos pt-PT e en, ficheiros gerados por render.mjs/gen.mjs, testes com node --test, macOS e Windows.
7. Privacidade (secção 6.6) é inegociável: nenhum prompt, código, caminho, nome de repositório ou token sai da máquina. Um hook de telemetria nunca bloqueia nem atrasa o Claude Code (timeout de 1 s, falha em silêncio).
8. Custo: o dia completo tem de ficar abaixo de US$ 5 por participante, medido com benchmark/run-benchmark.sh (secção 10, Fase 6).
9. Usa subagentes e worktrees para trabalho paralelo independente (por exemplo: painel e missões), mas integra e testa tu no fim de cada fase.

Começa por: (a) confirmar que leste a especificação com um resumo de 10 linhas, (b) listar as perguntas que tens, (c) propor o plano da Fase 0.
```

## 2. Objetivo, princípios e regra de interatividade

Em 90 minutos, cada participante aprende a usar as funcionalidades nativas do Claude Code, a orquestrar um swarm em que as suas decisões mudam o resultado e a aplicar o mesmo ciclo a uma tarefa real. O painel ao vivo liga tudo: mostra à sala o que está a ser feito e empurra cada pessoa para o que ainda não experimentou.

### 2.1 O que a pessoa leva

1. **Funcionalidades nativas**, cada uma usada pelo menos uma vez:
   - plan mode e escolha de modelo;
   - subagente, skill própria e hook próprio;
   - `/loop` e `/btw`;
   - statusline, `claude -p` e memória.
2. **Orquestração com decisões:** escrever uma spec, escolher o paralelismo e o modelo, corrigir uma spec ambígua e comparar o efeito no tempo e no custo.
3. **O ciclo aplicado a uma tarefa real:** intake → plan → swarm → gate → report → memória, no projeto de treino ou no repositório próprio.

### 2.2 Regra de interatividade (obrigatória)

Cada slide pertence a um destes tipos. Um slide que não encaixe em nenhum é cortado.

| Tipo | O que a pessoa faz | Exemplo |
|---|---|---|
| Faz agora | Corre um comando ou escreve algo no terminal | "Corre `/demo-plan --parallel 8`" |
| Missão | Completa uma missão validada automaticamente; o painel acende | "M3: lança um subagente" |
| Decide | Escolhe uma opção que muda o resultado | "4, 8 ou 12 agentes em paralelo?" |
| Prevê | Regista uma previsão antes de ver o resultado | "Quanto tempo vai demorar o teu swarm?" |
| Painel | O apresentador comenta os dados ao vivo e pede uma reação | "Só 30% fez o hook. Quem falta?" |
| Conceito-flash | Explicação de 45 segundos no máximo, sempre seguida de uma ação no slide seguinte | "Um hook é um comando que o Claude Code corre num evento" |

São exceções o título, as regras de custo e "Perguntas". Ao todo, no máximo 3 slides ficam sem ação.

### 2.3 Princípios

1. **Fazer antes de explicar.** Os conceitos ensinam-se dentro das missões, não num bloco de teoria.
2. **Medir cobertura e qualidade, nunca volume.**
   - O painel conta quantas pessoas usaram cada funcionalidade.
   - Mostra métricas de "fazer melhor": custo por tarefa verde, verdes à primeira tentativa e % em Haiku.
   - Nunca mostra contagens brutas que premeiem gastar mais, como o número de iterações do `/loop`.
3. **Sem ranking de pessoas.** O painel mostra a sala e a comparação entre as duas salas. Ninguém é exposto por estar atrasado.
4. **As decisões têm consequências visíveis.** No Projeto 1, o paralelismo, o modelo e a qualidade da spec mudam o tempo, o custo e o número de verdes. O painel mostra a relação.
5. **Nada pode bloquear a sala.** Cada passo tem plano B: o modo replay do painel, a solução pronta e o projeto de treino.
6. **Custo:** alvo de US$ 5 por pessoa para o dia todo e teto de US$ 10, sem cortes por custo (como hoje).
7. **Privacidade inegociável** (secção 6.6).
8. **Duas salas em paralelo, com o mesmo guião:** o Guilherme numa e o Pedro na outra. O painel distingue as salas.
9. **Línguas:** pt-PT e en, como o kit atual. Skills e agentes em inglês, a responder na língua da pessoa.

## 3. Agenda de 90 minutos

A agenda tem 5 blocos: Abertura (8 min), Missões (15), Projeto 1 (24), Projeto 2 (40) e Fecho (3). O painel está sempre visível e muda de vista em cada bloco (secção 6.2).

| Relógio | Min | Bloco | O que a pessoa faz | O que o painel mostra |
|---|---|---|---|---|
| 0:00 | 2 | Abertura | Ouve o objetivo e as regras de custo; vê o painel pela primeira vez | Vista "Abertura": 0 pessoas prontas, as duas salas |
| 0:02 | 6 | Abertura | Corre o `--check` do setup, que também a liga ao painel; quem falhar corre o `--doctor` | Pessoas prontas por sala, a subir em tempo real |
| 0:08 | 15 | Missões | Faz as 6 missões guiadas (M1 a M6), 2 min cada, com um conceito-flash antes de cada uma; quem acaba cedo faz as bónus | Grelha das 10 missões com a % da sala; a menos feita pisca; feed de "primeiros" |
| 0:23 | 24 | Projeto 1 "Canivete" | Escreve uma ferramenta própria, decide o paralelismo e o modelo, prevê o tempo, corre o swarm, corrige specs ambíguas, faz a revisão e vê o custo | Dispersão tempo × custo por paralelismo, previsão vs. real, specs corrigidas, ferramentas verdes |
| 0:47 | 40 | Projeto 2 | Ciclo `/task-*` na issue EX-1 do projeto de treino (ou numa issue própria); quem acabar faz a EX-3 sozinho | Issues em curso e fechadas, número de agentes escolhido pelo planner, gates aprovados |
| 1:27 | 3 | Fecho | Vê o resumo do dia no painel; 3 ideias para levar | Totais da sala, comparação entre salas, 3 números de "fazer melhor" |

### 3.1 Margem

- **No Projeto 1:** o slide "Usa o teu Canivete" (2 min) pode saltar-se.
- **No Projeto 2:** a EX-3 é opcional por natureza (só para quem acabar a EX-1).
- **Nas Missões:** as bónus (M7 a M10) nunca têm tempo de palco; fazem-se nas esperas do Projeto 1 e do Projeto 2.

### 3.2 Pré-trabalho (antes do dia)

- Instalar o kit com o comando de setup (10 a 20 min), como hoje.
- No setup, responder à pergunta de participação no painel e escolher a sala (A ou B). A pergunta e as consequências estão na secção 6.6.
- Opcional: correr `/missions` no Claude Code para ver a caderneta, ainda vazia.

## 4. Missões

São 10 missões curtas num projeto próprio, o `missions-project` (um conversor de unidades em Node com um teste partido). As 6 guiadas (M1 a M6) fazem-se em palco, 2 min cada. As 4 bónus (M7 a M10) fazem-se nas esperas. Cada missão é validada automaticamente: a pessoa não carrega em "feito".

### 4.1 O projeto das missões

- **Pasta:** `~/workshop-claude/missions-project/`, montada pelo setup no passo 9, como a Arena e o projeto de treino.
- **Conteúdo:**
  - `src/units.js`: conversões de comprimento, massa e temperatura;
  - `test/units.test.js`: 8 testes, dos quais 2 falham de propósito (temperatura Fahrenheit e arredondamento);
  - `README.md` e um `CLAUDE.md` curto;
  - `package.json` com `npm test` = `node --test`.
- Sem dependências, Node ≥ 22, pt-PT e en (pasta `i18n/en`, como nos outros projetos).
- O `npm test` emite um evento local `tests_run` com o número de testes verdes e vermelhos, através de um `--test-reporter` pequeno do kit. É isso que valida a M6 sem depender de hooks.

### 4.2 As 10 missões

| Id | Missão | Ensina | Ação pedida | Validação (hipótese, a confirmar na Fase 0) | Plano B se a Fase 0 falhar |
|---|---|---|---|---|---|
| M1 | Planear sem tocar | Plan mode | Shift+Tab até "plan mode" e pede "Como acrescentarias conversão de volume?" | `UserPromptSubmit` com `permission_mode = "plan"` (campo comum documentado) | Nenhum necessário (campo documentado) |
| M2 | O modelo certo | Escolha de modelo e custo | `/model` → Haiku; pergunta "O que faz o units.js?"; volta ao modelo anterior | `PostModelSwitch` com `to_model` a conter "haiku" | `SessionStart` com `model` Haiku (`claude --model haiku`) |
| M3 | Um subagente | Subagentes: contexto limpo | Pede "Usa um subagente Explore para listar as funções sem teste" | `SubagentStart` (qualquer `agent_type`) | `SubagentStop` (já instalado pelo kit) |
| M4 | A tua skill | Skills: receita com nome | Cria `.claude/skills/resumo/SKILL.md` (com a ajuda do Claude) e usa `/resumo` | Ficheiro existe com frontmatter válido + `UserPromptExpansion` com o nome da skill | Ficheiro + `PostToolUse` com `tool_name` da ferramenta Skill |
| M5 | O teu hook | Hooks: comando num evento | Pede um hook `PostToolUse` em `.claude/settings.local.json` que junta a hora e o ficheiro a `edits.log` em cada Edit ou Write; depois pede uma edição | `settings.local.json` tem um hook `PostToolUse` que não é do kit + `edits.log` tem ≥ 1 linha | Só a verificação de ficheiros |
| M6 | Até ficar verde | `/loop` | `/loop 1m` corre `npm test` e corrige o primeiro teste vermelho; para quando estiver tudo verde | Evento `tests_run` com 0 vermelhos depois de um `tests_run` com vermelhos + ≥ 2 turnos sem prompt da pessoa (`UserPromptSubmit` de turno iniciado pelo Claude Code) | Basta o `tests_run` passar a verde |
| M7 | Pergunta ao lado | `/btw` | Durante uma tarefa longa: `/btw o que é um subagente?` | Desconhecido: `/btw` não aparece na documentação de hooks | Fica como dica sem validação e sai da grelha do painel |
| M8 | A tua statusline | Statusline | `/statusline` a pedir modelo + branch, gravada só em `.claude/settings.local.json` do projeto | `settings.local.json` com `statusLine` que não é do kit | — |
| M9 | Sem abrir sessão | `claude -p` (headless) | `claude -p "Resume o README numa frase" --model claude-haiku-5-5 > resumo.txt` | `resumo.txt` existe e não está vazio | — |
| M10 | Lembra-te disto | Memória (Agent Memory via MCP) | `/memory` para guardar uma lição sobre o conversor | `PostToolUse` com `tool_name` a começar por `mcp__agent-memory__` e operação de escrita | Ficheiro novo em `~/.agent-memory/` com o projeto `missions-project` |

Notas:

- **Rewind (Esc Esc) não é missão:** não há evento de hook para ele. Fica como dica no slide da M5 ("se o hook estragou algo, Esc Esc").
- **A ordem de M1 a M6 é deliberada:**
  - começa pelo que não escreve nada (plan mode) e acaba no que corre sozinho (`/loop`);
  - cada missão usa a anterior: a skill da M4 pode ser usada no `/loop` da M6.
- **Custo-alvo das 10 missões:** ≤ US$ 0,80 por pessoa, com a sessão principal em Sonnet e a M2 e a M9 em Haiku.

### 4.3 Como se valida

1. O hook de telemetria do kit (secção 6.4) grava os eventos permitidos em `~/.workshop-claude/telemetry/local.jsonl`, mesmo com a participação no painel desligada. A caderneta pessoal funciona sempre.
2. `node ~/.workshop-claude/kit/missions/missions.mjs check` avalia as regras de `missions/rules.json`: eventos e verificações de ficheiros no `missions-project`. Corre em dois momentos:
   - no fim de cada evento relevante, chamado pelo hook em segundo plano;
   - quando a pessoa corre `/missions`.
3. Quando uma missão passa a feita, grava `mission_done` com o id (ex.: M4) e, se a participação estiver ligada, envia-o ao painel.
4. Cada missão conta uma vez por pessoa. Repetir não soma nada.

### 4.4 A skill /missions

- Mostra a caderneta: as 10 missões com ✔ ou ○, a próxima sugerida e uma dica de uma linha para ela.
- Nunca faz a missão pela pessoa: se lhe pedirem, responde com a dica e o comando.
- `allowed-tools`: só `Bash(node ~/.workshop-claude/kit/missions/missions.mjs *)`. Modelo: Haiku.

### 4.5 Como se dá em palco (cada missão guiada, 2 min)

1. **Conceito-flash (30 s):** uma frase e uma imagem ("um hook é um comando que o Claude Code corre num evento").
2. **Faz agora (90 s):** o comando ou o pedido, no slide, com o "Resultado esperado".
3. **Painel** (sem tempo próprio, em sobreposição): o apresentador lê em voz alta a % da missão anterior e chama quem ainda não a fez para a fazer em paralelo.

As falhas típicas e as respostas estão nas notas do apresentador (secção 8).

## 5. Projeto 1 "Canivete"

O Canivete é uma página web com 30 pequenas ferramentas do dia a dia (contar palavras, dividir a conta, converter cores…). Cada uma é construída por um agente, com o seu teste. É um tema que toda a gente percebe e que se usa a sério no fim. O centro do projeto são 5 decisões do participante, e o painel mostra o efeito delas na sala.

### 5.1 As decisões do participante

| # | Decisão | Quando | Como | O que muda | O que o painel mostra |
|---|---|---|---|---|---|
| D1 | A tua ferramenta | Antes do plano | Copia `specs/my-tool.example.json` para `specs/my-tool.json`, edita-o e corre `node tools/gen.mjs` (o mesmo mecanismo do my-card da Arena) | Uma 31.ª ferramenta, só dela | "Ferramentas inventadas pela sala: N" e o feed com o título de algumas (só com alcunha ligada, secção 6.6) |
| D2 | Paralelismo | No plano | `/demo-plan --parallel 4`, `8` ou `12` (por defeito 8) | O tempo do swarm e a carga na sessão principal | Dispersão tempo × custo, cor = paralelismo |
| D3 | Modelo das ferramentas | No plano | `--model haiku` (por defeito) ou `--model sonnet` | O custo e a taxa de verdes à primeira | Custo por ferramenta verde, por modelo |
| D4 | Previsão | No plano | O `/demo-plan` pergunta "Quantos minutos achas que o swarm vai demorar?" (aceita sem resposta) | Nada; é para comparar | Previsão vs. real (mediana da sala) |
| D5 | Corrigir a spec | Depois do swarm | Abre o vermelho, lê o que o agente fez, decide a regra, escreve-a na spec e corre `/demo-swarm --retry <id>` | O vermelho passa a verde (ou não, se decidir mal) | Specs corrigidas pela sala e % de verdes à 2.ª tentativa |

### 5.2 Estrutura do projeto

- **Pasta:** `~/workshop-claude/canivete-project/` (fonte em `canivete-project/` no repositório).
- **Reaproveita da Arena:**
  - `server.js` (CSP estrita, só 127.0.0.1) e `/status` (grelha de quadrados);
  - o testkit Node/browser e `security.js`;
  - `gen.mjs` (adaptado) e `plan.mjs`;
  - o orquestrador e as skills `/demo-*`, tornadas genéricas (secção 9).
- **`specs/tools.json`:** o catálogo (secção 5.4). Cada ferramenta tem id, categoria, modelo de ferramenta, título, conceito, entradas, exemplos de entrada e saída, e `spec_gaps` para as 3 partidas.
- **`tools/<id>/`:** `spec.md` e `tool.test.js` gerados, e `tool.js` escrito pelo agente.
  - O contrato está em `tools/CONTRACT.md`: `export default { id, title, inputs: [...], run(values) → { output, error? } }`.
  - Sem DOM, sem rede, sem `eval` e sem dependências.
- **4 modelos em `templates/`:**
  - `calc`: números → resultado;
  - `convert`: bidirecional;
  - `text`: texto → texto;
  - `generate`: gera com seed, para o teste ser determinístico.

  A UI é da casca: o agente só escreve `run()`.
- **A casca (`public/`)** mostra a grelha das ferramentas por categoria e a pesquisa. Cada ferramenta abre um painel com as entradas e o resultado ao vivo.
- **Ondas:**
  1. as 30 ferramentas + a tua (Haiku ou Sonnet, D3);
  2. `index-page` (página de pesquisa e categorias, Sonnet);
  3. `integration` (Sonnet);
  4. `review` (Opus).
- **Tempo-alvo do swarm:** 3 a 5 min com 8 em paralelo; 6 a 7 min com 4. O contraste entre 4 e 12 tem de ser visível.
- **Custo-alvo do Projeto 1:** ≤ US$ 1,30 por pessoa com as opções por defeito.

### 5.3 As 3 specs ambíguas

Cada uma omite uma regra que o teste verifica, e a resposta "óbvia" de um modelo é a errada.

O teste guarda só um hash da saída certa para os casos que importam, como no rc.5. A mensagem diz o que a ferramenta devolveu e que regra a spec não decide, nunca o valor certo.

| Id | Ferramenta | Regra omitida | Erro provável do agente | O que o teste exige |
|---|---|---|---|---|
| nm-03 | Arredondar com casas decimais | Como arredondar casos como 1,005 com 2 casas | `toFixed(2)` devolve 1.00 (erro de vírgula flutuante) | 1,01 (meio para cima, correto em decimal) |
| dn-01 | Gorjeta e divisão da conta | Como arredondar a parte de cada pessoa | Arredondamento normal, e a soma das partes fica abaixo do total | Arredondar para cima ao cêntimo; a soma das partes ≥ total |
| tx-02 | Maiúsculas de título | Palavras pequenas em português (de, da, do, e, em…) | Tudo com maiúscula: "Casa De Papel" | Palavras pequenas em minúscula, exceto a primeira: "Casa de Papel" |

**Critério de aceitação (Fase 6):** em cada execução do benchmark, pelo menos 2 das 3 falham à primeira com Haiku, nas duas línguas. Se não, troca-se a lacuna antes de mexer nos slides.

### 5.4 Catálogo (30 ferramentas)

| Categoria | Id | Ferramenta | Modelo |
|---|---|---|---|
| Texto | tx-01 | Contar palavras e tempo de leitura | text |
| Texto | tx-02 | Maiúsculas de título (ambígua) | text |
| Texto | tx-03 | Slug para URL | text |
| Texto | tx-04 | Remover acentos | text |
| Texto | tx-05 | Contar ocorrências de uma palavra | text |
| Números | nm-01 | X % de Y e Y é que % de X | calc |
| Números | nm-02 | Regra de três simples | calc |
| Números | nm-03 | Arredondar com casas decimais (ambígua) | calc |
| Números | nm-04 | Média e mediana de uma lista | calc |
| Números | nm-05 | Numeração romana ↔ árabe | convert |
| Datas | dt-01 | Dias entre duas datas | calc |
| Datas | dt-02 | Idade numa data | calc |
| Datas | dt-03 | Dia da semana de uma data | calc |
| Datas | dt-04 | Somar dias a uma data | calc |
| Datas | dt-05 | Hora noutro fuso (offset fixo) | convert |
| Dinheiro | dn-01 | Gorjeta e divisão da conta (ambígua) | calc |
| Dinheiro | dn-02 | IVA: com e sem (23 %, 13 %, 6 %) | calc |
| Dinheiro | dn-03 | Juros compostos | calc |
| Dinheiro | dn-04 | Prestação de um empréstimo | calc |
| Dinheiro | dn-05 | Descontos em cascata | calc |
| Dev | dv-01 | Formatar JSON | text |
| Dev | dv-02 | Base64 codificar e descodificar | convert |
| Dev | dv-03 | Gerar UUID v4 | generate |
| Dev | dv-04 | Cor HEX ↔ RGB | convert |
| Dev | dv-05 | Validar um email (regras simples) | text |
| Dia a dia | dd-01 | Medidas de cozinha (chávena, colher, g) | convert |
| Dia a dia | dd-02 | Consumo de combustível (l/100 km) | calc |
| Dia a dia | dd-03 | Gerador de password | generate |
| Dia a dia | dd-04 | Celsius ↔ Fahrenheit | convert |
| Dia a dia | dd-05 | Sorteio de nomes | generate |

Cada linha do `tools.json` tem ainda:
- 3 a 6 exemplos de entrada e saída, que o teste verifica;
- as mensagens de erro esperadas para entradas inválidas;
- os textos pt e en.

As soluções de referência ficam em `dev/solutions/canivete/` (como hoje na Arena) e são verificadas pelo `check-solutions.mjs`.

### 5.5 Guião dos 24 minutos

| Relógio | Min | Slide | Tipo | O que acontece |
|---|---|---|---|---|
| 0:23 | 2 | O que vamos construir | Painel | Gravação de 30 s do Canivete pronto + a pergunta "quantos minutos achas que demora com 8 agentes?" |
| 0:25 | 4 | Inventa a tua ferramenta | Faz agora | D1: `my-tool.json` + `gen.mjs`; o painel conta as ferramentas inventadas |
| 0:29 | 2 | Decide: quantos agentes e que modelo | Decide | D2 + D3 explicados num slide; o apresentador sugere à sala que se divida (filas da frente 4, meio 8, trás 12) para a comparação ficar rica |
| 0:31 | 1 | Planeia | Faz agora + Prevê | `/demo-plan --parallel N --model M`; D4 |
| 0:32 | 7 | Solta o swarm | Faz agora + Painel | `/demo-swarm`; `node server.js` e `/status`; nas esperas, missões bónus; aos 4 min o apresentador comenta a dispersão à medida que os primeiros acabam |
| 0:39 | 4 | Porque falhou? | Faz agora | D5 nas 3 ambíguas |
| 0:43 | 2 | Gate e custo | Faz agora + Painel | `/demo-review` e `/demo-cost`; o painel compara o custo por ferramenta verde por paralelismo e modelo, e a previsão vs. o real |
| 0:45 | 2 | Usa o teu Canivete | Faz agora (pode saltar) | Abre `http://localhost:3000` e usa a sua ferramenta |

### 5.6 A lição que o painel tem de tornar óbvia

- **Mais agentes não é sempre melhor:** 12 em paralelo acaba mais depressa, mas a sessão principal coordena mais e o custo não desce. A dispersão mostra-o.
- **Sonnet em tarefas simples** custa mais e quase não melhora a taxa de verdes.
- **O que a spec não decide, o agente adivinha,** e adivinha a resposta "óbvia".

## 6. Painel ao vivo

O painel é uma página web projetada ao lado dos slides, no terço direito do ecrã (640 × 1080 px). É alimentado por eventos anónimos enviados pelo kit de cada participante. Mostra a sala e as duas salas, nunca pessoas, e muda de vista em cada bloco da agenda.

O hook e os scripts do kit filtram tudo no portátil: só a fila de eventos permitidos chega ao servidor, que alimenta o painel por SSE. A caderneta funciona mesmo com a participação desligada.

### 6.1 Regras do painel

1. **Cobertura e qualidade, nunca volume** (princípio 2.3.2). Cada pessoa conta uma vez por missão ou decisão.
2. **Legibilidade de projetor:**
   - no máximo 4 elementos por vista;
   - números principais com ≥ 64 px e texto com ≥ 24 px;
   - tema escuro (o mesmo do `/status`);
   - funciona a 640 px de largura.
3. **Atualização:** ≤ 2 s entre o evento no portátil e a mudança no ecrã. Animações curtas (≤ 400 ms), sem piscar de forma agressiva.
4. **Duas salas:** cada participante escolhe A ou B no setup.
   - Cada sala projeta a mesma URL com `?sala=A` ou `?sala=B`: destaca a sua e mostra a outra mais pequena.
   - `?sala=todas` serve para o fecho.
5. **O apresentador controla a vista** com teclas no próprio painel (1 a 5 = Abertura, Missões, Projeto 1, Projeto 2, Fecho) ou por `POST /admin/fase` com o token de admin. A vista é partilhada pelas duas salas.

### 6.2 Vistas

| Vista | Elementos (por ordem no ecrã) | Pergunta que responde |
|---|---|---|
| Sempre (topo) | Pessoas ativas por sala; custo médio por pessoa vs. US$ 5 (barra) | "A sala está a trabalhar e dentro do orçamento?" |
| Abertura | Prontos por sala (contagem grande + barra para o total inscrito) | "Quantos estão prontos?" |
| Missões | Grelha 2 × 5 das missões: cada quadrado enche com a % da sala; a menos feita com etiqueta "experimenta agora"; feed dos 5 últimos marcos | "O que a sala já sabe fazer e o que falta?" |
| Projeto 1 | Dispersão tempo do swarm (x) × custo do Projeto 1 (y), um ponto por pessoa, cor = paralelismo, forma = modelo; previsão vs. real (mediana); specs corrigidas / total | "Que decisões deram melhor resultado?" |
| Projeto 2 | Funil intake → plan → swarm → gate → report (pessoas em cada fase); histograma do número de agentes escolhido pelo planner; issues fechadas por sala | "Onde está a sala no ciclo?" |
| Fecho | 3 números de "fazer melhor" (custo por tarefa verde, % de verdes à primeira, % do trabalho em Haiku); cobertura média de missões por sala; total de agentes lançados | "O que aprendemos, em números?" |

### 6.3 Métricas

| Métrica | Fórmula | Eventos de origem | Vista |
|---|---|---|---|
| Pessoas ativas | Participantes com qualquer evento nos últimos 10 min | todos | Sempre |
| Prontos | Participantes com `check_ok` | `check_ok` | Abertura |
| Custo médio por pessoa | Soma de `custo_usd` / participantes com custo | `cost` | Sempre, Fecho |
| Cobertura da missão Mx | Participantes com `mission_done` Mx / ativos | `mission_done` | Missões |
| Cobertura média | Média das 10 coberturas (ou das validadas, ver Fase 0) | `mission_done` | Fecho |
| Ponto da dispersão | (duração do swarm, custo P1, paralelismo, modelo) por participante | `p1_plan`, `p1_swarm_done`, `cost` | Projeto 1 |
| Previsão vs. real | Mediana de `previsao_min` vs. mediana da duração real | `p1_plan`, `p1_swarm_done` | Projeto 1 |
| Specs corrigidas | Participantes com ≥ 1 `p1_retry_green` / participantes com `p1_swarm_done` | `p1_retry_green` | Projeto 1 |
| Custo por tarefa verde | Custo do swarm / tarefas verdes (P1 + P2) | `p1_swarm_done`, `p2_swarm_done`, `cost` | Fecho |
| Verdes à primeira | Tarefas verdes na 1.ª tentativa / tarefas | `p1_swarm_done`, `p2_swarm_done` | Fecho |
| % em Haiku | Custo dos agentes Haiku / custo dos agentes | `cost` | Fecho |
| Funil do Projeto 2 | Última fase atingida por participante | `p2_*` | Projeto 2 |
| Agentes escolhidos pelo planner | Histograma de `n_agentes` | `p2_plan` | Projeto 2 |

### 6.4 Eventos

Allowlist fechada: o hook e o servidor rejeitam qualquer nome ou campo fora desta tabela.

| Evento | Origem | Quando | Campos além do envelope |
|---|---|---|---|
| `join` | setup / `ctl.mjs on` | Ao ligar a participação | `lingua`, `so` (mac ou win), `alcunha` (opcional, secção 6.6) |
| `check_ok` | setup `--check` | Verificação completa sem falhas | — |
| `feature` | hook de telemetria | Primeira vez por sessão que se observa uma funcionalidade | `nome`: `plan_mode`, `model_switch`, `subagent`, `skill_user`, `hook_user`, `loop`, `statusline_user`, `headless`, `memory_write` |
| `mission_done` | `missions.mjs` | Missão passa a feita | `missao`: M1 a M10 |
| `tests_run` | reporter do missions-project | Cada `npm test` | `verdes`, `vermelhos` (só local, não é enviado) |
| `p1_tool_created` | `gen.mjs` | `my-tool.json` válido gerado | `modelo_ferramenta` (calc, convert, text, generate) |
| `p1_plan` | `plan.mjs` | Plano gerado | `paralelo`, `modelo`, `previsao_min` (ou null), `tarefas` |
| `p1_swarm_done` | `next-wave.mjs` | `STATE: DONE` | `duracao_s`, `verdes`, `vermelhos`, `verdes_1a` |
| `p1_retry_green` | `next-wave.mjs` / `grade.mjs` | Um `--retry` de spec ambígua fica verde | `ferramenta` (só ids do catálogo) |
| `p1_gate` | `/demo-review` | Veredito | `veredito` (APPROVED ou outro) |
| `cost` | hooks `SubagentStop` e `Stop` do kit | Cada linha nova do `usage.jsonl` | `custo_usd`, `modelo` (família), `bloco` (missoes, p1, p2) |
| `p2_intake` | `/task-intake` | Issue lida | `origem` (treino ou propria), `issue` (EX-1, EX-2, EX-3 ou "propria", nunca a chave real) |
| `p2_plan` | `/task-plan` | Plano aprovado | `n_agentes` |
| `p2_swarm_done` | `next-wave.mjs` | `STATE: DONE` | `duracao_s`, `verdes`, `vermelhos`, `verdes_1a` |
| `p2_gate` | `/task-gate` | Veredito | `veredito` |
| `p2_report` | `/task-report` | Relatório escrito (ficheiro no treino, Jira ou GitHub no próprio) | `destino` (ficheiro, jira, github) |

**Envelope** (todos os eventos): `v` (1), `ws` (código do workshop), `sala` (A ou B), `p` (id anónimo), `ev`, `t` (ISO 8601) e `kit` (versão). Tamanho máximo: 512 bytes por evento.

**O hook de telemetria** (`hooks/telemetry.mjs`):
- **Registo:** o instalador regista-o no `settings.json` do utilizador, com `"async": true`, nos eventos `SessionStart`, `UserPromptSubmit`, `UserPromptExpansion`, `SubagentStart`, `PostToolUse` (matcher `Skill` e `mcp__agent-memory__.*`), `PostModelSwitch` e `ConfigChange`. A lista final sai da Fase 0.
- **O que lê:** o input do stdin. Extrai só o sinal booleano permitido (ex.: `permission_mode === "plan"` → feature `plan_mode`) e descarta o resto do input sem o gravar.
- **Onde grava:** no ficheiro local e, com a participação ligada, numa fila `queue.jsonl`. Nunca faz rede no próprio hook.
- **Tempo:** termina sempre com código 0 em ≤ 300 ms, com um timeout interno de 1 s.
- **Tipo:** tem de ser `type: "command"`, nunca `type: "http"`. Um hook HTTP envia o input JSON completo (prompt, caminhos, `transcript_path`) como corpo do POST.

**O envio** (`telemetry/send.mjs`):
- é um processo destacado, que o hook lança no máximo uma vez a cada 2 s (com lockfile);
- lê a fila e envia em lotes de até 50 eventos por `POST /e`, com timeout de 2 s;
- respeita o proxy e o certificado da empresa que o setup já deteta (`~/.workshop-claude/ca.pem`);
- apaga só o que o servidor confirmou;
- sem rede, a fila espera, com um máximo de 2.000 eventos (os mais antigos saem primeiro).

### 6.5 Servidor

- **`painel/server.mjs`:** Node ≥ 22, sem dependências, como o resto do kit. Uma instância serve as duas salas.
- **Endpoints:**
  - `POST /e`: lote de eventos, com o cabeçalho `X-Workshop-Code`. Valida a allowlist, o tamanho e o rate limit (120 eventos/min por participante). Responde 204.
  - `GET /stream`: Server-Sent Events com o estado agregado, no máximo 2 por segundo.
  - `GET /state`: o mesmo estado em JSON, para recarregar a página.
  - `GET /`: o painel.
  - `POST /admin/fase` e `POST /admin/reset`, com o cabeçalho `X-Admin-Token`.
- **Estado** em memória e num registo append-only (`data/<ws>/events.jsonl`), para rearrancar sem perder nada e para o replay. O agregado é recalculado a partir do registo no arranque.
- **Modo replay:** `GET /?replay=<nome>` reproduz um registo gravado à velocidade real ou acelerada (`&x=10`). Serve para ensaiar e como plano B.
- **Simulador:** `painel/simulate.mjs --people 100 --rooms 2 --speed 10` gera eventos realistas para toda a agenda. É usado nos testes e no ensaio.
- **Carga-alvo:** 250 participantes, picos de 20 eventos/s, 2 páginas abertas por sala, num servidor de 1 vCPU.
- **Alojamento:** ver a decisão em aberto na secção 11. O código não assume nenhum fornecedor: o HTTPS termina num proxy à frente (Caddy ou o do fornecedor).

### 6.6 Privacidade

1. **Participação opt-in.** O setup pergunta: "Queres que o teu kit envie eventos anónimos para o painel do workshop? (só o nome da funcionalidade usada, nunca o que escreves)".
   - Sem resposta (sem terminal) = não.
   - Muda-se a qualquer momento com `node ~/.workshop-claude/kit/telemetry/ctl.mjs on|off|status|show`.
2. **Nunca sai da máquina:**
   - prompts, respostas e código;
   - nomes de ficheiros, caminhos, cwd e `transcript_path`;
   - nomes de repositório e chaves de issues reais;
   - tokens;
   - email, nome de utilizador e hostname.
3. **Id anónimo:** 16 bytes aleatórios gerados no setup, guardados em `~/.workshop-claude/telemetry/id`. Não é derivado de nada da pessoa nem da máquina.
4. **Alcunha opcional, desligada por defeito:** até 16 caracteres `[A-Za-z0-9 _-]`. Só aparece no feed de marcos, e o apresentador pode esconder qualquer uma no painel (tecla H + clique).
5. **Transparência:** `ctl.mjs show` mostra os últimos 20 eventos enviados, exatamente como saíram. O README e o slide de abertura dizem o que é enviado.
6. **Expiração:** a configuração tem `expira_em` = dia do workshop + 1 dia. Depois disso, o hook não grava nem envia nada. O `--uninstall` remove tudo.
7. **Servidor:** não grava IPs nem cabeçalhos. Os registos apagam-se 7 dias depois do workshop. O código do workshop e o token de admin mudam a cada workshop.
8. **Revisão:** um teste automatizado alimenta o hook com inputs reais de cada evento, com prompts e caminhos falsos marcados, e falha se algum marcador aparecer na fila.

### 6.7 Caderneta pessoal

- A statusline do kit ganha um segmento: `missões 6/10`, e `P1 ✓` / `P2 ✓` quando o gate de cada projeto aprova. Funciona com a participação ligada ou desligada.
- O `/missions` mostra o detalhe (secção 4.4).
- O painel nunca mostra a caderneta de ninguém.

### 6.8 Plano B

| Falha | Resposta |
|---|---|
| Servidor ou rede em baixo | Os eventos ficam na fila; o apresentador muda para `?replay=ensaio` (registo do ensaio) e diz-o à sala; a caderneta continua a funcionar |
| Proxy da empresa bloqueia o domínio | O `--check` testa `GET /state` e avisa no dia anterior (pré-trabalho); alternativa: rede do evento ou hotspot |
| Painel lento no projetor | `?lite=1` desliga as animações e baixa a atualização para 1 por segundo |
| Pessoa sem participação | Faz tudo igual; só não aparece nos agregados |

## 7. Projeto 2 (40 minutos)

O Projeto 2 passa de 25 para 40 minutos e continua a usar as skills `/task-*` sem mudanças de fundo. O que muda é o ritmo:
- cada fase do ciclo tem um slide "Faz agora";
- o painel mostra o funil da sala;
- quem acaba a EX-1 faz a EX-3 sozinho, sem slides.

### 7.1 Caminho por defeito e alternativa

- **Por defeito:** projeto de treino Biblioteca Municipal, issue EX-1 (validação de ISBN e email), sem login no Jira.
- **Alternativa:** repositório próprio, com uma issue do Jira ou do GitHub, só para quem já tem o login feito e os testes a correr. O apresentador não dá suporte de autenticação durante a sessão.
- **Extra para quem acaba:** a EX-3 (IDOR, pequena, de segurança), repetindo o ciclo sozinho. A EX-2 (média) fica para depois do workshop.

### 7.2 Guião dos 40 minutos

| Relógio | Min | Slide | Tipo | O que acontece |
|---|---|---|---|---|
| 0:47 | 2 | O mesmo ciclo, noutro repositório | Painel | O funil vazio; o apresentador liga cada peça ao que fizeram nas missões e no Canivete |
| 0:49 | 4 | Lê a issue | Faz agora | `/task-intake issues/EX-1.json` (ou a issue própria) |
| 0:53 | 6 | Quantos agentes? | Decide + Painel | `/task-plan`: lê o porquê do número de agentes, aprova ou ajusta; o painel mostra o histograma da sala; o apresentador pergunta a quem ajustou porquê |
| 0:59 | 12 | Põe o swarm a trabalhar | Faz agora + Painel | `/task-swarm` + o dashboard noutro terminal; nas esperas, as missões bónus que faltam; a meio, o apresentador comenta o funil |
| 1:11 | 5 | O gate | Faz agora | `/task-gate`: testes, segredos, código perigoso e veredito do Opus; quem tiver reservas lê-as e corrige |
| 1:16 | 4 | O relatório e a memória | Faz agora | `/task-report` (no treino escreve `report.md`, sem Jira) e `/memory` com a lição |
| 1:20 | 7 | Agora sozinho: EX-3 | Faz agora | Repetir o ciclo na EX-3 sem slides; o painel mostra as issues fechadas por sala; quem não acabou a EX-1 continua nela |

### 7.3 O que muda no repositório

- **Eventos `p2_*`** (secção 6.4): as skills `/task-*` emitem-nos através de um script do kit (`telemetry/emit.mjs <evento> <campos>`). As skills não fazem rede.
- **`/task-report` no projeto de treino** escreve `report.md` na raiz em vez de pedir confirmação para o Jira. Isto é detetado pelo campo `"source": "practice"` do JSON da issue.
- **`practice-project/issues/EX-3.json`** passa a trazer critérios de aceitação que o `/task-gate` consegue verificar sem ajuda (um teste de autorização já escrito, a falhar).
- **Custo-alvo:** EX-1 + EX-3 ≤ US$ 2,20 por pessoa. Hoje a EX-1 sozinha custa cerca de US$ 0,65 a 0,80 (benchmark do rc.5).

## 8. Slides e notas

O deck novo tem 29 slides, todos de um dos tipos da secção 2.2. Os slides ocupam 2/3 do ecrã e o painel o terço direito. A vista do painel muda automaticamente com o slide.

### 8.1 Ecrã e formato

- **Ecrã de 1920 × 1080:** slides em 1280 × 1080 à esquerda e painel em 640 × 1080 à direita.
- **Tamanho dos slides:** personalizado, 1280 × 1080 px (33,87 × 28,58 cm), não 16:9.
  - Corpo mínimo de 24 pt e código mínimo de 20 pt.
  - O `build.mjs` avisa abaixo disso (como hoje avisa abaixo de 16 pt).
- **`slides/palco.html`** (gerado pelo `build.mjs`): mostra as imagens dos slides (exportadas para PNG no build) à esquerda e o painel num iframe à direita.
  - Setas e espaço para navegar. Cada slide tem uma fase no `content-v2.mjs`, e o palco chama `POST /admin/fase` quando a fase muda.
  - `palco.html?notas=1` abre as notas numa segunda janela (portátil do apresentador), sincronizada por `BroadcastChannel`.
- **Plano B:** o PowerPoint em modo janela ao lado do browser com o painel, com a fase mudada à mão (teclas 1 a 5 no painel).
- **Identidade:** a da Checkmarx, como o deck atual.

### 8.2 Lista de slides

| # | Min | Bloco | Fase do painel | Tipo | Título |
|---|---|---|---|---|---|
| 1 | 0,5 | Abertura | Abertura | (exceção) | Orquestração de agentes com Claude |
| 2 | 1,5 | Abertura | Abertura | (exceção) | As regras: custo e o que o painel vê |
| 3 | 4 | Abertura | Abertura | Faz agora | Verifica e liga-te ao painel |
| 4 | 2 | Abertura | Abertura | Faz agora | Algum passo falhou? |
| 5 | 1 | Missões | Missões | Painel | 10 missões, uma grelha vazia |
| 6 | 2 | Missões | Missões | Missão | M1 Planear sem tocar |
| 7 | 2 | Missões | Missões | Missão | M2 O modelo certo |
| 8 | 2 | Missões | Missões | Missão | M3 Um subagente |
| 9 | 2 | Missões | Missões | Missão | M4 A tua skill |
| 10 | 2 | Missões | Missões | Missão | M5 O teu hook |
| 11 | 2 | Missões | Missões | Missão | M6 Até ficar verde |
| 12 | 2 | Missões | Missões | Painel | O que falta à sala (e as bónus M7 a M10) |
| 13 | 2 | Projeto 1 | Projeto 1 | Painel | O que vamos construir: o Canivete |
| 14 | 4 | Projeto 1 | Projeto 1 | Faz agora | Inventa a tua ferramenta |
| 15 | 2 | Projeto 1 | Projeto 1 | Decide | Quantos agentes e que modelo? |
| 16 | 1 | Projeto 1 | Projeto 1 | Faz agora + Prevê | Planeia |
| 17 | 7 | Projeto 1 | Projeto 1 | Faz agora + Painel | Solta o swarm |
| 18 | 4 | Projeto 1 | Projeto 1 | Faz agora | Porque é que esta ferramenta falhou? |
| 19 | 2 | Projeto 1 | Projeto 1 | Faz agora + Painel | Gate e custo: que decisão ganhou? |
| 20 | 2 | Projeto 1 | Projeto 1 | Faz agora (pode saltar) | Usa o teu Canivete |
| 21 | 2 | Projeto 2 | Projeto 2 | Painel | O mesmo ciclo, noutro repositório |
| 22 | 4 | Projeto 2 | Projeto 2 | Faz agora | Lê a issue |
| 23 | 6 | Projeto 2 | Projeto 2 | Decide + Painel | Quantos agentes? |
| 24 | 12 | Projeto 2 | Projeto 2 | Faz agora + Painel | Põe o swarm a trabalhar |
| 25 | 5 | Projeto 2 | Projeto 2 | Faz agora | O gate |
| 26 | 4 | Projeto 2 | Projeto 2 | Faz agora | O relatório e a memória |
| 27 | 7 | Projeto 2 | Projeto 2 | Faz agora | Agora sozinho: EX-3 |
| 28 | 2 | Fecho | Fecho | Painel | O dia em números e 3 ideias para levar |
| 29 | 1 | Fecho | Fecho | (exceção) | Perguntas |

Total: 90 min.

### 8.3 Formato de cada slide

- **Faz agora e Missão:** o mesmo padrão do deck atual: etiqueta com os minutos, passos numerados, bloco de comando e "Resultado esperado". A Missão acrescenta no topo a frase do conceito-flash e o id (M1 a M6).
- **Decide:** as opções lado a lado (no máximo 3), com o que cada uma provavelmente muda e o comando de cada opção.
- **Prevê:** a pergunta em grande e onde se responde (no `/demo-plan`).
- **Painel:** uma pergunta grande para a sala e uma seta para o painel. O conteúdo está no painel, não no slide.

### 8.4 Notas do apresentador

Cada slide tem, nesta ordem:
1. **Objetivo:** uma frase.
2. **O que dizer:** no máximo 3 frases.
3. **Olha para o painel:** frases condicionais prontas a usar. Por exemplo: "Se a M5 estiver abaixo de 50 %: 'metade da sala ainda não tem um hook; quem já tem, ajuda o vizinho'".
4. **Falhas típicas e resposta:** no máximo 3, com o comando que resolve.
5. **Relógio:** "deves estar aqui aos X min", como hoje.

As respostas das 3 specs ambíguas (secção 5.3) e o argumento de cada uma ficam numa folha só para o apresentador, `docs/pt/PRESENTER-ANSWERS.md`, fora do kit do participante.

### 8.5 Ficheiros

- `slides/content-v2.mjs` e `slides/content-v2.en.mjs`: o mesmo formato do `content.mjs`, mais o campo `fase` por slide.
- **Saídas:** `slides/workshop-v2.pptx`, `slides/workshop-v2.en.pptx`, `slides/speaker-notes-v2.md` e `.en.md`, e `slides/palco.html`.
- O deck atual da Arena (`workshop.pptx`) mantém-se como alternativa (secção 9.4).

## 9. Reaproveitar, mudar e criar no repositório

Quase toda a infraestrutura do rc.5 fica. O trabalho novo são 4 peças: o projeto das missões, a telemetria com o painel, o Canivete e o deck v2. A Arena não é apagada.

### 9.1 Reaproveitar sem mudar

| Peça | Onde |
|---|---|
| Hooks de custo `SubagentStop` e `Stop`, `usage.jsonl`, `budget.mjs` | `hooks/` |
| Orquestrador: `next-wave` (com `--retry`), `grade`, `estimate`, `validate-plan`, `dashboard`, `report` | `orchestrator/` |
| Skills `/task-*` e agentes `ws-*` (só ganham uma chamada ao `emit.mjs`, secção 7.3) | `skills-prod/`, `agents/prod/` |
| Projeto de treino (Biblioteca Municipal) | `practice-project/` |
| Agent Memory e a skill `/memory` | `skills-*/memory/`, setup passo 10 |
| Testkit Node/browser, `security.js`, CSP do servidor, `/status` | `demo-project/lib/`, `server.js`, `public/status.*` |
| Geração de docs e READMEs, i18n, `repos.conf` | `tools/render.mjs`, `tools/templates/` |
| Release e publicação | `tools/build-release.sh`, `tools/publish-release.sh` |

### 9.2 Mudar

| Peça | Mudança |
|---|---|
| Setup (`setup-mac.sh`, `setup-windows.ps1`) | Pergunta de participação e sala no passo 8; o `--check` testa o painel (`GET /state`) e envia `check_ok`; o `--uninstall` remove a telemetria; catálogos de mensagens en e pt |
| `installer/lib/settings.mjs` | Regista o hook de telemetria nos eventos da Fase 0, com `"async": true`; remove-o no uninstall; testes do merge |
| `installer/assemble-*.mjs` | Monta `missions-project` e `canivete-project` em `~/workshop-claude/`; a Arena só com `WORKSHOP_P1=arena` |
| Statusline | Segmento da caderneta (secção 6.7), sem passar de uma linha |
| Skills `/demo-plan`, `/demo-swarm`, `/demo-review`, `/demo-cost`, `/demo-reset` | Genéricas: leem `workshop.project.json` na raiz do projeto (nome, catálogo, pastas, unidade "cartão" ou "ferramenta", flags permitidas). Uma só versão serve a Arena e o Canivete |
| `plan.mjs` | Flags `--parallel 4\|8\|12` (o limite atual de 8 passa a vir do plano), `--model haiku\|sonnet` e a pergunta da previsão; emite `p1_plan` |
| `next-wave.mjs` e `grade.mjs` | Emitem `p1_swarm_done`, `p1_retry_green` e `p2_swarm_done` |
| `gen.mjs` | Genérico para o catálogo (`cards.json` ou `tools.json`), com `my-tool.json` além de `my-card.json` |
| Benchmark | `--scope day` passa a incluir as missões (M1 a M6 por `claude -p`) e o Canivete; `--p1 canivete\|arena` |
| `slides/build.mjs` | Tamanho 1280 × 1080, campo `fase`, exportação PNG e geração do `palco.html` |
| Docs | INSTALL, FAQ, TROUBLESHOOTING (códigos de erro novos da telemetria), ORGANIZER (painel, alojamento, ensaio), em pt e en |

### 9.3 Criar

```text
missions-project/            projeto das missões (secção 4.1), pt e i18n/en
missions/
  rules.json                 regras das 10 missões: eventos e verificações de ficheiros
  missions.mjs               check | status | reset
  reporter.mjs               --test-reporter que emite tests_run
skills-shared/missions/SKILL.md
telemetry/
  allowlist.json             eventos e campos permitidos (fonte única: hook, emit, servidor)
  emit.mjs                   emitir um evento a partir de scripts e skills
  send.mjs                   fila → POST /e, destacado, com lockfile
  ctl.mjs                    on | off | status | show
hooks/telemetry.mjs          o hook (secção 6.4)
canivete-project/            o Projeto 1 (secção 5.2), pt e i18n/en
  workshop.project.json
  specs/tools.json, specs/my-tool.example.json
  templates/calc.js, convert.js, text.js, generate.js
  tools/CONTRACT.md
  public/ (casca), server.js, lib/, tools/ (gen, plan, reset)
dev/solutions/canivete/      soluções de referência das 30 ferramentas
painel/
  server.mjs, public/ (index.html, painel.js, painel.css)
  aggregate.mjs              eventos → estado (puro, testado)
  simulate.mjs               gerador de eventos para ensaio e testes
  replays/ensaio/events.jsonl
  Dockerfile, Caddyfile.example
slides/content-v2.mjs, content-v2.en.mjs, palco.html (gerado)
docs/pt/PRESENTER-ANSWERS.md, docs/pt/PRIVACY.md (e en)
tools/test/telemetry-privacy.test.mjs, missions.test.mjs, painel.test.mjs, canivete.test.mjs
```

### 9.4 A Arena como alternativa

- **Fica em `demo-project/`,** completa e testada como no rc.5. O setup só a monta com `WORKSHOP_P1=arena`; por defeito monta o Canivete.
- **Com as skills genéricas,** a Arena passa a ter `workshop.project.json` e ganha as mesmas flags (`--parallel`, `--model`) e os mesmos eventos `p1_*`. O painel funciona igual.
- **Deck:** `slides/workshop.pptx` mantém-se como está. Um deck v2 com a Arena no lugar do Canivete não faz parte desta entrega.
- **Benchmark:** `--p1 arena` continua a correr, para comparar.

## 10. Fases de entrega, critérios de aceitação e testes

Há 7 fases, de 0 a 6. Cada uma acaba com testes verdes, uma entrada D-xx no `DECISIONS.md`, um commit e a aprovação do Guilherme antes de passar à seguinte. A Fase 0 decide o que é possível validar por hook e pode mudar a secção 4.

### Fase 0: observabilidade (spike)

**Objetivo:** saber que eventos de hook disparam para cada ação das missões, e que campos trazem, na versão do Claude Code que o kit instala (2.1.292 ou a que estiver no `repos.conf`).

**Método:**
1. Numa pasta temporária com `CLAUDE_CONFIG_DIR` próprio, registar em todos os eventos da documentação um hook command que grava o input completo num ficheiro local. Isto é só para o spike e nunca vai para o kit.
2. Fazer à mão cada ação da tabela abaixo, em sessão interativa e com `claude -p` quando fizer sentido.
3. Registar em `docs/OBSERVABILITY.md` uma linha por ação: os eventos disparados, os campos úteis e se distinguem a ação sem ler o prompt.

| Ação | Hipótese a confirmar |
|---|---|
| Prompt em plan mode | `UserPromptSubmit` com `permission_mode = "plan"` |
| `/model haiku` | `PostModelSwitch` com `to_model` |
| Pedido que lança um subagente | `SubagentStart` com `agent_type` |
| `/resumo` (skill do utilizador) | `UserPromptExpansion` com o nome do comando; `PostToolUse` da ferramenta Skill quando o modelo a invoca |
| Hook criado pelo Claude em `settings.local.json` | `ConfigChange` (e que campos traz) |
| `/loop 1m …` | Que eventos disparam no arranque e em cada iteração; se há um campo que distingue um turno iniciado pelo Claude Code |
| `/btw …` | Se dispara algum evento |
| `/statusline …` | `ConfigChange` |
| `claude -p …` | `SessionStart` (e se se distingue de uma sessão interativa) |
| Escrita na Agent Memory via MCP | `PostToolUse` com `tool_name` `mcp__agent-memory__*` |
| Esc Esc (rewind) | Confirmar que não há evento |

**Aceitação:** a tabela preenchida e uma proposta de validação final para M1 a M10. O que não for observável usa o plano B da secção 4.2. Custo do spike: < US$ 1.

### Fase 1: telemetria local e missões

- **Entrega:**
  - `missions-project`, `missions/`, `hooks/telemetry.mjs` e `telemetry/` (sem envio ativo);
  - a skill `/missions` e a caderneta na statusline;
  - as alterações ao `settings.mjs` e ao setup (pergunta de participação e sala).
- **Aceitação:**
  - fazer M1 a M10 à mão numa máquina limpa marca as 10 na caderneta (ou as validadas, segundo a Fase 0);
  - o hook termina em ≤ 300 ms (p95) e nunca devolve um código diferente de 0;
  - `telemetry-privacy.test.mjs` verde: com inputs reais de todos os eventos e marcadores em prompts, caminhos, cwd e `tool_input`, nenhum marcador aparece na fila nem no ficheiro local.

### Fase 2: servidor e painel

- **Entrega:** `painel/` completo, `send.mjs` ativo, `emit.mjs`, o `--check` com teste do painel e o `ctl.mjs`.
- **Aceitação:**
  - o simulador corre com 250 pessoas e 2 salas a 10× sem erros, com o painel a atualizar em ≤ 2 s;
  - as 6 vistas são legíveis a 640 × 1080 (capturas de ecrã no PR);
  - o replay reproduz um registo;
  - o servidor rejeita eventos fora da allowlist, lotes acima do limite e códigos de workshop errados;
  - sem rede, a fila guarda e depois envia sem duplicar.

### Fase 3: Canivete

- **Entrega:**
  - `canivete-project/` completo;
  - as skills `/demo-*` genéricas e o `workshop.project.json`, também na Arena;
  - as 30 soluções em `dev/solutions/canivete/`;
  - o `PRESENTER-ANSWERS.md`.
- **Aceitação:**
  - `check-solutions.mjs` verde com as soluções (e com as 3 specs completas via `--no-gaps`);
  - os 3 testes ambíguos rejeitam a resposta "óbvia" da secção 5.3;
  - a Arena continua verde com as skills genéricas (os testes do rc.5 passam);
  - os eventos `p1_*` são emitidos.

### Fase 4: Projeto 2

- **Entrega:** o `emit.mjs` nas skills `/task-*`, o `report.md` no projeto de treino e os critérios da EX-3.
- **Aceitação:** a EX-1 e a EX-3 correm de ponta a ponta com `--auto`, com os gates aprovados e os eventos `p2_*` no painel.

### Fase 5: slides, notas e docs

- **Entrega:** `content-v2` (pt e en), o `build.mjs` atualizado, o `palco.html`, as notas com os 5 campos da secção 8.4 e as docs.
- **Aceitação:**
  - 29 slides e um total de 90 min nas notas;
  - todos os slides com um tipo válido e no máximo 3 exceções (o `build.mjs` falha se não);
  - nenhum `{{...}}` por resolver;
  - texto ≥ 24 pt;
  - o `palco.html` muda a fase do painel ao navegar.

### Fase 6: medição e ensaio

- **Benchmark do dia completo** (missões + Canivete + EX-1 + EX-3):
  - 3 execuções em pt e 1 em en;
  - alvo: média ≤ US$ 4,30 e máximo ≤ US$ 5;
  - em todas: 0 permissões negadas, 0 erros 429 e gates aprovados;
  - em cada execução, ≥ 2 das 3 specs ambíguas falham à primeira.
- **Teste de carga do painel** com o simulador (Fase 2), contra o servidor no alojamento real.
- **Ensaio com 5 pessoas** (4 participantes e 1 apresentador), em duas máquinas Mac e, quando houver, numa Windows:
  - cronometrar cada bloco;
  - gravar o registo do painel em `painel/replays/ensaio/`;
  - listar o que falhou.
- **Aceitação:** cada bloco dentro de ± 10 % do tempo previsto e uma lista de correções aprovada.

### Testes que têm de existir no fim

| Ficheiro | Cobre |
|---|---|
| `tools/test/telemetry-privacy.test.mjs` | Nada fora da allowlist sai do hook, do emit ou do send |
| `tools/test/missions.test.mjs` | Cada regra de missão com eventos e ficheiros falsos; uma vez por pessoa; caderneta |
| `tools/test/painel.test.mjs` | `aggregate.mjs` (todas as métricas da 6.3), allowlist no servidor, rate limit, replay |
| `tools/test/canivete.test.mjs` | `gen` com my-tool, flags do plan, ambiguidades, eventos `p1_*` |
| `tools/test/settings.test.mjs` (alargado) | Registo e remoção do hook de telemetria sem tocar em hooks alheios |
| `setup/test/*` (alargado) | Pergunta de participação, sala, `--check` com e sem painel acessível, uninstall |

## 11. Riscos, decisões em aberto e valores por defeito

Há 8 decisões ainda por tomar. Enquanto o Guilherme não responder, a sessão do Claude Code usa o valor por defeito e regista-o no `DECISIONS.md`. Os maiores riscos são o painel não chegar à rede da empresa e as missões que não se conseguem observar.

### 11.1 Decisões em aberto

| # | Decisão | Valor por defeito | Porquê |
|---|---|---|---|
| A1 | Onde alojar o servidor do painel | Contentor do `painel/Dockerfile` numa VM pequena controlada pela organização, com Caddy e HTTPS num subdomínio próprio | Sem fornecedor externo com dados; o código serve qualquer alojamento |
| A2 | Participação por defeito | Pergunta no setup; sem resposta = não | Plateia de segurança: consentimento explícito |
| A3 | Alcunhas no feed | Desligadas; o feed diz "alguém da sala A" | Zero exposição; ligam-se com `ctl.mjs alcunha <nome>` |
| A4 | Projeto 1 por defeito | Canivete; Arena com `WORKSHOP_P1=arena` | Pedido do Guilherme (19 out.) |
| A5 | Opções de paralelismo | 4, 8 e 12 (defeito 8) | 12 deve mostrar o custo da coordenação sem provocar erros 429; a confirmar na Fase 6 (se houver 429, o máximo passa a 10) |
| A6 | Retenção dos dados do painel | 7 dias depois do workshop | Tempo para o relatório do organizador |
| A7 | Data do workshop | Desconhecida: as fases 0 a 6 são todas necessárias. Se faltar tempo, corta-se por esta ordem: `palco.html` (fica o plano B), vista Fecho, alcunhas | Proteção do essencial |
| A8 | Validação do Windows real | Fora desta entrega; ponto 1 do WINDOWS-CHECKLIST quando houver máquina | Decisão do Guilherme (19 out.) |

### 11.2 Orçamento de custo por pessoa

| Bloco | Alvo |
|---|---|
| Missões (M1 a M10) | ≤ US$ 0,80 |
| Projeto 1 Canivete (opções por defeito) | ≤ US$ 1,30 |
| Projeto 2 (EX-1 + EX-3) | ≤ US$ 2,20 |
| **Total** | **≤ US$ 4,30** (alvo de US$ 5; teto de US$ 10) |

Escolher Sonnet e 12 agentes no Projeto 1 pode fazer passar a linha do Projeto 1. O total tem de continuar abaixo de US$ 5, o que se confirma na Fase 6.

### 11.3 Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| A rede ou o proxy da empresa bloqueia o painel | Média | Alto | Teste no `--check` do pré-trabalho; replay como plano B; a caderneta local continua |
| Missões não observáveis por hook | Alta para a M7 (`/btw`) | Médio | Fase 0 antes de tudo; plano B por ficheiros; tirar da grelha o que não se valida |
| Pessoas a gastar para "fazer subir" o painel | Baixa | Médio | Só cobertura e qualidade; cada missão conta uma vez; sem contagens brutas |
| As missões passam dos 15 min | Média | Médio | 2 min rígidos por missão; quem não acaba continua nas esperas; o slide 12 apanha os atrasados |
| As specs ambíguas deixam de falhar | Média | Médio | Critério da Fase 6 (≥ 2 de 3 em cada execução); trocar a lacuna |
| Desconfiança da plateia sobre a telemetria | Média | Alto | Opt-in, `ctl.mjs show`, `PRIVACY.md`, slide 2, expiração automática |
| Erros 429 com 100 pessoas e 12 agentes | Baixa | Alto | Benchmark sem 429 até agora; o 12 é opcional; o `next-wave` já repete |
| Hook de telemetria a atrasar o Claude Code | Baixa | Alto | `"async": true`, sem rede no hook, teste de p95 ≤ 300 ms |
| Windows não testado | Média | Médio | Fora desta entrega (A8); avisar na sala |

### 11.4 O que a sessão do Claude Code nunca faz sem perguntar

- Apagar ou reescrever a Arena, o setup ou o orquestrador.
- Acrescentar dependências npm ao kit do participante (o servidor do painel também não as usa).
- Enviar qualquer dado do participante fora da allowlist, mesmo "só para depurar".
- Mudar o orçamento, a agenda ou o número de missões.
- Publicar uma release ou fazer push para um repositório público.

## 12. Alterações decididas depois (19 out. 2026)

Decisões do Guilherme durante a construção. Prevalecem sobre o texto acima; o detalhe está no `DECISIONS.md`.

| # | Muda | O que fica | Decisão |
|---|---|---|---|
| D-30 | Alojamento do painel (A1) | Cloudflare: Worker + Durable Object (SQLite) para a API e Cloudflare Pages para a página, em `*.workers.dev` e `*.pages.dev`. Nomes técnicos em inglês (`panel/`, `/admin/phase`) | D-30 |
| D-34 | Princípio 2.3.3 ("sem ranking de pessoas") e secção 6.6 (participação opcional e anónima, alcunhas) | **Board de liderança por pessoa**, não por sala (as salas têm 70 e 30 pessoas). Pontos por cobertura e qualidade, nunca por gasto: missão validada 1; swarm acabado 1 por projeto; spec corrigida 1; gate aprovado 2 por projeto; relatório do Projeto 2 1. Desempate: quem chegou primeiro | D-34 |
| D-34 | Secção 6.6 (opt-in, id anónimo) | **Participação obrigatória com registo pelo GitHub, sem nenhum token nem email a sair do portátil.** O setup regista toda a gente logo a seguir ao login do `gh` (passo 6, com o scope `user:email`): o `gh` confirma no portátil um email verificado `@checkmarx.com` (`PANEL_EMAIL_DOMAIN`), e à Worker só vão o nome do GitHub, a sala e um SHA-256 do código do workshop e do id da conta. A Worker responde com uma credencial (assinatura HMAC), que é a única coisa que acompanha os eventos. A Worker confia na verificação do portátil. Quem não tiver email da empresa faz o workshop igual, sem aparecer no board. As alcunhas (A3) deixam de existir | D-34 |
| D-34 | Setup | Comando novo `--cleanup` (`-Cleanup` no Windows): apaga os dados do workshop (projetos de exercício, caderneta, fila e registo do painel, memórias desses projetos) e deixa o projeto do Projeto 2 e as ferramentas | D-34 |
| D-34 | Princípios 2.3.3 e 2.3.8 ("o painel distingue as salas"), secções 3 e 6 (vistas "as duas salas", `?room=`) | **Sem salas.** Um só board e um só painel para toda a gente; todos os ecrãs mostram a mesma página. Os eventos e o registo não levam sala, o setup deixa de perguntar a sala e `?room=` deixa de existir (um endereço antigo com `?room=` mostra o mesmo). Se houver duas salas físicas, seguem o mesmo guião e projetam o mesmo painel | D-34 |
| D-34 | Secção 6.6 (retenção: apagar 7 dias depois) | **Tudo apagado a cada dia.** À meia-noite (`PANEL_TIMEZONE` no `repos.conf`, Europe/Lisbon), o painel apaga os eventos, os nomes, os hashes das contas e o segredo das assinaturas: um alarme do Durable Object e, de reserva, o primeiro pedido do dia novo. As credenciais da véspera deixam de servir; o portátil que as tiver termina o registo e esvazia a fila | D-34 |
