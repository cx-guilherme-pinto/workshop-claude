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

## Depois

- `agent-memory update` atualiza a app Agent Memory sem tocar nas notas.
- Para limpar uma máquina: setup com `--uninstall` (Windows: `-Uninstall`).
