# Guia do organizador

[English](../ORGANIZER.md) · **Português**

## Antes do dia (pelo menos 3 dias antes)

1. **Enviar o comando de instalação** (o do `README.pt.md` ou, em inglês, do `README.md`, gerados a partir do `repos.conf`), com um prazo: "corre até <data>; no dia só vamos verificar".
2. **Pedir a cada pessoa** que:
   - tenha uma **conta Console** própria, com créditos;
   - defina um **limite de gasto mensal bem acima de US$ 10** (por exemplo, US$ 25), só como proteção contra abusos. Nunca abaixo, porque um limite atingido corta a sessão a meio;
   - corra o setup e depois `--check`;
   - envie o `~/.workshop-claude/summary.txt` se faltar algum passo.
3. **Contas novas e limites de taxa.** As organizações Console novas podem começar no tier *Evaluation*, com limites mais baixos e não publicados. O swarm do participante usa até 8 agentes em paralelo (`ARENA_MAX_PARALLEL`; o nome antigo, `ARENA_MAX_PARALELO`, continua a funcionar). Se aparecerem erros 429, o Claude Code repete sozinho e o swarm fica só mais lento. Recomenda-se que cada pessoa faça o setup e um `/demo-plan` uns dias antes, para a conta ganhar histórico de uso.
4. **Jira.** O servidor MCP da Atlassian usa OAuth e gasta créditos Rovo da organização. Em cada empresa, o administrador pode:
   - limitar os domínios permitidos (Atlassian Administration → Connectors → Atlassian MCP server);
   - desligar ferramentas de escrita.
   **Reserva:** o setup instala também o Atlassian CLI (`acli`, oficial), que as skills usam quando o MCP falha. Desde a versão 1.3.15, um administrador de cada site tem de autorizar a app ACLI uma vez: corre `acli jira auth login`, escolhe "Web" e aprova o site. Peçam isso ao administrador junto com o pedido do MCP. Sem OAuth, cada pessoa pode entrar com um API token (`E-ACLI-02`). O `acli` não regista horas (worklog): com ele, o `/task-report` só publica comentários.
   Quem não tiver Jira usa o `practice-project/` (issues em JSON).
5. **Rede da sala.** Centenas de portáteis a descarregar ao mesmo tempo esgotam a rede. Por isso o setup é feito **antes** do dia. No dia só se corre o `--check` e as chamadas à API. Domínios que a rede da sala tem de deixar passar:
   - `api.anthropic.com`, `claude.ai`, `platform.claude.com`, `downloads.claude.ai`;
   - o servidor dos repositórios (do `repos.conf`);
   - `mcp.atlassian.com`, `*.atlassian.net`, `acli.atlassian.com` (download do Atlassian CLI);
   - `github.com`, `api.github.com`;
   - para quem ainda não instalou: `nodejs.org`, `astral.sh`, `releases.astral.sh`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, `pypi.org`, `files.pythonhosted.org`.
6. **Língua.** O setup fala só inglês. As skills estão em inglês e respondem na língua de cada pessoa (o setup grava a definição `language` do Claude Code, se ainda não existir). A Arena, o orquestrador e a statusline ficam em português nas máquinas em português e em inglês nas restantes; `WORKSHOP_LANG=pt` ou `WORKSHOP_LANG=en` força uma delas. Os nomes de ficheiros e pastas, os comandos, as opções, os marcadores, os ids das tarefas da Arena e as ferramentas MCP da memória estão em inglês nas duas línguas (D-25), por isso uma sessão em inglês não mostra português. A documentação está primeiro em inglês (`README.md`, `docs/`), com versões em português (`README.pt.md`, `docs/pt/`); o README e o guia de instalação também em hindi e hebraico (`README.hi.md`, `README.he.md`, `docs/hi/`, `docs/he/`): envia a versão certa a cada grupo.

## Acompanhar o gasto dos participantes

Cada participante paga a sua conta. Por isso não há um painel central, e cada pessoa vê o seu gasto:
- na **statusline** do Claude Code (custo da sessão e do projeto, com aviso aos US$ 5 e aos US$ 10);
- no **`/demo-cost`** (relatório por agente, modelo e onda);
- na **Console** → Usage e Cost (o valor faturado, com alguns minutos de atraso).

Se for o organizador a dar acesso (convidando as pessoas para a sua organização Console), passa a poder acompanhar todos:
- **Workspace "Claude Code"**: é criado sozinho no primeiro login Console no Claude Code e é o único que permite limites de gasto **por pessoa**. Define-os bem acima de US$ 10.
- **Console → Claude Code** (`platform.claude.com/claude-code`): gasto e linhas aceites por membro.
- **Admin API** (com uma chave de admin): `GET /v1/organizations/usage_report/messages` (agrupável por chave e workspace, com buckets de 1 min a 1 dia) e `GET /v1/organizations/cost_report`. Os dados chegam com cerca de 5 minutos de atraso.
- **Atenção aos limites de taxa:** são por organização. Com centenas de pessoas na mesma organização, é preciso pedir um aumento temporário (tier Custom) e arrancar os swarms por filas.

## No dia

