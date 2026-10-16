# Repetições do `/estado`

Uma repetição reconstrói uma execução do swarm no `/estado` sem chamar a API: útil para ensaiar, para mostrar num projetor sem rede ou para comparar execuções.

```
node server.js
http://localhost:3000/estado?replay=exemplo
```

Cada repetição é uma pasta `replays/<nome>/` (nome com letras minúsculas, números e hífens) com dois ficheiros.

| Ficheiro | O que é |
|---|---|
| `events.jsonl` | Os eventos da execução, um JSON por linha, pela ordem em que aconteceram. É o `.workshop/events.jsonl` que o orquestrador e os hooks escrevem. |
| `snapshot.json` | A fotografia final (`fotografia()` de `tools/workshop/orquestrador/lib/estado.mjs`, a mesma que `/api/status` devolve). Dá a lista e a ordem das tarefas, os títulos, o resultado de cada teste e o custo total real. |

`exemplo/` é **sintética**: 15 tarefas em cerca de 20 minutos, para testar o modo repetição antes de haver uma gravação real. O `snapshot.json` dela tem `"sintetico": true`.

## Eventos (`events.jsonl`)

| `tipo` | Campos | Quem o escreve |
|---|---|---|
| `inicio` | `ts`, `modo`, `total` | `next-wave.mjs`, no primeiro lote |
| `estado` | `ts`, `tarefa`, `estado` (`em_curso`, `verde`, `vermelho`, `falhou`), `tentativa`, `agente`, `modelo` | `next-wave.mjs` (ao lançar) e `grade.mjs` (ao avaliar) |
| `custo` | `ts`, `tarefa`, `tentativa`, `agente`, `modelo`, `custo_usd`, `duracao_s` | hook `SubagentStop` |
| `fim` | `ts`, `contagem`, `custo` | `next-wave.mjs`, quando não há mais nada a fazer |

```json
{"ts":"2026-10-16T14:00:25.000Z","tipo":"estado","tarefa":"pw-01","estado":"em_curso","tentativa":1,"agente":"worker-05","modelo":"claude-haiku-5-5"}
{"ts":"2026-10-16T14:00:39.000Z","tipo":"custo","tarefa":"pw-01","tentativa":1,"agente":"worker-05","modelo":"claude-haiku-5-5","custo_usd":0.0016,"duracao_s":14}
{"ts":"2026-10-16T14:00:42.000Z","tipo":"estado","tarefa":"pw-01","estado":"verde","tentativa":1,"agente":"worker-05","modelo":"claude-haiku-5-5"}
```

Linhas que não sejam JSON válido são ignoradas. Um evento `custo` com `tarefa: null` conta como custo da sessão principal. Os hooks não o escrevem; a repetição sintética usa-o para o custo ir subindo. No evento `fim`, se o custo somado for menor do que `snapshot.custo.total`, a diferença entra como sessão principal, para o número final ser o real.

## Como a repetição se desenha

- O relógio começa no evento `inicio` e acaba no `fim`. A 20× (o valor por defeito), 20 minutos passam em cerca de 60 s. Há também 1×, 10× e 30×.
- O cabeçalho mostra o tempo e o custo **da execução gravada** no ponto em que a repetição vai. Por baixo dos controlos fica sempre a duração e o custo reais totais.
- O excerto do teste de cada quadrado vem do `snapshot.json`, e só aparece quando o quadrado chega ao estado final.
- Teclas: espaço para pausa, `r` para recomeçar, `1` a `4` para as velocidades.

## Gravar uma execução real

No fim de um `/demo-swarm`, com o servidor ligado:

```
mkdir -p replays/<nome>
cp .workshop/events.jsonl replays/<nome>/events.jsonl
curl -s http://localhost:3000/api/status > replays/<nome>/snapshot.json
```

Abre `/estado?replay=<nome>` para confirmar.
