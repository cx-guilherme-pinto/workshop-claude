# CLAUDE.md — kit do workshop "Orquestração de Agentes com Claude"

Kit para algumas centenas de participantes, cada um com a sua conta **Console** (API), em portáteis da empresa com Mac e Windows, **sem admin** e às vezes atrás de proxy. O kit inclui:
- um setup de um só comando;
- as skills e os agentes;
- os hooks de custo e a statusline;
- o orquestrador;
- dois projetos práticos: a Arena de Segurança e o projeto de treino;
- os slides.

A app Memória vive noutro repositório (`claude-memory-app`), ao lado deste.

**Lê primeiro `docs/HANDOVER.md`**, com o estado, o que falta e por onde continuar. As decisões e os porquês estão em `DECISIONS.md` (D-01 a D-20).

## Mapa

| Pasta | O que é |
|---|---|
| `setup/` | `setup-mac.sh`, `setup-windows.ps1`, `bootstrap-windows.ps1` e os catálogos `messages.en.json` (o que o setup mostra) e `messages.pt.json` (gera a TROUBLESHOOTING em pt). Testes em `setup/test/` |
| `installer/` | Node sem dependências: instalação ao nível do utilizador, merge do `settings.json`, montagem da Arena, injeção na release e redação |
| `orquestrador/` | `next-wave`, `grade`, `gate`, `digest`, `report`, `publicar-texto` e `estimate`. O DAG é determinístico (D-07) |
| `hooks/`, `statusline/`, `pricing.json` | Custo pelos tokens reais dos transcripts × `pricing.json` (D-08). Nunca o `total_cost_usd` |
| `skills-demo/`, `skills-prod/`, `skills-shared/`, `agents/` | Skills e agentes, em inglês, que respondem na língua da pessoa (D-20) |
| `demo-project/` | A Arena (100 cartões; `i18n/en/` sobrepõe-se ao pt). Soluções de referência em `dev/solutions/` (fora do kit) |
| `exemplo-projeto-real/` | O projeto de treino do Projeto 2 (issues em JSON local) |
| `benchmark/` | `run-benchmark.sh`, `run-projeto2.sh`, `collect`/`report`/`calibrar` e `REPORT.md` |
| `slides/` | `build.mjs` + `content.mjs` → `workshop.pptx` e `workshop.en.pptx` (`--lingua en`) |
| `tools/` | `render.mjs`, `check-repo.mjs`, `switch-repos.sh`, `build-release.sh`, `publish-release.sh`, `test-all.sh`, `testar-maquina.sh`, `levar-para-outra-maquina.sh` e `publicar-github-corporativo.sh` |

## Regras que não se partem

- **URLs e versões só no `repos.conf`.** Depois de mudar, corre `node tools/render.mjs` (README, INSTALAR, PUBLICAR, TROUBLESHOOTING, em pt e en). O `node tools/check-repo.mjs` falha se o servidor antigo aparecer noutro sítio.
- **Os `.ps1` são só ASCII.** Os textos para o utilizador vêm dos `messages.*.json`, e os dois catálogos têm as mesmas chaves (o check-repo verifica-o).
- **Skills:** frontmatter com `model`, `allowed-tools` e `disable-model-invocation`. Têm:
  - a linha **Commands:**: cada comando sozinho, sem `;`, `&&` nem `|`;
  - a linha **Language:**;
  - `{{KIT_DIR}}` nas de produção;
  - um "sim" explícito antes de qualquer escrita no Jira ou no GitHub.
- **Marcadores que não se traduzem:** `ESTADO: LOTE|FIM|BLOQUEADO`, `<<<CHAMADAS … CHAMADAS>>>`, `GATE: APROVADO|REPROVADO`, `PLANO OK` e semelhantes (lista na D-20).
- **Tokens:** nunca na linha de comandos, em ficheiros ou em logs. Vão para o `curl` por `-K -` (stdin) e os logs passam pela redação.
- **Sem admin e sem o Python do sistema** (D-14 e D-15): Node, uv/Python, gh, git portátil e acli vão para o perfil do utilizador.
- **Nunca cortar por custo:** só avisos aos US$ 5 e aos US$ 10.
- **Texto do kit:** português de Portugal ou inglês. Ao traduzir, localiza; os termos técnicos (swarm, agent, skill, hook, MCP, worktree…) ficam em inglês. O organizador escreve em português do Brasil; responde-lhe em português.

## Testes

```bash
bash tools/test-all.sh            # hooks, orquestrador, Arena (pt e en), projeto de treino, check-repo, tools, shellcheck (Docker)
bash setup/test/test-mac.sh       # funções do setup do Mac (bash 3.2)
```

**Pester e PSScriptAnalyzer** (Windows), em Docker: imagem `mcr.microsoft.com/powershell:latest`, `--platform linux/amd64` e `-e DOTNET_TieredCompilation=0 -e DOTNET_TieredPGO=0 -e DOTNET_EnableWriteXorExecute=0` (sem estes, a emulação rebenta). Os módulos Pester 5.7 e PSScriptAnalyzer 1.23 vão montados de uma pasta, e o comando é `Invoke-Pester -Path setup/test/setup-windows.Tests.ps1`.

**Máquina inteira com contas reais** (Jira, Confluence, GitHub corporativo): `bash tools/testar-maquina.sh --ajuda` (guia em `docs/TESTAR-MAQUINA.md`).

**Benchmark:** `benchmark/run-benchmark.sh --n 1 --sem-isolamento` (`BENCH_LINGUA=en` para a Arena em inglês) gasta cerca de US$ 1 por execução. Confirma com o organizador antes de correr mais de uma.

## Publicar

- **Release:** `tools/build-release.sh <tag>` e `tools/publish-release.sh <tag> [--prerelease]`. A tag tem de ser igual ao `WORKSHOP_VERSION`.
- **GitHub da empresa:** `tools/publicar-github-corporativo.sh --dono <org> [--servidor <host>] --dry-run` primeiro. Cria os repositórios, envia o histórico, muda os URLs e publica a app e depois o kit, com uma confirmação por passo.
- **Confirmações:** qualquer push, release ou escrita no Jira ou no GitHub só com o "sim" do organizador na conversa.
