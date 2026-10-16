---
name: demo-reset
description: Repõe a Arena de Segurança no estado inicial para repetir o exercício (os cartões construídos são apagados; o histórico de custos fica guardado em .workshop/historico/).
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
---

# /demo-reset — recomeçar

**Comandos:** corre cada comando exatamente como está escrito, sozinho. Não lhe juntes `;`, `&&`, `|`, `echo` nem `ls`, porque as permissões só aceitam o comando tal como está. Os scripts já mostram o resultado e o estado.

Argumentos: `$ARGUMENTS`.

1. Sem `--auto`, pergunta primeiro: "Isto apaga os cartões construídos e o plano atual. O histórico de custos fica em `.workshop/historico/`. Continuo?" Espera por um sim claro.
2. Corre `node tools/reset.mjs`.
3. Mostra o que o script fez em 2 ou 3 linhas e termina com: "Pronto. Para recomeçar: `/demo-plan`."

Nunca uses `git` diretamente para isto: o script confirma que estás mesmo na Arena antes de apagar alguma coisa.
