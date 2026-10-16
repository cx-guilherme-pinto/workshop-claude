# DECISIONS — registo de decisões do kit

Cada entrada diz **o que se decidiu, porquê e com que fonte**. A documentação foi verificada em **16 out. 2026** (Claude Code 2.1.285 local; 2.1.292 no canal `stable`).

---

## D-01 · Dois repositórios e um único ficheiro de URLs

- `workshop-claude` (o kit) e `claude-memory-app` (a app), cada um com as suas versões.
- **Todos os URLs e versões vivem em `repos.conf`.** Scripts, docs, README e slides leem-no ou são gerados a partir dele (`tools/render.mjs`). Qualquer chave pode ser sobreposta por uma variável de ambiente com o mesmo nome.
- Só se usa o que funciona igual no Gitea e no GitHub: clone HTTPS, ficheiros raw (por padrão configurável) e assets em `/releases/download/<tag>/<ficheiro>`.
- A única chamada a uma API específica é **criar a release**, isolada em `create_release()` (`tools/publish-release.sh`), com um ramo `gitea` e outro `github` escolhidos por `RELEASE_PROVIDER`.
- Não há runners de Actions no Gitea. As releases fazem-se **localmente** com os mesmos scripts do CI, usando o token que o git guarda no Keychain (acesso à API confirmado com `GET /api/v1/user`). Os workflows ficam em `.github/workflows/`: o Gitea Actions usa essa pasta quando não existe `.gitea/`, e ficam prontos para o GitHub.

## D-02 · Distribuição: um arquivo verificado, com a versão fixada

- O participante corre **um script**, que é um asset da release. O build da release **injeta** nesse script os valores do `repos.conf` e o SHA-256 do arquivo do kit.
- O script descarrega **um só ficheiro** (`workshop-kit-<versão>.tar.gz` no Mac, `.zip` no Windows), verifica o checksum e extrai-o. Se o download falhar, faz `git clone --depth 1 --branch <tag>`.
- Porquê: um download verificável e sem APIs, igual nos dois servidores. Embutir tudo no script tornaria-o enorme e difícil de rever; descarregar ficheiro a ficheiro multiplicaria os pontos de falha numa rede corporativa.
- Também se publicam `SHA256SUMS` e uma versão com tag fixa, para quem quiser verificar antes de executar.

## D-03 · Verificação da documentação oficial

