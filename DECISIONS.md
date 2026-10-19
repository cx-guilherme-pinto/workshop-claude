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
- **Benchmark:** a Arena do benchmark e o projeto de treino continuam em pt por defeito; `BENCH_LINGUA=en` mede-os em inglês. **Medido com as skills em inglês (16 out. 2026, 6 execuções, `--n 3 --sem-isolamento`):** com a Arena em pt, 3/3, US$ 0,97 a 1,03 e 4,3 a 4,5 min; com a Arena em en, 3/3, US$ 0,94 a 1,05 e 4,0 a 4,2 min. Tudo verde (20/20 cartões, 167/167 testes, gate aprovado), tal como com as skills em pt (D-16: US$ 1,03 e 4,0 min de média). Numa execução houve 3 negações de permissão: o integrator tentou encadear comandos (`|`, `;`, `cd`, `rm`) e a regra das permissões bloqueou-os, sem mudar o resultado. Detalhe em `benchmark/REPORT.md`.
- **Fica de fora:**
  - textos do kit em hindi e em hebraico. Nessas máquinas as skills respondem na língua da pessoa, mas as tabelas, a Arena e as docs ficam em inglês;
  - `presenter-replay/`, que é uma gravação, continua em pt;
  - este DECISIONS.md continua em pt;
  - os títulos das secções de `.workshop/tarefa.md` continuam em português (o `publicar-texto.mjs` aceita os dois);
  - as capturas de ecrã dos slides continuam em pt.
- **Testes:** `tools/test/linguas.test.mjs`, `catalogos.test.mjs`, `settings.test.mjs` (`language`), `install-user.test.mjs` (`lingua.json` e `language`), `assemble-sandbox.test.mjs`, os testes do orquestrador e dos hooks em pt e en, `setup/test/test-mac.sh` (etiquetas, AppleLanguages, LANG e a nota do passo 8) e o Pester (etiquetas, Get-UICulture e Get-Culture, a nota do passo 8 e os argumentos do `install-user`).
- Atualizado pela D-25: os marcadores, os nomes de ficheiros e pastas, as opções, as chaves JSON e os tipos da app de memória passam a inglês nas duas línguas.

## D-21 · Inglês como versão principal do repositório

- **Pedido do organizador (16 out. 2026):** em tudo o que se vê no repositório (README, guias, detalhes e descrição dos repositórios), a versão principal é em inglês e a secundária em português, "porque todo mundo vai entender". Hindi e hebraico também, se possível, tudo organizado, separado e fácil de usar.
- **Como ficou:**
  - **READMEs:** o `README.md` é em inglês e ao lado ficam `README.pt.md`, `README.hi.md` e `README.he.md`. Todos têm no topo a mesma linha de troca de língua: English · Português · हिन्दी · עברית.
  - **Docs:** `docs/` em inglês e `docs/pt/` em português, com os mesmos nomes de ficheiro (INSTALL, TROUBLESHOOTING, FAQ, ORGANIZER, PUBLISHING, REPORT, MANUAL-TESTS, HANDOVER e TEST-MACHINE). O guia de instalação existe também em `docs/hi/INSTALL.md` e `docs/he/INSTALL.md`. Deixam de existir `docs/en/` e os nomes antigos em português (INSTALAR, PUBLICAR, ORGANIZADOR, RELATORIO, TESTES-MANUAIS e TESTAR-MAQUINA). A D-20 descreve o arranjo anterior, que este substitui.
  - **Geração:** os templates estão em `tools/templates/<língua>/` (en, pt, hi, he). O `tools/render.mjs` gera 12 ficheiros e regista-os em `tools/generated-files.json`. O `docs/TROUBLESHOOTING.md` vem do `setup/messages.en.json` e o `docs/pt/TROUBLESHOOTING.md` do `messages.pt.json`; cada catálogo aponta para o seu.
  - **Ficheiros da raiz:** o `CLAUDE.md` passa a estar só em inglês. O `THIRD_PARTY.md` fica em inglês, com o `THIRD_PARTY.pt.md` ao lado. Este `DECISIONS.md` continua em português, por ser um registo.
  - **Hindi e hebraico:** só no README e no guia de instalação, o que o participante lê antes do workshop. Os links para as outras docs vão para as versões inglesas. Foram escritos pelo Claude no registo de um programador, com os termos técnicos em inglês, por isso convém pedir revisão a um falante nativo.
  - **Descrição dos repositórios** (Gitea e GitHub corporativo): é uma definição do servidor, que fica com a sessão do organizador (`tools/publicar-github-corporativo.sh`). Texto sugerido: "Workshop kit for "Agent Orchestration with Claude": one-command setup (macOS and Windows), skills, agents, cost hooks, statusline, orchestrator and hands-on projects."
- **Fica de fora:**
  - FAQ, TROUBLESHOOTING e as restantes docs em hindi e hebraico;
  - a Arena e o projeto de treino continuam com a fonte em português (`demo-project/README.md`), e a versão inglesa vem da sobreposição `i18n/en/` na montagem;
  - `presenter-replay/` e `benchmark/REPORT.md` continuam em português, porque são ferramentas e registos do organizador.
- **Testes:** `tools/test/tools.test.mjs` verifica os 12 ficheiros gerados, as linhas de troca de língua e os links entre línguas. O `check-repo` aceita URLs só no `repos.conf` e nos ficheiros gerados.

## D-22 · Slides no modelo da Checkmarx e revisão do conteúdo (16 out. 2026)

- **Modelo:** o organizador pediu que a apresentação siga o modelo corporativo da Checkmarx (ficheiro "RnD All Hands - October 2026.odp"), sem o All Hands. Do modelo vieram:
  - a paleta: roxo `#6b34fd`, escuro `#140920`, fundo `#fcf9fe`, cartões `#f4effe`, texto secundário `#4a405a` e laranja `#f25928` para destaques;
  - as letras: Founders Grotesk Medium nos títulos e Arial no texto. O LibreOffice da revisão não tem a Founders Grotesk e troca-a por outra; no PowerPoint com a letra instalada, os títulos ficam como no modelo;
  - os layouts: abertura escura com o X de linhas, separadores claros com a onda, conteúdo com a barra escura no rodapé (logótipo e número), "Faça agora" em lilás com etiqueta roxa e fecho escuro. Os fundos e os logótipos estão em `slides/modelo/`, gerados a partir das imagens do próprio modelo;
  - as cores de estado da Arena (cinzento, amarelo, verde, vermelho) e as dos modelos (Haiku amarelo, Sonnet verde, Opus roxo) ficam onde têm significado.
- **Conteúdo** (pedido do organizador, pt e en):
  - saíram os slides "90 minutos", "Limites que respeitamos" e "Claude Desktop e telemóvel";
  - entraram os slides "O que faz o /demo-plan" e "O que faz o /demo-swarm" (o resumo do SKILL.md, o que entra e sai, e como usar no teu projeto), "Hooks" e "Statusline" (o que são, para que servem no kit e como pedir ao Claude para criar o teu), e a secção "O swarm em ação" antes do vídeo;
  - a fonte dos preços é a página da Anthropic, e os comandos de instalação levam o aviso "estão no Teams";
  - o total continua nos 90 minutos.
