#!/usr/bin/env bash
# Gravacao do "preview do enxame" (modo apresentador, 100 agentes). SO PARA O ORGANIZADOR.
# Corre uma execucao real, grava a pagina /estado e o terminal, e gera:
#   out/<id>/enxame.mp4 (tempo real), enxame-acelerado.mp4 (60-90 s), enxame.gif,
#   e copia para presenter-replay/ o events.jsonl, snapshot.json e a Arena final (para o modo replay).
#
# Requisitos (so nesta maquina): brew install ffmpeg asciinema agg ; cd tools/record && npm install && npx playwright install chromium
set -euo pipefail

main() {
  local KIT; KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  local REC="$KIT/tools/record"
  local ID; ID="$(date +%Y%m%d-%H%M%S)"
  local OUT="$REC/out/$ID"; mkdir -p "$OUT"
  local ARENA="$OUT/arena"
  local NODE; NODE="$(command -v node)"
  local MAX="${ARENA_MAX_PARALELO:-16}"
  local PORTA="${PORTA:-3555}"
  for c in ffmpeg asciinema agg; do command -v "$c" >/dev/null || { echo "falta $c (brew install $c)"; exit 1; }; done

  "$NODE" "$KIT/installer/assemble-demo.mjs" --dest "$ARENA" --node "$NODE" --lingua "${GRAVAR_LINGUA:-pt}" >/dev/null  # D-20: GRAVAR_LINGUA=en grava a Arena em ingles
  # Servidor da Arena para a pagina /estado.
  ( cd "$ARENA" && "$NODE" server.js --porta "$PORTA" > "$OUT/server.log" 2>&1 ) &
  local SRV=$!
  # shellcheck disable=SC2064 # o PID e expandido ja, de proposito
  trap "kill $SRV 2>/dev/null || true" EXIT
  sleep 2

  # Gravador do browser (em paralelo com o enxame).
  ( cd "$REC" && "$NODE" record-estado.mjs --url "http://127.0.0.1:$PORTA/estado" --projeto "$ARENA" --out "$OUT" ) &
  local REC_PID=$!

  # A sessao completa, gravada no terminal (asciinema) com o tradutor do stream-json.
  local T0; T0="$(date +%s)"
  ARENA_MAX_PARALELO="$MAX" asciinema rec --overwrite --window-size 110x34 -c "bash '$REC/sessao.sh' '$ARENA' '$OUT'" "$OUT/terminal.cast"
  local T1; T1="$(date +%s)"
  wait $REC_PID || true

  # Videos.
  agg --font-size 20 "$OUT/terminal.cast" "$OUT/terminal.gif"
  ffmpeg -y -loglevel error -i "$OUT/terminal.gif" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "$OUT/terminal.mp4"
  ffmpeg -y -loglevel error -i "$OUT/estado.webm" -c:v libx264 -pix_fmt yuv420p -r 30 "$OUT/estado.mp4"
  # Lado a lado: browser (esquerda) + terminal (direita), mesma altura.
  ffmpeg -y -loglevel error -i "$OUT/estado.mp4" -i "$OUT/terminal.mp4" -filter_complex \
    "[0:v]scale=-2:1080[a];[1:v]scale=-2:1080,tpad=stop_mode=clone:stop_duration=600[b];[a][b]hstack=inputs=2:shortest=1,scale=1920:-2[v]" \
    -map "[v]" -c:v libx264 -pix_fmt yuv420p -r 30 "$OUT/enxame.mp4"
  local DUR; DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/enxame.mp4" | cut -d. -f1)"
  local FATOR=$(( DUR / 75 )); [ "$FATOR" -lt 1 ] && FATOR=1
  ffmpeg -y -loglevel error -i "$OUT/enxame.mp4" -vf "setpts=PTS/$FATOR" -an -c:v libx264 -pix_fmt yuv420p -r 30 "$OUT/enxame-acelerado.mp4"
  ffmpeg -y -loglevel error -i "$OUT/enxame-acelerado.mp4" -vf "fps=12,scale=1280:-1:flags=lanczos" "$OUT/enxame.gif"

  # Dados para o modo replay e a Arena final.
  mkdir -p "$KIT/presenter-replay"
  rm -rf "$KIT/presenter-replay/arena" && cp -R "$ARENA" "$KIT/presenter-replay/arena"
  rm -rf "$KIT/presenter-replay/arena/.git" "$KIT/presenter-replay/arena/.claude"  # sem caminhos locais no repo
  mkdir -p "$KIT/presenter-replay/arena/replays/gravacao"
  cp "$ARENA/.workshop/events.jsonl" "$KIT/presenter-replay/arena/replays/gravacao/events.jsonl"
  ( cd "$ARENA" && "$NODE" -e '
      import("./tools/workshop/orquestrador/lib/estado.mjs").then(m => {
        const c = m.caminhos(process.cwd()); const p = m.lerPlano("plan.json");
        require("fs").writeFileSync(process.argv[1], JSON.stringify(m.fotografia(c, p), null, 2));
      });' "$KIT/presenter-replay/arena/replays/gravacao/snapshot.json" )
  cp "$OUT/enxame-acelerado.mp4" "$KIT/slides/media/enxame-acelerado.mp4" 2>/dev/null || { mkdir -p "$KIT/slides/media"; cp "$OUT/enxame-acelerado.mp4" "$KIT/slides/media/"; }
  cp "$OUT/estado-final.png" "$KIT/slides/media/estado-final.png"
  cp "$OUT/arena.png" "$KIT/slides/media/arena.png"
  "$NODE" "$ARENA/tools/workshop/orquestrador/report.mjs" --projeto "$ARENA" --json > "$OUT/relatorio.json"
  # Conta como uma das execucoes do benchmark do modo apresentador.
  "$NODE" "$KIT/benchmark/collect.mjs" --run "$OUT" --id "$ID-apresentador-gravado" --modo apresentador --duracao $((T1 - T0)) --csv "$KIT/benchmark/results.csv" --isolado 0
  echo "Gravação: $OUT (duração real ${DUR}s, acelerado ${FATOR}×)"
}

main "$@"
