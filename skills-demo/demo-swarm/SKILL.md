---
name: demo-swarm
description: Executa o enxame da Arena de Segurança em ondas paralelas, respeitando as dependências do plan.json. Cada lote mostra uma tabela com agente, modelo, tarefa, estado, tempo e custo.
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
  - Agent
---

# /demo-swarm — executar o enxame

**Comandos:** corre cada comando exatamente como está escrito, sozinho. Não lhe juntes `;`, `&&`, `|`, `echo` nem `ls`, porque as permissões só aceitam o comando tal como está. Os scripts já mostram o resultado e o estado.

Argumentos: `$ARGUMENTS`. Com `--auto` não fazes perguntas, porque é o modo do benchmark.

Quem decide o grafo é o script, não tu. O teu trabalho é lançar exatamente o que ele pede.

**Ciclo** (repete até aparecer `ESTADO: FIM` ou `ESTADO: BLOQUEADO`):

1. Corre `node tools/workshop/orquestrador/next-wave.mjs`. Se aparecer `ERRO: Plano nao encontrado`, diz para correr `/demo-plan` e para.
2. Mostra ao participante a tabela "Resultado do lote anterior" (se existir) e a linha `Progresso`, tal como vieram.
3. Se aparecer `ESTADO: LOTE`, lê o JSON entre `<<<CHAMADAS` e `CHAMADAS>>>`. Numa **única mensagem**, faz uma chamada à ferramenta `Agent` por cada objeto, com `subagent_type`, `description` e `prompt` **exatamente** como estão.
   - Não alteres os prompts.
   - Não juntes nem separes chamadas.
   - Não leias os ficheiros dos agentes.
4. Quando todos os agentes do lote responderem, volta ao passo 1. Não resumas as respostas deles.

**No fim**, mostra a última tabela e a linha `ESTADO: FIM`. Sem `--auto`, sugere:
- abrir `http://localhost:3000/estado` (com `node server.js`) para ver a grelha;
- `/demo-review` para o gate final;
- `/demo-cost` para o relatório de custo.

Com `--auto`, termina só com `ENXAME OK`.

Enquanto o enxame corre, o participante pode usar `/btw <pergunta>` sem interromper nada.
