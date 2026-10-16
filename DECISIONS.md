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
- Alterações no fork (ver `skills-shared/design-taste-frontend/PATCHES.md`): `disable-model-invocation: true`; `scripts/assets.mjs` removido; secção "Use in this kit" ("Uso neste kit" até à D-20).
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

## D-16 · Resultados do benchmark (16 out. 2026, Claude Code 2.1.285, Mac arm64)

Detalhe completo em `benchmark/REPORT.md` e `benchmark/results.csv`. O custo é calculado com os tokens reais e os preços publicados (`pricing.json`).

| Modo | Execuções | Sucesso | Custo mín · média · máx | Duração mín · média · máx | Agentes |
|---|---|---|---|---|---|
| Participante (15 cartões + lib + 2 páginas + integração + revisão) | 10 | **10/10** | US$ 0,90 · **1,03** · 1,12 | 3,5 · **4,0** · 4,8 min | 22–23 |
| Apresentador (100 cartões) | 3 | **3/3** | US$ 2,53 · **2,54** · 2,55 | 6,6 · **7,1** · 7,9 min | 107 |

- **Critério de aceitação cumprido com folga:**
  - todas as execuções terminaram com testes verdes e gate aprovado;
  - o máximo ficou muito abaixo dos US$ 10 e dos 20 min;
  - a média ficou abaixo dos US$ 5, também no modo apresentador.
- **Onde vai o dinheiro (participante):**
  - Sonnet US$ 0,68 em média: a sessão principal, as páginas e a integração;
  - Opus US$ 0,32: o planner e o revisor;
  - Haiku US$ 0,03, ou seja, 17 agentes a cerca de US$ 0,0017 por cartão.
  A sessão principal fica com cerca de 50% do custo, o que confirma que o que custa é a coordenação, não o enxame.
- **O `total_cost_usd` do Claude Code** daria cerca de 2,4× mais no participante e 4× mais no apresentador, porque esta versão não conhece o Haiku 5.5 (D-13).
- **Margem:** como o custo real é cerca de 5× inferior ao alvo, não foi preciso otimizar mais. Ficou no desenho atual: o paralelismo de 8 protege as contas novas, e o planner e o revisor em Opus dão a qualidade do gate.
- **Estimativa antes de executar:** os perfis de tokens de `orquestrador/perfis.json` foram calibrados com estas execuções (`benchmark/calibrar.mjs`), com uma margem de 15%. Resultado: US$ 1,00 estimado no participante e US$ 2,43 no apresentador.
- **Ressalvas:**
  - corrido numa assinatura Max e sem isolamento total, porque o token de benchmark ficou truncado; isso não afeta os tokens nem o preço;
  - em modo não interativo, os subagentes correm em segundo plano;
  - um participante em modo interativo e com uma conta nova (tier Evaluation) pode demorar mais.
- **Gravação escolhida para o preview:** `20261016-153209-apresentador-gravado` (6,9 min, US$ 2,55, 105/105). É a mais representativa: a duração e o custo ficam na mediana das três. A primeira gravação foi descartada porque o tradutor do terminal marcava os lançamentos em segundo plano como falhas. O vídeo acelerado tem 92 s (4×). O replay e a Arena final estão em `presenter-replay/`.

## D-17 · macOS: sem assinatura de código, porque a instalação é por `curl`

- **Validado (16 out. 2026, macOS 26.6.2 arm64):**
  - um ZIP descarregado com `curl` e a app **sem assinatura** extraída dele ficam **sem** `com.apple.quarantine`;
  - `open` lança essa app **sem pedir aprovação**;
  - a mesma app com quarentena (como se viesse do Safari) é rejeitada pelo Gatekeeper (`spctl`: `rejected source=no usable signature`);
  - os binários que o setup instala (Claude Code, Node, gh, git portátil, uv) e o `Memória.app` criado localmente ficam todos sem quarentena.
