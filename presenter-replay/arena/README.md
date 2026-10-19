# Arena de Segurança

Um jogo de desafios curtos sobre segurança. É o projeto demo do workshop Claude Code: um swarm de agentes Claude constrói os cartões e as páginas, cada um com o seu teste.

## Correr

Precisas do Node 22 ou mais recente. Não há dependências para instalar.

```
node server.js            # mostra o endereço: normalmente http://localhost:3000 (se a porta estiver ocupada, usa a seguinte)
node server.js --port 4000
node --test               # todos os testes
```

O servidor só aceita ligações deste computador (127.0.0.1).

| Endereço | O que é |
|---|---|
| `/` | A galeria: categorias, cartões, pontuação e o botão "Correr testes" (corre os `card.test.js` no browser) |
| `/#/card/<id>` | Jogar um cartão |
| `/#/category/<id>` e `/#/score` | Páginas feitas pelo swarm na onda 2 |
| `/status` | O estado do swarm ao vivo, um quadrado por tarefa (tema escuro, para o projetor) |
| `/status?replay=example` | Uma execução gravada, repetida sem chamar a API |

## Onde está cada coisa

| Pasta ou ficheiro | Conteúdo |
|---|---|
| `specs/cards.json` | Os cartões e as categorias. `node tools/gen.mjs` gera daqui as specs, os testes e o `TASKS.md` |
| `specs/my-card.example.json` | O exemplo do teu cartão (ver "As tuas decisões") |
| `cards/<id>/` | `spec.md` e `card.test.js` já vêm prontos; o `card.js` é escrito por um agente (ver `cards/CONTRACT.md`) |
| `templates/` | Os 4 modelos de cartão: choice (escolha), spot-the-flaw (encontra o erro), order (ordenar) e answer (resposta) |
| `lib/` | Testes que correm no Node e no browser (`testkit.js`, `fakedom.js`), verificações de segurança (`security.js`), os textos (`texts.js`) e o `hash.js` (onda 1) |
| `pages/` | Página de categoria e tabela de pontuação (onda 2); os testes já vêm prontos |
| `public/` | A app: `app.js` (galeria), `status.js` (`/status`), `styles.css` (tokens do `DESIGN.md`) e a fonte |
| `server.js` | O servidor, sem dependências e com CSP estrita |
| `test/app.test.js` | Testes de segurança da app: cabeçalhos, caminhos recusados e fonte sem padrões perigosos |
| `replays/` | Repetições para o `/status` (formato em `replays/README.md`) |
| `specs/tasks.json` e `specs/*.md` | As tarefas de suporte: `lib-hash`, `category-page`, `score-table`, `integration` e `review` |
| `tools/` | `gen.mjs` (e `my-card.mjs`), `plan.mjs` (plano do swarm), `check-integration.mjs`, `review-digest.mjs`, `reset.mjs` e `routine.mjs` |
| `DESIGN.md` | O sistema de design, numa página |

## O swarm

No Claude Code, dentro desta pasta:

1. `/demo-plan` gera o plano (`plan.json` e `PLAN.md`) e a estimativa de custo.
2. `/demo-swarm` corre as ondas:
   - onda 1: os cartões e o `lib/hash.js`;
   - onda 2: as páginas;
   - onda 3: a integração;
   - onda 4: a revisão.
3. `/demo-reset` volta ao início com `node tools/reset.mjs`. O histórico de cada execução fica em `.workshop/history/`.

Os resultados de cada tarefa ficam em `.workshop/status/` e os custos em `.workshop/usage.jsonl`. O `/status` lê os dois.

## As tuas decisões

- **O teu cartão.** Copia o exemplo e muda-o: título, conceito, enunciado, `template` (`spot-the-flaw`, `choice`, `order` ou `answer`) e os campos desse template (`category` é opcional; sem ela, `secure-code`).
  ```
  cp specs/my-card.example.json specs/my-card.json          # Windows: Copy-Item specs\my-card.example.json specs\my-card.json
  node tools/gen.mjs
  ```
  O `gen.mjs` diz que campo está mal e dá um exemplo. Gera o cartão `my-01`, que entra no plano (101 cartões), na galeria e no `/status`, e o swarm constrói-o em Haiku. Sem `specs/my-card.json` nada muda.
- **Os cartões partidos de propósito.** A `spec.md` de quatro cartões não tem um detalhe que o teste verifica, e nenhum agente pode mudar uma spec. Quando um ficar vermelho, pergunta porque falhou: a mensagem do teste diz que linha falta. Acrescenta-a a `cards/<id>/spec.md` e corre só esse cartão outra vez: `/demo-swarm --retry <id>` (ou `node tools/workshop/orchestrator/next-wave.mjs --retry <id>`).
- **O custo da criptografia.** O `lib-hash` e os cartões que dependem dele vão para Sonnet por defeito. `/demo-plan --crypto haiku` (ou `node tools/plan.mjs --crypto haiku`) deixa-os em Haiku, mais barato; `--crypto sonnet` volta ao Sonnet.
