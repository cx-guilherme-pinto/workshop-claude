---
name: demo-review
description: Gate final da Arena de Segurança — testes, verificações estáticas (sem eval, sem innerHTML, CSP no servidor), procura de segredos e o veredito de segurança do revisor (Opus).
argument-hint: "[--auto]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node tools/*)
  - Bash(node --test *)
  - Read
  - Agent
---

# /demo-review — gate final

Argumentos: `$ARGUMENTS`. Com `--auto` não fazes perguntas.

1. Corre `node tools/workshop/orquestrador/gate.mjs --teste "node tools/check-integracao.mjs" --base arena-inicial`. O script não faz perguntas e verifica:
   - os testes de todos os cartões e da própria app (CSP, cabeçalhos, sem caminhos fora do projeto);
   - segredos nos ficheiros alterados;
   - padrões perigosos (`eval`, `innerHTML`…);
   - o veredito do revisor.
2. Se ainda não existir `.workshop/veredito.json` (por exemplo, se a onda 4 não correu):
   - corre `node tools/review-digest.mjs`;
   - lança **um** subagente `reviewer` com o prompt "Revê a Arena. Segue specs/revisao.md. Lê .workshop/revisao-resumo.md.";
   - volta a correr o gate.
3. Mostra a tabela do gate tal como veio. Depois, em 3 a 5 linhas, explica ao participante o que cada verificação protege, ligando-a ao OWASP Top 10:
   - injeção (A03);
   - XSS e CSP (A03/A05);
   - segredos (A02/A07);
   - dependências (A06).
4. Se o veredito tiver problemas, lista-os com gravidade, ficheiro e correção sugerida. Não corrijas nada sozinho. Sem `--auto`, sugere `/loop 2m corre node tools/check-integracao.mjs e corrige o primeiro teste vermelho com o implementer; para quando estiver tudo verde`.
5. Termina com `GATE: APROVADO` ou `GATE: REPROVADO`, como o script disse.

Um jogo de segurança com falhas de segurança seria o pior exemplo possível. Por isso este gate é obrigatório antes de jogar.