- **Vídeos:**
  - **swarm:** a gravação original do `/estado` estava parada no estado final. O `tools/record/montar-preview.sh` refá-lo sem correr o swarm: a grelha vem do replay, fotograma a fotograma (`record-replay.mjs`), e o terminal do `terminal.cast`, os dois a 5× e alinhados pela hora real do evento "inicio". Fica com 83 s;
  - **jogo:** o `tools/record/record-jogo.mjs` grava uma partida real, com um cartão de cada formato e as respostas tiradas do `specs/cards.json`. A versão inglesa monta os cartões a partir da especificação em inglês, e os 600 testes dos cartões passam;
  - **proporção:** o `build.mjs` encaixa as imagens e os vídeos pela proporção real do ficheiro, sem esticar.
- Atualizado pela D-23: o fundo passou a lilás e as cores dos modelos saíram.

## D-23 · Slides: fundo lilás, cores só para o estado e a Arena antes do vídeo (16 out. 2026)

- **Fundo:** a pedido do organizador, todos os slides de conteúdo, os "Faz agora" e os separadores ficam com o lilás do modelo (`#f4effe`), sem fundo branco. Os blocos por cima passam a brancos. O fundo dos separadores (`slides/modelo/fundo-seccao.png`) é o do modelo com o branco multiplicado para lilás; as linhas da onda ficam iguais.
- **Cores com um só significado:** os quadrados coloridos que eram só decoração confundiam (o verde e o amarelo também querem dizer "teste passou" e "a trabalhar"). Agora:
  - cinzento, amarelo, verde e vermelho só aparecem em quadrados, e um quadrado é sempre um cartão ou uma tarefa. Onde aparecem, há a legenda "Cada quadrado é um cartão: à espera · um agente a trabalhar · teste passou · teste falhou";
  - no vídeo do swarm, a legenda vai numa barra escura colada ao vídeo, com as cores do tema escuro do `/estado` (o cinzento "à espera" é escuro no ecrã do projetor);
  - a decoração é um ícone branco num círculo roxo (Lucide, `lucide-static` 1.48.0, licença ISC, rasterizado com `sharp` 0.34.5, só no build) e os passos de um fluxo ou de uma lista levam um número no círculo;
  - os modelos deixaram de ter cor: Opus, Sonnet e Haiku têm cada um o seu ícone (cérebro, peça de puzzle, pena), também nas ondas.
- **A Arena antes do vídeo:** antes de "O swarm em ação" entra "O que vamos construir: a Arena de Segurança": um cartão real (frame do vídeo do jogo), o que é a Arena (mini-jogo em 10 categorias, 4 formatos, um agente por cartão; 100 no vídeo, 15 no portátil) e a legenda das cores. Assim, "100 cartões" e "a Arena" já têm significado quando aparecem.
- **Ordem:** o slide com o comando de instalação ("Onde está tudo") passou do fim para o início ("Instala o kit", slide 4, antes do check e do doctor). A secção "Verificar" chama-se agora "Instalar". O endereço do repositório fica no slide das perguntas.
- **Outros:** o slide 2 chama-se "Vais sair do workshop com isto"; os fluxos têm uma frase por passo; os comandos dos "Faz agora" (antes "Faça agora") encolhem para caberem por cima do resultado esperado; os minutos usam a vírgula em português. Continua nos 90 minutos e com 47 slides.
- **Revisão completa** (texto em pt e en, e cada comando e número confrontado com o código):
  - corrigidos 4 erros que um participante ia sentir: o slide do doctor descrevia uma ajuda passo a passo que só existe na instalação; o `/loop` "até ficar tudo verde" usava o `check-integracao.mjs`, que deixa de fora os cartões que falharam, e passou a `grade.mjs --todos` (também na skill `/demo-review` e no FAQ); o painel do Projeto 2 corre na pasta do projeto e com `"$HOME/…"`, que funciona no zsh e no PowerShell (também na skill `/task-swarm`); a rotina precisa de `--sim`;
  - números alinhados com o benchmark (swarm de 2 a 3 min, até 8 agentes em paralelo, o rodapé do custo diz que é o Projeto 1) e com o código (caminho do hook, formato da statusline, `allowed-tools` do `/demo-plan`, mensagem final do `--check`);
  - texto: "Faz agora" (forma "tu"), "para" sem acento, "subscrição", um terceiro terminal para as funcionalidades (o segundo tem o servidor), legendas "Cada quadrado é uma tarefa" nas ondas.

## D-24 · Teste completo isolado: 100 tarefas, permissões, /btw, terminal e Agent Memory (17 out. 2026)

Uma execução completa como participante (HOME novo, Claude Code 2.1.292 do kit, interativo e gravado) mostrou problemas que o benchmark (`claude -p`, Claude Code 2.1.285 da máquina do organizador) não via. Decidido com o organizador:
- **Arena com 100 tarefas também no modo participante.** Com 15, o jogo final parecia pequeno ao lado do vídeo de 100. Os dois modos constroem as mesmas 105 tarefas; muda só o paralelismo (8 no participante, 16 no apresentador). Medido numa execução interativa: 105/105 verdes, 1 repetição, swarm em 6 min 33 s, sessão completa em cerca de 9 min, **US$ 3,39** (sessão principal US$ 2,68; 102 agentes Haiku US$ 0,18). O perfil por lote da sessão principal (`orquestrador_participante` em `orquestrador/perfis.json`) foi recalibrado com essa execução: a estimativa passa de US$ 1,83 para US$ 3,66.
- **Pedidos de permissão na Arena (cerca de 12 por execução, agora 0):** os agentes demo e de produção que correm comandos passam a ler e escrever ficheiros só com Read/Write/Edit e a correr cada comando sozinho (sem `cd`, `;`, `|`, heredocs nem `${…}`), porque o Claude Code 2.1.292 pede aprovação para esses comandos mesmo com a lista de permissões; e `mcp__memoria__memoria_adicionar` entrou na lista da Arena. O benchmark avisa quando a versão do Claude Code não é a do `repos.conf` (`CLAUDE_BIN` escolhe outra).
- **Diálogo de confiança:** com permissões pré-aprovadas, abre com "No, exit" selecionado. O slide, as notas e o FAQ dizem para escolher "Yes, I trust this folder".
- **/btw:** enquanto o painel da resposta está aberto, os resultados dos agentes ficam à espera e o swarm não avança. O slide, as skills e o FAQ dizem para fechar com Esc.
- **`curl | bash` suspenso ("zsh: suspended (tty input) bash"):** o passo 4 abria `"$SHELL" -lic 'node -v'`; um zsh interativo fica com o terminal e o setup é suspenso na pergunta seguinte. Passa a `+m` (sem controlo de tarefas). O teste `setup/test/test-mac.sh` impede um shell interativo sem `+m`, e antes de cada pergunta o setup avisa "escreve fg e Enter" se não estiver em primeiro plano.
  - Atualizado depois dos testes de caos: o `+m` não chegava. Um `.zshrc` com `setopt monitor` parava a sonda para sempre, o `compinit` perguntava "insecure directories" no terminal e o Enter da resposta respondia à pergunta do GitHub, e um node do Homebrew avariado escrevia "Abort trap: 6" no ecrã. A sonda passa a `ws_newterm`: o shell de login corre numa sessão nova, sem terminal (setsid, pelo node), com o ambiente e o PATH com que o launchd abre o Terminal, o stdin em `/dev/null` e no máximo 15 s; o grupo inteiro é morto no fim. Se não responder (ou se o `.zshrc` arrancar o tmux), fica só uma nota, e não um E-NODE-02 falso. Antes de cada pergunta e de cada login, o setup deita fora o que foi escrito antes (um Enter a mais ou o comando colado duas vezes não respondem por ti), e uma resposta que não é s/n faz repetir a pergunta (à terceira conta como "não").
