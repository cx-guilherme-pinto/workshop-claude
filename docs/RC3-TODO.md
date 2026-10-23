# O que falta para a v1.1.0-rc.3

Escrito a 23 out. 2026, quando o trabalho parou a pedido do organizador. O plano aprovado é o de [`docs/pt/WORKSHOP-V2-SPEC.md`](pt/WORKSHOP-V2-SPEC.md) (secção 12) e corrige o que correu mal no ensaio com 5 pessoas (o painel não acompanhava a sala).

## Já feito (no `workshop-v2`)

O primeiro commit é o `c700350` e o último o `03b9635`. Os testes de `tools/test`, do orquestrador e de `setup/test/test-mac.sh` (799) estão verdes.

- **Custo:** cada mensagem conta uma vez (`cost-counted.json`). Resolve o `claude -c`, os subagentes retomados e quem trabalha em dois terminais.
- **Missões:** verificadas também na `Stop` e na `SessionStart` (no máximo de 10 em 10 s, mais um `--delay`). Se duas verificações se cruzam, o `missions.dirty` faz repetir a última.
- **Registo:**
  - o `register` repõe na fila os eventos do dia, com a hora original (backfill);
  - um 401 escreve `needs_register` e o hook seguinte volta a registar sozinho, nunca depois de um `unregister`.
- **Fila de envio:**
  - arranca em cada hook;
  - um 429 respeita o `Retry-After` (`send.retry-at`).
- **Fora da pasta do workshop:**
  - a statusline mostra "outside the workshop";
  - o `/missions` diz em que pasta abrir o Claude e porque é que a próxima missão ainda não contou.
- **"Prontas" no painel:** o `check_ok` também sai no fim de uma instalação sem falhas (Mac e Windows).
- **Painel:**
  - a fase `auto` é a vista por defeito (`phase_mode`, snapshot v3);
  - sem token, o palco mostra um aviso grande;
  - o `/health` responde `{ok, build}`, e o `deploy-panel.sh` passa `BUILD` e confirma que build está a responder.
- **Projeto 2:** os eventos `p2_intake`, `p2_plan` e `p2_report` saem do `init-workshop`, do `validate-plan` e do `publish-text`. Numa tarefa local, o relatório fica em `.workshop/report.md`.
- **M11:**
  - a funcionalidade `pocketknife_tool`, com o matcher `mcp__canivete__.*`;
  - a M11 no `missions/rules.json` e no `MISSIONS` do painel (10 missões validadas).
- **Sessões paralelas, já fundidas:** B (painel claro Checkmarx, `52f68a1`), C (o Canivete como tools MCP, `8fa69b7`) e D (33 slides com "Tool ou skill?" e a M11, `3347f9c`).
- **Email antes do workshop:** `docs/EMAIL.md` e `docs/pt/EMAIL.md`, gerados por `tools/render.mjs` a partir de `tools/templates/<lang>/EMAIL.md.tmpl`.
- **Caos:** 14 cenários em `tools/test/chaos.test.mjs`.

## Falta fazer

### 1. Textos que ainda contam 9 ou 10 missões
- [ ] `docs/OBSERVABILITY.md`:
  - o título "M1 to M10" passa a M11;
  - a linha da M7 diz "the grid shows 9" e devem ser 10;
  - falta a linha da M11 (`PostToolUse` com `tool_name` a começar por `mcp__canivete__` → `pocketknife_tool`);
  - o matcher da lista de registo (linha ~51) passa a `Skill|CronCreate|mcp__agent-memory__memory_add|mcp__canivete__.*`.
- [ ] `skills-shared/missions/SKILL.md`: a description diz "the 10 missions"; devem ser 11.
- [ ] Procurar outros "9 missões", "10 missões" e "n/9" na documentação, nos slides e no simulador (`panel/simulate.mjs`: deve gerar também a M11).

### 2. O cenário do caos com 5 pessoas
- [ ] Em `tools/test/chaos.test.mjs`, um cenário com 5 portáteis contra o mesmo painel local, cada um com uma história diferente:
  - um registado desde o início;
  - um que só regista a meio;
  - um com `claude -c` e dois terminais;
  - um que vai abaixo da rede durante um bloco;
  - um que salta missões e faz a M11 antes da M4.
