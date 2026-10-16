---
name: task-plan
description: Planeia a tarefa lida pelo /task-intake. O planner (Opus) decompõe-na num grafo de dependências (DAG) e decide o número de agentes conforme o tamanho da tarefa, com justificação. A skill valida o plano, estima o custo e pede aprovação.
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Read
  - Agent
  - mcp__memoria__memoria_procurar
---

# /task-plan — decompor, estimar, aprovar

Argumentos: `$ARGUMENTS`. Com `--auto` não pedes aprovação.

1. Confirma que existe `.workshop/tarefa.md`. Se não existir, diz para correr primeiro `/task-intake <id>`.
2. **Planner (Opus).** Lança **um** subagente `ws-planner` com o prompt: "Planeia a tarefa descrita em .workshop/tarefa.md. Escreve .workshop/plan-proposta.json."
3. **Validar.** Corre `node "{{KIT_DIR}}/orquestrador/validate-plan.mjs" .workshop/plan-proposta.json`.
   - Se aparecer `PLANO INVALIDO`, lança o `ws-planner` **mais uma vez**, com os erros no prompt ("Corrige .workshop/plan-proposta.json. Erros: …"). Depois valida de novo. Se voltar a falhar, mostra os erros e para.
   - O validador acrescenta sozinho a integração (Sonnet) e a revisão (Opus), escreve `.workshop/plan.json` e `.workshop/PLANO.md`, e imprime o plano.
4. **Mostrar** ao utilizador:
   - o diagrama Mermaid, copiado tal como está;
   - a tabela de tarefas;
   - a secção "Porquê este número de agentes";
   - a estimativa de custo;
   - os avisos.
5. **Aprovação** (sem `--auto`): pergunta "Aprovas este plano? Responde *sim*, *ajusta: <o quê>* ou *não*."
   - Com "ajusta", relança o `ws-planner` com o pedido e volta ao passo 3.
   - Com "sim", termina com: "Plano aprovado. Para executar: `/task-swarm`."
   - Com "não", para.

Não comeces a implementar nada nesta skill.
