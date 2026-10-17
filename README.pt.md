<!-- GERADO por tools/render.mjs a partir de tools/templates/pt/README.md.tmpl e do repos.conf. Não editar à mão: edita o template. -->

# Workshop «Orquestração de Agentes com Claude»

[English](README.md) · **Português** · [हिन्दी](README.hi.md) · [עברית](README.he.md)

Kit do workshop: o setup de um só comando, as skills e os agentes, os hooks de custo, a statusline, o orquestrador e os projetos práticos (a Arena de Segurança e o projeto de treino). Versão do kit: **v1.0.0-rc.1**.

## Instalar (participantes)

Precisas de uma conta na [Console da Anthropic](https://platform.claude.com) com créditos. Não precisas de admin.

**macOS** (Terminal):

```bash
curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/setup-mac.sh | bash
```

**Windows** (PowerShell):

```powershell
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/bootstrap-windows.ps1 | iex
```

O setup demora 10 a 20 minutos. Se parar a meio, volta a correr o mesmo comando: os passos feitos são saltados. Guia completo, com o pré-trabalho: [docs/pt/INSTALL.md](docs/pt/INSTALL.md).

## Verificar (no dia do workshop)

| | macOS | Windows |
|---|---|---|
| Verificar | `bash ~/.workshop-claude/setup-mac.sh --check` | `powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.workshop-claude\setup-windows.ps1" -Check` |
| Diagnóstico com o Claude | `bash ~/.workshop-claude/setup-mac.sh --doctor` | `powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.workshop-claude\setup-windows.ps1" -Doctor` |
| Desinstalar | `bash ~/.workshop-claude/setup-mac.sh --uninstall` | `powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.workshop-claude\setup-windows.ps1" -Uninstall` |

Sem instalação anterior, a verificação também corre diretamente: `curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/setup-mac.sh | bash -s -- --check` (macOS) ou `$env:WORKSHOP_SETUP_ARGS='-Check'; irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/bootstrap-windows.ps1 | iex` (Windows).

Algo falhou? Cada erro tem um código. Vê [docs/pt/TROUBLESHOOTING.md](docs/pt/TROUBLESHOOTING.md).

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
| 10 | App Agent Memory v0.5.0 (opcional, não bloqueia) | `uv tool`, `~/.agent-memory` |
| 11 | Claude Desktop (opcional, `--no-desktop / -NoDesktop` salta) | `~/Applications` |
| 12 | Teste final com o Haiku e o custo pelo `pricing.json` | — |

Tudo o que é instalado fica registado em `~/.workshop-claude/manifest.json`. O `settings.json` tem backup em `~/.workshop-claude/backup/`. O log (sem segredos) está em `~/.workshop-claude/setup.log`.

**Línguas.** O setup fala só inglês, e as opções também (as antigas, em português, continuam a funcionar). Deteta a língua da máquina e, se ainda não tiveres a definição `language` do Claude Code, grava-a (português, inglês, hindi ou hebraico). As skills e os agentes estão em inglês e respondem na tua língua. A Arena, o orquestrador e a statusline ficam em português numa máquina em português e em inglês nas restantes. Para escolheres tu a língua, dá ao setup o `WORKSHOP_LANG` com `pt-BR`, `pt-PT`, `en`, `hi` ou `he`: no macOS escreve-o depois do pipe, mesmo antes de `bash` (`curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/setup-mac.sh | WORKSHOP_LANG=pt-BR bash`; `WORKSHOP_LANG=pt-BR curl …` só chega ao `curl`), e no Windows corre primeiro `$env:WORKSHOP_LANG='pt-BR'`. A língua escolhida na instalação mantém-se quando voltas a correr o setup; só o `WORKSHOP_LANG` a muda, e um valor que o setup não conhece é ignorado, com uma nota.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `setup/` | `setup-mac.sh`, `setup-windows.ps1`, `bootstrap-windows.ps1` e os catálogos de mensagens: `messages.en.json` (o que o setup mostra) e `messages.pt.json` (o TROUBLESHOOTING em português) |
| `installer/` | Instalação em Node, igual nos dois sistemas (`install-user.mjs`, `assemble-demo.mjs`, `assemble-sandbox.mjs`) |
| `hooks/`, `statusline/`, `orchestrator/` | Medição de custo e orquestração do swarm |
| `skills-demo/`, `skills-prod/`, `skills-shared/`, `agents/` | Skills e agentes (em inglês; respondem na língua de quem os usa) |
| `demo-project/`, `practice-project/` | Projetos práticos |
| `tools/` | `render.mjs`, `build-release.sh`, `publish-release.sh`, `switch-repos.*`, `check-repo.mjs` e os testes |
| `docs/` | Guias em inglês: instalação, resolução de problemas, FAQ, publicação, organizador. Em português em `docs/pt/`; o guia de instalação também em `docs/hi/` e `docs/he/` |

## Para o organizador

- Todos os URLs e versões estão em `repos.conf`. Este README é gerado: edita os templates em `tools/templates/<língua>/` (`en`, `pt`, `hi`, `he`) e corre `node tools/render.mjs`.
- Release: `tools/build-release.sh v1.0.0-rc.1` (gera `dist/v1.0.0-rc.1/`) e `tools/publish-release.sh v1.0.0-rc.1` (cria a release em https://github.com/cx-guilherme-pinto/workshop-claude/releases/tag/v1.0.0-rc.1).
- Verificar o repositório: `node tools/check-repo.mjs`. Testes: `node --test tools/test/` e `bash setup/test/test-mac.sh`.
- Mudar para os repositórios públicos: [docs/pt/PUBLISHING.md](docs/pt/PUBLISHING.md).
- Decisões e fontes: [DECISIONS.md](DECISIONS.md).

Quem quiser verificar antes de executar encontra os SHA-256 em https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/SHA256SUMS.