- **Decisão:** não se assina nem se notariza por defeito. Os participantes instalam tudo com o script. Só um download manual pelo browser, AirDrop ou Mail exigiria aprovação em Definições → Privacidade e Segurança, e é isso que a documentação desaconselha.
- **Plano B:** o organizador tem conta Apple Developer. Se uma frota corporativa tiver um EDR (Santa, por exemplo) que só aceite binários assinados, há um script opcional para o organizador assinar e notarizar ele próprio (Developer ID + `notarytool` + `stapler`), sem guardar credenciais no repositório.

## D-18 · Projeto 2 testado de ponta a ponta (projeto de treino, EX-3)

`benchmark/run-projeto2.sh EX-3` corre `/task-intake issues/EX-3.json` → `/task-plan --auto` → `/task-swarm --auto` → `/task-gate --auto` → `/memoria`, com as skills e os agentes `ws-*` instalados ao nível do projeto (nunca em `~/.claude`).

- **Resultado:** 233 s ao todo.
  - O planner fez 2 tarefas Haiku + 1 Sonnet, e o validador juntou a integração e a revisão.
  - O enxame ficou 4/4 verde em 1 min 49 s, e os testes do projeto passaram de 6 para 13.
  - O gate saiu **aprovado**. O revisor apontou um problema anterior à tarefa (autenticação só por cabeçalho) e sugeriu um ticket novo.
  - Custo de **US$ 0,60**, com a estimativa do plano em US$ 0,52, e zero negações de permissão.
- **Memória:** as memórias ficaram com `tarefa: EX-3`, `epico: EX-100` e etiquetas, e `memoria procurar EX-100` encontra-as.
- **Não testado aqui:** o `/task-report` a publicar no Jira ou no GitHub. Precisa de um Jira e de um repositório reais e pede confirmação a cada escrita. O texto que publicaria é gerado e verificado por `orquestrador/publicar-texto.mjs`.

## D-19 · Atlassian CLI (`acli`) como reserva do MCP do Jira

- **Pedido do organizador:** ter uma alternativa quando o MCP do Jira tiver problemas. Usa-se o **Atlassian CLI oficial** (developer.atlassian.com/cloud/acli), não o "ACLI" da Appfire, que é outro produto.
- **Verificado (16 out. 2026, acli 1.3.39-stable, a doc ainda descreve a 1.3.15):**
  - existem URLs com versão fixa, `https://acli.atlassian.com/{darwin|windows}/<versão>/acli_<versão>_<so>_<arq>.{tar.gz|zip}`; a doc só mostra `/latest/`;
  - não há ficheiro de checksums. Os SHA-256 do Mac são os da fórmula oficial `atlassian/homebrew-acli` (gerada pelo GoReleaser) e coincidem com os do download. Os do Windows foram calculados a partir do download oficial;
  - Mac: binário assinado com Developer ID da Atlassian (UPXU4CQZ5P), **sem** notarização. Vindo por `curl`, não tem quarentena e corre sem pedidos (como na D-17). Testado em arm64 e em x64 (Rosetta);
  - comandos: `acli auth login` (OAuth no browser, um login para Jira e Confluence); `acli jira auth login --site … --email … --token` (API token, lido do stdin: tem de vir de um pipe, porque escrito à mão dá erro ao fim de alguns segundos; documentado com `pbpaste |` e `Get-Clipboard |`); `jira workitem view <chave> --fields … --json`, `jira workitem search --jql … --json` e `jira workitem comment create --key … --body-file …`. Confluence: `space list/view`, `page view --id`, `blog`;
  - **não existe worklog** no `acli`;
  - desde a 1.3.15, um admin de cada site tem de autorizar a app ACLI uma vez (OAuth). Sem isso: "site admin must authorize this app".