| Tema | O que a documentação diz hoje | Fonte |
|---|---|---|
| Instalador nativo | `curl -fsSL https://claude.ai/install.sh \| bash -s <versão>`; `& ([scriptblock]::Create((irm https://claude.ai/install.ps1))) <versão>`; não precisa de admin; fica em `~/.local/bin` | https://code.claude.com/docs/en/setup |
| Atualizações | `DISABLE_AUTOUPDATER=1` em `env` para as automáticas; `claude doctor` | https://code.claude.com/docs/en/setup |
| Windows | Git for Windows é opcional mas recomendado (dá o Git Bash); sem ele usa-se a ferramenta PowerShell; `CLAUDE_CODE_GIT_BASH_PATH` | https://code.claude.com/docs/en/setup |
| Login Console | `claude auth login --console`; `claude auth status` (JSON, exit 0/1, `authMethod`); credenciais no Keychain (Mac) e em `%USERPROFILE%\.claude\.credentials.json` (Windows) | https://code.claude.com/docs/en/authentication |
| `setup-token` | **Exige assinatura**: não serve para contas Console | https://code.claude.com/docs/en/authentication |
| Modelo por defeito | **Opus 5.5** em contas API | https://code.claude.com/docs/en/model-config |
| Skills | `~/.claude/skills/<n>/SKILL.md` e `.claude/skills/`; frontmatter `model`, `allowed-tools`, `disable-model-invocation`, `argument-hint`, `context: fork`… | https://code.claude.com/docs/en/skills |
| Subagentes | `.claude/agents/*.md`; `model`, `tools`, `maxTurns`, `effort`, `permissionMode`, `isolation: worktree`; ferramenta `Agent`; **máximo de 20 em simultâneo, o 21.º falha (sem fila)**; `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | https://code.claude.com/docs/en/sub-agents |
| `/agents` | Já não abre um assistente; lembra de editar `.claude/agents/` | https://code.claude.com/docs/en/sub-agents |
| Workflows | `.claude/workflows/*.js`; disponíveis com acesso API; 16 agentes em paralelo por defeito, até 256 com `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`; 1000 por execução | https://code.claude.com/docs/en/workflows |
| Hooks | 33 eventos; `SubagentStop` traz `agent_id`, `agent_type`, `agent_transcript_path`; exit 0 + `systemMessage` só informa; exit 2 bloqueia (não usamos); no Windows correm em Git Bash, ou em PowerShell se não houver Git Bash | https://code.claude.com/docs/en/hooks |
| Statusline | `statusLine.command`; stdin com `cost.total_cost_usd`, `cost.total_duration_ms`, `model.display_name`, `workspace.project_dir` | https://code.claude.com/docs/en/statusline |
| `claude -p` | `--output-format json` (`total_cost_usd`, `modelUsage`, `permission_denials`), `--tools`, `--disallowedTools`, `--permission-mode`, `--json-schema`, `--session-id`, `--resume`; `--bare` **ignora hooks e o Keychain** | https://code.claude.com/docs/en/cli-reference |
| `/usage` | `/cost` passou a ser alias de `/usage`; o valor em dólares é uma **estimativa local** a preço de lista | https://code.claude.com/docs/en/costs |
| `/loop` | `/loop [intervalo] [prompt]`; com intervalo fixo ou com ritmo próprio; só corre com a sessão aberta | https://code.claude.com/docs/en/scheduled-tasks |
| `/btw` | Pergunta lateral que não entra na conversa | https://code.claude.com/docs/en/commands |
| `/rewind` | Checkpoints (Esc Esc); não restaura alterações feitas por Bash nem, na maior parte, as dos subagentes | https://code.claude.com/docs/en/checkpointing |
| Worktrees | `claude --worktree <nome>` / `-w`; `isolation: worktree` nos subagentes | https://code.claude.com/docs/en/worktrees |
| Rotinas `/schedule` | **Exigem assinatura claude.ai** (research preview) | https://code.claude.com/docs/en/routines |
| Remote Control (telemóvel) | **Não suporta API keys** | https://code.claude.com/docs/en/remote-control |
| Claude Desktop (separador Code) | Exige assinatura Pro/Max/Team/Enterprise | https://code.claude.com/docs/en/desktop-quickstart |
| Desktop: downloads | Mac: `https://claude.ai/api/desktop/darwin/universal/dmg/latest/redirect`; winget `Anthropic.Claude` (exe com `Scope: user`, Windows ≥ 10.0.18362) | doc acima + manifesto winget-pkgs |
| MCP | `claude mcp add --transport http --scope user <n> <url>`; `claude mcp add <n> -- <cmd>`; `claude mcp list` liga-se e mostra o estado | https://code.claude.com/docs/en/mcp |
| Atlassian | `claude mcp add --transport http atlassian https://mcp.atlassian.com/v2/mcp` + `/mcp` (OAuth 2.1); worklog: `addOrEditJiraIssueWorklog`; o admin controla domínios e tokens; gasta créditos Rovo | https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/ |
| GitHub MCP | O remoto (`https://api.githubcopilot.com/mcp`) exige PAT no Claude Code | https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-claude.md |
| Rede | `HTTPS_PROXY`/`NO_PROXY`; `NODE_EXTRA_CA_CERTS`; o instalador nativo usa a store do SO; lista de domínios necessários | https://code.claude.com/docs/en/network-config |
| Limites de taxa | Tiers Evaluation (contas novas, limites mais baixos e não publicados), Start (1000 RPM / 2M ITPM por modelo), Build, Scale; **por organização**; as leituras de cache não contam para o ITPM | https://platform.claude.com/docs/en/api/rate-limits |

## D-04 · Preços (`pricing.json`)

US$ por milhão de tokens, consultados a 16 out. 2026 em https://platform.claude.com/docs/en/about-claude/pricing:

| Modelo | ID | Input | Cache 5 min | Cache 1 h | Leitura de cache | Output |
|---|---|---|---|---|---|---|
| Opus 5.5 | `claude-opus-5-5` | 4 | 5 | 8 | 0,20 | 20 |
| Sonnet 5.5 | `claude-sonnet-5-5` | 2 | 2,50 | 4 | 0,10 | 10 |
| Haiku 5.5 (prompt ≤ 100K) | `claude-haiku-5-5` | 0,10 | 0,125 | 0,20 | 0,01 | 0,50 |
| Haiku 5.5 (prompt > 100K) | `claude-haiku-5-5` | 0,50 | 0,625 | 1 | 0,05 | 2,50 |

Um único `pricing.json`, indexado pelo ID do modelo. Um modelo desconhecido mostra "?" e nunca US$ 0.

## D-05 · O que muda para contas Console (API)

- **Modelo:** o projeto demo e as skills fixam Sonnet na sessão principal. Sem isso, a conta API arranca em Opus 5.5.
- **Rotinas:** o `/schedule` não existe para contas API. O workshop ensina o `/loop` (com a sessão aberta) e uma "rotina local" (launchd ou Agendador de Tarefas a correr `claude -p`). Fica um slide "com assinatura" para quem a tiver.
- **Claude Desktop:** só entra com conta claude.ai, e o separador Code exige assinatura. É instalado como passo **opcional** (`--sem-desktop` para o saltar), e todo o hands-on corre no Claude Code CLI.
- **Telemóvel:** o Remote Control não aceita API keys. Fica um slide "com assinatura".

## D-06 · GitHub: `gh` em vez de MCP

O MCP remoto do GitHub exige um PAT por pessoa, e a documentação de custos recomenda CLIs como o `gh` por gastarem menos contexto. Decisão: **o `gh` é a ferramenta principal** (`/task-intake`, `/task-report`). O MCP do GitHub fica documentado como opcional no FAQ.

## D-07 · Orquestração determinística

- O grafo **não** fica nas mãos do modelo. `orquestrador/next-wave.mjs` lê `plan.json` e o estado, avalia o lote anterior e devolve o próximo lote como uma lista de chamadas `Agent`, que a skill lança tal como vêm.
- Porquê: com 13 a 16 chamadas em paralelo, um modelo tende a dividi-las, a reescrever os prompts ou a esquecer dependências. O script é reproduzível e torna o benchmark comparável entre execuções.
- `orquestrador/grade.mjs` é o **avaliador único**: corre o teste e escreve `.workshop/status/<id>.json`. Os hooks só **medem custo** (append em `usage.jsonl`) e nunca bloqueiam.
- As tentativas são feitas pelo script: a 2.ª tentativa repete em Haiku com o erro anterior, e a 3.ª passa para o `implementer` (Sonnet). Depois disso a tarefa fica "falhou".
- Paralelismo por defeito: **8** no modo participante, porque as contas novas Console podem estar no tier Evaluation; **16** no modo apresentador. Configurável com `ARENA_MAX_PARALELO`. Nunca passa de 16, abaixo do limite de 20 subagentes.

## D-08 · Medição de custo

- O hook `SubagentStop` lê o transcript do subagente. Deduplica por `message.id`, ficando com a entrada de maior `output_tokens`, porque o streaming repete a mensagem. Preça à parte input, output, escrita de cache a 5 min e a 1 h e leitura de cache.
- O hook `Stop` regista o custo cumulativo da sessão principal, só com as mensagens que não são `isSidechain`.
- Formato confirmado num transcript real: `message.usage` traz `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` e `cache_creation.{ephemeral_5m_input_tokens, ephemeral_1h_input_tokens}`; `message.model`; `timestamp`; `isSidechain`. Cada subagente tem um `.meta.json` com `agentType` e `toolUseId`.
- Aviso de orçamento só **informativo**: uma mensagem ao passar US$ 5 e outra ao passar US$ 10. A execução continua sempre.

## D-09 · Arena de Segurança: cartões = dados + `validate()`

- Os 4 modelos de `templates/` tratam de **todo** o render, com DOM seguro: só `textContent` e uma lista de atributos permitidos. O `card.js` só tem dados e lógica, e não pode tocar em `document`, `window`, rede ou armazenamento. O teste verifica a fonte sem strings nem comentários, porque o texto dos desafios pode falar de `innerHTML` sem ser código.
- O mesmo teste corre em Node (com um DOM mínimo, `lib/fakedom.js`) e no browser (`lib/testkit-browser.js`), sem import maps, para não violar a CSP.
- As soluções de referência ficam em `dev/solutions/` e **não entram no kit**. `tools/dev/check-solutions.mjs` prova que todos os testes são satisfazíveis.

## D-10 · Skill de design: fork no nosso repo

- Pedido do organizador: nada externo, tudo dentro do repo.
- Origem: `github.com/Leonxlnx/taste-skill`, pasta `skills/taste-skill/` (nome `design-taste-frontend`), commit `2b44c81bbe36ac8a8a6bdd1c9ff593f28b8728f4` (tag v2.0.0, assinado), tree hash `d11cb9568d2f27401ce1f48217721e69ee32637f`.
- Licença MIT, que permite copiar e redistribuir desde que a nota de licença acompanhe a cópia.
- Revisão de segurança: não há código malicioso, ofuscação nem exfiltração. Só `scripts/assets.mjs` faz pedidos de rede (a 6 APIs públicas de imagens). Os restantes scripts correm localmente (lint, sorteio de direções, inspeção com Chrome headless).
- Alterações no fork (ver `skills-shared/design-taste-frontend/PATCHES.md`): `disable-model-invocation: true`; `scripts/assets.mjs` removido; secção "Uso neste kit".
- Os agentes do enxame **não** carregam a skill completa: é para landing pages e custa centenas de milhares de tokens por página. Recebem um `DESIGN.md` de uma página derivado dela.

## D-11 · App de memória

- Python 3.12 gerido pelo `uv` (sem admin). O wheel é descarregado com `curl` (o `uv` só faz auth Basic) e verificado por SHA-256, e as dependências ficam fixas num `constraints.txt`.
- O pywebview cai silenciosamente no IE11 quando o WebView2 falta. Por isso, a app deteta o WebView2 pelo registo e, se faltar, abre a mesma UI no browser em 127.0.0.1.
- Embeddings **desligados**: o fastembed traz cerca de 45 MB, e o onnxruntime deixou de publicar wheels para Mac Intel. A pesquisa usa SQLite FTS5.
- Executáveis não assinados (PyInstaller) estão excluídos, por causa do Gatekeeper.
- **Release v0.1.0 publicada** (16 out. 2026) no repositório `claude-memory-app`: wheel `memoria-0.1.0-py3-none-any.whl` (SHA-256 `2f8f9b07…a569fc`), `constraints.txt`, `SHA256SUMS`, `install.sh`, `install.ps1`. 116 testes verdes; `memoria selftest --gui` passa no Mac (arm64). O Windows só foi verificado estaticamente.
- **`cryptography` fixado em 46.0.3** (dependência indireta do `mcp`, não usada pelo servidor). A versão 49+ não tem wheel para Mac Intel e a 46.0.4+ não tem para Windows ARM; sem esta fixação, essas máquinas tentariam compilar com Rust e falhariam. Mantemos a 46.0.3 porque o setup também deteta Windows ARM.
- Comandos: `memoria` e `memoria-gui` (no Windows, sem janela de consola; é o que o atalho abre). Instalação com `uv tool install --managed-python`, que garante FTS5.

## D-13 · Resultados dos spikes (fase 1, Claude Code 2.1.285)

Spike 2: `claude -p "/demo-swarm --auto"` com 4 tarefas (`lib-hash` e 3 cartões, um deles dependente do `lib-hash`).

| Medida | Resultado |
|---|---|
| Resultado | 4/4 verdes, 2 lotes, 57 s de relógio |
| Custo pelos preços publicados (hooks + `pricing.json`) | **US$ 0,12**: sessão principal Sonnet US$ 0,11 e 4 workers Haiku US$ 0,0099 (US$ 0,0016 a 0,0042 cada, 8 a 21 s cada) |
| `total_cost_usd` do Claude Code | US$ 0,59 |

O que o spike mostrou:
- **Os hooks disparam em `-p`:** `PreToolUse(Agent)`, `SubagentStart`, `SubagentStop`, `PostToolUse(Agent)` e `Stop`. O `SubagentStop` traz `agent_transcript_path`. O `PostToolUse(Agent)` **não** traz usage (só `agentId`, `status` e `isAsync`), por isso a medição tem de ser pelo transcript.
- **O `total_cost_usd` inclui os subagentes, mas está errado nesta versão.**
  - O 2.1.285 e o 2.1.292 não conhecem o Haiku 5.5 (`[claude-code:unrecognized_model]`, `costBasis: "unknown"`) e preçam-no a preço de Opus.
  - Também preçam a leitura de cache da Sonnet 5.5 a 0,1× o input, quando a página de preços diz 0,05×.
  - Os tokens coincidem exatamente com os nossos; só os preços diferem.
- **Decisões que daqui resultam:**
  - A statusline, o `/demo-cost` e o benchmark usam o **nosso** cálculo (`pricing.json`).
  - O FAQ explica porque é que o `/usage` mostra um valor mais alto.
  - O número da fatura é sempre o da Console.
- **Confiança na pasta:** até a pasta ser confiada, o Claude Code ignora as `permissions.allow` do `.claude/settings.json` do projeto. Para o participante, o primeiro `claude` na pasta mostra o diálogo de confiança, e aceitar faz parte do passo 1 do hands-on (um momento didático). No benchmark, a pasta é pré-confiada na config temporária.
- Os IDs completos de modelo (`claude-haiku-5-5`) funcionam nos agentes. O alias `haiku` não foi usado, porque pode apontar para outro modelo nesta versão.

## D-14 · Python: nunca o do sistema

- Nenhum participante precisa de ter Python. O único Python usado no kit é o que o **`uv`** descarrega para a app de memória: `uv tool install --managed-python --python 3.12`. O `--managed-python` obriga o uv a usar o seu próprio Python (python-build-standalone, de `releases.astral.sh`), mesmo que exista um Python no sistema. O uv é um binário único, sem dependências, instalado sem admin.
- Os scripts que correm na máquina do participante (setup, installer, hooks, orquestrador, statusline, skills) **não chamam `python` nem `python3`**: está verificado por `grep`. Isto também evita, no Mac, o `python3` "falso" que abre a instalação das Command Line Tools.
- **Prova (16 out. 2026, Mac arm64):** com o `PATH` sem nenhum `python` e a pasta de Pythons e a cache do uv vazias, o uv descarregou o CPython 3.12.13, instalou as 39 dependências do PyPI e o `memoria selftest` passou (SQLite 3.53.1 com FTS5).
- **Validação na máquina do participante:** o passo 10 do setup e o `--check` correm `memoria selftest`, que verifica a versão do Python, o FTS5, o servidor MCP e a interface.
- Python continua a ser usado **só do lado do organizador** (QA dos slides e scripts de desenvolvimento), nunca na máquina do participante.

## D-15 · O script instala e configura tudo, partindo de uma máquina vazia

Pedido do organizador: não assumir **nada** pré-instalado. O mínimo do mínimo é o Claude Code e o GitHub, e o script tem de os instalar e fazer os logins.

| Peça | Se faltar, o script… | Sem admin |
|---|---|---|
| Git | Mac: usa as Command Line Tools se existirem; senão instala o **git portátil** do GitHub Desktop (`dugite-native`, versão e SHA-256 fixados no `repos.conf`) em `~/.workshop-claude/git`, com um wrapper em `~/.workshop-claude/bin/git`. Windows: Git for Windows por utilizador (winget ou instalador oficial `/CURRENTUSER`, SHA-256 fixado), que também dá o Git Bash ao Claude Code | sim |
| Claude Code | instalador nativo oficial, versão fixada | sim |
| **Login Claude** | pergunta e abre `claude auth login --console` (browser). Se já houver um login claude.ai, pergunta antes de trocar | — |
| Node.js | usa o existente se for ≥ 22; senão brew/winget; senão o arquivo oficial (SHA-256 verificado) em `~/.workshop-claude/node` | sim |
| uv + Python | instalador oficial do uv; o Python 3.12 vem do uv (D-14) | sim |
| GitHub CLI | brew/winget; senão o zip oficial (SHA-256 verificado) em `~/.workshop-claude/bin` | sim |
| **Login GitHub** | **obrigatório**: pergunta e abre `gh auth login --hostname github.com --git-protocol https --web` (browser) e depois `gh auth setup-git`. Sem login, o passo fica ❌ e entra na lista "Faltam N passos" | — |
| MCP Atlassian, skills, agentes, hooks, statusline, projetos, app de memória | tudo pelo script; o OAuth do Jira acaba com `/mcp` na primeira sessão | sim |

- **Testado (Mac arm64, 16 out. 2026):** num HOME vazio com acentos (`Maria João`, debaixo de `/var` → `/private/var`), sem `git`, sem Command Line Tools (`xcode-select` falso a falhar), sem Node, sem Claude Code e sem `gh`. O script instalou tudo: git portátil 2.53.0, Claude Code 2.1.292, Node 24.22.0, uv 0.13.1, gh 2.102.0, 7 skills, 6 agentes e os projetos (com commit inicial feito pelo git portátil), e a app de memória com Python 3.12. Os dois logins são interativos e não correm em `--sim`: estão no checklist manual (M6, W16).
- **Bug encontrado e corrigido neste teste:** a deteção de "script principal" (`import.meta.url === argv[1]`) falhava em pastas com links simbólicos (`/var`, `/tmp`, iCloud) e os scripts saíam em silêncio. Passou a comparar caminhos reais (`ehPrincipal()`).

## D-12 · Testes sem estragar a configuração de quem constrói o kit

- O organizador usa claude.ai Max e tem statusline e plugins próprios. Os spikes correm com `--setting-sources project,local --strict-mcp-config`.
- O setup e o benchmark correm com `HOME`/`CLAUDE_CONFIG_DIR` temporários e `CLAUDE_CODE_OAUTH_TOKEN`, guardado no Keychain e lido só em runtime.
- O benchmark corre na assinatura Max (decisão do organizador). O custo é a estimativa a preço de lista, o mesmo cálculo que um participante Console vê. O fluxo de login Console fica num checklist manual (`docs/TESTES-MANUAIS.md`).
