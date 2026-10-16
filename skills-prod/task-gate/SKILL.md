---
name: task-gate
description: Gate de produção. Corre os testes do projeto, procura segredos e código perigoso nas alterações, assinala dependências alteradas e pede a revisão de segurança e qualidade ao revisor (Opus). Só passa código pronto para produção.
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Read
  - Agent
---

# /task-gate — está pronto para produção?

Argumentos: `$ARGUMENTS`.

1. Lê `.workshop/plan.json` (campo `config.teste_global`) e `.workshop/base.json` (campo `base`). Se não houver `teste_global`, corre `node "{{KIT_DIR}}/orquestrador/explorar.mjs"` e usa o primeiro comando de teste provável. Se não houver nenhum, pergunta ao utilizador qual é o comando (sem `--auto`).
2. Se ainda não existir `.workshop/veredito.json`:
   - corre `node "{{KIT_DIR}}/orquestrador/digest.mjs" --base <base>`;
   - lança **um** subagente `ws-reviewer` com o prompt "Revê as alterações desta tarefa para produção. Lê .workshop/revisao-resumo.md e .workshop/tarefa.md. Escreve .workshop/veredito.json.".
3. Corre `node "{{KIT_DIR}}/orquestrador/gate.mjs" --base <base> --teste "<comando de teste>"`.
4. Mostra a tabela tal como veio. Se houver problemas do revisor, lista-os com gravidade, ficheiro e correção.
5. Se aparecer `GATE: REPROVADO`:
   - diz o que bloqueia, em linguagem simples;
   - sugere `/loop 3m corre <comando de teste>; se falhar, corrige a primeira falha; quando passar, corre /task-gate e para`;
   - não corrijas nada sem o utilizador pedir.
6. Se aparecer `GATE: APROVADO`, termina com: "Pronto para produção. Próximo passo: `/task-report`."