- **Decisão:**
  - o passo 7 passa a ser "Jira (MCP Atlassian e Atlassian CLI)". Instala o `acli` em `~/.workshop-claude/bin` sem admin, com versão e SHA-256 no `repos.conf`, e oferece o login (`acli auth login`). Falhar a instalação dá só ⚠️ `E-ACLI-01`; não ter login dá só uma nota. O passo nunca falha por causa do `acli`;
  - `/task-intake`: o MCP primeiro; se faltar ou falhar, `acli jira workitem view` (só leitura, permitido na skill). Grava `"via":"acli"` no `tarefa.json`;
  - `/task-report`: com `via: acli` ou o MCP em falha, publica os comentários com `acli jira workitem comment create --body-file`, um comando de cada vez, depois do "sim" e com a aprovação do Claude Code a cada comando (a escrita não está no `allowed-tools`). O registo de horas fica para a pessoa fazer à mão. O `publicar-texto.mjs` escreve os textos em `.workshop/publicar/*.txt`;
  - suporte de 6 meses por versão: rever `ACLI_VERSION` se o workshop for depois de mar. 2027.
- **Acrescento: Confluence no `/task-intake` (16 out. 2026).** É um passo opcional e só de leitura. Se a descrição da issue do Jira tiver links `…/wiki/spaces/<espaço>/pages/<id>/…`, o intake lê no máximo 2 páginas. Guarda o título, o URL e um resumo de até 800 caracteres de cada uma em `## Documentação (Confluence)` do `tarefa.md`. Sem MCP e sem login no `acli`, escreve uma linha de aviso e continua: o intake nunca para por isto.
  - **MCP:** a ferramenta é `getConfluenceContent`. Na lista oficial "Supported tools" do servidor v2 (consultada a 16 out. 2026), é *Primary*, isto é, visível sem `discover`. Guias mais antigos falam de `getConfluencePage`, que não existe no v2. A doc não descreve os parâmetros, e eles não foram vistos num servidor com login. Por isso a skill só diz para passar o `cloudId` e o id da página, e o Claude lê o esquema da ferramenta;
  - **`acli`:** `acli confluence page view --id <id> --body-format storage --json`. O `--body-format` aceita `storage`, `atlas_doc_format` e `view`. A medição foi feita na API REST v2 do Confluence Cloud, que recebe o mesmo `body-format`, em 13 páginas públicas reais de 2 sites (lf-onap e lf-hyperledger). Total do JSON: `storage` 172 KB, `view` 204 KB (+18 %), `atlas_doc_format` 279 KB (+62 %). O `storage` foi o mais pequeno em todas as páginas; uma página de requisitos típica tem 8 a 30 KB. A saída do próprio `acli` não foi medida, porque esta máquina não tem login: fica para o teste M7;
  - o `acli` tem um login geral (`acli auth login`) e logins por produto (`acli jira auth …`, `acli confluence auth …`). Sem login, `acli confluence auth status` e `page view` dão "unauthorized" com rc 1. Por isso a skill confirma `acli auth status` e, se falhar, `acli confluence auth status`;
  - no `allowed-tools` entram só `mcp__atlassian__getConfluenceContent`, `Bash(acli confluence auth status*)` e `Bash(acli confluence page view *)`, cada um corrido sozinho. Não há escrita no Confluence. O texto das páginas é tratado como informação, não como instruções.
- **Testes:** `test-mac.sh` com 8 casos do passo 7 (claude e acli falsos, tarball local) e Pester com 7. Instalação real a partir de acli.atlassian.com num HOME temporário com espaço e acentos, em arm64 e x64. O login OAuth e a publicação num Jira real ficam nos testes manuais M7 e W17.

## D-20 · Línguas: setup em inglês, skills em inglês que respondem na língua da pessoa, kit em pt e en

