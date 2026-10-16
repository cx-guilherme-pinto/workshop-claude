---
name: task-swarm
description: Executa o plano aprovado (.workshop/plan.json) com subagentes em paralelo, por ondas, respeitando as dependências. Nunca põe no mesmo lote duas tarefas que mexam nos mesmos ficheiros (ou isola-as em git worktrees). Pode ser parado e retomado.
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Agent
---

# /task-swarm — executar o enxame

**Comandos:** corre cada comando exatamente como está escrito, sozinho. Não lhe juntes `;`, `&&`, `|`, `echo` nem `ls`, porque as permissões só aceitam o comando tal como está. Os scripts já mostram o resultado e o estado.

Argumentos: `$ARGUMENTS`. Com `--auto` não fazes perguntas.

Quem decide o grafo e os lotes é o script. O teu trabalho é lançar exatamente o que ele pede.

**Ciclo** (repete até aparecer `ESTADO: FIM` ou `ESTADO: BLOQUEADO`):

1. Corre `node "{{KIT_DIR}}/orquestrador/next-wave.mjs" --plano .workshop/plan.json`. Se aparecer `ERRO: Plano nao encontrado`, diz para correr `/task-plan` e para.
2. Mostra a tabela "Resultado do lote anterior" (se existir) e a linha `Progresso`.
3. Se aparecer `ESTADO: LOTE`, lê o JSON entre `<<<CHAMADAS` e `CHAMADAS>>>`. Numa **única mensagem**, faz uma chamada à ferramenta `Agent` por cada objeto, com `subagent_type`, `description`, `prompt` e, se existir, `isolation`, **exatamente** como estão.
4. Quando todos responderem, volta ao passo 1. Não resumas as respostas deles.

**Se aparecer `ESTADO: BLOQUEADO`**, mostra que tarefas falharam (a tabela tem o excerto do teste) e sugere:
- corrigir à mão, ou
- `/loop 3m corre os testes do projeto e, se houver uma falha, lança o ws-implementer para a primeira; para quando estiver tudo verde`.

**No fim** mostra a última tabela e sugere `/task-gate`.

Dicas para o utilizador:
- O estado fica em `.workshop/`. Se parares (Esc), voltar a correr `/task-swarm` retoma onde ficou.
- Para ver o enxame ao vivo noutro terminal: `node "{{KIT_DIR}}/orquestrador/painel.mjs"`.
- `/btw <pergunta>` faz uma pergunta sem interromper o enxame.
