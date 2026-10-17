# Tarefa `integration` — juntar tudo e pôr a suite verde

As ondas 1 e 2 já terminaram: os cartões (`cards/*/card.js`), o `lib/hash.js` e as duas páginas (`pages/category.js`, `pages/score.js`). Cada um passou no seu teste, isolado. O teu trabalho é garantir que **juntos** também passam, incluindo os testes da app (`test/app.test.js`: cabeçalhos do servidor, caminhos recusados e fonte sem padrões perigosos).

Alguns cartões podem ter falhado de vez, depois de 3 tentativas. O orquestrador já desistiu deles: **não os refazes**.

## Verificação

```
node tools/check-integration.mjs
```

Corre `node --test` em todos os testes do projeto, exceto os das tarefas de cartão (ou de lib) que `.workshop/status/<id>.json` marca como falhadas de vez. Sai com 0 só se tudo passar. Com `--list`, só mostra os ficheiros que entram e os que ficam de fora.

## Passos

1. Corre a verificação. Se sair com 0, salta para o passo 5.
2. Para cada ficheiro vermelho, lê **só a primeira falha** e o ficheiro que ela aponta.
3. Corrige, mexendo **só** em `public/`, `pages/` e `test/`. Causas habituais:
   - uma página não segue a spec dela (`specs/category-page.md` ou `specs/score-table.md`): nome do export, classes, atributos `data-*`, texto exato;
   - `test/app.test.js` encontra `innerHTML`, `eval` ou parecido numa página: troca por `h()` de `../templates/common.js`;
   - `public/app.js` passa à página parâmetros com outro nome ou outra forma que a spec diz.
4. Volta ao passo 1. No máximo 5 voltas.
5. Escreve `.workshop/integration.md` (formato abaixo) e termina.

## O que não podes mudar

`cards/**`, `templates/**`, `lib/**`, `specs/**`, `server.js` e `tools/**`. Se a causa estiver aí, não a contornes (nem apagando nem enfraquecendo testes): descreve-a em `.workshop/integration.md`, na secção "Por resolver", e termina com `FAILED integration: <motivo>`.

Também não podes:
- apagar testes;
- marcar testes como `skip` ou `todo`;
- baixar o que um teste exige.

## `.workshop/integration.md`

No máximo 25 linhas, em português de Portugal, com este formato:

```markdown
# Integração

- Resultado: verde
- Comando: node tools/check-integration.mjs
- Testes: 96 passam, 0 falham, em 14 ficheiros
- De fora (falharam de vez no swarm): re-01

## Correções

- pages/score.js: o total somava cartões de categorias fora da lista; agora soma as linhas.

## Por resolver

- Nada.
```

- Uma linha por correção: ficheiro, problema e o que mudou.
- Se não corrigiste nada, escreve "Nenhuma: a suite já estava verde."
- Os números vêm das linhas `pass` e `fail` no fim da saída do `node --test`.

## Feito quando

`node tools/check-integration.mjs` sai com 0 e `.workshop/integration.md` existe.