- **Abertura:** toda a gente corre `--check`. Quem tiver ❌ corre `--doctor` e mostra o resultado a um assistente. Quem não tiver setup segue com o vizinho e instala no intervalo das perguntas.
- **Plano B para o vídeo:** se o MP4 falhar no projetor, abre `/status?replay=recording` na Arena gravada (`presenter-replay/`), que reproduz a execução real sem chamar a API.
- **Ritmo:** o `slides/speaker-notes.md` (apresentação em português, `slides/workshop.pptx`) tem o relógio acumulado e os slides que se podem saltar. A apresentação em inglês tem o seu, `slides/speaker-notes.en.md`.

## O deck v2 e o palco (workshop v2)

O deck v2 tem 32 slides em 1280 × 1080: os slides ocupam os dois terços da esquerda de um ecrã de 1920 × 1080 e o painel ao vivo o terço da direita. Cada slide tem uma fase do painel, por isso a vista do painel acompanha os slides (D-36).
- **Gerar** (em `slides/`, depois do `npm install`): `node build-v2.mjs`. Escreve `workshop-v2.pptx` e `workshop-v2.en.pptx`, `speaker-notes-v2.md` e `speaker-notes-v2.en.md`, e o `palco.html`. Com `--png` exporta também uma imagem por slide para `slides/palco/<língua>/`, com o LibreOffice (local, ou a imagem Docker: `docker build -t ws-libreoffice slides/libreoffice`). Sem as imagens, o palco desenha cada slide em HTML a partir do mesmo conteúdo.
- **O palco:** abre `slides/palco.html?lang=pt#admin=<token>` no browser, em ecrã inteiro (F). As setas, o espaço e PageUp/PageDown mudam de slide. Quando a fase muda, o palco chama o `/admin/phase` da Worker com o token, que fica só nesse browser. A tecla N abre as notas do apresentador numa segunda janela (`palco.html?notas=1`), sincronizada com o palco.
- **Notas do apresentador:** em cada slide, por esta ordem: o objetivo, o que dizer (no máximo 3 frases), o que ler no painel (frases prontas para cada caso), as falhas típicas com o comando que resolve, e o relógio.
- **Plano B:** o PowerPoint (`workshop-v2.pptx`) numa janela ao lado do browser com o painel, com a fase mudada à mão com as teclas 1 a 5 no painel.
- O deck v1 (a Arena, `workshop.pptx`) fica como alternativa.

## O painel ao vivo (workshop v2)

O painel é uma página projetada ao lado dos slides, alimentada pelos eventos dos portáteis registados no setup (`docs/pt/PRIVACY.md`; D-34: toda a gente entra, com o nome do GitHub, e tudo é apagado à meia-noite). Corre no Cloudflare (D-30): a API numa Worker com um Durable Object, e a página nas Pages.

- **Publicar** (pelo menos 3 dias antes), a partir deste repositório e com sessão iniciada no `wrangler`:
  1. Põe um `WORKSHOP_CODE` novo (um por workshop) e a `WORKSHOP_DATE` no `repos.conf`.
  2. Corre `tools/deploy-panel.sh --dry-run` e depois `tools/deploy-panel.sh`. O script pergunta antes de cada passo: a Worker, o token de admin (pedido pelo wrangler; nunca vai para a linha de comandos) e a página.
  3. Põe no `repos.conf` os dois endereços que o script mostra (`PANEL_URL` e `PANEL_PAGE_URL`), corre `node tools/render.mjs` e volta a construir a release, para os portáteis enviarem para o painel.
  4. Corre outra vez `tools/deploy-panel.sh`: a Worker passa a aceitar o endereço da página (CORS).
- **Ensaiar:** `node panel/simulate.mjs --people 100 --speed 10 --url <PANEL_URL> --ws <código>` (com `PANEL_ADMIN_TOKEN` no ambiente, também muda as vistas). Ou corre tudo localmente com `PANEL_ADMIN_TOKEN=<t> node panel/server.mjs` e abre `http://127.0.0.1:8787/`.
- **No dia:**
  - Todos os ecrãs abrem a mesma `<página>/`: um só board e os mesmos números para toda a gente, sem salas (D-34).
  - O apresentador acrescenta `#admin=<token>` uma vez: o token fica no browser e as teclas 1 a 5 mudam a vista em todos os ecrãs (Abertura, Missões, Projeto 1, Projeto 2, Fecho).
  - Para esconder uma alcunha do feed, carrega em `H` e clica nela.
  - Num projetor lento, usa `?lite=1`.
- **Plano B:**
  - Sem rede ou sem a Worker, usa `<página>/?replay=simulated&x=10`. Depois do ensaio, usa `?replay=rehearsal`, a partir de `panel/replays/rehearsal.jsonl`.
  - Os portáteis guardam os eventos na fila e enviam-nos depois. A caderneta continua a funcionar.
- **Depois:** não há nada a apagar. À meia-noite (`PANEL_TIMEZONE` no `repos.conf`), o painel apaga tudo sozinho: eventos, nomes, hashes das contas e o segredo das assinaturas (D-34). Para apagar tudo mais cedo (depois de um ensaio, por exemplo): `POST <PANEL_URL>/admin/reset` com o cabeçalho `X-Admin-Token`; quem já se registou tem de voltar a correr o setup (ou `ctl.mjs register`). Muda o `WORKSHOP_CODE` e o token antes do workshop seguinte.
- **Ensaia na véspera, não na manhã do próprio dia:** um ensaio com registos reais no próprio dia fica no board até à meia-noite, a não ser que faças o reset.

## Depois

- `agent-memory update` atualiza a app Agent Memory sem tocar nas notas.
- Para limpar uma máquina: setup com `--uninstall` (Windows: `-Uninstall`).
