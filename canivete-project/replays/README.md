# Repetições do `/status`

Uma repetição reconstrói uma execução do swarm no `/status` sem chamar a API: útil para ensaiar, para mostrar num projetor sem rede ou para comparar execuções. O formato é o mesmo da Arena de Segurança.

```
node server.js
http://localhost:3000/status?replay=example
```

(Se a porta 3000 estiver ocupada, o servidor usa a seguinte e mostra o endereço certo.)

Cada repetição é uma pasta `replays/<name>/` (nome com letras minúsculas, números e hífens) com dois ficheiros.

| Ficheiro | O que é |
|---|---|
| `events.jsonl` | Os eventos da execução, um JSON por linha, pela ordem em que aconteceram. É o `.workshop/events.jsonl` que o orquestrador e os hooks escrevem. |
| `snapshot.json` | A fotografia final (a mesma que `/api/status` devolve). Dá a lista e a ordem das tarefas, os títulos, o resultado de cada teste e o custo total real. |

`example/` é **sintética**: as 30 ferramentas com 8 em paralelo em Haiku, as 3 partidas de propósito (`tx-02`, `nm-03` e `dn-01`) a falhar de vez, e depois a pesquisa, a integração e a revisão. O `snapshot.json` dela tem `"synthetic": true`. É gerada por `tools/dev/make-canivete-replay.mjs`, no repositório do kit.

## Eventos (`events.jsonl`)

| `type` | Campos | Quem o escreve |
|---|---|---|
| `start` | `ts`, `mode`, `total` | `next-wave.mjs`, no primeiro lote |
| `state` | `ts`, `task`, `state` (`working`, `green`, `red`, `failed`), `attempt`, `agent`, `model` | `next-wave.mjs` (ao lançar) e `grade.mjs` (ao avaliar) |
| `cost` | `ts`, `task`, `attempt`, `agent`, `model`, `cost_usd`, `duration_s` | hook `SubagentStop` |
| `end` | `ts` | `next-wave.mjs`, quando não há mais nada a fazer |

Linhas que não sejam JSON válido são ignoradas. Um evento `cost` com `task: null` conta como custo da sessão principal. No evento `end`, se o custo somado for menor do que `snapshot.cost.total`, a diferença entra como sessão principal, para o número final ser o real.

## Gravar uma execução real

No fim de um `/demo-swarm`, com o servidor ligado:

```
mkdir -p replays/<name>
cp .workshop/events.jsonl replays/<name>/events.jsonl
curl -s http://localhost:3000/api/status > replays/<name>/snapshot.json
```

(Se o servidor mostrou outra porta, usa-a no `curl`.) Abre `/status?replay=<name>` para confirmar.