- **Pedido do organizador (16 out. 2026):** respeitar a língua da máquina de cada pessoa e suportar português, inglês, hindi e hebraico. As skills, criadas em português, passam a existir em inglês. A app Memória fica na língua nativa, com seletor de língua; é feita noutra sessão, no repositório `claude-memory-app`.
- **Decisões do organizador:**
  - **skills e agentes:** uma só versão por nome, em inglês, que substitui a portuguesa (os nomes `/demo-*` e `/task-*` não podem repetir-se). Cada skill tem a linha **Language:** e fala com a pessoa na língua dela;
  - **setup (Mac e Windows):** só em inglês, "mais seguro, todos falam". Assim evita-se o hebraico (RTL) invertido nas consolas do Windows e o devanágari partido na consola clássica. A língua da máquina continua a ser detetada, mas só para configurar o resto;
  - **docs e slides:** em português e em inglês, slides e notas do orador incluídos;
  - **orquestrador, hooks, statusline, ferramentas e jogo da Arena, e projeto de treino:** em português ou em inglês, conforme a língua da máquina.
- **Como funciona:**
  - **Deteção.** Mac: `WORKSHOP_LANG`, depois `defaults read -g AppleLanguages` (a primeira), `LC_ALL`, `LC_MESSAGES`, `LANG` e, por fim, `en`. Windows: `WORKSHOP_LANG`, depois `Get-UICulture`, `Get-Culture` e `en`. A etiqueta é normalizada (`pt_PT.UTF-8` dá `pt-PT`; `iw` dá `he`). Os casos estão em `tools/test/lingua-cases.json`, partilhados pelo Node, pelo bash e pelo Pester.
  - **O setup mostra a língua** no passo 0 (nota e tabela) e passa-a ao `install-user.mjs --lingua-maquina`, que faz duas coisas:
    - grava a definição `language` do Claude Code (`European Portuguese`, `Brazilian Portuguese`, `English`, `Hindi` ou `Hebrew`), só se a pessoa não tiver uma. Se a que lá está foi posta pelo setup e ninguém lhe mexeu, acompanha a máquina. O `--uninstall` só a tira se ainda for a do setup. Noutras línguas não se grava nada, e o Claude responde na língua em que a pessoa escreve. O passo 8 diz qual destes casos se aplicou;
    - escreve `~/.workshop-claude/kit/lingua.json`: `pt` se a máquina estiver em português, `en` em todos os outros casos (hindi e hebraico incluídos). O kit só tem textos em pt e en.
  - **App Memória (v0.3.0 ou mais recente; o `repos.conf` fixa a v0.4.0):** está nas quatro línguas (pt, en, hi e he, com o hebraico em espelho) e tem seletor de língua. Escolhe a língua sozinha: `MEMORIA_LANG`, depois a escolha guardada no seletor, depois a língua do sistema. O setup não força a `MEMORIA_LANG`, por isso numa máquina em hindi ou hebraico a app fica nessa língua, mesmo com o kit em inglês. O texto do `memoria selftest` também segue a língua. Por isso o setup corre-o com `MEMORIA_LANG=en` e decide pelo código de saída; o motivo de uma falha é qualquer etiqueta que não seja `[OK]`.
  - **Textos do kit:** `hooks/lib/lingua.mjs` escolhe pela ordem `WORKSHOP_LANG`, `lingua.json` junto do motor (kit instalado ou `<arena>/tools/workshop/`), locale do sistema e `en`.
  - **Arena:** `demo-project/` é a fonte em pt e `demo-project/i18n/en/` sobrepõe-se com os mesmos caminhos. O `assemble-demo.mjs --lingua pt|en` monta a Arena, regenera os cartões na língua (`tools/gen.mjs` lê o `"lingua"` do `cards.json`) e grava a língua em `.arena-kit.json` e em `tools/workshop/lingua.json`. O projeto de treino segue o mesmo esquema (`exemplo-projeto-real/i18n/en/`, com código, rotas e issues em inglês).
  - **Marcadores que não se traduzem**, porque as skills, o benchmark e as gravações dependem deles: `ESTADO: LOTE|FIM|BLOQUEADO`, `<<<CHAMADAS`/`CHAMADAS>>>`, `GATE: APROVADO|REPROVADO`, `PLANO INVALIDO`, `ERRO: Plano nao encontrado`, `PLANO OK`, `ENXAME OK`, `CUSTO OK` e `OK <id>`/`FALHOU <id>`. Também não mudam os nomes de ficheiros, as chaves JSON e os tipos da app Memória (`licao`, `fazer`, `nao_fazer`, `historico`).
  - **Opções do setup em inglês:** `--uninstall`, `--no-desktop`, `--yes` e `--replace-statusline` no Mac; `-Uninstall`, `-NoDesktop`, `-Yes` e `-ReplaceStatusline` no Windows. As portuguesas continuam a funcionar como sinónimos. No setup, os custos usam ponto decimal (`US$ 0.0003`); nos textos pt do kit fica a vírgula.
  - **Catálogos:** o setup mostra `setup/messages.en.json`, que é o injetado na release. `setup/messages.pt.json` gera `docs/TROUBLESHOOTING.md` e o en gera `docs/en/TROUBLESHOOTING.md`. O `check-repo` exige nos dois as mesmas chaves, listas e marcadores `{NOME}`.
  - **Docs em inglês:** `README.en.md` e `docs/en/` (INSTALL, TROUBLESHOOTING, FAQ, ORGANIZER, PUBLISHING, REPORT e MANUAL-TESTS). Os slides em inglês são `slides/workshop.en.pptx` e `slides/speaker-notes.en.md` (`node build.mjs --lingua en`).