- **Definições geridas pela empresa (`managed-settings`):** são normais nos portáteis da empresa; deixam de ser um aviso e passam a uma nota (a ajuda E-CFG-01 continua no TROUBLESHOOTING).
- **A app chama-se Agent Memory** em todas as línguas (janela, atalhos, setup, slides e docs). O comando `memoria`, o servidor MCP `memoria` e `~/.memoria` mantêm o nome; o setup e os instaladores da app removem o atalho antigo "Memória". Os ficheiros da versão portátil (`Memoria.app`, `Memoria.exe`) ficam para depois.
- **Testes isolados no macOS:** o Claude Code chama `security` pelo PATH para guardar credenciais; num HOME de testes sem keychain isso abria o diálogo "Keychain Not Found" no ecrã do organizador. Os testes usam um substituto de `security` (só no PATH dos testes).

## D-12 · Testes sem estragar a configuração de quem constrói o kit

- O organizador usa claude.ai Max e tem statusline e plugins próprios. Os spikes correm com `--setting-sources project,local --strict-mcp-config`.
- O setup e o benchmark correm com `HOME`/`CLAUDE_CONFIG_DIR` temporários e `CLAUDE_CODE_OAUTH_TOKEN`, guardado no Keychain e lido só em runtime.
- O benchmark corre na assinatura Max (decisão do organizador). O custo é a estimativa a preço de lista, o mesmo cálculo que um participante Console vê. O fluxo de login Console fica num checklist manual (`docs/TESTES-MANUAIS.md`).

## D-25 · Nomes técnicos em inglês, nas duas línguas (17 out. 2026)

- **Pedido do organizador (17 out. 2026):** na versão inglesa, o participante não pode ver uma única palavra em português. Nem nos textos, nem na saída do terminal, nem nos nomes de ficheiros e pastas, nas linhas de comandos, nas opções, nos nomes e argumentos das ferramentas MCP, nos ids das tarefas, nos marcadores ou nos títulos que o Claude Code mostra. A gravação de uma sessão em inglês ainda mostrava, por exemplo, os ids `integracao`, `pagina-categoria`, `tabela-pontuacao` e `revisao`, os caminhos `tools/workshop/orquestrador/…`, o agente `memoria-extrator`, `ESTADO: FIM`, `GATE: APROVADO`, o `PLANO.md`, o `.workshop/tarefa.md`, o `--modo participante`, as ferramentas `mcp__memoria__memoria_procurar` e o nome antigo da app.
- **Decisão:** os nomes técnicos passam a inglês nas **duas** línguas, porque os termos técnicos ficam em inglês em todas as línguas (D-20). Só se localizam as frases para pessoas (mensagens, tabelas, docs, slides e a Arena), em pt-PT e em inglês. Onde o contrato o diz, os nomes antigos continuam a funcionar como sinónimos, para não estragar as instalações que já existem.
- **Contrato de nomes** (todas as áreas usam exatamente estes):
  - **App de memória** (`claude-memory-app`, v0.5.0, com CHANGELOG em en e pt): chama-se **Agent Memory** em todas as línguas.
    - Comando `agent-memory` (o `memoria` fica como sinónimo). Subcomandos e opções em inglês: `search`, `add`, `--type`, `--title`, `--project`, `--text`, `--task`, `--epic`, `--url`, `--tag`, `--file`, `--link`, `--cost`, `--limit` e `update --check|--force`. Os portugueses continuam a ser aceites.
    - Servidor MCP registado pelo kit como `agent-memory` (`<uv bin>/agent-memory mcp`), com as ferramentas `memory_search`, `memory_add` e `memory_related` (no Claude Code, `mcp__agent-memory__memory_search` e as outras). Argumentos e resultados em inglês: `memory_add {type: lesson|do|dont|history, title, text, project, task?, epic?, url?, tags?, files?, links?, cost_usd?}`, `memory_search {text?, project?, task?, epic?, type?, limit?}` e `memory_related {ref, limit?}`. Os nomes portugueses das ferramentas deixam de existir (não há duplicados).
    - As notas novas têm o frontmatter em inglês (`type`, `project`, `task`, `epic`, `files`, `links`, `tags`, `date`, `cost_usd`). As antigas, com `tipo: licao|fazer|nao_fazer|historico`, `projeto`, `tarefa`, `epico`, `ficheiros`, `ligacoes`, `etiquetas`, `data` e `custo_usd`, continuam a ser lidas e mostradas.
    - Pasta dos dados: `~/.agent-memory` (`AGENT_MEMORY_HOME`). Se `MEMORIA_HOME` estiver definida, usa-se essa; se não houver `~/.agent-memory` mas houver `~/.memoria`, usa-se `~/.memoria`. Nunca se movem nem se apagam dados.
    - `MEMORIA INDISPONIVEL` passa a `MEMORY UNAVAILABLE`.
  - **Orquestrador:** `orquestrador/` passa a `orchestrator/`, também na Arena montada (`tools/workshop/orchestrator/`). Os ficheiros com nome português ganham um inglês: `dashboard.mjs`, `explore.mjs`, `publish-text.mjs`, `profiles.json`, `lib/state.mjs` (antes `painel`, `explorar`, `publicar-texto`, `perfis` e `lib/estado`). Opções em inglês, com as antigas como sinónimos: `grade.mjs --all|--summary|--project|--plan`, `next-wave.mjs --plan` e `gate.mjs --test|--ignore`. A tag git `arena-inicial` passa a `arena-start`.
  - **Marcadores**, iguais nas duas línguas (substituem a lista da D-20): `STATE: BATCH|DONE|BLOCKED`, `<<<CALLS`/`CALLS>>>`, `GATE: APPROVED|REJECTED`, `PLAN OK`, `PLAN INVALID`, `SWARM OK`, `COST OK`, `ERROR: plan not found`, e as linhas finais dos agentes `OK <id>` e `FAILED <id>: …`. Vereditos: `approved`, `approved_with_reservations` e `rejected`. Os estados que o participante vê ficam `green`, `red`, `failed`, `working` e `todo` (e a página `/status` e as tabelas mostram palavras inglesas no modo inglês).
  - **Ficheiros que o kit escreve:** `PLAN.md`; `.workshop/task.md`, com os títulos `## Title`, `## Description`, `## Acceptance criteria`, `## Test command` e os outros em inglês (fixos, porque os scripts os leem); `.workshop/task.json`, com as chaves `source`, `id`, `epic`, `url`, `title`, `description`, `criteria`, `labels`, `subtasks`, `status`, `via`…; `report.md`, `verdict.json`, `review-summary.md`, `integration.md`, `memory-summary.md`, `plan-summary.md`, `plan-proposal.json`, `orchestrator.json` e a pasta `.workshop/history/`. O resumo do setup passa a `~/.workshop-claude/summary.txt`.
  - **Agentes e skills:** `memoria-extrator` passa a `memory-extractor` (demo e prod) e a skill `/memoria` a `/memory`. O `allowed-tools`, as permissões e os prompts usam `mcp__agent-memory__memory_search`, `memory_add` e `memory_related`.
  - **Projeto de treino:** `exemplo-projeto-real/` passa a `practice-project/`, instalado em `~/workshop-claude/practice-project`. O setup só move um `~/workshop-claude/exemplo-projeto-real` antigo se a pasta nova não existir, e nunca apaga trabalho.
  - **Setup** (Mac, Windows e catálogos): instala e usa o `agent-memory` (selftest, update e o registo MCP `agent-memory`; um registo antigo `memoria` é substituído), a pasta dos dados do contrato da app, o `summary.txt`, o `practice-project` e o caminho novo do orquestrador. Os `.ps1` continuam só em ASCII.
  - **Arena:** os ids `pagina-categoria`, `tabela-pontuacao`, `integracao` e `revisao` passam a `category-page`, `score-table`, `integration` e `review` (o `lib-hash` e os ids dos cartões, como `pw-01`, ficam). Ferramentas: `tools/check-integration.mjs`, `tools/routine.mjs --install|--remove|--yes` (aceita `--instalar` e `--remover`; o `--sim`, como no `reset.mjs`, passou a ser simulação e nunca "sim") e `tools/plan.mjs --mode participant|presenter` (aceita `--modo participante|apresentador`); a variável `ARENA_MAX_PARALLEL` (aceita `ARENA_MAX_PARALELO`). Os modelos de cartão passam a `templates/spot-the-flaw.js`, `choice.js`, `order.js` e `answer.js`, com as funções exportadas em inglês, e os cartões gerados, as especificações, o contrato e as soluções seguem-nos. Rotas: `/status` (o `/estado` fica como sinónimo) e `?replay=recording` (aceita `?replay=gravacao`). No modo inglês não fica nenhum texto em português que o participante ou o Claude Code possam mostrar (por exemplo, a mensagem "Base64 inválido.").
