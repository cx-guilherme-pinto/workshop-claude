---
name: demo-cost
description: Relatório final de custo e tempo do enxame da Arena, por agente, modelo e onda (dados reais medidos pelos hooks). No fim grava na app de memória as lições, o que fazer, o que não fazer e o histórico da sessão.
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
  - Read
  - Agent
---

# /demo-cost — quanto custou e quanto demorou

**Comandos:** corre cada comando exatamente como está escrito, sozinho. Não lhe juntes `;`, `&&`, `|`, `echo` nem `ls`, porque as permissões só aceitam o comando tal como está. Os scripts já mostram o resultado e o estado.

Argumentos: `$ARGUMENTS`. Com `--auto` não fazes perguntas.

1. Corre `node tools/workshop/orquestrador/report.mjs`. O script escreve `.workshop/relatorio.md` e `.workshop/memoria-resumo.md`.
2. Mostra ao participante, sem reescrever os números:
   - a linha de resultado, a duração e o custo total (com o alvo de US$ 5 e o teto de US$ 10);
   - as tabelas "Por modelo" e "Por onda";
   - a tabela "Por agente", inteira se tiver até 20 linhas, senão só as 10 mais caras.
3. Em 2 ou 3 frases, explica o que os números mostram: quanto pesou cada modelo, o custo de um agente Haiku comparado com o orquestrador, e onde se podia poupar.
   Nota: o `/usage` do Claude Code pode mostrar um valor mais alto, porque algumas versões ainda não conhecem os preços dos modelos mais recentes. O número deste relatório usa os tokens reais e a tabela de preços publicada. A fatura oficial é a da Console.
4. **Memória.** Lança **um** subagente `memoria-extrator` com o prompt:
   > Lê .workshop/memoria-resumo.md. Projeto: arena-de-seguranca. Extrai e grava as memórias desta sessão do workshop.
   Depois mostra a lista que ele devolver: tipo e título de cada memória gravada. Se ele disser que a app de memória não está instalada, diz isso numa linha e continua.
5. Sem `--auto`, termina com:
   - "Abre a app **Memória** para ver o teu primeiro grafo."
   - "Para jogar: `node server.js` e abre http://localhost:3000."

Com `--auto`, termina só com `CUSTO OK`.
