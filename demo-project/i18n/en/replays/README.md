# `/status` replays

A replay rebuilds a swarm run in `/status` without calling the API: useful for rehearsing, for showing it on a projector without a network, or for comparing runs.

Run `node server.js` and open the replay address it prints (usually the one below; if port 3000 is taken, the server uses the next one):

```
node server.js
http://localhost:3000/status?replay=example
```

Each replay is a folder `replays/<name>/` (name with lowercase letters, numbers and hyphens) with two files.

| File | What it is |
|---|---|
| `events.jsonl` | The events of the run, one JSON per line, in the order they happened. It is the `.workshop/events.jsonl` that the orchestrator and the hooks write. |
| `snapshot.json` | The final snapshot (the same one that `/api/status` returns). It gives the list and order of the tasks, the titles, the result of each test and the real total cost. |

`example/` is **synthetic**: 15 tasks in about 20 minutes, to test replay mode before there is a real recording. Its `snapshot.json` has `"synthetic": true`. `/status?replay=recording` opens the presenter's recording; the names used by older kits still work.

The server sends both files to the page in the shape below. Recordings made by an older kit, with the older key names, are read too.

## Events (`events.jsonl`)

| `type` | Fields | Who writes it |
|---|---|---|
| `start` | `ts`, `mode`, `total` | `next-wave.mjs`, on the first batch |
| `state` | `ts`, `task`, `state` (`working`, `green`, `red`, `failed`), `attempt`, `agent`, `model` | `next-wave.mjs` (on launch) and `grade.mjs` (on grading) |
| `cost` | `ts`, `task`, `attempt`, `agent`, `model`, `cost_usd`, `duration_s` | the `SubagentStop` hook |
| `end` | `ts` | `next-wave.mjs`, when there is nothing left to do |

```json
{"ts":"2026-10-16T14:00:25.000Z","type":"state","task":"pw-01","state":"working","attempt":1,"agent":"worker-05","model":"claude-haiku-5-5"}
{"ts":"2026-10-16T14:00:39.000Z","type":"cost","task":"pw-01","attempt":1,"agent":"worker-05","model":"claude-haiku-5-5","cost_usd":0.0016,"duration_s":14}
{"ts":"2026-10-16T14:00:42.000Z","type":"state","task":"pw-01","state":"green","attempt":1,"agent":"worker-05","model":"claude-haiku-5-5"}
```

Lines that are not valid JSON are ignored. A `cost` event with `task: null` counts as the cost of the main session. The hooks do not write it; the synthetic replay uses it so the cost keeps going up. In the `end` event, if the summed cost is lower than `snapshot.cost.total`, the difference goes to the main session, so the final number is the real one.

## How the replay is drawn

- The clock starts at the `start` event and ends at `end`. At 20× (the default), 20 minutes pass in about 60 s. There are also 1×, 10× and 30×.
- The header shows the time and cost **of the recorded run** at the point the replay has reached. Below the controls, the real total duration and cost are always shown.
- The test excerpt for each square comes from `snapshot.json`, and only appears when the square reaches its final state.
- Keys: space to pause, `r` to restart, `1` to `4` for the speeds.

## Recording a real run

At the end of a `/demo-swarm`, with the server running:

```
mkdir -p replays/<name>
cp .workshop/events.jsonl replays/<name>/events.jsonl
curl -s http://localhost:3000/api/status > replays/<name>/snapshot.json
```

(If the server printed another port, use it in the `curl`.)

Open `/status?replay=<name>` to check.