- **Docs e slides:**
  - os guias (en, pt, hi e he), os templates do README e do INSTALL e os slides (pt e en, incluindo as notas do orador) usam os nomes novos, e a app chama-se Agent Memory em todo o lado. Nas docs em inglês também saíram os exemplos em português (`github.empresa.com` passa a `github.company.com`) e, no FAQ, os nomes das opções antigas;
  - corrigido o que já estava desatualizado: as pastas `project2-*` e os nomes ingleses das verificações no guia do `test-machine.sh`, e os caminhos `docs/en/` e `README.en.md` no relatório (D-21);
  - nos slides, os layouts (`TITLE`, `SECTION`, `CONTENT`, `DO-IT-NOW`, `CLOSING`) e as formas (o painel de seleção do PowerPoint) têm nomes em inglês nas duas apresentações. Os logótipos dos layouts têm texto alternativo; antes, o pptxgenjs punha lá o caminho local do ficheiro, com o nome do utilizador;
  - entraram uma pergunta no FAQ sobre a atualização de uma instalação anterior, uma pergunta no FAQ em pt sobre os nomes em inglês, os testes manuais W19 e M9 (atualizar um kit de antes desta decisão), e o W18 passou a exigir que não apareça nenhuma palavra em português.
- **Fica de fora:**
  - **os media dos slides:** o vídeo do swarm, o poster e a captura da pesquisa na app (`slides/media/enxame-acelerado.mp4`, `estado-final.png` e `memoria-procura.png`) foram gravados antes desta decisão, em português e com o nome antigo da app, e a apresentação inglesa ainda os usa. É preciso gravá-los outra vez em inglês (`tools/record`) e pôr o `content.en.mjs` a apontar para as versões `.en`. O vídeo e a captura do jogo em inglês (`arena-jogo.en.*` e `arena-cartao.en.png`) já estão em inglês;
  - as chaves do `content*.mjs` e os nomes internos do `build.mjs`, que são código do organizador e não aparecem nos slides;
  - as entradas anteriores deste ficheiro, que descrevem o que se decidiu na altura.
- **Testes (docs e slides):** `node tools/render.mjs` e `node tools/check-repo.mjs`; `cd slides && npm ci && node build.mjs` (as duas apresentações com 47 slides e 90 min, sem `{{…}}` nas notas); e uma análise do `workshop.en.pptx` (texto dos slides, notas, nomes dos layouts e das formas, texto alternativo) sem nenhuma palavra em português. A comparação com o build anterior confirma que o texto dos slides ficou igual e que só mudaram os nomes.

## D-26 · Testes de caos do setup e da app, sem Docker (17 out. 2026)

- **Pedido do organizador:** o setup e a app têm de funcionar para 100 pessoas, por mais estragado que esteja o portátil, ou parar com uma mensagem clara. Sem Docker (dá problemas e não é o ambiente real).
- **Como se testou:** num Mac real, cada cenário num HOME novo e isolado (`env-chaos.sh`: PATH sem Homebrew, um `security` falso para não abrir diálogos do Keychain, o token só em memória), com o one-liner escrito num pty a sério (`run-install.py`: deteta "suspended", pendurado e o fim) e uma release servida localmente. Cada falha foi reproduzida outra vez por um verificador independente antes de contar.
  - **Ronda 1:** 60 cenários (terminal, ferramentas já instaladas, perfis da shell, ficheiros e permissões, rede e proxy, login e definições, repetições e interrupções, app, línguas, git e a Arena). 56 falhas confirmadas, mais uma revisão estática do Windows com 12 problemas (F1–F12).
  - **Ronda 2:** os 60 outra vez sobre as correções, mais 35 novos (variáveis de ambiente hostis, ficheiros de configuração, sistema, app e orquestrador sem o Claude). Das falhas da ronda 1 não voltou nenhuma; ficaram 46 (25 graves, quase todas nas categorias novas), todas corrigidas e verificadas com o cenário outra vez, menos uma parcial (HOME com mais de 500 caracteres: a app avisa, mas o SQLite não abre).
