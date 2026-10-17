# Repetições do `/status`

Uma repetição reconstrói uma execução do swarm no `/status` sem chamar a API: útil para ensaiar, para mostrar num projetor sem rede ou para comparar execuções.

```
node server.js
http://localhost:3000/status?replay=example
```

Cada repetição é uma pasta `replays/<name>/` (nome com letras minúsculas, números e hífens) com dois ficheiros.

| Ficheiro | O que é |
|---|---|
| `events.jsonl` | Os eventos da execução, um JSON por linha, pela ordem em que aconteceram. É o `.workshop/events.jsonl` que o orquestrador e os hooks escrevem. |
| `snapshot.json` | A fotografia final (a mesma que `/api/status` devolve). Dá a lista e a ordem das tarefas, os títulos, o resultado de cada teste e o custo total real. |

`example/` é **sintética**: 15 tarefas em cerca de 20 minutos, para testar o modo repetição antes de haver uma gravação real. O `snapshot.json` dela tem `"synthetic": true`. `/status?replay=recording` abre a gravação do apresentador; os nomes antigos (`?replay=exemplo`, `?replay=gravacao`) continuam a funcionar.

O servidor envia os dois ficheiros à página no formato abaixo. As gravações feitas por um kit mais antigo, com chaves em português (`tipo`, `tarefa`, `estado: "verde"`…), também se leem.

## Eventos (`events.jsonl`)

| `type` | Campos | Quem o escreve |
|---|---|---|
| `start` | `ts`, `mode`, `total` | `next-wave.mjs`, no primeiro lote |
| `state` | `ts`, `task`, `state` (`working`, `green`, `red`, `failed`), `attempt`, `agent`, `model` | `next-wave.mjs` (ao lançar) e `grade.mjs` (ao avaliar) |
| `cost` | `ts`, `task`, `attempt`, `agent`, `model`, `cost_usd`, `duration_s` | hook `SubagentStop` |
| `end` | `ts` | `next-wave.mjs`, quando não há mais nada a fazer |

```json
{"ts":"2026-10-16T14:00:25.000Z","type":"state","task":"pw-01","state":"working","attempt":1,"agent":"worker-05","model":"claude-haiku-5-5"}
{"ts":"2026-10-16T14:00:39.000Z","type":"cost","task":"pw-01","attempt":1,"agent":"worker-05","model":"claude-haiku-5-5","cost_usd":0.0016,"duration_s":14}
{"ts":"2026-10-16T14:00:42.000Z","type":"state","task":"pw-01","state":"green","attempt":1,"agent":"worker-05","model":"claude-haiku-5-5"}
```

Linhas que não sejam JSON válido são ignoradas. Um evento `cost` com `task: null` conta como custo da sessão principal. Os hooks não o escrevem; a repetição sintética usa-o para o custo ir subindo. No evento `end`, se o custo somado for menor do que `snapshot.cost.total`, a diferença entra como sessão principal, para o número final ser o real.

## Como a repetição se desenha

- O relógio começa no evento `start` e acaba no `end`. A 20× (o valor por defeito), 20 minutos passam em cerca de 60 s. Há também 1×, 10× e 30×.
- O cabeçalho mostra o tempo e o custo **da execução gravada** no ponto em que a repetição vai. Por baixo dos controlos fica sempre a duração e o custo reais totais.
- O excerto do teste de cada quadrado vem do `snapshot.json`, e só aparece quando o quadrado chega ao estado final.
- Teclas: espaço para pausa, `r` para recomeçar, `1` a `4` para as velocidades.

## Gravar uma execução real

No fim de um `/demo-swarm`, com o servidor ligado:

```
mkdir -p replays/<name>
cp .workshop/events.jsonl replays/<name>/events.jsonl
curl -s http://localhost:3000/api/status > replays/<name>/snapshot.json
```

Abre `/status?replay=<name>` para confirmar.
