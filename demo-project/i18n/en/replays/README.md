# `/estado` replays

A replay rebuilds a swarm run in `/estado` without calling the API: useful for rehearsing, for showing it on a projector without a network, or for comparing runs.

```
node server.js
http://localhost:3000/estado?replay=exemplo
```

Each replay is a folder `replays/<nome>/` (name with lowercase letters, numbers and hyphens) with two files.

| File | What it is |
|---|---|
| `events.jsonl` | The events of the run, one JSON per line, in the order they happened. It is the `.workshop/events.jsonl` that the orchestrator and the hooks write. |
| `snapshot.json` | The final snapshot (`fotografia()` from `tools/workshop/orquestrador/lib/estado.mjs`, the same one that `/api/status` returns). It gives the list and order of the tasks, the titles, the result of each test and the real total cost. |

`exemplo/` is **synthetic**: 15 tasks in about 20 minutes, to test replay mode before there is a real recording. Its `snapshot.json` has `"sintetico": true`.

## Events (`events.jsonl`)

| `tipo` | Fields | Who writes it |
|---|---|---|
| `inicio` | `ts`, `modo`, `total` | `next-wave.mjs`, on the first batch |
| `estado` | `ts`, `tarefa`, `estado` (`em_curso`, `verde`, `vermelho`, `falhou`), `tentativa`, `agente`, `modelo` | `next-wave.mjs` (on launch) and `grade.mjs` (on grading) |
| `custo` | `ts`, `tarefa`, `tentativa`, `agente`, `modelo`, `custo_usd`, `duracao_s` | the `SubagentStop` hook |
| `fim` | `ts`, `contagem`, `custo` | `next-wave.mjs`, when there is nothing left to do |

```json
{"ts":"2026-10-16T14:00:25.000Z","tipo":"estado","tarefa":"pw-01","estado":"em_curso","tentativa":1,"agente":"worker-05","modelo":"claude-haiku-5-5"}
{"ts":"2026-10-16T14:00:39.000Z","tipo":"custo","tarefa":"pw-01","tentativa":1,"agente":"worker-05","modelo":"claude-haiku-5-5","custo_usd":0.0016,"duracao_s":14}
{"ts":"2026-10-16T14:00:42.000Z","tipo":"estado","tarefa":"pw-01","estado":"verde","tentativa":1,"agente":"worker-05","modelo":"claude-haiku-5-5"}
```

Lines that are not valid JSON are ignored. A `custo` event with `tarefa: null` counts as the cost of the main session. The hooks do not write it; the synthetic replay uses it so the cost keeps going up. In the `fim` event, if the summed cost is lower than `snapshot.custo.total`, the difference goes to the main session, so the final number is the real one.

## How the replay is drawn

- The clock starts at the `inicio` event and ends at `fim`. At 20× (the default), 20 minutes pass in about 60 s. There are also 1×, 10× and 30×.
- The header shows the time and cost **of the recorded run** at the point the replay has reached. Below the controls, the real total duration and cost are always shown.
- The test excerpt for each square comes from `snapshot.json`, and only appears when the square reaches its final state.
- Keys: space to pause, `r` to restart, `1` to `4` for the speeds.

## Recording a real run

At the end of a `/demo-swarm`, with the server running:

```
mkdir -p replays/<nome>
cp .workshop/events.jsonl replays/<nome>/events.jsonl
curl -s http://localhost:3000/api/status > replays/<nome>/snapshot.json
```

Open `/estado?replay=<nome>` to check.