- **Decisões de desenho que saíram dos testes:**
  - o setup nunca corre o perfil interativo da pessoa no terminal: a sonda do "terminal novo" (`ws_newterm`) corre numa sessão sem terminal, com o ambiente do launchd e no máximo 15 s; "não sei" é uma nota, nunca um aviso;
  - antes de cada pergunta e de cada login, o que foi escrito antes é deitado fora, e uma resposta que não é s/n repete a pergunta;
  - todos os comandos que podem ficar à espera da rede têm limite de tempo (`ws_timeout` no Mac, `-TimeoutSec` no Windows); os downloads falham depressa numa rede parada e voltam a tentar uma vez num SHA-256 errado;
  - o ambiente da pessoa só é limpo para os processos do setup (BASH_ENV, CDPATH, NODE_OPTIONS, cores forçadas, PYTHONHOME/PYTHONPATH, variáveis de certificados que apontam para ficheiros que não existem, entradas relativas no PATH, um TMPDIR estragado); nada fica mudado no terminal dela; o `.curlrc` e o `.netrc` dela não entram nos downloads do setup (`curl -q`);
  - o setup nunca destrói trabalho: as pastas dos projetos que a pessoa mudou vão para o backup, o marcador da montagem é escrito antes de copiar, os ficheiros ligados por symlinks (stow, chezmoi) são escritos através da ligação, e um `settings.json` com comentários ou inválido nunca é reescrito;
  - o git das montagens ignora a configuração global da pessoa (assinaturas, hooks da empresa, gitignore global, autocrlf);
  - no Windows usa-se sempre a pasta do perfil (`USERPROFILE`), nunca o `$HOME` do PowerShell 5.1, que numa empresa com AD aponta para uma partilha de rede;
  - os registos MCP decidem-se a partir do `~/.claude.json`, sem `claude mcp get` (que arrancava programas antigos);
  - a app Agent Memory segue regras claras para a pasta dos dados (AGENT_MEMORY_HOME, MEMORIA_HOME, `~/.memoria` antigo), nunca esconde notas antigas e trata um índice só de leitura como permissões e não como "estragado".
- **Para o organizador decidir:**
  - com `CLAUDE_CODE_USE_BEDROCK`/Vertex/Foundry o passo 3 falha (E-CFG-04): quem usa mesmo uma cloud da empresa tem de tirar a variável para o workshop;
  - `WORKSHOP_LANG=pt` simples continua a ser pt-PT, mesmo num Mac do Brasil (as docs recomendam `pt-BR` ou `pt-PT`);
  - nos dois projetos de treino, os hooks da empresa e a assinatura de commits ficam desligados por configuração local do repositório (o gate do Projeto 2 tem a sua própria verificação de segredos);
  - as cópias do `setup-mac.sh` guardadas pela rc.1 não se atualizam sozinhas: quem instalou com a rc.1 corre o one-liner outra vez uma vez.
- **Ainda não testado:** nada correu num Windows real (só Pester e PSScriptAnalyzer num PowerShell 7 portátil, no macOS). A lista para o primeiro teste está em `docs/WINDOWS-CHECKLIST.md` (`docs/pt/WINDOWS-CHECKLIST.md`).

## D-27 · Saída do setup: cartão e lista de passos (19 out. 2026)

- **Pedido do organizador:** uma saída do setup moderna e profissional, no estilo "cartão e lista de passos": um cartão no início (título, versão, sistema, língua), uma linha por passo com o símbolo do estado, o nome alinhado e o detalhe curto, um spinner com o que o passo está a fazer e a barra "N of 12", e um cartão de resumo no fim. Só muda a apresentação: códigos de erro, mensagens, perguntas, o `summary.txt` e o `setup.log` ficam iguais.
- **Decisão:**
  - **Três aspetos.** `fancy` só num terminal a sério (o stdout é um terminal, `TERM` não é `dumb`, sem `NO_COLOR`, tamanho conhecido, pelo menos 70 colunas e 12 linhas; no Windows, o Windows Terminal). `plain` em todos os outros casos (log, CI, agentes de IA, `| tee`, terminal estreito): as linhas de sempre (`Step N/12 · …`), sem `\r` nem movimentos do cursor. No Windows há ainda o `ascii` para a consola antiga (conhost sem VT): cartões `+--+` e `[OK] [!!] [XX]`, sem spinner.
  - **Símbolos de uma coluna** em vez de emoji: ✔ feito ou já feito, ▲ aviso, ✖ falhou, – saltado, ○ não corrido (no `.ps1` vêm de `[char]`). Os nomes curtos dos passos estão no catálogo (`passos_curtos`), em en e pt.
  - **O spinner no Mac é um processo em segundo plano que só escreve** (stdin `/dev/null`): só arranca no processo principal (nunca dentro de `$( )`, de um pipe ou de um subshell) com o stdout no terminal, para (kill + wait) antes de cada linha, pergunta, login e no fim de cada passo, e acaba sozinho se o setup desaparecer (kill -9). O Ctrl-C, o HUP e o fim (traps) tiram-no do ecrã. Os MB do heartbeat passam para a linha do spinner. No Windows não há processo: o spinner anda enquanto o setup espera por um programa (`Invoke-WsProcess`, `Invoke-WsLogin`), e o `finally` do `Invoke-WsMain` tira a zona viva no Ctrl-C.
  - Corrigido o que o spinner revelou: o `wait` sem PIDs do teste de rede (passo 0) esperaria também pelo spinner; e, no bash 3.2 num locale UTF-8, um `$VAR` colado a um caractere não ASCII é lido como parte do nome (agora há um teste que o proíbe).
- **Validado:** testes do Mac (novos: deteção do aspeto, plain sem sequências do cursor, spinner parado no fim do passo, antes da pergunta, depois do Ctrl-C e do kill -9, nunca em `$( )` nem com o stdout redirecionado, resumo e `summary.txt`); Pester (aspeto, zona viva, pergunta, Ctrl-C, cartões ascii); e, num Mac real com o harness de caos e a release servida localmente: instalação limpa, segunda execução, `--check`, `NO_COLOR`, `TERM=dumb` e Ctrl-C a meio do download do Claude Code seguido de nova execução (sem "suspended", sem pendurar, sem processos a mais, as mesmas 2 perguntas e o resumo).
- **Ainda não testado:** o aspeto no Windows real (Windows Terminal e conhost); fica no ponto 1 do `docs/WINDOWS-CHECKLIST.md`.

## D-28 · Projeto 1 com decisões do participante; agenda e slides revistos (19 out. 2026)

