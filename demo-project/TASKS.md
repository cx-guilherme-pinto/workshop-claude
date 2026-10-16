# TASKS — Arena de Segurança

Cada tarefa é feita por um agente. **Este ficheiro é gerado** por `node tools/gen.mjs` a partir de `specs/cards.json` e `specs/tarefas.json`.

- Modo participante: **3 cartões** + utilitário + 2 páginas + integração + revisão.
- Modo apresentador: **3 cartões** + as mesmas tarefas.

## Tarefas de suporte

| id | onda | o quê | spec | depende de |
| --- | --- | --- | --- | --- |
| lib-hash | 1 | Utilitário de criptografia lib/hash.js | `specs/lib-hash.md` | — |
| pagina-categoria | 2 | Página de categoria | `specs/pagina-categoria.md` | *cartoes |
| tabela-pontuacao | 2 | Tabela de pontuação | `specs/tabela-pontuacao.md` | *cartoes |
| integracao | 3 | Integração e suite completa | `specs/integracao.md` | pagina-categoria, tabela-pontuacao |
| revisao | 4 | Revisão de segurança e qualidade | `specs/revisao.md` | integracao |

## Passwords

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| pw-01 | participante | escolha | Qual é a password mais forte? | O comprimento e a imprevisibilidade pesam mais do que trocar letras por símbolos. | — |

## Web (XSS, SQLi, CSRF)

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| web-01 | participante | clica-erro | Encontra a injeção SQL | Juntar texto do utilizador a uma consulta SQL deixa o atacante reescrever a consulta. | — |

## Criptografia básica

| id | modo | modelo | título | conceito | depende de |
| --- | --- | --- | --- | --- | --- |
| cr-01 | participante | resposta | Decifra a mensagem de César | A cifra de César troca cada letra por outra a uma distância fixa. Com só 25 chaves, parte-se em segundos. | lib-hash |
