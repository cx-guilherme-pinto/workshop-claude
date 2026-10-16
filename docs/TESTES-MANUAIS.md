# Testes manuais (o que a automação não cobre)

Estes testes têm de ser feitos numa máquina real antes de publicar. Para cada um, regista em `DECISIONS.md` a data, a máquina e o resultado.

## Windows 10 e Windows 11 (utilizador sem admin)

| # | Passo | Resultado esperado |
|---|---|---|
| W1 | Numa conta **sem admin**, num PowerShell 5.1 normal (não o 7), corre o one-liner do README | Começa sem erros de política de execução; o cabeçalho aparece em português e com os acentos certos |
| W2 | Deixa correr até ao fim | Todos os passos ✅ ou ⏭️, exceto o Desktop (⚠️); a frase final diz "Está tudo pronto para o workshop" |
| W3 | Fecha e abre um terminal novo; corre `claude --version`, `node -v`, `gh --version`, `uv --version`, `memoria --help` | Todos respondem (o PATH ficou certo) |
| W4 | Corre outra vez o one-liner | Os passos já feitos aparecem como ⏭️ |
| W5 | Corre com `-Check` | Só verifica; não altera nada (compara a data de `~/.claude/settings.json`) |
| W6 | Desliga a rede a meio de uma segunda instalação (num perfil limpo) e volta a correr | Retoma; o passo que falhou mostra porquê e o que fazer |
| W7 | Com um proxy corporativo (ou um Fiddler/mitmproxy a intercetar) | Deteta a interceção, exporta os certificados e o `claude -p` de teste funciona |
| W8 | `claude` na pasta da Arena → aceitar a confiança na pasta → `/demo-plan` | Mostra o Mermaid e a estimativa |
| W9 | `/demo-swarm` com a statusline visível | Cartões a ficar verdes; a statusline mostra o custo; o cronómetro fica abaixo de 20 min |
| W10 | `node server.js` e abrir `http://localhost:3000/estado` | A grelha muda de cor; não aparece o aviso da firewall do Windows |
| W11 | Abre a app Memória pelo Menu Iniciar | A janela abre (WebView2) e o grafo aparece |
| W12 | `-Desinstalar` | O `settings.json` volta ao que era; os agentes, as skills e o MCP saem |
| W13 | Utilizador com espaço e acentos no nome (ex.: `C:\Users\João Silva`) | Tudo funciona, incluindo os hooks e a statusline |
| W14 | Windows on ARM (se houver) | Usa os binários arm64 ou dá uma mensagem clara |

## macOS (Apple Silicon e Intel)

| # | Passo | Resultado esperado |
|---|---|---|
| M1 | Numa conta sem admin, com `curl -fsSL … \| bash` | Corre até ao fim; as perguntas (login) aparecem e aceitam resposta |
| M2 | Sem Xcode Command Line Tools | O passo do git explica o pré-trabalho (`xcode-select --install`) e os passos independentes continuam |
| M3 | Intel (x64) | Instala o Node x64 e o Claude Code certo |
| M4 | App Memória pelo `~/Applications/Memória.app` | Abre sem aviso do Gatekeeper |
| M5 | Login Console real (`claude auth login --console`) numa conta Console nova | `claude auth status` mostra o método Console; o teste de fumo mostra o custo |

## Fluxo Console (não exercitado pelo benchmark)

O benchmark corre numa assinatura Max. Antes do workshop, faz uma vez, numa conta Console nova:
1. Instalação limpa e login com `--console`.
2. Sessão completa do Projeto 1 em modo interativo, com cronómetro.
3. Compara o custo do `/demo-cost` com a página Cost da Console no dia seguinte. A diferença esperada é inferior a 5%.
4. Regista o resultado em `DECISIONS.md`.
