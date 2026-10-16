---
name: memoria
description: Grava na app de memória as lições, o que fazer, o que não fazer e o histórico da tarefa atual (extração com Haiku, custo desprezível). Usa no fim de uma tarefa ou quando quiseres guardar uma lição.
argument-hint: "[nota livre opcional]"
model: sonnet
allowed-tools:
  - Bash(node *)
  - Read
  - Agent
---

# /memoria — guardar o que se aprendeu

Argumentos: `$ARGUMENTS` (opcional: uma nota livre do utilizador a guardar também).

1. Descobre o projeto: é o nome da pasta atual. Se existir `.workshop/plan.json` ou `plan.json` com o campo `projeto`, usa esse.
2. Prepara o resumo:
   - **Na Arena** (existe `tools/workshop/orquestrador/report.mjs`): corre `node tools/workshop/orquestrador/report.mjs > /dev/null`.
   - **Noutro projeto com `.workshop/`:** corre `node "{{KIT_DIR}}/orquestrador/report.mjs" > /dev/null`.
   - Se nenhum dos dois existir, escreve tu um `.workshop/memoria-resumo.md` curto, com o que foi feito nesta conversa: tarefa, ficheiros tocados, o que correu bem e o que correu mal.
3. Lança **um** subagente `memoria-extrator`. O prompt é: "Lê .workshop/memoria-resumo.md. Projeto: <projeto>." e, se o utilizador deu uma nota, acrescenta "Nota do utilizador a guardar como lição: <nota>".
4. Mostra a lista que ele devolver: tipo e título de cada memória gravada, numa tabela curta. Se a app de memória não estiver instalada, diz isso e onde ficou o resumo (`.workshop/memoria-resumo.md`).
