# Tarefa `integration` — juntar tudo e pôr a suite verde

As ondas 1 e 2 já terminaram: as ferramentas (`tools/*/tool.js`) e a pesquisa (`pages/catalog.js`). Cada uma passou no seu teste, isolada. O teu trabalho é garantir que **juntas** também passam, incluindo os testes da app (`test/app.test.js`: cabeçalhos do servidor, caminhos recusados, `/api/tools` e fonte sem padrões perigosos).

Algumas ferramentas podem ter falhado de vez, depois de 3 tentativas. O orquestrador já desistiu delas: **não as refazes**.

## Verificação

```
node tools/check-integration.mjs
```

Corre `node --test` em todos os testes do projeto, exceto os das ferramentas que `.workshop/status/<id>.json` marca como falhadas de vez e os das ferramentas fora do plano. Sai com 0 só se tudo passar. Com `--list`, só mostra os ficheiros que entram e os que ficam de fora.

## Passos

1. Corre a verificação. Se sair com 0, salta para o passo 5.
2. Para cada ficheiro vermelho, lê **só a primeira falha** e o ficheiro que ela aponta.
3. Corrige, mexendo **só** em `public/` e `pages/`. Causas habituais:
   - `pages/catalog.js` não segue `specs/index-page.md`: o nome de um export, a forma dos grupos (`id`, `name`, `tools`, `built`), o grupo `other` ou uma lista recebida que é alterada;
   - `test/app.test.js` encontra `innerHTML`, `eval` ou parecido em `public/` ou `pages/`: troca por `el()` de `public/dom.js` (na casca) ou tira-o (a página é pura);
   - `public/app.js` chama `pages/catalog.js` com outros parâmetros ou outra forma que a spec diz.
4. Volta ao passo 1. No máximo 5 voltas.
5. Escreve `.workshop/integration.md` (formato abaixo) e termina.

## O que não podes mudar

`tools/**` (as ferramentas, as specs, os testes e os scripts), `templates/**`, `lib/**`, `specs/**`, `test/**` e `server.js`. Se a causa estiver aí, não a contornes (nem apagando nem enfraquecendo testes): descreve-a em `.workshop/integration.md`, na secção "Por resolver", e termina com `FAILED integration: <motivo>`.

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
- Testes: 212 passam, 0 falham, em 33 ficheiros
- De fora (falharam de vez no swarm): nm-03

## Correções

- pages/catalog.js: search() ordenava a lista recebida com sort(); agora filtra uma cópia.

## Por resolver

- Nada.
```

- Uma linha por correção: ficheiro, problema e o que mudou.
- Se não corrigiste nada, escreve "Nenhuma: a suite já estava verde."
- Os números vêm das linhas `pass` e `fail` no fim da saída do `node --test`.

## Feito quando

`node tools/check-integration.mjs` sai com 0 e `.workshop/integration.md` existe.
