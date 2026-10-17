<!-- GERADO por tools/render.mjs a partir de setup/messages.pt.json. Não editar à mão. -->

# Resolução de problemas do setup

[English](../TROUBLESHOOTING.md) · **Português**

Cada erro do setup tem um **código** (por exemplo, `E-NET-01`). O setup mostra o código, a causa e o que fazer. Aqui está o catálogo completo, por sistema operativo.

## Antes de tudo

- Volta a correr o setup: os passos já feitos são saltados.
- Só verificar, sem instalar: `bash ~/.workshop-claude/setup-mac.sh --check` (Mac) ou `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Check` (Windows).
- Diagnóstico com ajuda do Claude: `bash ~/.workshop-claude/setup-mac.sh --doctor` (Mac) ou `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Doctor` (Windows).
- O log completo, sem segredos, está em `~/.workshop-claude/setup.log`. O resumo está em `~/.workshop-claude/summary.txt`.
- Nunca envies a tua API key a ninguém. O setup nunca a pede nem a mostra.

## Índice

| Código | Problema | Onde |
|---|---|---|
| `E-SETUP-01` | Este passo ainda não foi feito | [macOS](#mac-e-setup-01) · [Windows](#windows-e-setup-01) |
| `E-NET-01` | Um domínio necessário está bloqueado | [macOS](#mac-e-net-01) · [Windows](#windows-e-net-01) |
| `E-NET-02` | O nome do servidor não resolve (DNS) | [macOS](#mac-e-net-02) · [Windows](#windows-e-net-02) |
| `E-NET-03` | O proxy não responde ou recusa o pedido | [macOS](#mac-e-net-03) · [Windows](#windows-e-net-03) |
| `E-NET-04` | A empresa interceta o tráfego HTTPS (certificado próprio) | [macOS](#mac-e-net-04) · [Windows](#windows-e-net-04) |
| `E-NET-05` | Sem ligação à API da Anthropic | [macOS](#mac-e-net-05) · [Windows](#windows-e-net-05) |
| `E-NET-06` | Proxy só com autenticação NTLM ou Kerberos | [macOS](#mac-e-net-06) · [Windows](#windows-e-net-06) |
| `E-NET-07` | O download falhou | [macOS](#mac-e-net-07) · [Windows](#windows-e-net-07) |
| `E-NET-08` | O Claude Code está configurado com um proxy que não responde nesta rede | [macOS](#mac-e-net-08) · [Windows](#windows-e-net-08) |
| `E-SO-01` | Windows anterior a 10.0.18362 (versão 1903) | [Windows](#windows-e-so-01) |
| `E-SO-02` | Windows em ARM64 | [Windows](#windows-e-so-02) |
| `E-SO-03` | A pasta pessoal está no OneDrive | [macOS](#mac-e-so-03) · [Windows](#windows-e-so-03) |
| `E-SO-04` | macOS antigo | [macOS](#mac-e-so-04) |
| `E-SO-05` | PowerShell em modo restrito | [Windows](#windows-e-so-05) |
| `E-SO-06` | Pouco espaço em disco | [macOS](#mac-e-so-06) · [Windows](#windows-e-so-06) |
| `E-SO-07` | Uma política da empresa bloqueia os scripts do PowerShell | [Windows](#windows-e-so-07) |
| `E-SO-08` | O PowerShell ISE não consegue correr o setup | [Windows](#windows-e-so-08) |
| `E-CFG-01` | Há definições geridas pela empresa (managed-settings) | [macOS](#mac-e-cfg-01) · [Windows](#windows-e-cfg-01) |
| `E-CFG-02` | Está definida a variável ANTHROPIC_API_KEY ou ANTHROPIC_AUTH_TOKEN | [macOS](#mac-e-cfg-02) · [Windows](#windows-e-cfg-02) |
| `E-CFG-03` | A variável ANTHROPIC_BASE_URL está definida | [macOS](#mac-e-cfg-03) · [Windows](#windows-e-cfg-03) |
| `E-CFG-04` | O Claude Code está configurado para Bedrock, Vertex ou Foundry | [macOS](#mac-e-cfg-04) · [Windows](#windows-e-cfg-04) |
| `E-CFG-05` | O ficheiro settings.json do Claude Code tem um erro | [macOS](#mac-e-cfg-05) · [Windows](#windows-e-cfg-05) |
| `E-CFG-06` | Já tinhas uma statusline | [macOS](#mac-e-cfg-06) · [Windows](#windows-e-cfg-06) |
| `E-CFG-07` | O uv está proibido de usar o Python gerido | [macOS](#mac-e-cfg-07) · [Windows](#windows-e-cfg-07) |
| `E-PERM-01` | Sem permissão para escrever na pasta pessoal | [macOS](#mac-e-perm-01) · [Windows](#windows-e-perm-01) |
| `E-PERM-02` | Um programa foi bloqueado pela segurança do computador | [macOS](#mac-e-perm-02) · [Windows](#windows-e-perm-02) |
| `E-PERM-03` | O instalador pediu permissões de administrador | [macOS](#mac-e-perm-03) · [Windows](#windows-e-perm-03) |
| `E-GIT-01` | Não foi possível instalar o git | [macOS](#mac-e-git-01) |
| `E-GIT-02` | Não consegui instalar o Git for Windows | [Windows](#windows-e-git-02) |
| `E-GIT-03` | Não encontrei o Git Bash (bash.exe) | [Windows](#windows-e-git-03) |
| `E-CC-01` | O instalador do Claude Code falhou | [macOS](#mac-e-cc-01) · [Windows](#windows-e-cc-01) |
| `E-CC-02` | O comando claude não está no PATH | [macOS](#mac-e-cc-02) · [Windows](#windows-e-cc-02) |
| `E-CC-03` | A versão do Claude Code é antiga | [macOS](#mac-e-cc-03) · [Windows](#windows-e-cc-03) |
| `E-CC-04` | O teu ficheiro ~/.claude.json tem um erro | [macOS](#mac-e-cc-04) · [Windows](#windows-e-cc-04) |
| `E-AUTH-01` | O Claude Code não tem login | [macOS](#mac-e-auth-01) · [Windows](#windows-e-auth-01) |
| `E-AUTH-02` | O login é de uma assinatura claude.ai, não da Console | [macOS](#mac-e-auth-02) · [Windows](#windows-e-auth-02) |
| `E-AUTH-03` | O Claude Code usa outro método de autenticação | [macOS](#mac-e-auth-03) · [Windows](#windows-e-auth-03) |
| `E-AUTH-04` | Uma chave do Claude no teu ambiente foi recusada | [macOS](#mac-e-auth-04) · [Windows](#windows-e-auth-04) |
| `E-AUTH-05` | O gateway da empresa no ANTHROPIC_BASE_URL não responde | [macOS](#mac-e-auth-05) · [Windows](#windows-e-auth-05) |
| `E-NODE-01` | Não consegui instalar o Node.js | [macOS](#mac-e-node-01) · [Windows](#windows-e-node-01) |
| `E-NODE-02` | Há um Node antigo ou avariado à frente no PATH | [macOS](#mac-e-node-02) · [Windows](#windows-e-node-02) |
| `E-UV-01` | Não consegui instalar o uv | [macOS](#mac-e-uv-01) · [Windows](#windows-e-uv-01) |
| `E-UV-02` | Há um uv antigo à frente no PATH | [macOS](#mac-e-uv-02) · [Windows](#windows-e-uv-02) |
| `E-GH-01` | Não consegui instalar o GitHub CLI (gh) | [macOS](#mac-e-gh-01) · [Windows](#windows-e-gh-01) |
| `E-GH-02` | Falta o login no GitHub (obrigatório) | [macOS](#mac-e-gh-02) · [Windows](#windows-e-gh-02) |
| `E-GH-03` | O GitHub não respondeu | [macOS](#mac-e-gh-03) · [Windows](#windows-e-gh-03) |
| `E-MCP-01` | Não consegui adicionar o MCP do Atlassian | [macOS](#mac-e-mcp-01) · [Windows](#windows-e-mcp-01) |
| `E-MCP-02` | Falta o login no Atlassian (OAuth) | [macOS](#mac-e-mcp-02) · [Windows](#windows-e-mcp-02) |
| `E-ACLI-01` | Não consegui instalar o Atlassian CLI (reserva do Jira) | [macOS](#mac-e-acli-01) · [Windows](#windows-e-acli-01) |
| `E-ACLI-02` | O Atlassian CLI não tem login ou o site recusou o acesso | [macOS](#mac-e-acli-02) · [Windows](#windows-e-acli-02) |
| `E-KIT-01` | Não consegui obter o kit do workshop | [macOS](#mac-e-kit-01) · [Windows](#windows-e-kit-01) |
| `E-KIT-02` | O arquivo do kit não confere (SHA-256) | [macOS](#mac-e-kit-02) · [Windows](#windows-e-kit-02) |
| `E-KIT-03` | A instalação das skills e dos hooks falhou | [macOS](#mac-e-kit-03) · [Windows](#windows-e-kit-03) |
| `E-DEMO-01` | Não consegui montar os projetos do workshop | [macOS](#mac-e-demo-01) · [Windows](#windows-e-demo-01) |
| `E-DEMO-02` | Os testes da app da Arena falharam | [macOS](#mac-e-demo-02) · [Windows](#windows-e-demo-02) |
| `E-DEMO-03` | A pasta do projeto já existe e não é do kit | [macOS](#mac-e-demo-03) · [Windows](#windows-e-demo-03) |
| `E-DEMO-04` | A Arena tem um histórico git próprio: deixei-a como está | [macOS](#mac-e-demo-04) · [Windows](#windows-e-demo-04) |
| `E-MEM-01` | A release da app Agent Memory ainda não foi publicada | [macOS](#mac-e-mem-01) · [Windows](#windows-e-mem-01) |
| `E-MEM-02` | O ficheiro da app Agent Memory não confere (SHA-256) | [macOS](#mac-e-mem-02) · [Windows](#windows-e-mem-02) |
| `E-MEM-03` | A instalação da app Agent Memory falhou | [macOS](#mac-e-mem-03) · [Windows](#windows-e-mem-03) |
| `E-MEM-04` | Falta o WebView2 (Windows) | [Windows](#windows-e-mem-04) |
| `E-MEM-05` | O teste da app Agent Memory falhou | [macOS](#mac-e-mem-05) · [Windows](#windows-e-mem-05) |
| `E-MEM-06` | Não consegui criar o atalho da app Agent Memory | [macOS](#mac-e-mem-06) · [Windows](#windows-e-mem-06) |
| `E-MEM-07` | A pasta da app Agent Memory não aceita escrita | [macOS](#mac-e-mem-07) · [Windows](#windows-e-mem-07) |
| `E-DESK-01` | O Claude Desktop tem limitações com a Console | [macOS](#mac-e-desk-01) · [Windows](#windows-e-desk-01) |
| `E-DESK-02` | Não consegui instalar o Claude Desktop | [macOS](#mac-e-desk-02) · [Windows](#windows-e-desk-02) |
| `E-PROF-01` | O setup não conseguiu pôr as pastas do workshop num perfil do shell | [macOS](#mac-e-prof-01) |
| `E-PROF-02` | Um perfil do shell tem um bloco do workshop incompleto | [macOS](#mac-e-prof-02) |
| `E-SMOKE-01` | O teste final ao Claude falhou | [macOS](#mac-e-smoke-01) · [Windows](#windows-e-smoke-01) |
| `E-SMOKE-02` | A conta da Console não tem créditos | [macOS](#mac-e-smoke-02) · [Windows](#windows-e-smoke-02) |
| `E-SMOKE-03` | Limite de pedidos atingido (erro 429) | [macOS](#mac-e-smoke-03) · [Windows](#windows-e-smoke-03) |
| `E-SMOKE-04` | O modelo do teste não está disponível na tua conta | [macOS](#mac-e-smoke-04) · [Windows](#windows-e-smoke-04) |
| `E-GIT-04` | O download do git portátil está corrompido | [macOS](#mac-e-git-04) |

## macOS

<a id="mac-e-setup-01"></a>

### E-SETUP-01 · Este passo ainda não foi feito

- **Porquê:** O setup ainda não instalou isto neste computador, ou a instalação ficou a meio.
- **O que fazer:**
  - Corre o setup completo, sem --check. Os passos já feitos são saltados.

Comando (macOS):

```
curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/setup-mac.sh | bash
```

<a id="mac-e-net-01"></a>

### E-NET-01 · Um domínio necessário está bloqueado

- **Porquê:** A rede não deixa chegar a um ou mais domínios de que o workshop precisa. Costuma ser uma firewall ou um filtro da empresa.
- **O que fazer:**
  - Pede à equipa de IT para libertar os domínios da lista em docs/pt/TROUBLESHOOTING.md (secção «Domínios necessários»).
  - Em alternativa, usa outra rede (por exemplo, o hotspot do telemóvel) e volta a correr o setup.

Comando (macOS):

```
curl -sS -o /dev/null -w '%{http_code}\n' https://api.anthropic.com
```

<a id="mac-e-net-02"></a>

### E-NET-02 · O nome do servidor não resolve (DNS)

- **Porquê:** O computador não consegue traduzir o nome do domínio para um endereço. A rede pode exigir VPN, ou o DNS está a falhar.
- **O que fazer:**
  - Liga a VPN da empresa, se a usares, ou desliga-a, se estiver a bloquear.
  - Experimenta outra rede e volta a correr o setup.

Comando (macOS):

```
dscacheutil -q host -a name api.anthropic.com
```

<a id="mac-e-net-03"></a>

### E-NET-03 · O proxy não responde ou recusa o pedido

- **Porquê:** O teu terminal envia o tráfego por um proxy (HTTPS_PROXY, ALL_PROXY ou o proxy do sistema). Esse proxy não responde, o nome dele não resolve, ou recusou o pedido (por exemplo, erro 407: pede utilizador e palavra-passe). Acontece com um proxy que ficou da rede do escritório ou de uma VPN antiga.
- **O que fazer:**
  - Se não estás na rede do escritório nem na VPN, tira o proxy deste terminal (primeiro comando abaixo) e apaga a linha que o define no ~/.zshrc ou no ~/.zprofile. Se for o proxy do sistema, desliga-o em Definições do Sistema > Rede > Detalhes > Proxies. Depois volta a correr o setup.
  - No Windows, o segundo comando tira o proxy das tuas variáveis de ambiente de utilizador, e o proxy do sistema está em Definições > Rede e Internet > Proxy.
  - Se a rede da empresa precisa do proxy, liga a VPN, ou define o proxy certo para esta sessão e volta a correr o setup.
  - Se o proxy pedir utilizador e palavra-passe (erro 407), pede ao IT um proxy sem autenticação ou uma exceção para os domínios do workshop.
  - No Windows, se até o primeiro comando do setup der o erro 407, corre-o com o último comando: ele envia o teu login do Windows ao proxy.

Comandos (macOS):

```
unset HTTPS_PROXY https_proxy HTTP_PROXY http_proxy ALL_PROXY all_proxy
grep -n -i proxy ~/.zshrc ~/.zprofile ~/.bash_profile
export HTTPS_PROXY=http://proxy.empresa:8080
export NO_PROXY=localhost,127.0.0.1
```

<a id="mac-e-net-04"></a>

### E-NET-04 · A empresa interceta o tráfego HTTPS (certificado próprio)

- **Porquê:** Um site de que o setup precisa (api.anthropic.com, github.com ou pypi.org) mostra um certificado que não vem de uma autoridade pública: a rede da empresa abre e volta a cifrar o tráfego. O setup exporta os certificados da empresa para ~/.workshop-claude/ca.pem e configura o Claude Code e o uv para os usarem.
- **O que fazer:**
  - Normalmente não precisas de fazer nada: o setup já configurou NODE_EXTRA_CA_CERTS e UV_SYSTEM_CERTS.
  - Se o teste final falhar com erro de certificado, pede ao IT o certificado raiz da empresa em formato PEM e guarda-o em ~/.workshop-claude/ca.pem. Depois volta a correr o setup.
  - Se a app Agent Memory falhar com um erro de certificado, instala o Python dela com os certificados do sistema (último comando abaixo) e volta a correr o setup.

Comandos (macOS):

```
security find-certificate -a -p /Library/Keychains/System.keychain > ~/.workshop-claude/ca.pem
UV_SYSTEM_CERTS=true uv python install 3.12
```

<a id="mac-e-net-05"></a>

### E-NET-05 · Sem ligação à API da Anthropic

- **Porquê:** O Claude Code não consegue falar com api.anthropic.com. Sem isto não há workshop, e o Claude também não pode ajudar a diagnosticar.
- **O que fazer:**
  - Confirma que abres https://api.anthropic.com no browser (uma página de erro em JSON é sinal de que chega lá).
  - Se a tua rede precisa de proxy, define HTTPS_PROXY antes de correr o setup. Se já tens um proxy definido, vê E-NET-03 e E-NET-08.
  - Pede ao IT para libertar api.anthropic.com, claude.ai e platform.claude.com.

Comando (macOS):

```
curl -sv https://api.anthropic.com -o /dev/null
```

<a id="mac-e-net-06"></a>

### E-NET-06 · Proxy só com autenticação NTLM ou Kerberos

- **Porquê:** O Claude Code e o Node não sabem autenticar-se em proxies NTLM ou Kerberos. Este tipo de proxy não é suportado.
- **O que fazer:**
  - Pede ao IT uma exceção ao proxy para os domínios do workshop.
  - Em alternativa, usa outra rede (hotspot do telemóvel) durante o workshop.

<a id="mac-e-net-07"></a>

### E-NET-07 · O download falhou

- **Porquê:** Um ficheiro não chegou a ser descarregado, ou chegou incompleto (a transferência parou a meio). Costuma ser uma falha de rede momentânea ou uma rede WiFi cheia.
- **O que fazer:**
  - Volta a correr o setup. Os passos já feitos são saltados.
  - Se falhar sempre no mesmo ficheiro, experimenta outra rede (por exemplo, o hotspot do telemóvel) e verifica o proxy (códigos E-NET-01 e E-NET-03).

Comando (macOS):

```
curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/setup-mac.sh | bash
```

<a id="mac-e-net-08"></a>

### E-NET-08 · O Claude Code está configurado com um proxy que não responde nesta rede

- **Porquê:** O bloco "env" do ~/.claude/settings.json tem HTTPS_PROXY, e o Claude Code usa-o mesmo quando o teu terminal não tem proxy. Esse proxy não responde aqui. Costuma ser um proxy que o setup gravou noutra rede (por exemplo, o proxy do escritório).
- **O que fazer:**
  - Volta a correr o setup nesta rede: ele tira ou atualiza o proxy que gravou.
  - Se foste tu que acrescentaste este proxy, apaga as linhas HTTPS_PROXY e NO_PROXY do bloco "env" do ~/.claude/settings.json.
  - De volta à rede do escritório, corre o setup outra vez para repor o proxy.

Comandos (macOS):

```
curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/setup-mac.sh | bash
grep -n -i proxy ~/.claude/settings.json
```

<a id="mac-e-so-03"></a>

### E-SO-03 · A pasta pessoal está no OneDrive

- **Porquê:** A pasta pessoal, ou a pasta dos projetos do workshop, é sincronizada pelo OneDrive. A sincronização pode bloquear ficheiros a meio do trabalho dos agentes.
- **O que fazer:**
  - Durante o workshop, pausa a sincronização do OneDrive (ícone do OneDrive > Pausar sincronização).
  - Os projetos ficam em ~/workshop-claude. Se essa pasta estiver dentro do OneDrive, move-a para fora.

<a id="mac-e-so-04"></a>

### E-SO-04 · macOS antigo

- **Porquê:** O Claude Code precisa do macOS 13 ou mais recente.
- **O que fazer:**
  - Atualiza o macOS em Definições do Sistema > Geral > Atualização de software.

Comando (macOS):

```
sw_vers
```

<a id="mac-e-so-06"></a>

### E-SO-06 · Pouco espaço em disco

- **Porquê:** Há menos de 3 GB livres na pasta pessoal. As ferramentas e os projetos precisam de cerca de 2 GB.
- **O que fazer:**
  - Liberta espaço (por exemplo, esvazia a pasta de Transferências) e volta a correr o setup.

Comando (macOS):

```
df -h ~
```

<a id="mac-e-cfg-01"></a>

### E-CFG-01 · Há definições geridas pela empresa (managed-settings)

- **Porquê:** A empresa instalou regras para o Claude Code que se sobrepõem às tuas. Podem bloquear modelos, ferramentas, MCP ou hooks do workshop.
- **O que fazer:**
  - Se algum passo do workshop for bloqueado, mostra este aviso ao IT.
  - O ficheiro está no caminho indicado acima. Não o alteres sem falar com o IT.

Comando (macOS):

```
cat '/Library/Application Support/ClaudeCode/managed-settings.json'
```

<a id="mac-e-cfg-02"></a>

### E-CFG-02 · Está definida a variável ANTHROPIC_API_KEY ou ANTHROPIC_AUTH_TOKEN

- **Porquê:** Com esta variável, o Claude Code usa essa chave em vez do teu login. O custo vai para a conta dona da chave.
- **O que fazer:**
  - Se a chave for tua e da Console, podes continuar: o teste final (passo 12) confirma que funciona.
  - Se não for, remove a variável do teu perfil do terminal (o comando abaixo mostra onde está) e abre um terminal novo.

Comando (macOS):

```
grep -n ANTHROPIC_ ~/.zshrc ~/.zprofile ~/.zshenv ~/.bash_profile ~/.bashrc ~/.profile ~/.claude/settings.json 2>/dev/null
```

<a id="mac-e-cfg-03"></a>

### E-CFG-03 · A variável ANTHROPIC_BASE_URL está definida

- **Porquê:** Com esta variável, o Claude Code fala com outro servidor em vez da API da Anthropic (por exemplo, um gateway da empresa). Os preços e os modelos podem ser outros.
- **O que fazer:**
  - Se o IT te pediu para usar esse gateway, podes continuar.
  - Se não, remove a variável (do teu perfil do terminal ou do bloco "env" do ~/.claude/settings.json) e abre um terminal novo.

Comandos (macOS):

```
grep -n ANTHROPIC_BASE_URL ~/.zshrc ~/.zprofile ~/.zshenv ~/.bash_profile ~/.claude/settings.json 2>/dev/null
unset ANTHROPIC_BASE_URL
```

<a id="mac-e-cfg-04"></a>

### E-CFG-04 · O Claude Code está configurado para Bedrock, Vertex ou Foundry

- **Porquê:** A CLAUDE_CODE_USE_BEDROCK, a CLAUDE_CODE_USE_VERTEX ou a CLAUDE_CODE_USE_FOUNDRY está definida, no terminal ou no bloco "env" de um ficheiro de definições do Claude Code (indicado acima). Assim o Claude Code usa a cloud da empresa e ignora o login na Console e, sem as credenciais dessa cloud, os pedidos nunca acabam.
- **O que fazer:**
  - Se indicar (shell): apaga a linha do ~/.zshrc, ~/.zprofile ou ~/.bash_profile (o primeiro comando mostra-a) e abre um terminal novo.
  - Se indicar ~/.claude/settings.json: apaga a variável do bloco "env" (e AWS_PROFILE ou AWS_REGION, se só servirem para isto).
  - Se indicar /Library/... ou managed settings: foi a empresa que a definiu. Fala com o organizador: o workshop usa a Console.
  - Se a empresa exigir Bedrock, Vertex ou Foundry, confirma com o organizador que os modelos do workshop estão disponíveis.

Comandos (macOS):

```
grep -n CLAUDE_CODE_USE_ ~/.zshrc ~/.zprofile ~/.zshenv ~/.bash_profile ~/.claude/settings.json 2>/dev/null
unset CLAUDE_CODE_USE_BEDROCK CLAUDE_CODE_USE_VERTEX CLAUDE_CODE_USE_FOUNDRY
```

<a id="mac-e-cfg-05"></a>

### E-CFG-05 · O ficheiro settings.json do Claude Code tem um erro

- **Porquê:** O ~/.claude/settings.json não é JSON estrito, ou um campo dele tem o tipo errado: a linha e a coluna, ou o campo, estão entre parênteses. O JSON não aceita comentários // ou /* */, nem uma vírgula depois do último elemento de uma lista ou objeto (os ficheiros de definições de alguns editores aceitam). O setup não lhe toca, para não perderes as tuas definições.
- **O que fazer:**
  - Abre o ficheiro na linha e coluna indicadas e corrige: tira os comentários e a vírgula depois do último elemento. Num campo com o tipo errado, dá-lhe a forma indicada entre parênteses.
  - Confirma o ficheiro com o comando abaixo (mostra JSON OK) e volta a correr o setup.

Comando (macOS):

```
PATH="$HOME/.workshop-claude/node/bin:$PATH" node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.claude/settings.json', 'utf8')); console.log('JSON OK')"
```

<a id="mac-e-cfg-06"></a>

### E-CFG-06 · Já tinhas uma statusline

- **Porquê:** O teu Claude Code já mostra uma statusline tua. O setup manteve-a e não instalou a do workshop, que mostra o custo.
- **O que fazer:**
  - Podes continuar: o custo também aparece no /demo-cost.
  - Para usar a statusline do workshop, volta a correr o setup com a opção abaixo. A tua fica no backup e volta com --uninstall.

Comando (macOS):

```
bash ~/.workshop-claude/setup-mac.sh --replace-statusline
```

<a id="mac-e-cfg-07"></a>

### E-CFG-07 · O uv está proibido de usar o Python gerido

- **Porquê:** Há uma variável de ambiente (UV_PYTHON_DOWNLOADS, UV_NO_MANAGED_PYTHON ou UV_PYTHON_PREFERENCE) que impede o uv de descarregar o seu próprio Python. A app Agent Memory precisa desse Python. O setup ignora a variável só no comando dele, mas outros comandos uv continuam afetados.
- **O que fazer:**
  - Se a variável foi posta pela empresa, fala com o IT antes de a mudar.
  - Não precisas de ter Python instalado: o uv traz o dele.

Comando (macOS):

```
env | grep -E "^UV_(PYTHON_DOWNLOADS|NO_MANAGED_PYTHON|PYTHON_PREFERENCE)"
```

<a id="mac-e-perm-01"></a>

### E-PERM-01 · Sem permissão para escrever na pasta pessoal

- **Porquê:** O setup instala tudo na tua pasta pessoal, e uma pasta ou ficheiro dela (entre parênteses) está protegido, pertence a outro utilizador (por exemplo, criado com sudo ou por um administrador) ou é um ficheiro onde devia estar uma pasta.
- **O que fazer:**
  - Corre o comando que o setup mostra depois de "To fix it, run this command" (tem exatamente esses caminhos) e volta a correr o setup.
  - Se não tiveres direitos de administrador para o sudo, pede à TI que o corra.
  - Se um caminho for um ficheiro e não uma pasta (por exemplo ~/.local/bin), muda-lhe o nome: mv ~/.local/bin ~/.local/bin.old.
  - Não corras o setup com sudo nem como administrador.

Comandos (macOS):

```
ls -ld ~/.local ~/.local/bin ~/.claude ~/.claude.json ~/.workshop-claude
sudo chown -R "$USER" ~/.local ~/.claude ~/.claude.json ~/.workshop-claude
```

<a id="mac-e-perm-02"></a>

### E-PERM-02 · Um programa foi bloqueado pela segurança do computador

- **Porquê:** Um antivírus, EDR, AppLocker, WDAC ou o Gatekeeper impediu um programa instalado na pasta pessoal de correr, ou apagou um ficheiro logo a seguir ao download.
- **O que fazer:**
  - Mostra ao IT o nome do programa que aparece no log e pede uma exceção.
  - No Mac, se aparecer «não pode ser aberto», abre Definições do Sistema > Privacidade e segurança e escolhe «Abrir mesmo assim».

Comando (macOS):

```
xattr -l ~/.local/bin/claude
```

<a id="mac-e-perm-03"></a>

### E-PERM-03 · O instalador pediu permissões de administrador

- **Porquê:** Um instalador tentou escrever fora da tua pasta pessoal. O setup foi feito para não precisar de admin.
- **O que fazer:**
  - Recusa o pedido de elevação e volta a correr o setup: ele usa a alternativa sem admin.
  - Se o problema continuar, envia o log ao organizador.

<a id="mac-e-git-01"></a>

### E-GIT-01 · Não foi possível instalar o git

- **Porquê:** O Mac não tem as Command Line Tools da Apple e o git portátil do workshop não ficou a funcionar.
- **O que fazer:**
  - Volta a correr o setup: o git portátil é descarregado outra vez.
  - Se continuar a falhar, instala as ferramentas da Apple com o comando abaixo (pode pedir a password de administrador) e volta a correr o setup.

Comando (macOS):

```
xcode-select --install
```

<a id="mac-e-cc-01"></a>

### E-CC-01 · O instalador do Claude Code falhou

- **Porquê:** O instalador oficial não terminou. Costuma ser rede (downloads.claude.ai bloqueado) ou um antivírus a bloquear o ficheiro.
- **O que fazer:**
  - Confirma o acesso a claude.ai e downloads.claude.ai (código E-NET-01).
  - Corre o instalador oficial à mão e volta a correr o setup.

Comando (macOS):

```
curl -fsSL https://claude.ai/install.sh | bash -s 2.1.292
```

<a id="mac-e-cc-02"></a>

### E-CC-02 · O comando claude não está no PATH

- **Porquê:** O Claude Code foi instalado em ~/.local/bin, mas o terminal ainda não procura nessa pasta.
- **O que fazer:**
  - Fecha e volta a abrir o terminal. Se continuar, adiciona a pasta ao PATH com o comando abaixo.

Comando (macOS):

```
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

<a id="mac-e-cc-03"></a>

### E-CC-03 · A versão do Claude Code é antiga

- **Porquê:** O workshop precisa do Claude Code 2.1.285 ou mais recente. Pode haver uma instalação antiga (por exemplo, pelo npm) à frente no PATH.
- **O que fazer:**
  - Vê qual é o claude que o terminal usa. Se for uma instalação antiga pelo npm, remove-a.
  - Depois volta a correr o setup.

Comandos (macOS):

```
which -a claude
npm uninstall -g @anthropic-ai/claude-code
```

<a id="mac-e-cc-04"></a>

### E-CC-04 · O teu ficheiro ~/.claude.json tem um erro

- **Porquê:** O ~/.claude.json (as definições do próprio Claude Code, com os teus servidores MCP) não é JSON válido, muitas vezes por causa de uma vírgula ou de aspas que ficaram de uma edição à mão. O Claude Code trocá-lo-ia por um ficheiro vazio, por isso o setup para aqui e não lhe toca.
- **O que fazer:**
  - Corrige o ficheiro indicado acima, ou pede ajuda ao organizador. O comando abaixo mostra o erro e onde está (abre primeiro um terminal novo, para o node ser encontrado).
  - Se o caminho indicado estiver em ~/.claude/backups, o Claude Code já substituiu o ~/.claude.json: os teus servidores MCP estão nessa cópia. Corrige-a e copia de volta o que precisares (por exemplo, o mcpServers).
  - Depois volta a correr o setup.

Comando (macOS):

```
node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.claude.json', 'utf8'))"
```

<a id="mac-e-auth-01"></a>

### E-AUTH-01 · O Claude Code não tem login

- **Porquê:** Ainda não fizeste login. O workshop usa a tua conta da Console da Anthropic (paga por uso).
- **O que fazer:**
  - Corre o comando abaixo. Abre o browser: entra na Console e autoriza.
  - Se não tens conta, cria-a em https://platform.claude.com e adiciona créditos (Billing).
  - Depois volta a correr o setup.

Comando (macOS):

```
claude auth login --console
```

<a id="mac-e-auth-02"></a>

### E-AUTH-02 · O login é de uma assinatura claude.ai, não da Console

- **Porquê:** Estás ligado com uma assinatura claude.ai (Pro, Max, Team ou Enterprise). Funciona, mas o workshop foi preparado para a Console e mede o custo a preço de API.
- **O que fazer:**
  - Podes continuar com a assinatura: os limites são os do teu plano.
  - Para usar a Console, corre o comando abaixo.

Comando (macOS):

```
claude auth login --console
```

<a id="mac-e-auth-03"></a>

### E-AUTH-03 · O Claude Code usa outro método de autenticação

- **Porquê:** O login vem de uma variável de ambiente, de um token ou de uma cloud (Bedrock ou Vertex), e não da Console.
- **O que fazer:**
  - Se foi intencional, podes continuar.
  - Para usar a Console, remove essa variável, abre um terminal novo e corre o comando abaixo.

Comandos (macOS):

```
claude auth status --text
claude auth login --console
```

<a id="mac-e-auth-04"></a>

### E-AUTH-04 · Uma chave do Claude no teu ambiente foi recusada

- **Porquê:** O Claude Code usa a chave de uma variável de ambiente (ou de um apiKeyHelper) em vez do teu login na Console, e a API recusou-a (401: inválida, expirada ou revogada). Voltar a fazer login não resolve enquanto essa chave estiver definida.
- **O que fazer:**
  - Remove a variável indicada acima do teu perfil do terminal (o primeiro comando mostra o ficheiro e a linha) ou do bloco "env" do ~/.claude/settings.json.
  - Neste terminal, corre o segundo comando e volta a correr o setup.
  - Se foi o IT que te deu esta chave para um gateway da empresa, pede-lhe uma nova.

Comandos (macOS):

```
grep -n ANTHROPIC_ ~/.zshrc ~/.zprofile ~/.zshenv ~/.bash_profile ~/.bashrc ~/.profile ~/.claude/settings.json 2>/dev/null
unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN
```

<a id="mac-e-auth-05"></a>

### E-AUTH-05 · O gateway da empresa no ANTHROPIC_BASE_URL não responde

- **Porquê:** O ANTHROPIC_BASE_URL manda o Claude Code para um gateway da empresa (indicado acima) em vez do api.anthropic.com, e esse gateway não está acessível: VPN desligada, gateway em baixo ou proxy local parado. O api.anthropic.com pode estar bem.
- **O que fazer:**
  - Se usas o gateway da empresa, liga a VPN (ou arranca o proxy local) e volta a correr o setup.
  - Para o workshop basta a tua conta da Console: remove o ANTHROPIC_BASE_URL (e o ANTHROPIC_AUTH_TOKEN, se só servir para o gateway) do teu perfil do terminal ou do ~/.claude/settings.json, corre o segundo comando e volta a correr o setup.

Comandos (macOS):

```
grep -n ANTHROPIC_ ~/.zshrc ~/.zprofile ~/.zshenv ~/.bash_profile ~/.claude/settings.json 2>/dev/null
unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN
```

<a id="mac-e-node-01"></a>

### E-NODE-01 · Não consegui instalar o Node.js

- **Porquê:** O download de nodejs.org falhou, ou o ficheiro não confere com o SHA256SUMS publicado.
- **O que fazer:**
  - Confirma o acesso a nodejs.org (código E-NET-01) e volta a correr o setup.
  - Em alternativa, instala o Node 24.22.0 (LTS) pelo site oficial e volta a correr o setup.

Comando (macOS):

```
curl -sS -o /dev/null -w '%{http_code}\n' https://nodejs.org/dist/
```

<a id="mac-e-node-02"></a>

### E-NODE-02 · Há um Node antigo ou avariado à frente no PATH

- **Porquê:** Um terminal novo encontra primeiro um Node com versão inferior a 22, ou um que não arranca. Os hooks usam o Node novo, mas os testes do projeto podem usar o antigo.
- **O que fazer:**
  - Fecha e volta a abrir o terminal e vê com o primeiro comando abaixo qual é o node que aparece primeiro.
  - Se usas nvm, escolhe o Node novo com o nvm. Se o primeiro node não arranca (num Mac, muitas vezes um node do Homebrew avariado), reinstala-o ou remove-o: brew reinstall node ou brew uninstall node.
  - Confirma com node -v.

Comandos (macOS):

```
type -a node
nvm install 22 && nvm alias default 22
node -v
```

<a id="mac-e-uv-01"></a>

### E-UV-01 · Não consegui instalar o uv

- **Porquê:** O instalador oficial do uv falhou. Costuma ser rede (astral.sh ou github.com bloqueados).
- **O que fazer:**
  - Confirma o acesso a astral.sh, releases.astral.sh e github.com.
  - Corre o instalador à mão e volta a correr o setup.

Comando (macOS):

```
curl -LsSf https://astral.sh/uv/0.13.1/install.sh | sh
```

<a id="mac-e-uv-02"></a>

### E-UV-02 · Há um uv antigo à frente no PATH

- **Porquê:** O workshop precisa do uv 0.6.8 ou mais recente e usa a sua cópia em ~/.local/bin. Um uv antigo (por exemplo, do Homebrew ou do pipx) aparece primeiro no PATH deste terminal, e os comandos uv que escreves usam esse.
- **O que fazer:**
  - Podes continuar: o setup e a app Agent Memory usam o ~/.local/bin/uv.
  - Para evitar surpresas, atualiza ou remove o uv antigo (indicado acima) e abre um terminal novo.

Comandos (macOS):

```
which -a uv
brew upgrade uv
```

<a id="mac-e-gh-01"></a>

### E-GH-01 · Não consegui instalar o GitHub CLI (gh)

- **Porquê:** O download do gh falhou ou não confere com o ficheiro de checksums da release.
- **O que fazer:**
  - Confirma o acesso a github.com e release-assets.githubusercontent.com.
  - Volta a correr o setup. O gh só é preciso no Projeto 2 (tarefa real).

Comando (macOS):

```
brew install gh
```

<a id="mac-e-gh-02"></a>

### E-GH-02 · Falta o login no GitHub (obrigatório)

- **Porquê:** O gh está instalado mas sem conta. O workshop precisa do login no GitHub para o Projeto 2: ler issues, criar branches e abrir PRs.
- **O que fazer:**
  - Corre o comando abaixo: abre o browser com um código para confirmares o login.
  - Se a tua empresa usa GitHub Enterprise, troca github.com pelo servidor da empresa.
  - Depois volta a correr o setup.

Comando (macOS):

```
gh auth login --hostname github.com --git-protocol https --web
```

<a id="mac-e-gh-03"></a>

### E-GH-03 · O GitHub não respondeu

- **Porquê:** O gh tentou confirmar o teu login, mas o servidor do GitHub (indicado acima) não respondeu a tempo. Costuma ser a VPN da empresa desligada ou um proxy a bloquear a ligação; não é um problema de login.
- **O que fazer:**
  - Liga a VPN da empresa (ou confirma o proxy) e volta a correr o setup.
  - Se já não usas um dos servidores indicados acima, remove-o do gh: gh auth logout --hostname seguido do nome do servidor.
  - Os outros passos não foram afetados. O gh só é preciso no Projeto 2 (tarefa real).

Comando (macOS):

```
gh auth status
```

<a id="mac-e-mcp-01"></a>

### E-MCP-01 · Não consegui adicionar o MCP do Atlassian

- **Porquê:** O comando claude mcp add falhou. O Claude Code pode estar em falta, ou a empresa bloqueia servidores MCP.
- **O que fazer:**
  - Corre o comando abaixo à mão e lê a mensagem de erro.
  - Se a empresa bloquear MCP (managed-settings), usa o projeto de treino com issues locais.

Comando (macOS):

```
claude mcp add --transport http --scope user atlassian https://mcp.atlassian.com/v2/mcp
```

<a id="mac-e-mcp-02"></a>

### E-MCP-02 · Falta o login no Atlassian (OAuth)

- **Porquê:** O MCP do Jira está registado, mas o login é feito por ti, no browser, dentro do Claude Code.
- **O que fazer:**
  - Abre o Claude Code, escreve /mcp, escolhe atlassian e segue o login.
  - Se o admin do Jira restringir domínios, pede-lhe para autorizar o Claude.

Comando (macOS):

```
claude
```

<a id="mac-e-acli-01"></a>

### E-ACLI-01 · Não consegui instalar o Atlassian CLI (reserva do Jira)

- **Porquê:** O download de acli.atlassian.com falhou ou o ficheiro não corresponde ao SHA-256 esperado. O acli só é usado quando o MCP do Jira falha, por isso o setup continua.
- **O que fazer:**
  - Confirma o acesso a acli.atlassian.com (a rede da empresa pode bloquear).
  - Volta a correr o setup. Sem o acli, o Jira continua a funcionar pelo MCP (/mcp).

Comando (macOS):

```
curl -fsSI https://acli.atlassian.com/darwin/1.3.39-stable/acli_1.3.39-stable_darwin_arm64.tar.gz
```

<a id="mac-e-acli-02"></a>

### E-ACLI-02 · O Atlassian CLI não tem login ou o site recusou o acesso

- **Porquê:** O acli precisa do teu login. Desde a versão 1.3.15, um administrador do site Atlassian tem de autorizar a app ACLI uma vez ("Your site admin must authorize this app…").
- **O que fazer:**
  - Corre acli auth login e escolhe no terminal o mesmo site que escolheste no browser.
  - Se aparecer "site admin must authorize", pede ao administrador do Jira para correr acli jira auth login, escolher "Web" e aprovar o site.
  - Alternativa sem OAuth: cria um API token em id.atlassian.com (Security > API tokens), copia-o e corre o comando da segunda linha. O token vai da área de transferência para o acli, sem ficar no histórico nem em ficheiros.

Comandos (macOS):

```
acli auth login
pbpaste | acli jira auth login --site <empresa>.atlassian.net --email <o teu email> --token
```

<a id="mac-e-kit-01"></a>

### E-KIT-01 · Não consegui obter o kit do workshop

- **Porquê:** O download do arquivo do kit falhou, e o git clone de recurso também.
- **O que fazer:**
  - Confirma o acesso ao servidor do repositório (github.com).
  - Volta a correr o setup. Se continuar, envia o log ao organizador.

Comando (macOS):

```
curl -sSI https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/workshop-kit-v1.0.0-rc.1.tar.gz
```

<a id="mac-e-kit-02"></a>

### E-KIT-02 · O arquivo do kit não confere (SHA-256)

- **Porquê:** O ficheiro descarregado é diferente do publicado. Pode estar incompleto, ou um proxy alterou-o.
- **O que fazer:**
  - Volta a correr o setup para descarregar outra vez.
  - Se repetir, não continues e avisa o organizador.

<a id="mac-e-kit-03"></a>

### E-KIT-03 · A instalação das skills e dos hooks falhou

- **Porquê:** O instalador em Node não conseguiu copiar os ficheiros ou atualizar o settings.json. Se o settings.json já tiver sido alterado, o backup dele está em ~/.workshop-claude/backup.
- **O que fazer:**
  - Lê a mensagem no log (procura «install-user»).
  - Corrige a causa (permissões ou settings.json inválido) e volta a correr o setup.

Comando (macOS):

```
ls -la ~/.claude ~/.workshop-claude/backup
```

<a id="mac-e-demo-01"></a>

### E-DEMO-01 · Não consegui montar os projetos do workshop

- **Porquê:** A cópia ou o git init dos projetos falhou.
- **O que fazer:**
  - A razão está entre parênteses acima, e a mensagem completa está no log (procura «assemble»).
  - Depois de corrigires, volta a correr o setup: um projeto montado a meio é refeito sozinho, e o teu trabalho nunca é apagado.

Comando (macOS):

```
ls -la ~/workshop-claude
```

<a id="mac-e-demo-02"></a>

### E-DEMO-02 · Os testes da app da Arena falharam

- **Porquê:** Os testes da própria app (test/app.test.js) devem passar logo à partida. Os testes dos cartões estão vermelhos de propósito.
- **O que fazer:**
  - Corre os testes à mão e envia o resultado ao organizador.
  - Confirma que node -v mostra a versão 22 ou superior.

Comando (macOS):

```
cd ~/workshop-claude/demo-project && node --test test/app.test.js
```

<a id="mac-e-demo-03"></a>

### E-DEMO-03 · A pasta do projeto já existe e não é do kit

- **Porquê:** Já há uma pasta com esse nome e com outros ficheiros. O setup não a apaga.
- **O que fazer:**
  - Muda o nome da pasta (ou apaga-a, se não precisares dela) e volta a correr o setup.

Comando (macOS):

```
mv ~/workshop-claude ~/workshop-claude-antigo
```

<a id="mac-e-demo-04"></a>

### E-DEMO-04 · A Arena tem um histórico git próprio: deixei-a como está

- **Porquê:** A Arena tem commits mas não tem a tag arena-start (o ponto de partida), por isso o /demo-reset não a consegue repor no início. O setup nunca apaga o teu trabalho.
- **O que fazer:**
  - Não há nada a fazer se quiseres continuar a trabalhar nesta Arena.
  - Para teres uma Arena nova, muda o nome desta pasta e volta a correr o setup.

Comando (macOS):

```
mv ~/workshop-claude/demo-project ~/workshop-claude/demo-project-old
```

<a id="mac-e-mem-01"></a>

### E-MEM-01 · A release da app Agent Memory ainda não foi publicada

- **Porquê:** Não encontrei os ficheiros da app Agent Memory v0.5.0 no servidor. A app é opcional: as skills funcionam sem ela.
- **O que fazer:**
  - Podes continuar. Mais perto do workshop, volta a correr o setup para a instalar.

<a id="mac-e-mem-02"></a>

### E-MEM-02 · O ficheiro da app Agent Memory não confere (SHA-256)

- **Porquê:** O wheel descarregado é diferente do publicado em SHA256SUMS. Não o instalei.
- **O que fazer:**
  - Volta a correr o setup. Se repetir, avisa o organizador.

<a id="mac-e-mem-03"></a>

### E-MEM-03 · A instalação da app Agent Memory falhou

- **Porquê:** O uv não conseguiu instalar a app (Python 3.12 ou as dependências). Costuma ser a rede (pypi.org, files.pythonhosted.org ou github.com) ou o certificado de um proxy da empresa (código E-NET-04).
- **O que fazer:**
  - Confirma o acesso a pypi.org e files.pythonhosted.org.
  - Volta a correr o setup. A app é opcional: as skills funcionam sem ela.

Comando (macOS):

```
uv python install 3.12
```

<a id="mac-e-mem-05"></a>

### E-MEM-05 · O teste da app Agent Memory falhou

- **Porquê:** A app ficou instalada, mas o autoteste falhou. O Python que o uv instalou, a pesquisa nas notas (FTS5) ou a pasta das memórias não estão a funcionar, ou o índice de pesquisa das notas pode estar estragado. As skills funcionam sem a app.
- **O que fazer:**
  - Corre o primeiro comando abaixo e envia o resultado ao organizador.
  - Se uma linha falar do índice: fecha o Claude Code e a app Agent Memory e depois corre agent-memory reindex (as tuas notas continuam guardadas em Markdown).
  - Volta a correr o setup: o uv volta a instalar a app e o Python dela.

Comandos (macOS):

```
agent-memory selftest
agent-memory reindex
```

<a id="mac-e-mem-06"></a>

### E-MEM-06 · Não consegui criar o atalho da app Agent Memory

- **Porquê:** A pasta dos atalhos das apps (entre parênteses) não aceita escrita: pertence a outro utilizador ou está bloqueada pela TI. Só falta o atalho: a app, a janela dela e o MCP funcionam.
- **O que fazer:**
  - Podes continuar. Abre a janela da app com o primeiro comando abaixo.
  - Se quiseres o atalho, devolve a pasta ao teu utilizador (ou pede à TI) e volta a correr o setup.

Comandos (macOS):

```
agent-memory-gui
ls -ld ~/Applications
```

<a id="mac-e-mem-07"></a>

### E-MEM-07 · A pasta da app Agent Memory não aceita escrita

- **Porquê:** A app Agent Memory está instalada, mas não consegue escrever na pasta das memórias (~/.agent-memory, ~/.memoria das versões antigas, ou AGENT_MEMORY_HOME). Costuma acontecer depois de um comando corrido com sudo, que deixa a pasta a pertencer ao administrador, ou quando esse caminho é um ficheiro ou um link partido. Voltar a correr o setup não resolve. As skills funcionam sem a app.
- **O que fazer:**
  - Corre o comando que o setup mostra depois de "To fix it, run this command" e volta a correr o setup.
  - Sem direitos de administrador: muda o nome da pasta (por exemplo, mv ~/.agent-memory ~/.agent-memory-old), volta a correr o setup e depois copia as pastas dos teus projetos da pasta antiga para a nova.
  - Para ver a pasta e o que a app diz, usa os comandos abaixo.

Comandos (macOS):

```
ls -ld ~/.agent-memory ~/.memoria
agent-memory selftest
```

<a id="mac-e-desk-01"></a>

### E-DESK-01 · O Claude Desktop tem limitações com a Console

- **Porquê:** O Claude Desktop só entra com uma conta claude.ai, e o separador Code exige assinatura. O hands-on do workshop corre todo no Claude Code (terminal).
- **O que fazer:**
  - Não precisas de fazer nada. O Desktop é opcional.

<a id="mac-e-desk-02"></a>

### E-DESK-02 · Não consegui instalar o Claude Desktop

- **Porquê:** O download ou a instalação do Claude Desktop falhou. É opcional.
- **O que fazer:**
  - Se o quiseres, descarrega-o à mão em https://claude.ai/download.

<a id="mac-e-prof-01"></a>

### E-PROF-01 · O setup não conseguiu pôr as pastas do workshop num perfil do shell

- **Porquê:** Os terminais novos leem este ficheiro quando arrancam, mas o setup não o conseguiu ler nem alterar. É só de leitura, pertence a outro utilizador (por exemplo, foi criado com sudo) ou aponta para um ficheiro que não existe ou é só de leitura (dotfiles, iCloud). O setup deixou-o como estava. Os outros ficheiros de perfil foram atualizados.
- **O que fazer:**
  - Acrescenta a primeira linha abaixo ao fim do ficheiro indicado pelo setup (ou do ficheiro dos teus dotfiles para onde ele aponta) e abre um terminal novo.
  - Se o ficheiro não é só de leitura de propósito, vê-o com o segundo comando, dá-te permissão para o ler e alterar (ou pede a quem gere o teu Mac) e volta a correr o setup.

Comandos (macOS):

```
export PATH="$HOME/.local/bin:$HOME/.workshop-claude/bin:$HOME/.workshop-claude/node/bin:$PATH"
ls -lO ~/.zshrc ~/.zprofile ~/.bash_profile ~/.profile
```

<a id="mac-e-prof-02"></a>

### E-PROF-02 · Um perfil do shell tem um bloco do workshop incompleto

- **Porquê:** O ficheiro tem uma linha '# >>> workshop-claude >>>' sem a linha '# <<< workshop-claude <<<', ou o contrário (um bloco antigo ou editado à mão). O setup não lhe mexeu, por isso não perdeste nenhuma linha. Os outros ficheiros de perfil foram atualizados.
- **O que fazer:**
  - Abre o ficheiro indicado pelo setup e apaga as linhas antigas do workshop: a linha do marcador e as linhas do PATH a seguir. Mantém as tuas linhas.
  - Depois volta a correr o setup.

Comando (macOS):

```
grep -n workshop-claude ~/.zshrc ~/.zprofile ~/.bash_profile ~/.profile
```

<a id="mac-e-smoke-01"></a>

### E-SMOKE-01 · O teste final ao Claude falhou

- **Porquê:** O Claude Code não conseguiu responder a um pedido simples. Pode ser login, rede ou créditos.
- **O que fazer:**
  - Corre o comando abaixo e lê a mensagem de erro.
  - Confirma o login (código E-AUTH-01) e os créditos (código E-SMOKE-02).

Comando (macOS):

```
claude -p "responde só OK" --model claude-haiku-5-5
```

<a id="mac-e-smoke-02"></a>

### E-SMOKE-02 · A conta da Console não tem créditos

- **Porquê:** A API recusou o pedido por falta de saldo (credit balance too low).
- **O que fazer:**
  - Abre https://platform.claude.com, vai a Billing e adiciona créditos (recomendado: um limite bem acima de US$ 10).
  - Depois volta a correr o setup.

<a id="mac-e-smoke-03"></a>

### E-SMOKE-03 · Limite de pedidos atingido (erro 429)

- **Porquê:** A API está a limitar os pedidos da tua organização. Contas novas têm limites mais baixos.
- **O que fazer:**
  - Espera um minuto e volta a correr o setup.

<a id="mac-e-smoke-04"></a>

### E-SMOKE-04 · O modelo do teste não está disponível na tua conta

- **Porquê:** A tua organização não tem acesso ao modelo claude-haiku-5-5, ou um gateway da empresa bloqueia-o.
- **O que fazer:**
  - Confirma os modelos disponíveis na Console e fala com o organizador.

<a id="mac-e-git-04"></a>

### E-GIT-04 · O download do git portátil está corrompido

- **Porquê:** O ficheiro descarregado não tem o SHA-256 esperado. Pode ser um proxy a alterar o download.
- **O que fazer:**
  - Volta a correr o setup.
  - Se continuar, testa noutra rede e mostra o setup.log a quem te ajudar.

Comando (macOS):

```
xcode-select --install
```

## Windows

<a id="windows-e-setup-01"></a>

### E-SETUP-01 · Este passo ainda não foi feito

- **Porquê:** O setup ainda não instalou isto neste computador, ou a instalação ficou a meio.
- **O que fazer:**
  - Corre o setup completo, sem --check. Os passos já feitos são saltados.

Comando (Windows):

```
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/bootstrap-windows.ps1 | iex
```

<a id="windows-e-net-01"></a>

### E-NET-01 · Um domínio necessário está bloqueado

- **Porquê:** A rede não deixa chegar a um ou mais domínios de que o workshop precisa. Costuma ser uma firewall ou um filtro da empresa.
- **O que fazer:**
  - Pede à equipa de IT para libertar os domínios da lista em docs/pt/TROUBLESHOOTING.md (secção «Domínios necessários»).
  - Em alternativa, usa outra rede (por exemplo, o hotspot do telemóvel) e volta a correr o setup.

Comando (Windows):

```
Invoke-WebRequest -UseBasicParsing -Method Head https://api.anthropic.com
```

<a id="windows-e-net-02"></a>

### E-NET-02 · O nome do servidor não resolve (DNS)

- **Porquê:** O computador não consegue traduzir o nome do domínio para um endereço. A rede pode exigir VPN, ou o DNS está a falhar.
- **O que fazer:**
  - Liga a VPN da empresa, se a usares, ou desliga-a, se estiver a bloquear.
  - Experimenta outra rede e volta a correr o setup.

Comando (Windows):

```
Resolve-DnsName api.anthropic.com
```

<a id="windows-e-net-03"></a>

### E-NET-03 · O proxy não responde ou recusa o pedido

- **Porquê:** O teu terminal envia o tráfego por um proxy (HTTPS_PROXY, ALL_PROXY ou o proxy do sistema). Esse proxy não responde, o nome dele não resolve, ou recusou o pedido (por exemplo, erro 407: pede utilizador e palavra-passe). Acontece com um proxy que ficou da rede do escritório ou de uma VPN antiga.
- **O que fazer:**
  - Se não estás na rede do escritório nem na VPN, tira o proxy deste terminal (primeiro comando abaixo) e apaga a linha que o define no ~/.zshrc ou no ~/.zprofile. Se for o proxy do sistema, desliga-o em Definições do Sistema > Rede > Detalhes > Proxies. Depois volta a correr o setup.
  - No Windows, o segundo comando tira o proxy das tuas variáveis de ambiente de utilizador, e o proxy do sistema está em Definições > Rede e Internet > Proxy.
  - Se a rede da empresa precisa do proxy, liga a VPN, ou define o proxy certo para esta sessão e volta a correr o setup.
  - Se o proxy pedir utilizador e palavra-passe (erro 407), pede ao IT um proxy sem autenticação ou uma exceção para os domínios do workshop.
  - No Windows, se até o primeiro comando do setup der o erro 407, corre-o com o último comando: ele envia o teu login do Windows ao proxy.

Comandos (Windows):

```
Remove-Item Env:HTTPS_PROXY, Env:HTTP_PROXY, Env:ALL_PROXY -ErrorAction SilentlyContinue
[Environment]::SetEnvironmentVariable('HTTPS_PROXY', $null, 'User')
$env:HTTPS_PROXY = 'http://proxy.empresa:8080'
$env:NO_PROXY = 'localhost,127.0.0.1'
[Net.WebRequest]::DefaultWebProxy.Credentials = [Net.CredentialCache]::DefaultNetworkCredentials; irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/bootstrap-windows.ps1 | iex
```

<a id="windows-e-net-04"></a>

### E-NET-04 · A empresa interceta o tráfego HTTPS (certificado próprio)

- **Porquê:** Um site de que o setup precisa (api.anthropic.com, github.com ou pypi.org) mostra um certificado que não vem de uma autoridade pública: a rede da empresa abre e volta a cifrar o tráfego. O setup exporta os certificados da empresa para ~/.workshop-claude/ca.pem e configura o Claude Code e o uv para os usarem.
- **O que fazer:**
  - Normalmente não precisas de fazer nada: o setup já configurou NODE_EXTRA_CA_CERTS e UV_SYSTEM_CERTS.
  - Se o teste final falhar com erro de certificado, pede ao IT o certificado raiz da empresa em formato PEM e guarda-o em ~/.workshop-claude/ca.pem. Depois volta a correr o setup.
  - Se a app Agent Memory falhar com um erro de certificado, instala o Python dela com os certificados do sistema (último comando abaixo) e volta a correr o setup.

Comandos (Windows):

```
Get-ChildItem Cert:\LocalMachine\Root, Cert:\CurrentUser\Root | Select-Object Subject, Issuer
$env:UV_SYSTEM_CERTS = 'true'; uv python install 3.12
```

<a id="windows-e-net-05"></a>

### E-NET-05 · Sem ligação à API da Anthropic

- **Porquê:** O Claude Code não consegue falar com api.anthropic.com. Sem isto não há workshop, e o Claude também não pode ajudar a diagnosticar.
- **O que fazer:**
  - Confirma que abres https://api.anthropic.com no browser (uma página de erro em JSON é sinal de que chega lá).
  - Se a tua rede precisa de proxy, define HTTPS_PROXY antes de correr o setup. Se já tens um proxy definido, vê E-NET-03 e E-NET-08.
  - Pede ao IT para libertar api.anthropic.com, claude.ai e platform.claude.com.

Comando (Windows):

```
Test-NetConnection api.anthropic.com -Port 443
```

<a id="windows-e-net-06"></a>

### E-NET-06 · Proxy só com autenticação NTLM ou Kerberos

- **Porquê:** O Claude Code e o Node não sabem autenticar-se em proxies NTLM ou Kerberos. Este tipo de proxy não é suportado.
- **O que fazer:**
  - Pede ao IT uma exceção ao proxy para os domínios do workshop.
  - Em alternativa, usa outra rede (hotspot do telemóvel) durante o workshop.

<a id="windows-e-net-07"></a>

### E-NET-07 · O download falhou

- **Porquê:** Um ficheiro não chegou a ser descarregado, ou chegou incompleto (a transferência parou a meio). Costuma ser uma falha de rede momentânea ou uma rede WiFi cheia.
- **O que fazer:**
  - Volta a correr o setup. Os passos já feitos são saltados.
  - Se falhar sempre no mesmo ficheiro, experimenta outra rede (por exemplo, o hotspot do telemóvel) e verifica o proxy (códigos E-NET-01 e E-NET-03).

Comando (Windows):

```
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/bootstrap-windows.ps1 | iex
```

<a id="windows-e-net-08"></a>

### E-NET-08 · O Claude Code está configurado com um proxy que não responde nesta rede

- **Porquê:** O bloco "env" do ~/.claude/settings.json tem HTTPS_PROXY, e o Claude Code usa-o mesmo quando o teu terminal não tem proxy. Esse proxy não responde aqui. Costuma ser um proxy que o setup gravou noutra rede (por exemplo, o proxy do escritório).
- **O que fazer:**
  - Volta a correr o setup nesta rede: ele tira ou atualiza o proxy que gravou.
  - Se foste tu que acrescentaste este proxy, apaga as linhas HTTPS_PROXY e NO_PROXY do bloco "env" do ~/.claude/settings.json.
  - De volta à rede do escritório, corre o setup outra vez para repor o proxy.

Comandos (Windows):

```
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/bootstrap-windows.ps1 | iex
Select-String -Path "$env:USERPROFILE\.claude\settings.json" -Pattern proxy
```

<a id="windows-e-so-01"></a>

### E-SO-01 · Windows anterior a 10.0.18362 (versão 1903)

- **Porquê:** Esta versão do Windows é antiga. O winget e o Claude Desktop não funcionam nela, e o resto pode falhar.
- **O que fazer:**
  - Atualiza o Windows pelo Windows Update ou pede ao IT.
  - O setup continua, mas usa instaladores diretos em vez do winget.

Comando (Windows):

```
winver
```

<a id="windows-e-so-02"></a>

### E-SO-02 · Windows em ARM64

- **Porquê:** O computador usa um processador ARM. O setup escolhe as versões ARM64 do Node, do gh e do Git quando existem.
- **O que fazer:**
  - Não precisas de fazer nada. Se algum passo falhar, avisa o organizador e indica o código deste aviso.

<a id="windows-e-so-03"></a>

### E-SO-03 · A pasta pessoal está no OneDrive

- **Porquê:** A pasta pessoal, ou a pasta dos projetos do workshop, é sincronizada pelo OneDrive. A sincronização pode bloquear ficheiros a meio do trabalho dos agentes.
- **O que fazer:**
  - Durante o workshop, pausa a sincronização do OneDrive (ícone do OneDrive > Pausar sincronização).
  - Os projetos ficam em ~/workshop-claude. Se essa pasta estiver dentro do OneDrive, move-a para fora.

<a id="windows-e-so-05"></a>

### E-SO-05 · PowerShell em modo restrito

- **Porquê:** O PowerShell está em ConstrainedLanguage, por política da empresa (AppLocker ou WDAC). Neste modo o setup não consegue correr.
- **O que fazer:**
  - Pede ao IT uma exceção para o setup do workshop, ou faz o setup noutro computador.
  - Confirma o modo com o comando abaixo: tem de dizer FullLanguage.

Comando (Windows):

```
$ExecutionContext.SessionState.LanguageMode
```

<a id="windows-e-so-06"></a>

### E-SO-06 · Pouco espaço em disco

- **Porquê:** Há menos de 3 GB livres na pasta pessoal. As ferramentas e os projetos precisam de cerca de 2 GB.
- **O que fazer:**
  - Liberta espaço (por exemplo, esvazia a pasta de Transferências) e volta a correr o setup.

Comando (Windows):

```
Get-PSDrive C
```

<a id="windows-e-so-07"></a>

### E-SO-07 · Uma política da empresa bloqueia os scripts do PowerShell

- **Porquê:** A Group Policy define a política de execução do PowerShell, e ela ganha ao "-ExecutionPolicy Bypass". Com AllSigned ou Restricted nenhum script sem assinatura corre: nem o setup, nem os instaladores oficiais do Claude Code e do uv.
- **O que fazer:**
  - Pede ao IT uma exceção para o workshop (scripts da tua pasta pessoal), ou faz o setup noutro computador.
  - Se a política for RemoteSigned e descarregaste o setup-windows.ps1 com o browser, desbloqueia primeiro o ficheiro (segundo comando) e volta a corrê-lo.

Comandos (Windows):

```
Get-ExecutionPolicy -List
Unblock-File -LiteralPath .\setup-windows.ps1
```

<a id="windows-e-so-08"></a>

### E-SO-08 · O PowerShell ISE não consegue correr o setup

- **Porquê:** O PowerShell ISE não tem uma consola a sério: os programas que te perguntam alguma coisa (os logins do Claude Code, do GitHub e do Jira) ficavam à espera para sempre.
- **O que fazer:**
  - Abre o «Windows PowerShell» no menu Iniciar (não o «Windows PowerShell ISE») e corre lá o comando do setup.

Comando (Windows):

```
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/bootstrap-windows.ps1 | iex
```

<a id="windows-e-cfg-01"></a>

### E-CFG-01 · Há definições geridas pela empresa (managed-settings)

- **Porquê:** A empresa instalou regras para o Claude Code que se sobrepõem às tuas. Podem bloquear modelos, ferramentas, MCP ou hooks do workshop.
- **O que fazer:**
  - Se algum passo do workshop for bloqueado, mostra este aviso ao IT.
  - O ficheiro está no caminho indicado acima. Não o alteres sem falar com o IT.

Comando (Windows):

```
Get-Content "$env:ProgramFiles\ClaudeCode\managed-settings.json"
```

<a id="windows-e-cfg-02"></a>

### E-CFG-02 · Está definida a variável ANTHROPIC_API_KEY ou ANTHROPIC_AUTH_TOKEN

- **Porquê:** Com esta variável, o Claude Code usa essa chave em vez do teu login. O custo vai para a conta dona da chave.
- **O que fazer:**
  - Se a chave for tua e da Console, podes continuar: o teste final (passo 12) confirma que funciona.
  - Se não for, remove a variável do teu perfil do terminal (o comando abaixo mostra onde está) e abre um terminal novo.

Comandos (Windows):

```
[Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', $null, 'User')
[Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', $null, 'User')
```

<a id="windows-e-cfg-03"></a>

### E-CFG-03 · A variável ANTHROPIC_BASE_URL está definida

- **Porquê:** Com esta variável, o Claude Code fala com outro servidor em vez da API da Anthropic (por exemplo, um gateway da empresa). Os preços e os modelos podem ser outros.
- **O que fazer:**
  - Se o IT te pediu para usar esse gateway, podes continuar.
  - Se não, remove a variável (do teu perfil do terminal ou do bloco "env" do ~/.claude/settings.json) e abre um terminal novo.

Comando (Windows):

```
[Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', $null, 'User')
```

<a id="windows-e-cfg-04"></a>

### E-CFG-04 · O Claude Code está configurado para Bedrock, Vertex ou Foundry

- **Porquê:** A CLAUDE_CODE_USE_BEDROCK, a CLAUDE_CODE_USE_VERTEX ou a CLAUDE_CODE_USE_FOUNDRY está definida, no terminal ou no bloco "env" de um ficheiro de definições do Claude Code (indicado acima). Assim o Claude Code usa a cloud da empresa e ignora o login na Console e, sem as credenciais dessa cloud, os pedidos nunca acabam.
- **O que fazer:**
  - Se indicar (shell): apaga a linha do ~/.zshrc, ~/.zprofile ou ~/.bash_profile (o primeiro comando mostra-a) e abre um terminal novo.
  - Se indicar ~/.claude/settings.json: apaga a variável do bloco "env" (e AWS_PROFILE ou AWS_REGION, se só servirem para isto).
  - Se indicar /Library/... ou managed settings: foi a empresa que a definiu. Fala com o organizador: o workshop usa a Console.
  - Se a empresa exigir Bedrock, Vertex ou Foundry, confirma com o organizador que os modelos do workshop estão disponíveis.

Comandos (Windows):

```
[Environment]::SetEnvironmentVariable('CLAUDE_CODE_USE_BEDROCK', $null, 'User')
[Environment]::SetEnvironmentVariable('CLAUDE_CODE_USE_VERTEX', $null, 'User')
[Environment]::SetEnvironmentVariable('CLAUDE_CODE_USE_FOUNDRY', $null, 'User')
Select-String -Path "$env:USERPROFILE\.claude\settings.json" -Pattern CLAUDE_CODE_USE_
```

<a id="windows-e-cfg-05"></a>

### E-CFG-05 · O ficheiro settings.json do Claude Code tem um erro

- **Porquê:** O ~/.claude/settings.json não é JSON estrito, ou um campo dele tem o tipo errado: a linha e a coluna, ou o campo, estão entre parênteses. O JSON não aceita comentários // ou /* */, nem uma vírgula depois do último elemento de uma lista ou objeto (os ficheiros de definições de alguns editores aceitam). O setup não lhe toca, para não perderes as tuas definições.
- **O que fazer:**
  - Abre o ficheiro na linha e coluna indicadas e corrige: tira os comentários e a vírgula depois do último elemento. Num campo com o tipo errado, dá-lhe a forma indicada entre parênteses.
  - Confirma o ficheiro com o comando abaixo (mostra JSON OK) e volta a correr o setup.

Comando (Windows):

```
node -e "JSON.parse(require('fs').readFileSync(process.env.USERPROFILE + '/.claude/settings.json', 'utf8')); console.log('JSON OK')"
```

<a id="windows-e-cfg-06"></a>

### E-CFG-06 · Já tinhas uma statusline

- **Porquê:** O teu Claude Code já mostra uma statusline tua. O setup manteve-a e não instalou a do workshop, que mostra o custo.
- **O que fazer:**
  - Podes continuar: o custo também aparece no /demo-cost.
  - Para usar a statusline do workshop, volta a correr o setup com a opção abaixo. A tua fica no backup e volta com --uninstall.

Comando (Windows):

```
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -ReplaceStatusline
```

<a id="windows-e-cfg-07"></a>

### E-CFG-07 · O uv está proibido de usar o Python gerido

- **Porquê:** Há uma variável de ambiente (UV_PYTHON_DOWNLOADS, UV_NO_MANAGED_PYTHON ou UV_PYTHON_PREFERENCE) que impede o uv de descarregar o seu próprio Python. A app Agent Memory precisa desse Python. O setup ignora a variável só no comando dele, mas outros comandos uv continuam afetados.
- **O que fazer:**
  - Se a variável foi posta pela empresa, fala com o IT antes de a mudar.
  - Não precisas de ter Python instalado: o uv traz o dele.

Comando (Windows):

```
Get-ChildItem Env:UV_*
```

<a id="windows-e-perm-01"></a>

### E-PERM-01 · Sem permissão para escrever na pasta pessoal

- **Porquê:** O setup instala tudo na tua pasta pessoal, e uma pasta ou ficheiro dela (entre parênteses) está protegido, pertence a outro utilizador (por exemplo, criado com sudo ou por um administrador) ou é um ficheiro onde devia estar uma pasta.
- **O que fazer:**
  - Corre o comando que o setup mostra depois de "To fix it, run this command" (tem exatamente esses caminhos) e volta a correr o setup.
  - Se não tiveres direitos de administrador para o sudo, pede à TI que o corra.
  - Se um caminho for um ficheiro e não uma pasta (por exemplo ~/.local/bin), muda-lhe o nome: mv ~/.local/bin ~/.local/bin.old.
  - Não corras o setup com sudo nem como administrador.

Comandos (Windows):

```
icacls "$env:USERPROFILE\.workshop-claude"
icacls "$env:USERPROFILE\.claude"
icacls "$env:USERPROFILE\.claude.json"
icacls "$env:USERPROFILE\.local\bin"
```

<a id="windows-e-perm-02"></a>

### E-PERM-02 · Um programa foi bloqueado pela segurança do computador

- **Porquê:** Um antivírus, EDR, AppLocker, WDAC ou o Gatekeeper impediu um programa instalado na pasta pessoal de correr, ou apagou um ficheiro logo a seguir ao download.
- **O que fazer:**
  - Mostra ao IT o nome do programa que aparece no log e pede uma exceção.
  - No Mac, se aparecer «não pode ser aberto», abre Definições do Sistema > Privacidade e segurança e escolhe «Abrir mesmo assim».

Comando (Windows):

```
Get-MpThreatDetection | Select-Object -First 5
```

<a id="windows-e-perm-03"></a>

### E-PERM-03 · O instalador pediu permissões de administrador

- **Porquê:** Um instalador tentou escrever fora da tua pasta pessoal. O setup foi feito para não precisar de admin.
- **O que fazer:**
  - Recusa o pedido de elevação e volta a correr o setup: ele usa a alternativa sem admin.
  - Se o problema continuar, envia o log ao organizador.

<a id="windows-e-git-02"></a>

### E-GIT-02 · Não consegui instalar o Git for Windows

- **Porquê:** O winget não está disponível ou falhou, e o instalador direto do Git também falhou.
- **O que fazer:**
  - Instala o Git for Windows à mão, escolhendo «Only for me» (sem admin), e volta a correr o setup.
  - Se a empresa tiver um portal de software (Company Portal, Software Center), instala o Git por lá.

Comando (Windows):

```
winget install --id Git.Git -e --scope user --source winget
```

<a id="windows-e-git-03"></a>

### E-GIT-03 · Não encontrei o Git Bash (bash.exe)

- **Porquê:** O Claude Code no Windows usa o Git Bash para correr comandos e hooks. O git existe, mas não encontrei o bash.exe ao lado dele nem nas pastas habituais do Git for Windows.
- **O que fazer:**
  - Reinstala o Git for Windows (inclui o Git Bash) e volta a correr o setup.
  - Se o bash.exe estiver noutra pasta, define a variável abaixo com o caminho certo.

Comando (Windows):

```
[Environment]::SetEnvironmentVariable('CLAUDE_CODE_GIT_BASH_PATH', 'C:\caminho\para\Git\bin\bash.exe', 'User')
```

<a id="windows-e-cc-01"></a>

### E-CC-01 · O instalador do Claude Code falhou

- **Porquê:** O instalador oficial não terminou. Costuma ser rede (downloads.claude.ai bloqueado) ou um antivírus a bloquear o ficheiro.
- **O que fazer:**
  - Confirma o acesso a claude.ai e downloads.claude.ai (código E-NET-01).
  - Corre o instalador oficial à mão e volta a correr o setup.

Comando (Windows):

```
& ([scriptblock]::Create((irm https://claude.ai/install.ps1))) 2.1.292
```

<a id="windows-e-cc-02"></a>

### E-CC-02 · O comando claude não está no PATH

- **Porquê:** O Claude Code foi instalado em ~/.local/bin, mas o terminal ainda não procura nessa pasta.
- **O que fazer:**
  - Fecha e volta a abrir o terminal. Se continuar, adiciona a pasta ao PATH com o comando abaixo.

Comando (Windows):

```
[Environment]::SetEnvironmentVariable('Path', "$env:USERPROFILE\.local\bin;" + [Environment]::GetEnvironmentVariable('Path','User'), 'User')
```

<a id="windows-e-cc-03"></a>

### E-CC-03 · A versão do Claude Code é antiga

- **Porquê:** O workshop precisa do Claude Code 2.1.285 ou mais recente. Pode haver uma instalação antiga (por exemplo, pelo npm) à frente no PATH.
- **O que fazer:**
  - Vê qual é o claude que o terminal usa. Se for uma instalação antiga pelo npm, remove-a.
  - Depois volta a correr o setup.

Comandos (Windows):

```
Get-Command claude -All
npm uninstall -g @anthropic-ai/claude-code
```

<a id="windows-e-cc-04"></a>

### E-CC-04 · O teu ficheiro ~/.claude.json tem um erro

- **Porquê:** O ~/.claude.json (as definições do próprio Claude Code, com os teus servidores MCP) não é JSON válido, muitas vezes por causa de uma vírgula ou de aspas que ficaram de uma edição à mão. O Claude Code trocá-lo-ia por um ficheiro vazio, por isso o setup para aqui e não lhe toca.
- **O que fazer:**
  - Corrige o ficheiro indicado acima, ou pede ajuda ao organizador. O comando abaixo mostra o erro e onde está (abre primeiro um terminal novo, para o node ser encontrado).
  - Se o caminho indicado estiver em ~/.claude/backups, o Claude Code já substituiu o ~/.claude.json: os teus servidores MCP estão nessa cópia. Corrige-a e copia de volta o que precisares (por exemplo, o mcpServers).
  - Depois volta a correr o setup.

Comando (Windows):

```
node -e "JSON.parse(require('fs').readFileSync(process.env.USERPROFILE + '/.claude.json', 'utf8'))"
```

<a id="windows-e-auth-01"></a>

### E-AUTH-01 · O Claude Code não tem login

- **Porquê:** Ainda não fizeste login. O workshop usa a tua conta da Console da Anthropic (paga por uso).
- **O que fazer:**
  - Corre o comando abaixo. Abre o browser: entra na Console e autoriza.
  - Se não tens conta, cria-a em https://platform.claude.com e adiciona créditos (Billing).
  - Depois volta a correr o setup.

Comando (Windows):

```
claude auth login --console
```

<a id="windows-e-auth-02"></a>

### E-AUTH-02 · O login é de uma assinatura claude.ai, não da Console

- **Porquê:** Estás ligado com uma assinatura claude.ai (Pro, Max, Team ou Enterprise). Funciona, mas o workshop foi preparado para a Console e mede o custo a preço de API.
- **O que fazer:**
  - Podes continuar com a assinatura: os limites são os do teu plano.
  - Para usar a Console, corre o comando abaixo.

Comando (Windows):

```
claude auth login --console
```

<a id="windows-e-auth-03"></a>

### E-AUTH-03 · O Claude Code usa outro método de autenticação

- **Porquê:** O login vem de uma variável de ambiente, de um token ou de uma cloud (Bedrock ou Vertex), e não da Console.
- **O que fazer:**
  - Se foi intencional, podes continuar.
  - Para usar a Console, remove essa variável, abre um terminal novo e corre o comando abaixo.

Comandos (Windows):

```
claude auth status --text
claude auth login --console
```

<a id="windows-e-auth-04"></a>

### E-AUTH-04 · Uma chave do Claude no teu ambiente foi recusada

- **Porquê:** O Claude Code usa a chave de uma variável de ambiente (ou de um apiKeyHelper) em vez do teu login na Console, e a API recusou-a (401: inválida, expirada ou revogada). Voltar a fazer login não resolve enquanto essa chave estiver definida.
- **O que fazer:**
  - Remove a variável indicada acima do teu perfil do terminal (o primeiro comando mostra o ficheiro e a linha) ou do bloco "env" do ~/.claude/settings.json.
  - Neste terminal, corre o segundo comando e volta a correr o setup.
  - Se foi o IT que te deu esta chave para um gateway da empresa, pede-lhe uma nova.

Comandos (Windows):

```
[Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', $null, 'User')
[Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', $null, 'User')
Remove-Item Env:ANTHROPIC_API_KEY, Env:ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue
```

<a id="windows-e-auth-05"></a>

### E-AUTH-05 · O gateway da empresa no ANTHROPIC_BASE_URL não responde

- **Porquê:** O ANTHROPIC_BASE_URL manda o Claude Code para um gateway da empresa (indicado acima) em vez do api.anthropic.com, e esse gateway não está acessível: VPN desligada, gateway em baixo ou proxy local parado. O api.anthropic.com pode estar bem.
- **O que fazer:**
  - Se usas o gateway da empresa, liga a VPN (ou arranca o proxy local) e volta a correr o setup.
  - Para o workshop basta a tua conta da Console: remove o ANTHROPIC_BASE_URL (e o ANTHROPIC_AUTH_TOKEN, se só servir para o gateway) do teu perfil do terminal ou do ~/.claude/settings.json, corre o segundo comando e volta a correr o setup.

Comandos (Windows):

```
[Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', $null, 'User')
[Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', $null, 'User')
```

<a id="windows-e-node-01"></a>

### E-NODE-01 · Não consegui instalar o Node.js

- **Porquê:** O download de nodejs.org falhou, ou o ficheiro não confere com o SHA256SUMS publicado.
- **O que fazer:**
  - Confirma o acesso a nodejs.org (código E-NET-01) e volta a correr o setup.
  - Em alternativa, instala o Node 24.22.0 (LTS) pelo site oficial e volta a correr o setup.

Comando (Windows):

```
winget install --id OpenJS.NodeJS.LTS -e --scope user --source winget
```

<a id="windows-e-node-02"></a>

### E-NODE-02 · Há um Node antigo ou avariado à frente no PATH

- **Porquê:** Um terminal novo encontra primeiro um Node com versão inferior a 22, ou um que não arranca. Os hooks usam o Node novo, mas os testes do projeto podem usar o antigo.
- **O que fazer:**
  - Fecha e volta a abrir o terminal e vê com o primeiro comando abaixo qual é o node que aparece primeiro.
  - Se usas nvm, escolhe o Node novo com o nvm. Se o primeiro node não arranca (num Mac, muitas vezes um node do Homebrew avariado), reinstala-o ou remove-o: brew reinstall node ou brew uninstall node.
  - Confirma com node -v.

Comandos (Windows):

```
Get-Command node -All
node -v
```

<a id="windows-e-uv-01"></a>

### E-UV-01 · Não consegui instalar o uv

- **Porquê:** O instalador oficial do uv falhou. Costuma ser rede (astral.sh ou github.com bloqueados).
- **O que fazer:**
  - Confirma o acesso a astral.sh, releases.astral.sh e github.com.
  - Corre o instalador à mão e volta a correr o setup.

Comando (Windows):

```
powershell -ExecutionPolicy Bypass -c "irm https://astral.sh/uv/0.13.1/install.ps1 | iex"
```

<a id="windows-e-uv-02"></a>

### E-UV-02 · Há um uv antigo à frente no PATH

- **Porquê:** O workshop precisa do uv 0.6.8 ou mais recente e usa a sua cópia em ~/.local/bin. Um uv antigo (por exemplo, do Homebrew ou do pipx) aparece primeiro no PATH deste terminal, e os comandos uv que escreves usam esse.
- **O que fazer:**
  - Podes continuar: o setup e a app Agent Memory usam o ~/.local/bin/uv.
  - Para evitar surpresas, atualiza ou remove o uv antigo (indicado acima) e abre um terminal novo.

Comando (Windows):

```
Get-Command uv -All
```

<a id="windows-e-gh-01"></a>

### E-GH-01 · Não consegui instalar o GitHub CLI (gh)

- **Porquê:** O download do gh falhou ou não confere com o ficheiro de checksums da release.
- **O que fazer:**
  - Confirma o acesso a github.com e release-assets.githubusercontent.com.
  - Volta a correr o setup. O gh só é preciso no Projeto 2 (tarefa real).

Comando (Windows):

```
winget install --id GitHub.cli -e --scope user --source winget
```

<a id="windows-e-gh-02"></a>

### E-GH-02 · Falta o login no GitHub (obrigatório)

- **Porquê:** O gh está instalado mas sem conta. O workshop precisa do login no GitHub para o Projeto 2: ler issues, criar branches e abrir PRs.
- **O que fazer:**
  - Corre o comando abaixo: abre o browser com um código para confirmares o login.
  - Se a tua empresa usa GitHub Enterprise, troca github.com pelo servidor da empresa.
  - Depois volta a correr o setup.

Comando (Windows):

```
gh auth login --hostname github.com --git-protocol https --web
```

<a id="windows-e-gh-03"></a>

### E-GH-03 · O GitHub não respondeu

- **Porquê:** O gh tentou confirmar o teu login, mas o servidor do GitHub (indicado acima) não respondeu a tempo. Costuma ser a VPN da empresa desligada ou um proxy a bloquear a ligação; não é um problema de login.
- **O que fazer:**
  - Liga a VPN da empresa (ou confirma o proxy) e volta a correr o setup.
  - Se já não usas um dos servidores indicados acima, remove-o do gh: gh auth logout --hostname seguido do nome do servidor.
  - Os outros passos não foram afetados. O gh só é preciso no Projeto 2 (tarefa real).

Comando (Windows):

```
gh auth status
```

<a id="windows-e-mcp-01"></a>

### E-MCP-01 · Não consegui adicionar o MCP do Atlassian

- **Porquê:** O comando claude mcp add falhou. O Claude Code pode estar em falta, ou a empresa bloqueia servidores MCP.
- **O que fazer:**
  - Corre o comando abaixo à mão e lê a mensagem de erro.
  - Se a empresa bloquear MCP (managed-settings), usa o projeto de treino com issues locais.

Comando (Windows):

```
claude mcp add --transport http --scope user atlassian https://mcp.atlassian.com/v2/mcp
```

<a id="windows-e-mcp-02"></a>

### E-MCP-02 · Falta o login no Atlassian (OAuth)

- **Porquê:** O MCP do Jira está registado, mas o login é feito por ti, no browser, dentro do Claude Code.
- **O que fazer:**
  - Abre o Claude Code, escreve /mcp, escolhe atlassian e segue o login.
  - Se o admin do Jira restringir domínios, pede-lhe para autorizar o Claude.

Comando (Windows):

```
claude
```

<a id="windows-e-acli-01"></a>

### E-ACLI-01 · Não consegui instalar o Atlassian CLI (reserva do Jira)

- **Porquê:** O download de acli.atlassian.com falhou ou o ficheiro não corresponde ao SHA-256 esperado. O acli só é usado quando o MCP do Jira falha, por isso o setup continua.
- **O que fazer:**
  - Confirma o acesso a acli.atlassian.com (a rede da empresa pode bloquear).
  - Volta a correr o setup. Sem o acli, o Jira continua a funcionar pelo MCP (/mcp).

Comando (Windows):

```
Invoke-WebRequest -UseBasicParsing -Method Head https://acli.atlassian.com/windows/1.3.39-stable/acli_1.3.39-stable_windows_amd64.zip
```

<a id="windows-e-acli-02"></a>

### E-ACLI-02 · O Atlassian CLI não tem login ou o site recusou o acesso

- **Porquê:** O acli precisa do teu login. Desde a versão 1.3.15, um administrador do site Atlassian tem de autorizar a app ACLI uma vez ("Your site admin must authorize this app…").
- **O que fazer:**
  - Corre acli auth login e escolhe no terminal o mesmo site que escolheste no browser.
  - Se aparecer "site admin must authorize", pede ao administrador do Jira para correr acli jira auth login, escolher "Web" e aprovar o site.
  - Alternativa sem OAuth: cria um API token em id.atlassian.com (Security > API tokens), copia-o e corre o comando da segunda linha. O token vai da área de transferência para o acli, sem ficar no histórico nem em ficheiros.

Comandos (Windows):

```
acli auth login
Get-Clipboard | acli jira auth login --site <empresa>.atlassian.net --email <o teu email> --token
```

<a id="windows-e-kit-01"></a>

### E-KIT-01 · Não consegui obter o kit do workshop

- **Porquê:** O download do arquivo do kit falhou, e o git clone de recurso também.
- **O que fazer:**
  - Confirma o acesso ao servidor do repositório (github.com).
  - Volta a correr o setup. Se continuar, envia o log ao organizador.

Comando (Windows):

```
Invoke-WebRequest -UseBasicParsing -Method Head https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/workshop-kit-v1.0.0-rc.1.zip
```

<a id="windows-e-kit-02"></a>

### E-KIT-02 · O arquivo do kit não confere (SHA-256)

- **Porquê:** O ficheiro descarregado é diferente do publicado. Pode estar incompleto, ou um proxy alterou-o.
- **O que fazer:**
  - Volta a correr o setup para descarregar outra vez.
  - Se repetir, não continues e avisa o organizador.

<a id="windows-e-kit-03"></a>

### E-KIT-03 · A instalação das skills e dos hooks falhou

- **Porquê:** O instalador em Node não conseguiu copiar os ficheiros ou atualizar o settings.json. Se o settings.json já tiver sido alterado, o backup dele está em ~/.workshop-claude/backup.
- **O que fazer:**
  - Lê a mensagem no log (procura «install-user»).
  - Corrige a causa (permissões ou settings.json inválido) e volta a correr o setup.

Comando (Windows):

```
Get-ChildItem "$env:USERPROFILE\.claude", "$env:USERPROFILE\.workshop-claude\backup"
```

<a id="windows-e-demo-01"></a>

### E-DEMO-01 · Não consegui montar os projetos do workshop

- **Porquê:** A cópia ou o git init dos projetos falhou.
- **O que fazer:**
  - A razão está entre parênteses acima, e a mensagem completa está no log (procura «assemble»).
  - Depois de corrigires, volta a correr o setup: um projeto montado a meio é refeito sozinho, e o teu trabalho nunca é apagado.

Comando (Windows):

```
Get-ChildItem ~/workshop-claude
```

<a id="windows-e-demo-02"></a>

### E-DEMO-02 · Os testes da app da Arena falharam

- **Porquê:** Os testes da própria app (test/app.test.js) devem passar logo à partida. Os testes dos cartões estão vermelhos de propósito.
- **O que fazer:**
  - Corre os testes à mão e envia o resultado ao organizador.
  - Confirma que node -v mostra a versão 22 ou superior.

Comando (Windows):

```
cd ~/workshop-claude\demo-project; node --test test/app.test.js
```

<a id="windows-e-demo-03"></a>

### E-DEMO-03 · A pasta do projeto já existe e não é do kit

- **Porquê:** Já há uma pasta com esse nome e com outros ficheiros. O setup não a apaga.
- **O que fazer:**
  - Muda o nome da pasta (ou apaga-a, se não precisares dela) e volta a correr o setup.

Comando (Windows):

```
Rename-Item ~/workshop-claude workshop-claude-antigo
```

<a id="windows-e-demo-04"></a>

### E-DEMO-04 · A Arena tem um histórico git próprio: deixei-a como está

- **Porquê:** A Arena tem commits mas não tem a tag arena-start (o ponto de partida), por isso o /demo-reset não a consegue repor no início. O setup nunca apaga o teu trabalho.
- **O que fazer:**
  - Não há nada a fazer se quiseres continuar a trabalhar nesta Arena.
  - Para teres uma Arena nova, muda o nome desta pasta e volta a correr o setup.

Comando (Windows):

```
Rename-Item ~/workshop-claude\demo-project demo-project-old
```

<a id="windows-e-mem-01"></a>

### E-MEM-01 · A release da app Agent Memory ainda não foi publicada

- **Porquê:** Não encontrei os ficheiros da app Agent Memory v0.5.0 no servidor. A app é opcional: as skills funcionam sem ela.
- **O que fazer:**
  - Podes continuar. Mais perto do workshop, volta a correr o setup para a instalar.

<a id="windows-e-mem-02"></a>

### E-MEM-02 · O ficheiro da app Agent Memory não confere (SHA-256)

- **Porquê:** O wheel descarregado é diferente do publicado em SHA256SUMS. Não o instalei.
- **O que fazer:**
  - Volta a correr o setup. Se repetir, avisa o organizador.

<a id="windows-e-mem-03"></a>

### E-MEM-03 · A instalação da app Agent Memory falhou

- **Porquê:** O uv não conseguiu instalar a app (Python 3.12 ou as dependências). Costuma ser a rede (pypi.org, files.pythonhosted.org ou github.com) ou o certificado de um proxy da empresa (código E-NET-04).
- **O que fazer:**
  - Confirma o acesso a pypi.org e files.pythonhosted.org.
  - Volta a correr o setup. A app é opcional: as skills funcionam sem ela.

Comando (Windows):

```
uv python install 3.12
```

<a id="windows-e-mem-04"></a>

### E-MEM-04 · Falta o WebView2 (Windows)

- **Porquê:** A janela da app Agent Memory usa o Microsoft Edge WebView2, e não o encontrei nem o consegui instalar. Sem ele, a app abre no browser.
- **O que fazer:**
  - Podes continuar: a app abre no browser.
  - Para a janela própria, instala o WebView2 Runtime pelo portal de software da empresa ou pede ao IT.

<a id="windows-e-mem-05"></a>

### E-MEM-05 · O teste da app Agent Memory falhou

- **Porquê:** A app ficou instalada, mas o autoteste falhou. O Python que o uv instalou, a pesquisa nas notas (FTS5) ou a pasta das memórias não estão a funcionar, ou o índice de pesquisa das notas pode estar estragado. As skills funcionam sem a app.
- **O que fazer:**
  - Corre o primeiro comando abaixo e envia o resultado ao organizador.
  - Se uma linha falar do índice: fecha o Claude Code e a app Agent Memory e depois corre agent-memory reindex (as tuas notas continuam guardadas em Markdown).
  - Volta a correr o setup: o uv volta a instalar a app e o Python dela.

Comandos (Windows):

```
agent-memory selftest
agent-memory reindex
```

<a id="windows-e-mem-06"></a>

### E-MEM-06 · Não consegui criar o atalho da app Agent Memory

- **Porquê:** A pasta dos atalhos das apps (entre parênteses) não aceita escrita: pertence a outro utilizador ou está bloqueada pela TI. Só falta o atalho: a app, a janela dela e o MCP funcionam.
- **O que fazer:**
  - Podes continuar. Abre a janela da app com o primeiro comando abaixo.
  - Se quiseres o atalho, devolve a pasta ao teu utilizador (ou pede à TI) e volta a correr o setup.

Comando (Windows):

```
agent-memory-gui
```

<a id="windows-e-mem-07"></a>

### E-MEM-07 · A pasta da app Agent Memory não aceita escrita

- **Porquê:** A app Agent Memory está instalada, mas não consegue escrever na pasta das memórias (~/.agent-memory, ~/.memoria das versões antigas, ou AGENT_MEMORY_HOME). Costuma acontecer depois de um comando corrido com sudo, que deixa a pasta a pertencer ao administrador, ou quando esse caminho é um ficheiro ou um link partido. Voltar a correr o setup não resolve. As skills funcionam sem a app.
- **O que fazer:**
  - Corre o comando que o setup mostra depois de "To fix it, run this command" e volta a correr o setup.
  - Sem direitos de administrador: muda o nome da pasta (por exemplo, mv ~/.agent-memory ~/.agent-memory-old), volta a correr o setup e depois copia as pastas dos teus projetos da pasta antiga para a nova.
  - Para ver a pasta e o que a app diz, usa os comandos abaixo.

Comandos (Windows):

```
icacls "$env:USERPROFILE\.agent-memory"
agent-memory selftest
```

<a id="windows-e-desk-01"></a>

### E-DESK-01 · O Claude Desktop tem limitações com a Console

- **Porquê:** O Claude Desktop só entra com uma conta claude.ai, e o separador Code exige assinatura. O hands-on do workshop corre todo no Claude Code (terminal).
- **O que fazer:**
  - Não precisas de fazer nada. O Desktop é opcional.

<a id="windows-e-desk-02"></a>

### E-DESK-02 · Não consegui instalar o Claude Desktop

- **Porquê:** O download ou a instalação do Claude Desktop falhou. É opcional.
- **O que fazer:**
  - Se o quiseres, descarrega-o à mão em https://claude.ai/download.

Comando (Windows):

```
winget install --id Anthropic.Claude -e --scope user --source winget
```

<a id="windows-e-smoke-01"></a>

### E-SMOKE-01 · O teste final ao Claude falhou

- **Porquê:** O Claude Code não conseguiu responder a um pedido simples. Pode ser login, rede ou créditos.
- **O que fazer:**
  - Corre o comando abaixo e lê a mensagem de erro.
  - Confirma o login (código E-AUTH-01) e os créditos (código E-SMOKE-02).

Comando (Windows):

```
claude -p "responde só OK" --model claude-haiku-5-5
```

<a id="windows-e-smoke-02"></a>

### E-SMOKE-02 · A conta da Console não tem créditos

- **Porquê:** A API recusou o pedido por falta de saldo (credit balance too low).
- **O que fazer:**
  - Abre https://platform.claude.com, vai a Billing e adiciona créditos (recomendado: um limite bem acima de US$ 10).
  - Depois volta a correr o setup.

<a id="windows-e-smoke-03"></a>

### E-SMOKE-03 · Limite de pedidos atingido (erro 429)

- **Porquê:** A API está a limitar os pedidos da tua organização. Contas novas têm limites mais baixos.
- **O que fazer:**
  - Espera um minuto e volta a correr o setup.

<a id="windows-e-smoke-04"></a>

### E-SMOKE-04 · O modelo do teste não está disponível na tua conta

- **Porquê:** A tua organização não tem acesso ao modelo claude-haiku-5-5, ou um gateway da empresa bloqueia-o.
- **O que fazer:**
  - Confirma os modelos disponíveis na Console e fala com o organizador.

## Domínios necessários

Pede ao IT que estes domínios fiquem acessíveis por HTTPS (porta 443):

- `api.anthropic.com`
- `claude.ai`
- `platform.claude.com`
- `downloads.claude.ai`
- `nodejs.org`
- `astral.sh`
- `releases.astral.sh`
- `github.com`
- `objects.githubusercontent.com`
- `release-assets.githubusercontent.com`
- `pypi.org`
- `files.pythonhosted.org`
- `mcp.atlassian.com`

## Proxies e certificados da empresa

- O setup deteta o proxy do sistema (no Windows também resolve o PAC) e grava `HTTPS_PROXY` e `NO_PROXY` no `env` do `~/.claude/settings.json`. O `NO_PROXY` mantém o valor que já lá estava e junta `localhost,127.0.0.1`, as entradas do teu `NO_PROXY` e as exceções do proxy do sistema (os endereços que não passam pelo proxy; no Windows, também os servidores que o PAC manda direto).
- Se voltares a correr o setup numa rede sem esse proxy (por exemplo, no local do workshop depois de instalar no escritório), ele tira o `HTTPS_PROXY` e o `NO_PROXY` que gravou (ver `E-NET-08`). De volta ao escritório, corre o setup outra vez.
- Se a empresa intercetar o HTTPS, o setup exporta as raízes da empresa para `~/.workshop-claude/ca.pem` e define `NODE_EXTRA_CA_CERTS` e `UV_SYSTEM_CERTS=true`.
- Proxies só com NTLM ou Kerberos não são suportados (ver `E-NET-06`).

