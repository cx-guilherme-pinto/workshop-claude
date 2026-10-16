---
name: task-report
description: Fecha a tarefa. No Jira publica um comentário por subtarefa (agente, modelo, duração, custo), o registo de horas e um resumo total; no GitHub abre o PR com gh pr create e o mesmo resumo. Pede SEMPRE confirmação antes de qualquer escrita. No fim grava as memórias da tarefa.
argument-hint: "[jira|github|ambos]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Bash(git status*)
  - Bash(git branch*)
  - Bash(git rev-parse *)
  - Read
  - Agent
---

# /task-report — reportar e lembrar

Argumento: `$ARGUMENTS` (destino; por defeito o da fonte da tarefa).

**Regra:** nada é escrito no Jira ou no GitHub sem um "sim" claro do utilizador **para essa escrita**. Se a resposta for ambígua, não publiques.

1. Corre `node "{{KIT_DIR}}/orquestrador/publicar-texto.mjs"`. Prepara, sem publicar, `.workshop/publicar.json` e `.workshop/pr-body.md`.
2. Lê `.workshop/publicar.json` e mostra ao utilizador **exatamente** o que vai ser publicado:
   - os comentários, um por subtarefa, cada um com agente, modelo, duração e custo;
   - o resumo total;
   - o registo de horas (`tempo_jira`);
   - o título do PR.
3. **Jira** (fonte `jira`, ou destino `jira`/`ambos`):
   - Pergunta: "Publico N comentários, o resumo e um registo de <tempo> na issue <alvo>? (sim/não)".
   - Com sim:
     - um comentário por subtarefa com `addOrEditJiraIssueComment`, usando o `cloudId` de `.workshop/tarefa.json`; se a subtarefa tiver `alvo` próprio, o comentário vai para essa subtarefa do Jira;
     - um comentário com o resumo;
     - o registo de horas com `addOrEditJiraIssueWorklog` (`timeSpent` = `tempo_jira`). Se esta ferramenta não aparecer diretamente, usa a ferramenta `discover` do servidor atlassian para a encontrar e depois `executeWrite`.
   - Mostra o que foi publicado, com links.
4. **GitHub** (fonte `github`, ou destino `github`/`ambos`):
   - Verifica o branch com `git rev-parse --abbrev-ref HEAD`. Se estiver em `main`/`master`, propõe criar um branch e espera pela resposta.
   - Pergunta: "Faço push do branch <b> e abro o PR '<título>'? (sim/não)".
   - Com sim, corre num terminal, pedindo aprovação a cada comando: `git push -u origin <b>` e `gh pr create --title "<título>" --body-file .workshop/pr-body.md`. Mostra o URL do PR.
5. **Memória.** Lança **um** subagente `memoria-extrator` com o prompt "Lê .workshop/memoria-resumo.md. Projeto: <nome do repositório>." e mostra a lista do que foi gravado.
6. Termina com um resumo de uma linha: o que foi publicado, onde e quanto custou a tarefa.
