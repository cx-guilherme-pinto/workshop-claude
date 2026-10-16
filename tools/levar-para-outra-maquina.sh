#!/usr/bin/env bash
# tools/levar-para-outra-maquina.sh - empacota os dois repositorios (kit e app Memoria) num zip com
# "git bundles" para copiar para outra maquina (AirDrop, pen USB), sem precisar do Gitea.
# Leva o historico completo, todos os branches e todas as tags; nao leva alteracoes por commitar.
# Antes de fechar o zip, clona cada bundle e confirma que o numero de commits e o mesmo.
#
#   bash tools/levar-para-outra-maquina.sh [--memoria-repo <pasta>] [--saida <pasta>]
#
# Resultado: dist/levar/workshop-claude-pacote-<data>.zip com workshop-claude.bundle,
# claude-memory-app.bundle, SHA256SUMS e LEIA-ME.md (os passos na outra maquina).
# Guia: docs/TESTAR-MAQUINA.md
set -uo pipefail

main() {
  local KIT MEM SAIDA r nome sujo=0 nomep pasta tmp n1 n2 linhas=""
  KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
  MEM="$KIT/../claude-memory-app"; SAIDA="$KIT/dist/levar"
  while [ $# -gt 0 ]; do
    case "$1" in
      --memoria-repo) MEM="$2"; shift 2 ;;
      --saida) SAIDA="$2"; shift 2 ;;
      -h|--ajuda|--help) sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; return 0 ;;
      *) printf 'Opcao desconhecida: %s\n' "$1" >&2; return 2 ;;
    esac
  done
  nomep="workshop-claude-pacote-$(date +%Y%m%d-%H%M)"
  pasta="$SAIDA/$nomep"
  mkdir -p "$pasta" || return 1
  tmp=$(mktemp -d "${TMPDIR:-/tmp}/ws-levar.XXXXXX") || return 1
  for r in "$KIT" "$MEM"; do
    [ -d "$r/.git" ] || { printf 'Sem repositorio git em %s (salto)\n' "$r"; continue; }
    nome=$(basename "$(cd "$r" && pwd -P)")
    if [ -n "$(git -C "$r" status --porcelain)" ]; then
      printf 'Aviso: %s tem alteracoes por commitar; o pacote so leva o que esta commitado.\n' "$nome"; sujo=1
    fi
    # so branches e tags (sem refs/remotes), para o "git push --mirror" do outro lado ficar limpo
    git -C "$r" bundle create "$pasta/$nome.bundle" --branches --tags 2>/dev/null || { printf 'Falhou o bundle de %s\n' "$nome" >&2; return 1; }
    git bundle verify "$pasta/$nome.bundle" >/dev/null 2>&1 || { printf 'O bundle de %s nao passa no git bundle verify\n' "$nome" >&2; return 1; }
    git clone -q --mirror "$pasta/$nome.bundle" "$tmp/$nome.git" 2>/dev/null || { printf 'Nao consegui clonar o bundle de %s\n' "$nome" >&2; return 1; }
    n1=$(git -C "$r" rev-list --branches --tags --count); n2=$(git -C "$tmp/$nome.git" rev-list --all --count)
    [ "$n1" = "$n2" ] || { printf 'Historico incompleto em %s: %s commits no original, %s no bundle\n' "$nome" "$n1" "$n2" >&2; return 1; }
    linhas="$linhas- \`$nome.bundle\`: $n2 commits, $(git -C "$r" branch --format='%(refname:short)' | wc -l | tr -d ' ') branches, $(git -C "$r" tag | wc -l | tr -d ' ') tags; main em \`$(git -C "$r" rev-parse --short main 2>/dev/null)\` ($(git -C "$r" describe --tags --always main 2>/dev/null))
"
    printf '%s: %s commits, historico completo\n' "$nome" "$n2"
  done
  rm -rf "$tmp"
  leia_me "$linhas" > "$pasta/LEIA-ME.md"
  (cd "$pasta" && shasum -a 256 ./*.bundle LEIA-ME.md | sed 's#  \./#  #' > SHA256SUMS)
  (cd "$SAIDA" && rm -f "$nomep.zip" && zip -qr "$nomep.zip" "$nomep") || { printf 'Falhou o zip\n' >&2; return 1; }
  rm -rf "$pasta"
  printf '\nPacote: %s/%s.zip (%s)\nCopia-o para a outra maquina e segue o LEIA-ME.md que vai dentro.\n' "$SAIDA" "$nomep" "$(du -h "$SAIDA/$nomep.zip" | cut -f1 | tr -d ' ')"
  [ "$sujo" = 0 ] || printf '\nHa alteracoes por commitar que ficaram de fora (ver os avisos acima).\n'
}

leia_me() {
  cat <<EOF
# Pacote do kit do workshop

Criado em $(date '+%Y-%m-%d %H:%M'). Tem os dois repositórios com o histórico completo, todos os branches e todas as tags:

$1
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
bash tools/testar-maquina.sh --instalar --jira ABC-123 --confluence 123456
\`\`\`

O guia completo está em \`docs/TESTAR-MAQUINA.md\`. O relatório fica em \`~/workshop-teste/<data>/relatorio.md\`.

## 3. Publicar no GitHub corporativo, com o histórico

Cria os dois repositórios vazios no GitHub da empresa. Depois, para cada um:

\`\`\`bash
git clone --mirror workshop-claude.bundle workshop-claude.git
git -C workshop-claude.git push --mirror https://<servidor>/<equipa>/workshop-claude.git
git clone --mirror claude-memory-app.bundle claude-memory-app.git
git -C claude-memory-app.git push --mirror https://<servidor>/<equipa>/claude-memory-app.git
\`\`\`

O \`--mirror\` envia todos os branches e todas as tags tal como estão. No clone de trabalho, aponta o \`origin\` para o repositório novo:

\`\`\`bash
git -C workshop-claude remote set-url origin https://<servidor>/<equipa>/workshop-claude.git
git -C claude-memory-app remote set-url origin https://<servidor>/<equipa>/claude-memory-app.git
\`\`\`

Depois mudam-se os URLs e criam-se as releases lá:

- **App Memória:** no \`release.conf\`, muda \`MEMORY_APP_REPO_URL\` e \`RELEASE_PROVIDER=github\` e sobe a \`MEMORY_APP_VERSION\`. Confirma também o URL por defeito em \`install/install.sh\` e \`install/install.ps1\`. Depois \`scripts/build.sh\` e \`scripts/publish-release.sh\` (usa o \`gh\`; num servidor próprio, com \`GH_HOST=<servidor>\`). Ver o README dela.
- **Kit:** \`docs/PUBLICAR.md\` e a secção 5 do \`docs/TESTAR-MAQUINA.md\` (\`tools/switch-repos.sh\`, \`RELEASE_PROVIDER=github\`, uma versão nova no \`WORKSHOP_VERSION\`, \`MEMORY_APP_VERSION\` igual à release da app, \`tools/build-release.sh\` e \`tools/publish-release.sh\`).
- **Confirmar:** volta a correr o teste com \`--github-host\` e \`--github-repo\`.
EOF
}

main "$@"
