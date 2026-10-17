# Swarm preview: a real recorded run

This folder holds the **final Arena** of a real run and the data to replay it without calling the API (plan B for the swarm video on the slides).

| Folder | Language | Run |
|---|---|---|
| `arena/` | Portuguese | presenter mode: 100 cards, 107 agents, 6.9 min, US$ 2.55, 105/105 tasks green |
| `arena-en/` | English | built from the English recording (see `README` in that folder when it exists) |

## Plan B, if the video fails on the projector

```
cd presenter-replay/arena        # or arena-en for the English deck
node server.js
```

Then open `http://localhost:3000/status?replay=recording`. The grid of 100 squares replays the run at 20× (with the real time and cost on screen). To play a card: `http://localhost:3000`.

## How these folders are made

- `tools/record/gravar-apresentador.sh` records a new presenter run (`GRAVAR_LINGUA=en` for English) and writes the video to `slides/media/` and the Arena here.
- `node tools/record/montar-replay.mjs --lingua pt|en --gravacao <folder with events.jsonl>` (or `--arena <Arena of a run>`) rebuilds a folder with the kit's current code, the reference solutions and the recorded run, mapping the task ids from before D-25 to the English ones.
