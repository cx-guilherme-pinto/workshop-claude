# Arena de Segurança

Um jogo de desafios curtos sobre segurança. É o projeto demo do workshop Claude Code: um enxame de agentes Claude constrói os cartões e as páginas, cada um com o seu teste.

## Correr

Precisas do Node 22 ou mais recente. Não há dependências para instalar.

```
node server.js            # http://localhost:3000 (se a porta estiver ocupada, usa a seguinte)
node server.js --porta 4000
node --test               # todos os testes
```

O servidor só aceita ligações deste computador (127.0.0.1).

| Endereço | O que é |
|---|---|
| `/` | A galeria: categorias, cartões, pontuação e o botão "Correr testes" (corre os `card.test.js` no browser) |
| `/#/cartao/<id>` | Jogar um cartão |
| `/#/categoria/<id>` e `/#/pontuacao` | Páginas feitas pelo enxame na onda 2 |
| `/estado` | O estado do enxame ao vivo, um quadrado por tarefa (tema escuro, para o projetor) |
| `/estado?replay=exemplo` | Uma execução gravada, repetida sem chamar a API |

## Onde está cada coisa

| Pasta ou ficheiro | Conteúdo |
|---|---|
| `specs/cards.json` | Os cartões e as categorias. `node tools/gen.mjs` gera daqui as specs, os testes e o `TASKS.md` |
| `cards/<id>/` | `spec.md` e `card.test.js` já vêm prontos; o `card.js` é escrito por um agente (ver `cards/CONTRACT.md`) |
| `templates/` | Os 4 modelos de cartão: escolha, clica-erro, ordenar, resposta |
| `lib/` | Testes que correm no Node e no browser (`testkit.js`, `fakedom.js`), verificações de segurança (`seguranca.js`) e o `hash.js` (onda 1) |
| `pages/` | Página de categoria e tabela de pontuação (onda 2); os testes já vêm prontos |
| `public/` | A app: `app.js` (galeria), `estado.js` (`/estado`), `styles.css` (tokens do `DESIGN.md`) e a fonte |
| `server.js` | O servidor, sem dependências e com CSP estrita |
| `test/app.test.js` | Testes de segurança da app: cabeçalhos, caminhos recusados e fonte sem padrões perigosos |
| `replays/` | Repetições para o `/estado` (formato em `replays/README.md`) |
| `specs/*.md` | As tarefas de suporte: `lib-hash`, `pagina-categoria`, `tabela-pontuacao`, `integracao` e `revisao` |
| `tools/` | `gen.mjs`, `plan.mjs` (plano do enxame), `check-integracao.mjs`, `review-digest.mjs` e `reset.mjs` |
| `DESIGN.md` | O sistema de design, numa página |

## O enxame

No Claude Code, dentro desta pasta:

1. `/demo-plan` gera o plano (`plan.json` e `PLANO.md`) e a estimativa de custo.
2. `/demo-swarm` corre as ondas:
   - onda 1: os cartões e o `lib/hash.js`;
   - onda 2: as páginas;
   - onda 3: a integração;
   - onda 4: a revisão.
3. `/demo-reset` volta ao início com `node tools/reset.mjs`. O histórico de cada execução fica em `.workshop/historico/`.

Os resultados de cada tarefa ficam em `.workshop/status/` e os custos em `.workshop/usage.jsonl`. O `/estado` lê os dois.