- **Pedido do organizador:** o Projeto 1 era um espetáculo passivo (cerca de 10 comandos copiados, o mesmo plano, custo e jogo para todos). A prioridade é que cada pessoa decida alguma coisa e veja que a qualidade da spec decide o swarm.
- **O teu cartão:** `cp specs/my-card.example.json specs/my-card.json`, editar e `node tools/gen.mjs`; o `gen.mjs` valida com mensagens curtas e gera o cartão `my-01` (101 cartões), que o Haiku constrói como os outros. O exemplo funciona sem mudanças.
- **Cartões partidos de propósito** (revisto no mesmo dia: a falha era encenada, o teste lia a spec e a mensagem dava a linha a copiar): `pv-07` (choice), `rd-09` (spot-the-flaw), `cr-07` (order) e `sc-08` (answer) têm duas respostas plausíveis e a spec sem a regra que escolhe uma, por isso o agente adivinha. O `card.test.js` só guarda um hash curto (FNV-1a de 32 bits) da resposta certa, sem respostas erradas que a denunciem, e a mensagem diz o que o agente produziu e o que a spec não decide, nunca o valor. O plano marca-os (`spec_gap`, de `spec_gaps` no `cards.json`) e o `grade` falha-os de vez na 1.ª tentativa (`motivo: spec`), também no `--retry`. A pessoa decide o valor pelo enunciado e pelo conceito, escreve-o na spec e corre `/demo-swarm --retry <id>`; se decidir mal, volta a mesma mensagem com o seu valor. Os agentes continuam sem poder editar specs nem testes (regras deny `Edit(cards/*/spec.md)` e `Edit(cards/*/card.test.js)`).
- **Decisão de custo:** `/demo-plan --crypto sonnet|haiku` (por defeito `sonnet`: o `lib-hash` e os 5 cartões de criptografia que dependem dele).
- **Slides:** 44 por deck, 90 min. Conceitos de 14 para 7,5 min (o grafo e o "medir" foram para junto da prática), slides novos "Escreve o teu cartão" e "Porque é que este cartão falhou?" (substitui o `/loop`), hook e statusline passam a "Faz agora" durante a espera do swarm, o projeto de treino é o caminho por defeito no Projeto 2, e o corpo mínimo passa a 18 pt. O `{{PRICING_DATA}}` do slide 10 volta a aparecer (as chaves do `pricing.json` passaram a inglês na D-25).
- **Execução de referência** (19 out., uma em cada língua, num HOME limpo, como um participante: cartão próprio, swarm, as 4 specs corrigidas com `--retry`, revisão e custo): 106/106 tarefas verdes, gate aprovado, US$ 4,33 (pt) e 4,30 (en), swarm em 7,9 e 7,4 min, sessão de 14 min, 120 agentes. Os 4 cartões falharam com o Haiku nas duas línguas, e cada `--retry` ficou verde em 30 a 60 s. Estas execuções ainda tinham 3 tentativas por cartão partido; com a falha imediata o custo real deve ficar um pouco abaixo (não medido).
- **Encontrado nas execuções:** um `grep` com o caminho absoluto de uma pasta com espaço (`Ana Demo`) parava o swarm num pedido de permissão; os agentes passam a usar caminhos relativos e as ferramentas Read/Grep/Glob.

## D-29 · Benchmark do dia completo (19 out. 2026)

- **Pedido:** medir o que um participante gasta no workshop todo, numa linha por língua, antes de o organizador aprovar a despesa.
- **Um comando:** `BENCH_LINGUA=pt benchmark/run-benchmark.sh` (e `BENCH_LINGUA=en`). Por defeito `--scope day`, `--n 1` (antes `--n 10`, que no dia completo seriam cerca de US$ 50):
  - **Projeto 1**, o fluxo da rc.4 (D-28): o cartão próprio a partir do exemplo e `node tools/gen.mjs`; `/demo-plan --auto` (`--crypto haiku` opcional); `/demo-swarm --auto`; para cada tarefa `falhou` com `motivo: spec`, a linha que falta em `cards/<id>/spec.md` e `/demo-swarm --retry <id> --auto` na mesma sessão; `/demo-review --auto`; `/demo-cost --auto` (com o `memory-extractor` e a Agent Memory);
  - **Projeto 2**, noutra sessão (o Terminal 3 dos slides): `/task-intake issues/EX-1.json` → `/task-plan --auto` → `/task-swarm --auto` → `/task-gate --auto` → `/memory`, com a mesma pasta de memórias, como no portátil de uma pessoa.
  - `--scope p1|p2` mede um só projeto (`run-projeto2.sh` passou a ser o `--scope p2`; o `tools/test-machine.sh --arena` usa o `--scope p1`).
- **A "pessoa" dos cartões partidos** (`benchmark/person.mjs`): não lê a mensagem do teste (o redesenho dos cartões deixa lá só um hash da resposta) e não adivinha. Tira a linha da mesma fonte de que um participante parte, a spec completa que `node tools/gen.mjs --no-gaps` escreve numa cópia temporária, e insere só as linhas que faltam, no sítio delas; o `gen.mjs --check` continua a aceitar a spec completada. Testado nas duas línguas em `tools/test/benchmark.test.mjs`.
- **Falha a execução** se houver `permission_denials` em qualquer passo, um gate que não ficou APPROVED no fim (P1 e P2) ou passos com erro. O resultado fica na coluna `resultado` e o script sai com 1.
- **`results.csv`:** as colunas de sempre (as linhas antigas continuam válidas) mais `escopo`, `lingua`, `versao`, `claude`, `crypto`, a divisão P1/P2 (custo, duração, swarm, agentes, tentativas a mais, `--retry` e quantos ficaram verdes, gate e veredito de cada projeto), `erros_429` (contados nos transcripts e no stderr) e `resultado`. Um CSV com o cabeçalho antigo é reescrito com as colunas novas. O `REPORT.md` tem um resumo por grupo (escopo · língua · modo · versão · criptografia) com a face ao alvo de US$ 5 e ao teto de US$ 10, e as execuções antigas numa secção à parte.
- **Calibração** (`benchmark/calibrar.mjs`): por defeito só as execuções da versão atual do kit (`--only`, `--all`, `--margin`, `--dry-run`). A sessão principal passa a ser dividida pelos mesmos lotes que o `estimate.mjs` conta para esse plano, para a estimativa reproduzir a média medida (com os `--retry` incluídos); mostra a estimativa antes e depois contra o custo medido. Nas 12 execuções antigas reproduz US$ 1,03 medido → US$ 1,24 estimado com a margem de 15%. Com os US$ 4,33 da D-28, a margem de 15% põe a estimativa perto dos US$ 5: decidir a margem depois de medir.
- **Segurança, como antes:** o token só do Keychain para o ambiente do `claude`; `CLAUDE_CONFIG_DIR` temporário por execução com o MCP `agent-memory` registado como o setup o regista; sem isolamento, `--setting-sources project,local --strict-mcp-config`. A língua das respostas (`language`) é a que o setup poria.
- **`--dry-run`** (grátis): monta a Arena e o projeto de treino, cria o cartão, corrige as 4 specs e mostra cada `claude -p` (o token aparece como `<Keychain:…>`), sem chamar o Claude nem escrever no CSV. Corrido em pt e em en.
- **Não medido:** os exercícios ao lado durante o swarm (`/btw`, plan mode, `claude -p` com Haiku, hook e statusline, perguntar "porque é que este cartão falhou?"), que são interativos; com o Sonnet a escrever o hook e a statusline, devem somar algumas dezenas de cêntimos (não medido).
- **Estimativa por execução:** cerca de US$ 5 e 25 min (P1 ~US$ 4,3, D-28; P2 ~US$ 0,6, D-18).