- **Benchmark:** a Arena do benchmark e o projeto de treino continuam em pt por defeito; `BENCH_LINGUA=en` mede-os em inglês. As medições da D-16 e da D-18 foram feitas com as skills em português.
- **Benchmark com as skills em inglês (16 out. 2026, Claude Code 2.1.285, Mac arm64):** o custo e o tempo ficaram iguais aos da D-16 e da D-18, dentro da variação entre execuções.

| Medição | Execuções | Custo mín · média · máx | Duração mín · média · máx |
|---|---|---|---|
| Arena pt, skills pt (D-16) | 10 | US$ 0,90 · **1,03** · 1,12 | 3,5 · **4,0** · 4,8 min |
| Arena pt, skills en | 3 | US$ 0,97 · **1,01** · 1,03 | 4,3 · **4,4** · 4,5 min |
| Arena en, skills en | 3 | US$ 0,94 · **1,00** · 1,05 | 4,0 · **4,1** · 4,2 min |
| Projeto 2 EX-3 pt, skills pt (D-18) | 1 | US$ 0,60 (estimativa 0,52) | 233 s (enxame 1 min 49 s) |
| Projeto 2 EX-3 pt, skills en | 1 | US$ 0,64 (estimativa 0,52) | 220 s (enxame 1 min 12 s) |
| Projeto 2 EX-3 en, skills en | 1 | US$ 0,59 (estimativa 0,52) | 194 s (enxame 1 min 14 s) |

  - **Arena** (`run-benchmark.sh --n 3`, modo participante, por defeito e com `BENCH_LINGUA=en`):
    - as 6 execuções acabaram com `PLANO OK`, `ENXAME OK`, `GATE: APROVADO` e `CUSTO OK`, com 20 verdes, 167/167 testes, 22 agentes e zero erros. A Arena tem agora 167 testes (eram 155 na D-16);
    - média por modelo: Sonnet US$ 0,66 (pt) e 0,65 (en), Opus 0,32 e 0,33, Haiku 0,03 nas duas. Na D-16 era 0,68, 0,32 e 0,03.
  - **Projeto 2** (`run-projeto2.sh EX-3`, em pt e com `BENCH_LINGUA=en`): o plano tem a mesma forma da D-18 nas duas línguas (2 tarefas Haiku, integração e revisão). Em ambas:
    - o enxame ficou 4/4 verde e os testes passaram de 6 para 13;
    - o gate saiu `GATE: APROVADO`, com zero negações de permissão;
    - as memórias ficaram com `tarefa: EX-3` e `epico: EX-100` (3 em pt, 4 em en).
  - **Leitura:**
    - a maior diferença é a duração da Arena em pt (+9 %), e fica dentro do mínimo e do máximo da D-16 (desvio padrão de 32 s);
    - o custo médio desceu 2 %;
    - a estimativa de `orquestrador/perfis.json` (US$ 1,00 no participante) continua certa, por isso não se recalibrou.
  - **Sem isolamento, como na D-16:** o token `workshop-benchmark-oauth` do Keychain continua truncado (79 caracteres, 401). Por isso a Arena correu com `--sem-isolamento`. O Projeto 2 não usa o token.
  - **`results.csv` e `REPORT.md`:** as 6 execuções da Arena entraram no modo participante, junto com as 10 da D-16 (16 execuções, US$ 1,02 e 4,1 min de média). O CSV não tem coluna de língua: as execuções das 17:36 às 17:45 são da Arena em pt e as das 17:50 às 17:58 da Arena em en. O Projeto 2 não escreve no CSV.
  - **Observações, que não bloqueiam:**
    - **Integrator com o Bash negado.** Em 5 das 6 execuções, o integrator correu comandos encadeados, como `node tools/check-integracao.mjs 2>&1 | tail …; echo …`. Como não é só `node tools/*`, o modo `-p` negou-os, e em 4 delas o `.workshop/integracao.md` não foi escrito. O hook do orquestrador correu a suite (167/167) e marcou a integração verde, e o reviewer confirmou-a. Na D-16, o `integracao.md` faltou em 2 de 10 execuções, pela mesma razão. Numa sessão interativa, aparece um pedido de permissão. O `results.csv` só conta as 3 negações que o `claude -p` reporta (uma execução);
    - **Língua das respostas.** O benchmark corre sem a definição `language`, e assim as skills misturaram línguas:
      - em 2 das 3 execuções da Arena en, parte do texto veio em pt (a causa não foi apurada);
      - no Projeto 2 pt, as frases de fecho vieram em inglês ("Next step: `/task-plan`.", "Ready for production.").

      Os marcadores não mudaram. O setup grava o `language` (ver acima), mas esse caso não foi medido aqui.
