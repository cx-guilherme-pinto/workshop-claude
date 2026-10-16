<!-- GERADO por tools/render.mjs a partir de tools/templates/README.md.tmpl e do repos.conf. Não editar à mão: edita o template. -->

# Workshop «Orquestração de Agentes com Claude»

Kit do workshop: o setup de um só comando, as skills e os agentes, os hooks de custo, a statusline, o orquestrador e os projetos práticos (a Arena de Segurança e o projeto de treino). Versão do kit: **v1.0.0-dev.1**.

## Instalar (participantes)

Precisas de uma conta na [Console da Anthropic](https://platform.claude.com) com créditos. Não precisas de admin.

**macOS** (Terminal):

```bash
curl -fsSL https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.1/setup-mac.sh | bash
```

**Windows** (PowerShell):

```powershell
irm https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.1/bootstrap-windows.ps1 | iex
```

O setup demora 10 a 20 minutos. Se parar a meio, volta a correr o mesmo comando: os passos feitos são saltados. Guia completo, com o pré-trabalho: [docs/INSTALAR.md](docs/INSTALAR.md).

## Verificar (no dia do workshop)

| | macOS | Windows |
|---|---|---|
| Verificar | `bash ~/.workshop-claude/setup-mac.sh --check` | `powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.workshop-claude\setup-windows.ps1" -Check` |
| Diagnóstico com o Claude | `bash ~/.workshop-claude/setup-mac.sh --doctor` | `powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.workshop-claude\setup-windows.ps1" -Doctor` |
| Desinstalar | `bash ~/.workshop-claude/setup-mac.sh --desinstalar` | `powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.workshop-claude\setup-windows.ps1" -Desinstalar` |

Sem instalação anterior, a verificação também corre diretamente: `curl -fsSL https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.1/setup-mac.sh | bash -s -- --check` (macOS) ou `$env:WORKSHOP_SETUP_ARGS='-Check'; irm https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.1/bootstrap-windows.ps1 | iex` (Windows).

Algo falhou? Cada erro tem um código. Vê [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## O que o setup faz

| Passo | O quê | Onde fica |
|---|---|---|
| 0 | Deteta o sistema, o proxy, a interceção TLS, o OneDrive e a rede | `~/.workshop-claude/ca.pem` (só com certificado da empresa) |
| 1 | git (Mac: Command Line Tools; Windows: Git for Windows só para o utilizador) | sistema / `%LOCALAPPDATA%\Programs\Git` |
| 2 | Claude Code 2.1.292 (instalador oficial) | `~/.local/bin` |
| 3 | Login na Console (`claude auth login --console`) | Keychain / `~/.claude` |
| 4 | Node.js (o existente se for ≥ 22; senão 24.22.0, verificado por SHA-256) | `~/.workshop-claude/node` |
| 5 | uv 0.13.1 | `~/.local/bin` |
| 6 | GitHub CLI 2.102.0 e `gh auth login` | `~/.workshop-claude/bin` |
| 7 | MCP do Jira (Atlassian), âmbito utilizador | `~/.claude.json` |
| 8 | Skills, agentes `ws-*`, hooks de custo e statusline, com merge seguro do `settings.json` | `~/.claude/`, `~/.workshop-claude/kit` |
| 9 | Projetos do workshop | `~/workshop-claude/` |
| 10 | App Memória v0.2.1 (opcional, não bloqueia) | `uv tool`, `~/.memoria` |
| 11 | Claude Desktop (opcional, `--sem-desktop` / `-SemDesktop` salta) | `~/Applications` |
| 12 | Teste final com o Haiku e o custo pelo `pricing.json` | — |

Tudo o que é instalado fica registado em `~/.workshop-claude/manifest.json`. O `settings.json` tem backup em `~/.workshop-claude/backup/`. O log (sem segredos) está em `~/.workshop-claude/setup.log`.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `setup/` | `setup-mac.sh`, `setup-windows.ps1`, `bootstrap-windows.ps1` e o catálogo de mensagens `messages.pt.json` |
| `installer/` | Instalação em Node, igual nos dois sistemas (`install-user.mjs`, `assemble-demo.mjs`, `assemble-sandbox.mjs`) |
| `hooks/`, `statusline/`, `orquestrador/` | Medição de custo e orquestração do enxame |
| `skills-demo/`, `skills-prod/`, `skills-shared/`, `agents/` | Skills e agentes |
| `demo-project/`, `exemplo-projeto-real/` | Projetos práticos |
| `tools/` | `render.mjs`, `build-release.sh`, `publish-release.sh`, `switch-repos.*`, `check-repo.mjs` e os testes |
| `docs/` | Instalação, resolução de problemas, publicação |

## Para o organizador

- Todos os URLs e versões estão em `repos.conf`. Este README é gerado: edita `tools/templates/README.md.tmpl` e corre `node tools/render.mjs`.
- Release: `tools/build-release.sh v1.0.0-dev.1` (gera `dist/v1.0.0-dev.1/`) e `tools/publish-release.sh v1.0.0-dev.1` (cria a release em https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/tag/v1.0.0-dev.1).
- Verificar o repositório: `node tools/check-repo.mjs`. Testes: `node --test tools/test/` e `bash setup/test/test-mac.sh`.
- Mudar para os repositórios públicos: [docs/PUBLICAR.md](docs/PUBLICAR.md).
- Decisões e fontes: [DECISIONS.md](DECISIONS.md).

Quem quiser verificar antes de executar encontra os SHA-256 em https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.1/SHA256SUMS.
