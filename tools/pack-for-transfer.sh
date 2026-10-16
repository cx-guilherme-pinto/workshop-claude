#!/usr/bin/env bash
# tools/pack-for-transfer.sh - packs both repositories (kit and Memória app) into one zip of
# "git bundles", to copy to another machine (AirDrop, USB stick) without needing the server.
# Carries the full history, every branch and every tag; uncommitted changes are left out.
# Before closing the zip, it clones each bundle and checks the commit count matches the original.
#
#   bash tools/pack-for-transfer.sh [--memory-repo <dir>] [--out <dir>]
#
# Result: dist/transfer/workshop-claude-package-<date>.zip with workshop-claude.bundle,
# claude-memory-app.bundle, SHA256SUMS, README.md (en) and LEIA-ME.md (pt): the steps on the other machine.
# Guide: docs/MACHINE-TEST.md
set -uo pipefail

main() {
  local KIT MEM OUTDIR r name dirty=0 pname dir tmp n1 n2 lines=""
  KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
  MEM="$KIT/../claude-memory-app"; OUTDIR="$KIT/dist/transfer"
  while [ $# -gt 0 ]; do
    case "$1" in
      --memory-repo|--memoria-repo) MEM="$2"; shift 2 ;;
      --out|--saida) OUTDIR="$2"; shift 2 ;;
      -h|--help|--ajuda) sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; return 0 ;;
      *) printf 'Unknown option: %s\n' "$1" >&2; return 2 ;;
    esac
  done
  pname="workshop-claude-package-$(date +%Y%m%d-%H%M)"
  dir="$OUTDIR/$pname"
  mkdir -p "$dir" || return 1
  tmp=$(mktemp -d "${TMPDIR:-/tmp}/ws-pack.XXXXXX") || return 1
  for r in "$KIT" "$MEM"; do
    [ -d "$r/.git" ] || { printf 'No git repository at %s (skipped)\n' "$r"; continue; }
    name=$(basename "$(cd "$r" && pwd -P)")
    if [ -n "$(git -C "$r" status --porcelain)" ]; then
      printf 'Warning: %s has uncommitted changes; the package only carries what is committed.\n' "$name"; dirty=1
    fi
    # branches and tags only (no refs/remotes), so a "git push --mirror" on the other side stays clean
    git -C "$r" bundle create "$dir/$name.bundle" --branches --tags 2>/dev/null || { printf 'Bundle of %s failed\n' "$name" >&2; return 1; }
    git bundle verify "$dir/$name.bundle" >/dev/null 2>&1 || { printf 'The %s bundle fails git bundle verify\n' "$name" >&2; return 1; }
    git clone -q --mirror "$dir/$name.bundle" "$tmp/$name.git" 2>/dev/null || { printf 'Could not clone the %s bundle\n' "$name" >&2; return 1; }
    n1=$(git -C "$r" rev-list --branches --tags --count); n2=$(git -C "$tmp/$name.git" rev-list --all --count)
    [ "$n1" = "$n2" ] || { printf 'Incomplete history in %s: %s commits in the original, %s in the bundle\n' "$name" "$n1" "$n2" >&2; return 1; }
    lines="$lines$name	$n2	$(git -C "$r" branch --format='%(refname:short)' | wc -l | tr -d ' ')	$(git -C "$r" tag | wc -l | tr -d ' ')	$(git -C "$r" rev-parse --short main 2>/dev/null)	$(git -C "$r" describe --tags --always main 2>/dev/null)