- **Resultado (19 out., uma execução por língua, Claude Code 2.1.292 e Agent Memory 0.5.0 do kit, isolado):** dia completo US$ 4,56 em pt (Projeto 1 3,76 + Projeto 2 0,80) e US$ 4,02 em en (3,37 + 0,65), abaixo do alvo de US$ 5; 117 agentes; 0 permissões negadas, 0 erros 429, os dois gates aprovados. A falha imediata dos cartões partidos baixou o Projeto 1 de US$ 4,33 (D-28) para 3,76.
- **Cartões partidos com a resposta só em hash:** o Haiku acertou 3 dos 4 (rd-09, cr-07 e sc-08) nas duas línguas e falhou o pv-07. O slide passa a dizer que o agente "quase sempre erra pelo menos um" e as notas dizem o que fazer a quem não tiver nenhum vermelho.
- **Encontrado:** na execução em inglês o `/demo-swarm --retry pv-07` ficou num ciclo: o hook SubagentStop dava a nota antes da chamada seguinte do mesmo `next-wave --retry`, que a tomava por um retry novo e repunha a tarefa. Corrigido com um retry aberto/fechado em `run.json` (teste em `orchestrator/test/retry.test.mjs`).
- **Estimativa recalibrada** (`benchmark/calibrar.mjs`): US$ 4,16 no plano (média medida do Projeto 1 US$ 3,56, margem de 15%). O `benchmark/REPORT.md` foi gerado de novo com estas execuções.

## D-30 · Workshop v2: decisões iniciais e Fase 0 (observabilidade) (19 out. 2026)

- **Especificação:** `docs/pt/WORKSHOP-V2-SPEC.md` (fonte única), na branch `workshop-v2`.
- **Respostas do organizador às decisões em aberto:**
  - **A1, alojamento do painel:** Cloudflare. A API (`POST /e`, `/state`, `/stream`, `/admin/*`) fica numa Worker, com o estado e o registo append-only num Durable Object (SQLite) por workshop. A página fica no Cloudflare Pages. Os domínios são os `*.workers.dev` e `*.pages.dev`, por isso há CORS só para a origem da página. O `aggregate.mjs` é o mesmo código na Worker, nos testes, no simulador e num servidor local (replay e plano B). O wrangler é só do organizador, não é dependência do kit. O `PRIVACY.md` diz que o Cloudflare vê os IPs na rede dele, que o nosso código não os grava e que os logs da Worker ficam desligados. Risco: os proxies de algumas empresas bloqueiam `*.workers.dev`; o `--check` do pré-trabalho testa-o.
  - **Nomes:** em inglês, como na D-25: eventos, campos e chaves JSON (`room`, `forecast_min`, `cost_usd`, `duration_s`…), `?room=`, `/admin/phase` e as pastas. "Canivete" é o nome do produto em pt.
  - **Âmbito do hook de telemetria:** só os projetos do workshop (`missions-project`, Canivete, Arena, `practice-project` e repositórios com `.workshop/` criado pelo `/task-intake`). Nos outros projetos não faz nada.
  - **"Leaderboard":** o painel compara as salas, nunca pessoas (princípio 2.3.3).
- **Fase 0** (Claude Code 2.1.292, kit rc.5 instalado pelo one-liner num HOME isolado, duas sessões interativas conduzidas por pty e um `claude -p`; custo US$ 0,46): resultados e proposta de validação em `docs/OBSERVABILITY.md`.
  - **Observáveis por hook:**
    - plan mode: `permission_mode`;
    - troca de modelo: `PostModelSwitch`, só depois de confirmar o diálogo;
    - subagente: `SubagentStart`, com o `agent_type`;
    - skill do utilizador: `UserPromptExpansion` com `command_source`, ou `PostToolUse` `Skill`;
    - hook e statusline do utilizador: `ConfigChange` `local_settings`;
    - `/loop`: `UserPromptExpansion` `loop` e `CronCreate`;
    - `claude -p`: `CLAUDE_CODE_ENTRYPOINT=sdk-cli` no ambiente do hook;
    - escrita na memória: `PostToolUse` `mcp__agent-memory__memory_add`, dentro do subagente.
  - **Não observáveis:** o `/btw` (M7 passa a dica, fora da grelha) e o rewind.
  - **`"async": true`** funciona: um hook que dorme 4 s não atrasa o turno.
  - **Mudanças à secção 4.2:**
    - **M3:** exclui os subagentes lançados pelo `/statusline` e pelas skills do kit.
    - **M4:** precisa de reiniciar a sessão depois de criar a skill.
    - **M6:** deixa de exigir "≥ 2 turnos sem prompt", porque nenhum campo diz quem começou o turno.
    - **M7:** sai da grelha, que fica com 9 missões.
  - **Encontrado:**
    - o alias `haiku` da 2.1.292 é o Haiku 4.5, que o `pricing.json` não conhece (o custo aparece "?");
    - o `--model claude-haiku-5-5` no `claude -p` avisa no stderr que o modelo não está no catálogo desta versão;
    - o `/model` grava o modelo como defeito das sessões novas;
    - o ciclo do Shift+Tab é default → accept edits → plan mode → auto mode.

## D-31 · Workshop v2, Fase 1: caderneta de missões e telemetria local (19 out. 2026)

- **Entregue:**
  - `telemetry/`:
    - `allowlist.json`, a fonte única dos eventos e campos, com os nomes em inglês (D-30);
    - `schema.mjs`, a validação pura, que a Worker também vai usar;
    - `lib.mjs`, com o registo local e a fila;
    - `emit.mjs` e `ctl.mjs` (`on|off|status|show|nickname`).
  - `hooks/telemetry.mjs`.
  - `missions/`: `rules.json`, `missions.mjs` (`check|status|reset`) e `reporter.mjs` (o `npm test` grava `tests_run`).
  - A skill `/missions` e o `missions-project` (pt e en, 8 testes, 2 vermelhos de propósito), montado pelo `installer/assemble-missions.mjs`.
  - O segmento `missões n/9` na statusline.
  - O registo dos 7 hooks (`"async": true`) no `settings.json`; o `desinstalar` apaga `~/.workshop-claude/telemetry/`.
  - O setup, em Mac e Windows: a pergunta de participação e a sala no passo 8, e o projeto das missões no passo 9.
  - Ainda sem envio: o `send.mjs` é da Fase 2.
