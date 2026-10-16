# FAQ — dúvidas frequentes

Respostas curtas às perguntas mais prováveis no workshop. Para erros de instalação com código (`E-NET-01`, `E-PERM-01`…), vê o `TROUBLESHOOTING.md`.

## Instalação

**Deu erro de permissão.**
O script instala tudo no teu perfil e não precisa de admin. Corre `setup --doctor` (Mac: `bash setup-mac.sh --doctor`; Windows: `-Doctor`): ele diz qual pasta não tem permissão e o comando para corrigir. Num portátil da empresa, uma pasta bloqueada por política (AppLocker, antivírus) é um caso para a tua equipa de TI.

**Como sei se está tudo pronto?**
Corre o script com `--check` (Windows: `-Check`). Demora 2 a 3 minutos, não instala nada e acaba com "Está tudo pronto para o workshop" ou com a lista do que falta. O resumo fica em `~/.workshop-claude/resumo.txt`, e podes mostrá-lo a quem te ajudar.

**Posso correr o script duas vezes?**
Sim. Ele deteta o que já está feito e salta esses passos (⏭️). Se falhou a meio, voltar a correr continua dali.

**Estou atrás de um proxy da empresa.**
O script deteta o proxy do sistema e, se a empresa inspecionar o tráfego HTTPS, exporta os certificados da empresa e configura o Claude Code, o Node e o uv para os usarem. Proxies que só aceitam NTLM ou Kerberos não são suportados. Nesse caso fala com a TI ou usa outra rede.

**O `gh` não autentica.**
Corre `gh auth login` num terminal novo, escolhe GitHub.com, HTTPS e "Login with a web browser". Se a empresa usar GitHub Enterprise, escolhe-o e indica o servidor. Confirma com `gh auth status`.

**O Jira não aparece no `/mcp`.**
1. Confirma com `claude mcp list` que existe uma linha `atlassian`. Se não existir, volta a correr o setup.
2. Dentro do Claude Code, corre `/mcp`, escolhe `atlassian` e faz login no browser.
3. Se o login recusar o acesso, o administrador do Jira da tua empresa pode ter limitado os domínios ou as apps permitidas no "Atlassian MCP server". Sem isso, usa o projeto de treino `exemplo-projeto-real/`, que tem as issues em ficheiros locais.

**A app Memória não abre no Windows.**
Ela precisa do WebView2 da Microsoft. O setup instala-o se faltar. Se mesmo assim não abrir, a app abre a mesma interface no teu browser.

## Custos

**Quanto já gastei?**
- A **statusline**, a linha por baixo da caixa de texto, mostra o custo da sessão e o total do projeto. Avisa ao passar US$ 5 e US$ 10.
- O **`/demo-cost`** dá o relatório completo, por agente, modelo e onda.
- O valor que é faturado está na Console da Anthropic, em Usage e Cost. Aparece com alguns minutos de atraso.

**Porque é que o `/usage` mostra um valor mais alto do que a statusline?**
Algumas versões do Claude Code ainda não conhecem os preços dos modelos mais recentes (por exemplo, o Haiku 5.5) e estimam-nos por cima. A statusline e o `/demo-cost` usam os tokens reais e a tabela de preços publicada (`pricing.json`). Quem manda é sempre a Console.

**O enxame pára se eu passar dos US$ 10?**
Não. O workshop nunca interrompe uma sessão por custo: só mostra um aviso. O desenho foi medido para ficar perto dos US$ 5 (ver `benchmark/REPORT.md`).

**Porque é que o orquestrador usa Sonnet e não Opus?**
Com conta Console, o modelo por defeito é o Opus. O projeto demo fixa Sonnet na sessão principal e põe o Opus só onde vale a pena: planear e rever. O grosso do trabalho vai para o Haiku, cerca de 20 vezes mais barato.

## Durante o enxame

**Como paro o enxame?**
Carrega em **Esc** no Claude Code. Os agentes em curso terminam e não são lançados mais. O estado fica guardado em `.workshop/`, por isso voltar a correr `/demo-swarm` (ou `/task-swarm`) retoma onde parou.

**Posso fazer uma pergunta sem interromper?**
Sim: `/btw <pergunta>`. A resposta não entra na conversa principal.

**Onde vejo os agentes a trabalhar?**
- No browser: `node server.js` na pasta da Arena e depois `http://localhost:3000/estado`.
- Noutro terminal: `node tools/workshop/orquestrador/painel.mjs`.

**Um cartão ficou vermelho. E agora?**
O orquestrador repete-o sozinho, primeiro em Haiku com a mensagem de erro e depois em Sonnet. Se mesmo assim falhar, o `/demo-review` mostra porquê. Para insistir até ficar tudo verde: `/loop 2m corre node tools/check-integracao.mjs e corrige o primeiro teste vermelho com o implementer; para quando estiver tudo verde`.

**Apareceu "Do you trust the files in this folder?".**
É o Claude Code a perguntar se confias na pasta. Na Arena, responde que sim: sem isso, as permissões do projeto (`.claude/settings.json`) ficam desligadas e o enxame pára a pedir autorizações.

**Quero recomeçar a Arena do zero.**
`/demo-reset`. O histórico de custos fica guardado em `.workshop/historico/`.

## Funcionalidades

**Porque é que o `/schedule` (rotinas) não aparece?**
As rotinas na cloud exigem uma assinatura claude.ai. Com conta Console, usa o `/loop` (com a sessão aberta) ou uma "rotina local": o agendador do sistema (launchd no Mac, Agendador de Tarefas no Windows) a correr `claude -p "..."`.

**Posso continuar a sessão no telemóvel?**
O Remote Control também exige uma assinatura claude.ai e não aceita API keys. Com conta Console, não.

**O Claude Desktop serve para o workshop?**
Para o hands-on, não: o separador Code do Desktop exige assinatura. O Desktop é instalado à parte, se quiseres usá-lo para conversar (com uma conta claude.ai, até a gratuita). Todo o hands-on corre no Claude Code, no terminal.

**E o MCP do GitHub?**
O workshop usa o `gh` (mais simples e gasta menos contexto). Se quiseres o MCP oficial do GitHub, precisas de um token pessoal (PAT): `claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer <o teu PAT>"}}'`. Não partilhes esse token.
