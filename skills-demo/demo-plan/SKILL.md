---
name: demo-plan
description: Planeia o enxame da Arena de Segurança. Lê TASKS.md, gera o grafo de dependências (plan.json + PLANO.md com diagrama Mermaid), mostra as ondas e a estimativa de custo. Primeiro passo do Projeto 1 do workshop.
argument-hint: "[--modo participante|apresentador] [--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
  - Read
  - Agent
  - mcp__memoria__memoria_procurar
---

# /demo-plan — planear o enxame

**Comandos:** corre cada comando exatamente como está escrito, sozinho. Não lhe juntes `;`, `&&`, `|`, `echo` nem `ls`, porque as permissões só aceitam o comando tal como está. Os scripts já mostram o resultado e o estado.

Argumentos: `$ARGUMENTS`. Com `--auto` não fazes perguntas, porque é o modo do benchmark. Por defeito o modo é `participante`.

Faz estes passos por ordem, sem explorar o projeto além do que é pedido:

1. **Memória.** Se a ferramenta `memoria_procurar` existir, chama-a com `texto: "arena enxame"` e `projeto: "arena-de-seguranca"`. Guarda as lições (até 5, uma linha cada). Se não existir, diz numa linha que a app de memória não está instalada e continua.
2. **Gerar o grafo.** Corre `node tools/plan.mjs --modo <modo>`. O DAG vem das specs e é determinístico.
3. **Planner (Opus).** Lança **um** subagente `planner` com este prompt:
   > Revê o plano da Arena. Lê .workshop/plano-resumo.md. Lições da memória: <as lições, ou "nenhuma">. Escreve .workshop/planner.json.
4. **Aplicar.** Corre `node tools/plan.mjs --aplicar .workshop/planner.json`.
5. **Mostrar** ao participante, de forma compacta:
   - a tabela das 4 ondas;
   - o bloco Mermaid de `PLANO.md`, copiado tal como está;
   - a tabela da estimativa de custo, com o alvo de US$ 5 e o teto de US$ 10;
   - os ajustes do planner, numa ou duas linhas.
6. Sem `--auto`, termina com: "Plano pronto. Para executar: `/demo-swarm`". Com `--auto`, termina só com `PLANO OK`.

Não leias `TASKS.md` inteiro: o `plan.mjs` já o resume.
