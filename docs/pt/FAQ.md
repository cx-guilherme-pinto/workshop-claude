# FAQ — dúvidas frequentes

[English](../FAQ.md) · **Português**

Respostas curtas às perguntas mais prováveis no workshop. Para erros de instalação com código (`E-NET-01`, `E-PERM-01`…), vê o `TROUBLESHOOTING.md`.

## Instalação

**Deu erro de permissão.**
O script instala tudo no teu perfil e não precisa de admin. Corre `setup --doctor` (Mac: `bash setup-mac.sh --doctor`; Windows: `-Doctor`): ele diz qual pasta não tem permissão e o comando para corrigir. Num portátil da empresa, uma pasta bloqueada por política (AppLocker, antivírus) é um caso para a tua equipa de TI.

**Como sei se está tudo pronto?**
Corre o script com `--check` (Windows: `-Check`). Demora 2 a 3 minutos, não instala nada e acaba com "Check complete: everything is ready for the workshop." (está tudo pronto) ou com a lista do que falta. O resumo fica em `~/.workshop-claude/resumo.txt`, e podes mostrá-lo a quem te ajudar.

**Posso correr o script duas vezes?**
Sim. Ele deteta o que já está feito e salta esses passos (⏭️). Se falhou a meio, voltar a correr continua dali.

**Estou atrás de um proxy da empresa.**
O script deteta o proxy do sistema e, se a empresa inspecionar o tráfego HTTPS, exporta os certificados da empresa e configura o Claude Code, o Node e o uv para os usarem. Proxies que só aceitam NTLM ou Kerberos não são suportados. Nesse caso fala com a TI ou usa outra rede.

**O `gh` não autentica.**
Corre `gh auth login` num terminal novo, escolhe GitHub.com, HTTPS e "Login with a web browser". Se a empresa usar GitHub Enterprise, escolhe-o e indica o servidor. Confirma com `gh auth status`.

**O Jira não aparece no `/mcp`.**
1. Confirma com `claude mcp list` que existe uma linha `atlassian`. Se não existir, volta a correr o setup.
2. Dentro do Claude Code, corre `/mcp`, escolhe `atlassian` e faz login no browser.
3. Se o login recusar o acesso, o administrador do Jira da tua empresa pode ter limitado os domínios ou as apps permitidas no "Atlassian MCP server". Sem isso, usa a reserva (abaixo) ou o projeto de treino `exemplo-projeto-real/`, que tem as issues em ficheiros locais.

**O MCP do Jira falha. Há alternativa?**
Sim: o setup instala o **Atlassian CLI** (`acli`, oficial da Atlassian). Quando as ferramentas do MCP faltam ou dão erro, o `/task-intake` lê a issue com o `acli` e o `/task-report` publica os comentários com ele, sempre com o teu "sim" antes de escrever.
1. Faz o login uma vez num terminal: `acli auth login` (abre o browser; no terminal, escolhe o mesmo site). Confirma com `acli auth status`.
2. Se aparecer "site admin must authorize this app", o administrador do Jira tem de aprovar a app ACLI no site (ver `E-ACLI-02` no TROUBLESHOOTING). Também lá está o login com API token, para quando não houver OAuth.
3. O `acli` não regista horas: no fim, o `/task-report` diz-te quanto tempo registar à mão em *Log work*.
O mesmo login serve para o Confluence: `acli confluence space list` e `acli confluence page view --id <id>`.

**A app Agent Memory não abre no Windows.**
Ela precisa do WebView2 da Microsoft. O setup instala-o se faltar. Se mesmo assim não abrir, a app abre a mesma interface no teu browser.

## Custos

**Quanto já gastei?**
- A **statusline**, a linha por baixo da caixa de texto, mostra o custo da sessão e o total do projeto. Avisa ao passar US$ 5 e US$ 10.
- O **`/demo-cost`** dá o relatório completo, por agente, modelo e onda.
- O valor que é faturado está na Console da Anthropic, em Usage e Cost. Aparece com alguns minutos de atraso.

**Porque é que o `/usage` mostra um valor mais alto do que a statusline?**
Algumas versões do Claude Code ainda não conhecem os preços dos modelos mais recentes (por exemplo, o Haiku 5.5) e estimam-nos por cima. A statusline e o `/demo-cost` usam os tokens reais e a tabela de preços publicada (`pricing.json`). Quem manda é sempre a Console.

**O swarm pára se eu passar dos US$ 10?**
Não. O workshop nunca interrompe uma sessão por custo: só mostra um aviso. O desenho foi medido para ficar perto dos US$ 5 (ver `benchmark/REPORT.md`).

**Porque é que o orquestrador usa Sonnet e não Opus?**
Com conta Console, o modelo por defeito é o Opus. O projeto demo fixa Sonnet na sessão principal e põe o Opus só onde vale a pena: planear e rever. O grosso do trabalho vai para o Haiku, cerca de 20 vezes mais barato.

## Durante o swarm

**Como paro o swarm?**
Carrega em **Esc** no Claude Code. Os agentes em curso terminam e não são lançados mais. O estado fica guardado em `.workshop/`, por isso voltar a correr `/demo-swarm` (ou `/task-swarm`) retoma onde parou.

