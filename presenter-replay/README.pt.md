# Preview do swarm: execução real gravada

Esta pasta guarda a **Arena final** de uma execução real e os dados para a reproduzir sem chamar a API (o plano B do vídeo do swarm nos slides).

| Pasta | Língua | Execução |
|---|---|---|
| `arena/` | português | modo apresentador: 100 cartões, 107 agentes, 6,9 min, US$ 2,55, 105/105 tarefas verdes |
| `arena-en/` | inglês | feita a partir da gravação em inglês |

## Plano B, se o vídeo falhar no projetor

```
cd presenter-replay/arena        # ou arena-en para a apresentação em inglês
node server.js
```

Depois abre `http://localhost:3000/status?replay=recording`. A grelha dos 100 quadrados repete a execução a 20× (com o tempo e o custo reais no ecrã). Para jogar um cartão: `http://localhost:3000`.

## Como se fazem estas pastas

- `tools/record/gravar-apresentador.sh` grava uma execução nova do modo apresentador (`GRAVAR_LINGUA=en` para inglês), põe o vídeo em `slides/media/` e a Arena aqui.
- `node tools/record/montar-replay.mjs --lingua pt|en --gravacao <pasta com events.jsonl>` (ou `--arena <Arena de uma execução>`) refaz uma pasta com o código atual do kit, as soluções de referência e a execução gravada, e troca os ids das tarefas de antes da D-25 pelos ingleses.
