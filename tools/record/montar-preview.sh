#!/usr/bin/env bash
# Monta o video do preview do swarm (slide "100 agentes a construir a Arena") sem voltar a correr o swarm:
# a grelha vem do modo replay da Arena gravada (presenter-replay/, a partir de events.jsonl) e o terminal
# do terminal.cast da mesma execucao. Os dois sao gerados a mesma velocidade (5x por defeito) e alinhados
# pela hora real do evento "inicio", por isso ficam sincronizados. SO PARA O ORGANIZADOR.
#
#   tools/record/montar-preview.sh <pasta da gravacao em tools/record/out/<id>> [--velocidade 5] [--fps 12] [--lingua pt|en]
#   (--lingua en usa presenter-replay/arena-en e escreve slides/media/*.en.*)
#
# Requisitos: ffmpeg, agg e o Playwright de tools/record (npm install && npx playwright install chromium).
# Escreve <pasta>/preview/enxame-acelerado.mp4 e estado-poster.png e copia-os para slides/media/.
set -euo pipefail

main() {
  local KIT; KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  local REC="$KIT/tools/record" GRAV=${1:?pasta da gravacao} VEL=5 FPS=12 PORTA="${PORTA:-3620}" LG="${GRAVAR_LINGUA:-pt}"
  shift; while [ $# -gt 0 ]; do case "$1" in --velocidade) VEL=$2; shift 2 ;; --fps) FPS=$2; shift 2 ;; --lingua|--language) LG=$2; shift 2 ;; *) echo "opcao desconhecida: $1" >&2; exit 2 ;; esac; done
  local ARENA="$KIT/presenter-replay/arena" SUF="" OUT="$GRAV/preview" NODE; NODE="$(command -v node)"
  if [ "$LG" = en ]; then ARENA="$KIT/presenter-replay/arena-en"; SUF=".en"; fi
  local EVS="$ARENA/replays/recording/events.jsonl"; [ -f "$EVS" ] || EVS="$ARENA/replays/gravacao/events.jsonl"
  for c in ffmpeg ffprobe agg; do command -v "$c" >/dev/null || { echo "falta $c (brew install $c)"; exit 1; }; done
  [ -f "$GRAV/terminal.cast" ] || { echo "falta $GRAV/terminal.cast"; exit 1; }
  mkdir -p "$OUT"

  # 1. Grelha: a repeticao, fotograma a fotograma, a ${VEL}x.
  ( cd "$ARENA" && "$NODE" server.js --porta "$PORTA" > "$OUT/server.log" 2>&1 ) &
  local SRV=$!
  # shellcheck disable=SC2064 # o PID e expandido ja, de proposito
  trap "kill $SRV 2>/dev/null || true" EXIT
  sleep 2
  "$NODE" "$REC/record-replay.mjs" --url "http://127.0.0.1:$PORTA/status?replay=recording" --out "$OUT" --velocidade "$VEL" --fps "$FPS"
  kill "$SRV" 2>/dev/null || true

  # 2. Tempos: a repeticao comeca no evento "inicio"; o terminal.cast (v2 ou v3) tem a hora de inicio.
  local T; T=$("$NODE" -e '
    const fs = require("fs");
    const [cast, evs] = process.argv.slice(1);
    const L = fs.readFileSync(cast, "utf8").trim().split("\n");
    const h = JSON.parse(L[0]);
    let t = 0;
    for (const l of L.slice(1)) { const e = JSON.parse(l); t = h.version >= 3 ? t + e[0] : e[0]; }
    const evl = fs.readFileSync(evs, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const inicio = Date.parse((evl.find((e) => e.tipo === "inicio" || e.type === "start") || evl[0]).ts);
    console.log([((inicio - h.timestamp * 1000) / 1000).toFixed(3), t.toFixed(3)].join(" "));
  ' "$GRAV/terminal.cast" "$EVS")
  local INI TOT; read -r INI TOT <<<"$T"
  local LEAD DUR; LEAD=$(awk -v a="$INI" -v v="$VEL" 'BEGIN{printf "%.3f", a/v}'); DUR=$(awk -v a="$TOT" -v v="$VEL" 'BEGIN{printf "%.3f", a/v}')
  echo "repeticao comeca a ${INI}s do terminal (${LEAD}s a ${VEL}x); terminal ${TOT}s (${DUR}s a ${VEL}x)"

  # 3. Terminal a ${VEL}x, sem cortar as pausas (o tempo fica proporcional ao real, como a repeticao).
  agg --speed "$VEL" --idle-time-limit 100000 --font-size 20 --last-frame-duration 3 "$GRAV/terminal.cast" "$OUT/terminal-vel.gif"
  ffmpeg -y -loglevel error -i "$OUT/terminal-vel.gif" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -r 30 "$OUT/terminal-vel.mp4"

  # 4. Lado a lado: grelha (esquerda) + terminal (direita), a mesma altura, com a duracao do terminal.
  ffmpeg -y -loglevel error -framerate "$FPS" -i "$OUT/replay-frames/f%05d.jpg" -i "$OUT/terminal-vel.mp4" -filter_complex \
    "[0:v]fps=30,tpad=start_mode=clone:start_duration=$LEAD:stop_mode=clone:stop_duration=60,scale=-2:1080[g];[1:v]fps=30,scale=-2:1080,tpad=stop_mode=clone:stop_duration=60[t];[g][t]hstack=inputs=2,trim=duration=$DUR,setpts=PTS-STARTPTS,scale=1920:-2[v]" \
    -map "[v]" -an -c:v libx264 -pix_fmt yuv420p -r 30 -movflags faststart "$OUT/enxame-acelerado.mp4"
  ffmpeg -y -loglevel error -ss 30 -i "$OUT/enxame-acelerado.mp4" -frames:v 1 "$OUT/estado-poster.png"  # a meio: amarelos e verdes
  cp "$OUT/enxame-acelerado.mp4" "$KIT/slides/media/enxame-acelerado$SUF.mp4"
  cp "$OUT/estado-poster.png" "$KIT/slides/media/estado-final$SUF.png"
  echo "video: $OUT/enxame-acelerado.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/enxame-acelerado.mp4" | cut -d. -f1) s), copiado para slides/media/"
}

main "$@"
