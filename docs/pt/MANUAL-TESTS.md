# Testes manuais (o que a automação não cobre)

[English](../MANUAL-TESTS.md) · **Português**

Estes testes têm de ser feitos numa máquina real antes de publicar. Para cada um, regista em `DECISIONS.md` a data, a máquina e o resultado.

## Windows 10 e Windows 11 (utilizador sem admin)

Checklist passo a passo para um portátil (as correções do Windows, cerca de 60 a 90 minutos): [WINDOWS-CHECKLIST.md](WINDOWS-CHECKLIST.md) · [English](../WINDOWS-CHECKLIST.md).

| # | Passo | Resultado esperado |
|---|---|---|
| W1 | Numa conta **sem admin**, num PowerShell 5.1 normal (não o 7), corre o one-liner do README | Começa sem erros de política de execução; o cabeçalho aparece em inglês, sem caracteres trocados |
| W2 | Deixa correr até ao fim | Todos os passos ✅ ou ⏭️, exceto o Desktop (⚠️); a frase final diz "Everything is ready for the workshop." |
| W3 | Fecha e abre um terminal novo; corre `claude --version`, `node -v`, `gh --version`, `uv --version`, `agent-memory --help` | Todos respondem (o PATH ficou certo) |
| W4 | Corre outra vez o one-liner | Os passos já feitos aparecem como ⏭️ |
| W5 | Corre com `-Check` | Só verifica; não altera nada (compara a data de `~/.claude/settings.json`) |
| W6 | Desliga a rede a meio de uma segunda instalação (num perfil limpo) e volta a correr | Retoma; o passo que falhou mostra porquê e o que fazer |
| W7 | Com um proxy corporativo (ou um Fiddler/mitmproxy a intercetar) | Deteta a interceção, exporta os certificados e o `claude -p` de teste funciona |
| W8 | `claude` na pasta da Arena → aceitar a confiança na pasta → `/demo-plan` | Mostra o Mermaid e a estimativa |
| W9 | `/demo-swarm` com a statusline visível | Cartões a ficar verdes; a statusline mostra o custo; o cronómetro fica abaixo de 20 min |
| W10 | `node server.js` e abrir o endereço `/status` que ele mostra (normalmente `http://localhost:3000/status`) | A grelha muda de cor; não aparece o aviso da firewall do Windows |
| W11 | Abre a app Agent Memory pelo Menu Iniciar | A janela abre (WebView2) e o grafo aparece |
| W12 | `-Uninstall` (e o sinónimo antigo `-Desinstalar`) | O `settings.json` volta ao que era; os agentes, as skills e o MCP saem |
| W13 | Utilizador com espaço e acentos no nome (ex.: `C:\Users\João Silva`) | Tudo funciona, incluindo os hooks e a statusline |
| W14 | Windows on ARM (se houver) | Usa os binários arm64 ou dá uma mensagem clara |
| W16 | Conta **sem nada** instalado (sem Git, sem Claude Code, sem `gh`) | O setup instala o Git for Windows (por utilizador), o Claude Code e o `gh`; abre o login Claude e o do GitHub no browser; passos 1, 3 e 6 ✅ |
| W15 | Máquina **sem Python** instalado (confirma que `python`/`py` não existem ou que só abrem a Microsoft Store) | O passo da app de memória instala, o uv descarrega o seu próprio Python 3.12, e o `agent-memory selftest` mostra "Python 3.12.x" e "FTS5" |
| W17 | Atlassian CLI: no fim do setup, aceitar "Log in to the Atlassian CLI now?…", e depois `acli auth status` num terminal novo | O browser abre e o login fica feito. Num site sem a app ACLI aprovada, aparece "site admin must authorize" e o passo 7 continua sem falhar (só a nota) |
| W18 | Windows em inglês (ou noutra língua que não o português), sem `language` no `~/.claude/settings.json` | O setup grava `"language": "English"`; a Arena (cartões e `/status`), as tabelas do orquestrador e a statusline aparecem em inglês, sem nenhuma palavra, nome de ficheiro ou marcador em português; o `/demo-plan` responde em inglês |
| W19 | Numa conta com um kit de antes da D-25 (nomes em inglês) instalado (servidor MCP `memoria`, notas em `~/.memoria`, `~/workshop-claude/exemplo-projeto-real`), volta a correr o one-liner | O `claude mcp list` mostra `agent-memory` e já não mostra `memoria`; as notas antigas aparecem na app Agent Memory e pelo `/memory`; o projeto de treino fica em `~/workshop-claude/practice-project` (só é movido se essa pasta ainda não existir, e nada é apagado) |

## macOS (Apple Silicon e Intel)

| # | Passo | Resultado esperado |
|---|---|---|
| M1 | Numa conta sem admin, com `curl -fsSL … \| bash` | Corre até ao fim; as perguntas (login) aparecem e aceitam resposta |
| M2 | Sem Xcode Command Line Tools | O passo do git explica o pré-trabalho (`xcode-select --install`) e os passos independentes continuam |
| M3 | Intel (x64) | Instala o Node x64 e o Claude Code certo |
| M4 | App Agent Memory pelo `~/Applications/Agent Memory.app` | Abre sem aviso do Gatekeeper |
| M5 | Login Console real (`claude auth login --console`) numa conta Console nova | `claude auth status` mostra o método Console; o teste de fumo mostra o custo |
| M6 | Conta **sem nada** instalado (sem Claude Code, sem `gh`, sem Command Line Tools) | O setup instala tudo, abre o login da conta Claude no browser e depois o login do GitHub (código no terminal, confirmação no browser); passos 3 e 6 ✅; "Everything is ready for the workshop." |
| M7 | Atlassian CLI: aceitar o login do passo 7, depois `acli auth status`. Com o MCP desligado (`claude mcp remove --scope user atlassian`), correr `/task-intake <CHAVE>` e `/task-report jira` numa issue de teste com um link para uma página do Confluence na descrição | O intake lê a issue pelo `acli` (`"via":"acli"` no `task.json`) e a página com `acli confluence page view … --body-format storage --json`; o `task.md` tem `## Documentation (Confluence)` com um resumo de até 800 caracteres. Anota o tamanho da saída em `storage` e em `view` (D-19). O report pede o sim e publica os comentários com `--body-file`; diz para registar as horas à mão. Volta a correr o setup para repor o MCP |
| M8 | macOS em português de Portugal, sem `language` no `~/.claude/settings.json`; depois, noutra conta, com um `language` já definido | Sem `language`: o setup grava `"European Portuguese"` e a Arena e a statusline aparecem em português. Com `language`: fica o que lá estava |
| M9 | O mesmo que o W19, no Mac: um kit de antes da D-25 instalado e depois o one-liner outra vez | O mesmo que o W19 |

## Fluxo Console (não exercitado pelo benchmark)

O benchmark corre numa assinatura Max. Antes do workshop, faz uma vez, numa conta Console nova:
1. Instalação limpa e login com `--console`.
2. Sessão completa do Projeto 1 em modo interativo, com cronómetro.
3. Compara o custo do `/demo-cost` com a página Cost da Console no dia seguinte. A diferença esperada é inferior a 5%.
4. Regista o resultado em `DECISIONS.md`.