- [ ] No fim, o `/state` (pontos, missões por pessoa, custo) e o `/admin/presenter` têm de ser iguais à soma das cadernetas locais (`local.jsonl` de cada um).

### 3. Decisão e spec
- [ ] D-37 no `DECISIONS.md`:
  - tudo o que está acima, com o porquê (o ensaio de 5 pessoas);
  - o desvio ao DESIGN.md só para o painel (o violeta e o tema claro da Checkmarx);
  - a M11, e a vista `auto` como vista por defeito.
- [ ] A secção 12 da `docs/pt/WORKSHOP-V2-SPEC.md`: as alterações da rc.3.
- [ ] `docs/HANDOVER.md` e `docs/pt/HANDOVER.md`: o estado da rc.3.

### 4. Versão e textos gerados
- [ ] `repos.conf`: `WORKSHOP_VERSION=v1.1.0-rc.3`.
- [ ] `node tools/render.mjs`: README, INSTALL, TROUBLESHOOTING e o **email**, que fica a apontar para a rc.3.
- [ ] `node slides/build-v2.mjs --png` (Docker LibreOffice, imagem `ws-libreoffice`) e revisão visual das imagens dos 33 slides, em pt e en.

### 5. Bateria completa
- [ ] `bash tools/test-all.sh` (com Docker, para o shellcheck).
- [ ] `bash setup/test/test-mac.sh`.
- [ ] Pester e PSScriptAnalyzer (`scratchpad/pwsh/pester-local.sh`, ou o Docker do `CLAUDE.md`). O `Test-WsCheckOkWanted` mudou: a instalação sem falhas passa a enviar.
- [ ] Instalação limpa, e por cima da rc.2, a partir de uma release local, num HOME temporário (o script de 32 verificações), acrescentando:
  - o `.mcp.json` do Canivete e o `enabledMcpjsonServers` no `~/.claude.json`;
  - o hook de telemetria na `Stop` e o matcher novo;
  - a M11 na caderneta.
- [ ] Uma chamada real a uma tool do Canivete a partir do Claude (`claude -p "Usa a ferramenta my-01 …"` no Canivete, num HOME temporário). A sessão C não a pôde fazer sem login. Confirma que a M11 conta.
- [ ] As capturas do painel (`tools/record/panel-screenshots.mjs`) a 640 e 1920 px, em pt e en, incluindo a vista do apresentador (tecla P), que a sessão B não capturou.

### 6. Publicar (só com o "sim" do organizador)
- [ ] `tools/build-release.sh v1.1.0-rc.3`.
- [ ] `tools/publish-release.sh v1.1.0-rc.3 --prerelease --notas <ficheiro>` no GitHub e no Gitea (`RELEASE_PROVIDER=gitea` e `WORKSHOP_REPO_URL` com o repositório do Gitea em `DEV_REPO_HOST`, do `repos.conf`), com os mesmos assets.
- [ ] Push do `workshop-v2` e do `main` (fast-forward).
- [ ] Deploy do painel com **todas as abas do painel fechadas**:
  - correr `tools/deploy-panel.sh` (a Worker e as Pages);
  - confirmar que o `/health` responde com o `build` do commit novo. Se responder o antigo, a Durable Object ainda é a velha: fechar as abas, esperar e voltar a ver.
- [ ] Rodar o token de admin do painel, que foi colado no chat a 22 out.:
  - gerar um novo com `openssl rand -hex 24`;
  - guardá-lo com `cd panel/worker && wrangler secret put ADMIN_TOKEN`.
- [ ] Teste real curto com o painel publicado: uma instalação a partir do one-liner da rc.3 e 2 ou 3 missões. Ver a vista `auto` a mudar e o build certo no `/health`.

### 7. Depois de publicar
- [ ] Voltar a gerar o email (`node tools/render.mjs`), confirmar que os três links da rc.3 abrem (HTTP 200) e enviá-lo com a data, o local e o prazo preenchidos.