**Posso fazer uma pergunta sem interromper?**
Sim: `/btw <pergunta>`. A resposta não entra na conversa principal. Abre num painel: fecha-o com Esc, porque enquanto está aberto os resultados dos agentes ficam à espera e o swarm não avança.

**Onde vejo os agentes a trabalhar?**
- No browser: `node server.js` na pasta da Arena e depois `http://localhost:3000/estado`.
- Noutro terminal: `node tools/workshop/orquestrador/painel.mjs`.

**Um cartão ficou vermelho. E agora?**
O orquestrador repete-o sozinho, primeiro em Haiku com a mensagem de erro e depois em Sonnet. Se mesmo assim falhar, o `/demo-review` mostra porquê. Para insistir até ficar tudo verde: `/loop 2m corre node tools/workshop/orquestrador/grade.mjs --todos e corrige a primeira tarefa vermelha com o agente implementer; termina quando estiver tudo verde`.

**Apareceu "Is this a project you created or one you trust?" (ou "Do you trust the files in this folder?").**
É o Claude Code a perguntar se confias na pasta. Na Arena, responde que sim: sem isso, as permissões do projeto (`.claude/settings.json`) ficam desligadas e o swarm para a pedir autorizações. Atenção: como a Arena pré-aprova algumas permissões, as versões recentes do Claude Code abrem este diálogo com **No, exit** selecionado. Carrega na seta para baixo até **Yes, I trust this folder** e depois em Enter. Se o Claude Code fechar, corre `claude` outra vez na mesma pasta.

**Quero recomeçar a Arena do zero.**
`/demo-reset`. O histórico de custos fica guardado em `.workshop/historico/`.

## Língua

**Porque é que o setup está em inglês?**
O setup fala só inglês, em todas as máquinas, e as opções também: `--uninstall`, `--no-desktop`, `--yes` e `--replace-statusline` (Windows: `-Uninstall`, `-NoDesktop`, `-Yes` e `-ReplaceStatusline`). As antigas em português (`--desinstalar`, `-SemDesktop`…) continuam a funcionar. Os códigos de erro são os mesmos, e o [TROUBLESHOOTING.md](TROUBLESHOOTING.md) explica-os em português.

**Em que língua me responde o Claude?**
Na tua. As skills e os agentes estão escritos em inglês, mas respondem na língua de quem os usa. O setup grava a definição `language` do Claude Code com a língua da máquina (português de Portugal ou do Brasil, inglês, hindi ou hebraico), só se ainda não tiveres uma. Se já tinhas, fica a tua.

**E a Arena, o orquestrador e a statusline?**
Seguem a língua da máquina: português numa máquina em português, inglês em todas as outras (incluindo hindi e hebraico). Para forçar uma delas nos textos do kit, define `WORKSHOP_LANG=pt` ou `WORKSHOP_LANG=en` antes de abrir o Claude Code.

## Funcionalidades

**Como encontro tudo o que aprendi num ticket ou num épico?**
Na app Agent Memory, escreve a chave na pesquisa (ex.: `ABC-123` ou o épico `ABC-100`): aparecem as memórias desse ticket, as do épico e as tarefas ligadas. No Claude Code, o `/task-intake` faz o mesmo sozinho antes de planear. As memórias ficam ligadas ao ticket porque o `/task-report` e o `/memoria` gravam o id, o épico e o URL.

**O `/task-intake` lê as páginas do Confluence ligadas na issue?**
Sim, até 2. Se a descrição da issue do Jira tiver links para páginas do Confluence (`…/wiki/spaces/<espaço>/pages/<id>/…`), o intake lê-as pelo MCP ou, se o MCP falhar, pelo `acli`. Depois guarda um resumo curto de cada uma em `.workshop/tarefa.md`, na secção "Documentação (Confluence)", e o `/task-plan` usa-o.
- Só lê: nunca escreve no Confluence.
- Se o MCP falhar e o `acli` não tiver login (`acli auth login`), avisa numa linha e continua sem as páginas.
- Os links curtos (`…/wiki/x/…`) não têm o id da página e ficam de fora. Na issue, cola o link completo.

**Porque é que o `/schedule` (rotinas) não aparece?**
As rotinas na cloud exigem uma assinatura claude.ai. Com conta Console, usa o `/loop` (com a sessão aberta) ou uma "rotina local": o agendador do sistema (launchd no Mac, Agendador de Tarefas no Windows) a correr `claude -p "..."`.

**Posso continuar a sessão no telemóvel?**
O Remote Control também exige uma assinatura claude.ai e não aceita API keys. Com conta Console, não.

**O Claude Desktop serve para o workshop?**
Para o hands-on, não: o separador Code do Desktop exige assinatura. O Desktop é instalado à parte, se quiseres usá-lo para conversar (com uma conta claude.ai, até a gratuita). Todo o hands-on corre no Claude Code, no terminal.

**E o MCP do GitHub?**
O workshop usa o `gh` (mais simples e gasta menos contexto). Se quiseres o MCP oficial do GitHub, precisas de um token pessoal (PAT): `claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer <o teu PAT>"}}'`. Não partilhes esse token.