- **Fica de fora:**
  - textos do kit em hindi e em hebraico. Nessas máquinas as skills respondem na língua da pessoa, mas as tabelas, a Arena e as docs ficam em inglês;
  - `presenter-replay/`, que é uma gravação, continua em pt;
  - este DECISIONS.md continua em pt;
  - os títulos das secções de `.workshop/tarefa.md` continuam em português (o `publicar-texto.mjs` aceita os dois);
  - as capturas de ecrã dos slides continuam em pt.
- **Testes:** `tools/test/linguas.test.mjs`, `catalogos.test.mjs`, `settings.test.mjs` (`language`), `install-user.test.mjs` (`lingua.json` e `language`), `assemble-sandbox.test.mjs`, os testes do orquestrador e dos hooks em pt e en, `setup/test/test-mac.sh` (etiquetas, AppleLanguages, LANG e a nota do passo 8) e o Pester (etiquetas, Get-UICulture e Get-Culture, a nota do passo 8 e os argumentos do `install-user`).

## D-12 · Testes sem estragar a configuração de quem constrói o kit

- O organizador usa claude.ai Max e tem statusline e plugins próprios. Os spikes correm com `--setting-sources project,local --strict-mcp-config`.
- O setup e o benchmark correm com `HOME`/`CLAUDE_CONFIG_DIR` temporários e `CLAUDE_CODE_OAUTH_TOKEN`, guardado no Keychain e lido só em runtime.
- O benchmark corre na assinatura Max (decisão do organizador). O custo é a estimativa a preço de lista, o mesmo cálculo que um participante Console vê. O fluxo de login Console fica num checklist manual (`docs/TESTES-MANUAIS.md`).