"
    printf '%s: %s commits, full history\n' "$name" "$n2"
  done
  rm -rf "$tmp"
  readme_en "$lines" > "$dir/README.md"
  readme_pt "$lines" > "$dir/LEIA-ME.md"
  (cd "$dir" && shasum -a 256 ./*.bundle README.md LEIA-ME.md | sed 's#  \./#  #' > SHA256SUMS)
  (cd "$OUTDIR" && rm -f "$pname.zip" && zip -qr "$pname.zip" "$pname") || { printf 'zip failed\n' >&2; return 1; }
  rm -rf "$dir"
  printf '\nPackage: %s/%s.zip (%s)\nCopy it to the other machine and follow the README.md inside.\n' "$OUTDIR" "$pname" "$(du -h "$OUTDIR/$pname.zip" | cut -f1 | tr -d ' ')"
  [ "$dirty" = 0 ] || printf '\nSome uncommitted changes were left out (see the warnings above).\n'
}

# one line per bundle, from the tab-separated summary
bundles() { # summary "commits" "branches" "tags" "main at"
  printf '%s' "$1" | while IFS="$(printf '\t')" read -r n c b t m d; do
    [ -n "$n" ] && printf -- '- `%s.bundle`: %s %s, %s %s, %s %s; %s `%s` (%s)\n' "$n" "$c" "$2" "$b" "$3" "$t" "$4" "$5" "$m" "$d"
  done
}

readme_en() {
  cat <<EOF
# Workshop kit package

[English](README.md) · [Português](LEIA-ME.md)

Created on $(date '+%Y-%m-%d %H:%M'). It holds both repositories with the full history, every branch and every tag:

$(bundles "$1" commits branches tags "main at")

## 1. Check and open

\`\`\`bash
shasum -a 256 -c SHA256SUMS
git clone workshop-claude.bundle workshop-claude
git clone claude-memory-app.bundle claude-memory-app
\`\`\`

Keep both clones side by side: that is where the test script looks for the Memória app.

## 2. Test

\`\`\`bash
cd workshop-claude
bash tools/test-machine.sh --install --jira ABC-123 --confluence 123456
\`\`\`

The full guide is \`docs/MACHINE-TEST.md\`. The report goes to \`~/workshop-test/<date>/report.md\`.

## 3. Publish to the corporate GitHub, with the history

Inside the kit clone, with the app clone next to it, look at the plan first and then run it. It asks for a yes before every step:

\`\`\`bash
cd workshop-claude
gh auth login --hostname <server> --web
bash tools/publish-to-github.sh --owner <org-or-user> --host <server> --dry-run
bash tools/publish-to-github.sh --owner <org-or-user> --host <server>
\`\`\`

The script:
- creates both repositories (private by default; \`--visibility internal\` for the whole company);
- pushes every branch and tag;
- switches the URLs to the new server;
- publishes the app release and then the kit release;
- checks the download with \`tools/test-machine.sh\`.

On github.com you can leave out \`--host\`.

## 4. Carry on with Claude

Open Claude Code inside \`workshop-claude\`. \`CLAUDE.md\` and \`docs/HANDOVER.md\` (and the Memória app's own) tell it the state, the rules and what is left.
EOF
}

readme_pt() {
  cat <<EOF
# Pacote do kit do workshop

[English](README.md) · [Português](LEIA-ME.md)

Criado em $(date '+%Y-%m-%d %H:%M'). Tem os dois repositórios com o histórico completo, todos os branches e todas as tags:

$(bundles "$1" commits branches tags "main em")

## 1. Verificar e abrir

\`\`\`bash
shasum -a 256 -c SHA256SUMS
git clone workshop-claude.bundle workshop-claude
git clone claude-memory-app.bundle claude-memory-app
\`\`\`

Os dois clones ficam lado a lado, que é onde o script de testes procura a app Memória.

## 2. Testar

\`\`\`bash
cd workshop-claude
bash tools/test-machine.sh --install --jira ABC-123 --confluence 123456
\`\`\`

O guia completo está em \`docs/pt/TESTAR-MAQUINA.md\`. O relatório fica em \`~/workshop-test/<data>/report.md\`.

## 3. Publicar no GitHub corporativo, com o histórico

Dentro do clone do kit, com o clone da app ao lado, vê primeiro o plano e depois corre-o. Pede o "sim" antes de cada passo:

\`\`\`bash
cd workshop-claude
gh auth login --hostname <servidor> --web
bash tools/publish-to-github.sh --owner <org-ou-utilizador> --host <servidor> --dry-run
bash tools/publish-to-github.sh --owner <org-ou-utilizador> --host <servidor>
\`\`\`

O script:
- cria os dois repositórios (privados por defeito; \`--visibility internal\` para toda a empresa);
- envia todos os branches e tags;
- muda os URLs para o servidor novo;
- publica a release da app e depois a do kit;
- verifica o download com o \`tools/test-machine.sh\`.

No github.com não precisas de \`--host\`.

## 4. Continuar com o Claude

Abre o Claude Code dentro de \`workshop-claude\`. O \`CLAUDE.md\` e o \`docs/HANDOVER.md\` (e os da app Memória) dizem-lhe o estado, as regras e o que falta.
EOF
}

main "$@"
