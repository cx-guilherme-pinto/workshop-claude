# Preview do enxame: execução real gravada

Esta pasta guarda a **Arena final** de uma execução real do modo apresentador (100 cartões, 107 agentes) e os dados para a reproduzir sem chamar a API.

| O quê | Valor medido |
|---|---|
| Duração da sessão completa | 6,9 min (`/demo-plan` → `/demo-swarm` → `/demo-review` → `/demo-cost`) |
| Custo (tokens reais × preços publicados) | US$ 2,55 |
| Resultado | 105/105 tarefas verdes, 665 testes verdes, gate aprovado |

## Plano B, se o vídeo falhar no projetor

```
cd presenter-replay/arena
node server.js
```

Depois abre `http://localhost:3000/estado?replay=gravacao`. A grelha dos 100 quadrados repete a execução a 20× (com o tempo e o custo reais no ecrã). Para jogar um cartão: `http://localhost:3000`.

O vídeo (`slides/media/enxame-acelerado.mp4`) e esta pasta são gerados por `tools/record/gravar-apresentador.sh`.