- **Decisões tomadas aqui (valores por defeito da spec ou necessários para fechar a fase):**
  - **`repos.conf`:** chaves novas `PANEL_URL` (vazia até haver Worker), `WORKSHOP_CODE` (`dev`) e `WORKSHOP_DATE`. A telemetria expira no fim do dia seguinte ao workshop; sem data, 14 dias depois da instalação.
  - **`config.json`:** fica com a participação, a sala, a pasta dos projetos, o código, o painel e a expiração. A alcunha está desligada por defeito (A3). Sem sala não há participação. Reinstalar mantém a escolha anterior. O `join` é enviado uma só vez.
  - **O hook só atua dentro da pasta dos projetos** (`~/workshop-claude`) ou num projeto com `.workshop/`, e guarda cada funcionalidade uma vez por sessão, com o hash do id da sessão.
  - **Missões:**
    - a M6 tem um plano B: se os testes forem corridos sem o `npm test`, o check corre-os ele próprio;
    - a M9 aceita `resumo.txt` ou `summary.txt`;
    - a M10 conta com a escrita na Agent Memory ou com uma nota nova;
    - a M7 é só dica, como na D-30.
  - **Haiku 4.5 no `pricing.json`:** US$ 1 / 5 por MTok, escrita na cache 1,25 e 2, leitura 0,10. Fonte: platform.claude.com/docs/en/about-claude/pricing, consultada a 19 out. Os slides mantêm `/model haiku` e `--model haiku`, por decisão do organizador.
  - **`missions-project`:** o `.claude/settings.json` fixa o Sonnet e deixa correr `npm test` e `node --test` sem perguntar, porque o `/loop` não pode parar num pedido de permissão. O reporter fica com um caminho relativo ou, com espaços, um `file://`.
  - **A Arena não copia o hook de telemetria** (precisa de `telemetry/`) nem a skill `/missions`, que apareceria duas vezes.
  - **Setup:**
    - sem terminal, ou com `--yes`, a participação fica desligada (é opt-in);
    - `WORKSHOP_TELEMETRY` e `WORKSHOP_ROOM` sobrepõem-se à pergunta;
    - o passo 8 volta a correr uma vez quando o kit tem telemetria e ainda não há `config.json`.
- **Testes:**
  - novos: `telemetry-privacy.test.mjs` (8, com as entradas reais da 2.1.292 com marcadores, e nenhum marcador chega aos ficheiros) e `missions.test.mjs` (14);
  - alargados: `settings.test` e `install-user.test`;
  - `test-mac.sh` 675;
  - Pester 280;
  - PSSA sem erros;
  - shellcheck limpo;
  - `test-all` verde.
  - O hook demora p50 30 ms e p95 32 ms (o limite é 300 ms).
- **Aceitação** (release local v1.1.0-dev.1 instalada pelo one-liner num HOME limpo, com o painel ligado por variável de ambiente; as missões feitas por pty como um participante, com uma segunda sessão `claude -c` e um `claude -p`):
  - a caderneta ficou com **9/9** (a M7 é dica);
  - a fila só tem campos da allowlist, sem nomes, caminhos nem prompts;
  - as missões todas custaram **US$ 0,47** (o alvo é ≤ US$ 0,80).
- **Encontrado (para os slides e as notas, Fase 5):**
  - Depois do `/model haiku`, o auto mode fica indisponível e a sessão passa a manual mode, com mais pedidos de permissão.
  - Sair com um `/loop` ativo abre o diálogo "Background work is running"; a opção 1 para o loop.
  - A statusline da M8 substitui a do kit nesse projeto.
  - A M5 só fica marcada no evento seguinte ao `edits.log`; o `/missions` também atualiza.

## D-32 · Workshop v2, Fase 2: painel ao vivo (envio, Worker + Durable Object, página) (19 out. 2026)

- **Entregue:**
  - `panel/aggregate.mjs`, puro: as métricas da secção 6.3 e um snapshot para o Durable Object.
  - `panel/api.mjs`, partilhada pela Worker e pelo Node: `POST /e`, `/state`, `/stream` em SSE, `/admin/phase|hide|reset` e `/health`.
  - `panel/server.mjs` e `store-file.mjs` (servidor local para ensaios e plano B).
  - `panel/worker/` (Worker + Durable Object em SQLite, `wrangler.toml` com os logs desligados).
  - `panel/public/` (a página: 6 vistas, replay no browser, SSE com polling de reserva, teclas do apresentador).
  - `panel/simulate.mjs` e `panel/replays/simulated.jsonl`.
  - `telemetry/send.mjs`; eventos `cost` dos hooks de custo; `ctl.mjs show` com o que foi enviado.
  - `tools/deploy-panel.sh` (pergunta antes de cada passo) e `docs/PRIVACY.md`, em pt e en.
  - O painel e o deploy no `ORGANIZER`.
  - Setup: o `--check` testa o painel (`E-TEL-01`, só aviso) e envia `check_ok`; o passo 8 mostra o estado real.
- **Decisões:**
  - **Pasta e endpoints em inglês** (D-30): `panel/`, `/admin/phase`, `?room=` (o `?sala=` também é aceite), `PANEL_URL` e `PANEL_PAGE_URL` no `repos.conf`.
  - **API:**
    - um evento repetido (o reenvio depois de um timeout) é ignorado pela chave única do evento, por isso nada conta duas vezes;
    - o rate limit responde 429 com `{processed: n}`, e o envio guarda o resto;
    - lotes de 50 no máximo e corpo de 64 KB no máximo;
    - `?lite=1` dá 1 atualização por segundo.
  - **Worker:** guarda os eventos e um snapshot do agregado a cada 2 s, para não refazer todos os eventos no arranque. Passa ao objeto só os cabeçalhos de que a API precisa, por isso nem o User-Agent nem os cookies lá chegam.
  - **Página:**
    - o replay corre no browser, sem a API;
    - o token de admin vem só do fragmento `#admin=` e fica no `sessionStorage`;
    - as alcunhas escondidas não aparecem no `/state` público;
    - CSP estrita, sem inline.
  - **Cobertura de uma missão:** quem a fez, sobre as pessoas presentes (ativas ou que já a fizeram).
  - **`compatibility_date` 2026-08-01:** é o que o workerd local desta versão do wrangler suporta.
- **Testes:**
  - novos: `panel.test.mjs` (9: métricas, API, SSE, store SQLite da Worker com node:sqlite, envio sem duplicados offline e online, ponta a ponta `record` → envio → painel, carga de 250 pessoas) e `panel-page.test.mjs` (10);
  - `test-mac` 737;
  - Pester 333;
  - PSSA sem erros;
  - shellcheck limpo;
  - `test-all` verde.
- **Aceitação:**
  - O simulador com 250 pessoas e 2 salas, a 10× e em tempo real, contra o servidor local: 7493 eventos, 0 erros, o painel atualizado no máximo 0,52 s depois (o limite é 2 s).
  - A mesma Worker no `wrangler dev` local (workerd e Durable Object, sem deploy), com 100 pessoas: 3015 eventos sem erros; 403 sem código ou sem token; CORS só para a origem da página; SSE atualizado em 0,5 s; o estado sobrevive a um reinício.
  - As 6 vistas a 640 × 1080, mais uma larga e uma em inglês, em `dev/panel-screenshots/`.
- **Por fazer, ou para as fases seguintes:**
  - O deploy no Cloudflare: só com o "sim" do organizador.
  - A "% em Haiku" inclui a sessão principal, mas a spec pede só os agentes; o evento `cost` não distingue. Proposta: um campo `agent` na allowlist.
  - A Arena (e o Canivete, se copiar os hooks para o projeto) não envia custos: a cópia dos hooks não tem `telemetry/` ao lado (Fase 3).
  - O `frame-ancestors` para o `palco.html` (Fase 5).
  - Não se sabe se o plano grátis da Workers aguenta o limite de CPU por pedido; o snapshot foi pensado para isso.
  - Os proxies das empresas podem bloquear `*.workers.dev`; o `--check` do pré-trabalho avisa (`E-TEL-01`).
