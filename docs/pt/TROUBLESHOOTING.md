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
| `E-NET-09` | Uma variável de certificados aponta para um ficheiro que não existe ou está errado | [macOS](#mac-e-net-09) · [Windows](#windows-e-net-09) |
| `E-NET-10` | O uv não confia no certificado da empresa | [macOS](#mac-e-net-10) · [Windows](#windows-e-net-10) |
| `E-SO-01` | Windows anterior a 10.0.18362 (versão 1903) | [Windows](#windows-e-so-01) |
| `E-SO-02` | Windows em ARM64 | [Windows](#windows-e-so-02) |
| `E-SO-03` | A pasta pessoal está no OneDrive | [macOS](#mac-e-so-03) · [Windows](#windows-e-so-03) |
| `E-SO-04` | macOS antigo | [macOS](#mac-e-so-04) |
| `E-SO-05` | PowerShell em modo restrito | [Windows](#windows-e-so-05) |
| `E-SO-06` | Pouco espaço em disco | [macOS](#mac-e-so-06) · [Windows](#windows-e-so-06) |
| `E-SO-07` | Uma política da empresa bloqueia os scripts do PowerShell | [Windows](#windows-e-so-07) |
| `E-SO-08` | O PowerShell ISE não consegue correr o setup | [Windows](#windows-e-so-08) |
| `E-SO-09` | A variável da pasta temporária aponta para uma pasta que não serve | [macOS](#mac-e-so-09) · [Windows](#windows-e-so-09) |
| `E-SO-10` | A pasta temporária do setup foi apagada enquanto ele corria | [macOS](#mac-e-so-10) · [Windows](#windows-e-so-10) |
| `E-CFG-01` | Há definições geridas pela empresa (managed-settings) | [macOS](#mac-e-cfg-01) · [Windows](#windows-e-cfg-01) |
| `E-CFG-02` | Está definida a variável ANTHROPIC_API_KEY ou ANTHROPIC_AUTH_TOKEN | [macOS](#mac-e-cfg-02) · [Windows](#windows-e-cfg-02) |
| `E-CFG-03` | A variável ANTHROPIC_BASE_URL está definida | [macOS](#mac-e-cfg-03) · [Windows](#windows-e-cfg-03) |
| `E-CFG-04` | O Claude Code usa a cloud da tua empresa (Bedrock, Vertex ou Foundry) | [macOS](#mac-e-cfg-04) · [Windows](#windows-e-cfg-04) |
| `E-CFG-05` | O ficheiro settings.json do Claude Code tem um erro | [macOS](#mac-e-cfg-05) · [Windows](#windows-e-cfg-05) |
| `E-CFG-06` | Já tinhas uma statusline | [macOS](#mac-e-cfg-06) · [Windows](#windows-e-cfg-06) |
| `E-CFG-07` | O uv está proibido de usar o Python gerido | [macOS](#mac-e-cfg-07) · [Windows](#windows-e-cfg-07) |
| `E-CFG-08` | O CLAUDE_CONFIG_DIR não é um caminho absoluto | [macOS](#mac-e-cfg-08) · [Windows](#windows-e-cfg-08) |
| `E-CFG-09` | Os terminais novos não usam a mesma pasta do Claude Code | [macOS](#mac-e-cfg-09) · [Windows](#windows-e-cfg-09) |
| `E-CFG-10` | Há uma variável que troca os modelos do Claude Code | [macOS](#mac-e-cfg-10) · [Windows](#windows-e-cfg-10) |
| `E-CFG-11` | Os hooks do Claude Code estão desligados | [macOS](#mac-e-cfg-11) · [Windows](#windows-e-cfg-11) |
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
| `E-CC-05` | Um terminal novo corre outro claude | [macOS](#mac-e-cc-05) |
| `E-AUTH-01` | O Claude Code não tem login | [macOS](#mac-e-auth-01) · [Windows](#windows-e-auth-01) |
| `E-AUTH-02` | O login é de uma assinatura claude.ai, não da Console | [macOS](#mac-e-auth-02) · [Windows](#windows-e-auth-02) |
| `E-AUTH-03` | O Claude Code usa outro método de autenticação | [macOS](#mac-e-auth-03) · [Windows](#windows-e-auth-03) |
| `E-AUTH-04` | Uma chave do Claude no teu ambiente foi recusada | [macOS](#mac-e-auth-04) · [Windows](#windows-e-auth-04) |
| `E-AUTH-05` | O gateway da empresa no ANTHROPIC_BASE_URL não responde | [macOS](#mac-e-auth-05) · [Windows](#windows-e-auth-05) |
| `E-NODE-01` | Não consegui instalar o Node.js | [macOS](#mac-e-node-01) · [Windows](#windows-e-node-01) |
| `E-NODE-02` | Há um Node antigo ou avariado à frente no PATH | [macOS](#mac-e-node-02) · [Windows](#windows-e-node-02) |
| `E-NODE-03` | O NODE_OPTIONS parte o Node no teu terminal | [macOS](#mac-e-node-03) · [Windows](#windows-e-node-03) |
| `E-UV-01` | Não consegui instalar o uv | [macOS](#mac-e-uv-01) · [Windows](#windows-e-uv-01) |
| `E-UV-02` | Há um uv antigo à frente no PATH | [macOS](#mac-e-uv-02) · [Windows](#windows-e-uv-02) |
| `E-UV-03` | Não consigo ler o ficheiro de definições do uv | [macOS](#mac-e-uv-03) · [Windows](#windows-e-uv-03) |
| `E-UV-04` | O mirror da empresa nas definições do uv não responde | [macOS](#mac-e-uv-04) · [Windows](#windows-e-uv-04) |
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
| `E-TEL-01` | Não é possível chegar ao painel do workshop a partir desta rede | [macOS](#mac-e-tel-01) · [Windows](#windows-e-tel-01) |
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
| `E-MEM-08` | O uv aponta para um espelho de pacotes que não funciona | [macOS](#mac-e-mem-08) · [Windows](#windows-e-mem-08) |
| `E-MEM-09` | O PYTHONHOME ou o PYTHONPATH está definido no teu terminal | [macOS](#mac-e-mem-09) · [Windows](#windows-e-mem-09) |
| `E-MEM-10` | O caminho da tua pasta pessoal é demasiado comprido para a app Agent Memory | [macOS](#mac-e-mem-10) |
| `E-MEM-11` | Outra pasta tem memórias que a app Agent Memory não mostra | [macOS](#mac-e-mem-11) · [Windows](#windows-e-mem-11) |
| `E-MEM-12` | O atalho da Agent Memory não usa a pasta das memórias desta janela | [Windows](#windows-e-mem-12) |
| `E-DESK-01` | O Claude Desktop tem limitações com a Console | [macOS](#mac-e-desk-01) · [Windows](#windows-e-desk-01) |
| `E-DESK-02` | Não consegui instalar o Claude Desktop | [macOS](#mac-e-desk-02) · [Windows](#windows-e-desk-02) |
| `E-PROF-01` | O setup não conseguiu pôr as pastas do workshop num perfil do shell | [macOS](#mac-e-prof-01) |
| `E-PROF-02` | Um perfil do shell tem um bloco do workshop incompleto | [macOS](#mac-e-prof-02) |
| `E-SMOKE-01` | O teste final ao Claude falhou | [macOS](#mac-e-smoke-01) · [Windows](#windows-e-smoke-01) |
| `E-SMOKE-02` | A conta da Console não tem créditos | [macOS](#mac-e-smoke-02) · [Windows](#windows-e-smoke-02) |
| `E-SMOKE-03` | Limite de pedidos atingido (erro 429) | [macOS](#mac-e-smoke-03) · [Windows](#windows-e-smoke-03) |
| `E-SMOKE-04` | O modelo do teste não está disponível na tua conta | [macOS](#mac-e-smoke-04) · [Windows](#windows-e-smoke-04) |
| `E-SMOKE-05` | Um hook teu bloqueou o pedido de teste | [macOS](#mac-e-smoke-05) · [Windows](#windows-e-smoke-05) |
| `E-SMOKE-06` | Um hook teu faz o Claude ficar à espera | [macOS](#mac-e-smoke-06) · [Windows](#windows-e-smoke-06) |
| `E-GIT-04` | O download do git portátil está corrompido | [macOS](#mac-e-git-04) |

## macOS

<a id="mac-e-setup-01"></a>

### E-SETUP-01 · Este passo ainda não foi feito

- **Porquê:** O setup ainda não instalou isto neste computador, ou a instalação ficou a meio.
- **O que fazer:**
  - Corre o setup completo, sem --check. Os passos já feitos são saltados.

Comando (macOS):

```
curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/setup-mac.sh | bash
```

<a id="mac-e-net-01"></a>

### E-NET-01 · Um domínio necessário está bloqueado

- **Porquê:** A rede não deixa chegar a um ou mais domínios de que o workshop precisa. Costuma ser uma firewall ou um filtro da empresa.
- **O que fazer:**
  - Pede à equipa de IT para libertar os domínios da lista em docs/pt/TROUBLESHOOTING.md (secção «Domínios necessários»).
  - Em alternativa, usa outra rede (por exemplo, o hotspot do telemóvel) e volta a correr o setup.

Comando (macOS):

```
curl -sSL -o /dev/null -w '%{http_code} %{url_effective}\n' https://api.anthropic.com
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

- **Porquê:** Um site de que o setup precisa (api.anthropic.com, github.com ou pypi.org) mostra um certificado que não vem de uma autoridade pública: a rede da empresa abre o tráfego e volta a cifrá-lo. O setup exporta os certificados da empresa do sistema para ~/.workshop-claude/ca-company.pem, junta o teu ~/.workshop-claude/ca.pem se o tiveres, e configura o Claude Code para os usar e o uv para usar os certificados do sistema.
- **O que fazer:**
  - Normalmente não precisas de fazer nada: o setup já definiu NODE_EXTRA_CA_CERTS e UV_SYSTEM_CERTS.
  - Se o teste final ou a app Agent Memory continuarem a falhar com um erro de certificado, pede ao IT o certificado raiz da empresa em formato PEM e guarda-o como ~/.workshop-claude/ca.pem (o setup nunca escreve por cima desse ficheiro). Depois corre o setup outra vez.

Comando (macOS):

```
ls -l ~/.workshop-claude/ca.pem ~/.workshop-claude/ca-company.pem
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
curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/setup-mac.sh | bash
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
curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/setup-mac.sh | bash
grep -n -i proxy ~/.claude/settings.json
```

<a id="mac-e-net-09"></a>

### E-NET-09 · Uma variável de certificados aponta para um ficheiro que não existe ou está errado

- **Porquê:** O SSL_CERT_FILE, CURL_CA_BUNDLE, GIT_SSL_CAINFO, NODE_EXTRA_CA_CERTS, REQUESTS_CA_BUNDLE ou SSL_CERT_DIR (entre parênteses), ou uma linha cacert no ~/.curlrc, aponta para um ficheiro de certificados que não existe ou não tem os certificados certos. Costuma ser um resto de uma instalação antiga do Homebrew, do Anaconda ou do Zscaler. O curl falha então em todos os sites com "curl: (77) error setting certificate verify locations", e o uv falha com "invalid peer certificate". O setup ignora a variável nos comandos dele, mas o teu terminal continua a tê-la.
- **O que fazer:**
  - Se o próprio comando de instalação parar com curl: (77), corre o primeiro comando abaixo no mesmo terminal e volta a colar o comando de instalação.
  - Encontra o export no perfil do shell com o segundo comando, apaga essa linha (ou aponta-a para o ficheiro certo) e abre um terminal novo.

Comandos (macOS):

```
unset SSL_CERT_FILE CURL_CA_BUNDLE GIT_SSL_CAINFO NODE_EXTRA_CA_CERTS REQUESTS_CA_BUNDLE SSL_CERT_DIR
grep -nE 'SSL_CERT|CA_BUNDLE|CAINFO|EXTRA_CA_CERTS|cacert' ~/.zshrc ~/.zprofile ~/.zshenv ~/.bash_profile ~/.profile ~/.curlrc 2>/dev/null
```

<a id="mac-e-net-10"></a>

### E-NET-10 · O uv não confia no certificado da empresa

- **Porquê:** O download do Python da app (github.com) ou dos pacotes (pypi.org) falhou com um erro de certificado, mesmo com os certificados do sistema (UV_SYSTEM_CERTS) e com o ~/.workshop-claude/ca.pem, se o tiveres. O certificado raiz da empresa não está entre eles.
- **O que fazer:**
  - Pede ao IT o certificado raiz da empresa em formato PEM e guarda-o como ~/.workshop-claude/ca.pem. O setup nunca escreve por cima desse ficheiro.
  - Depois corre o setup outra vez: ele passa esse certificado ao uv. Os comandos abaixo fazem o mesmo à mão. A app é opcional: as skills funcionam sem ela.

Comandos (macOS):

```
cat /etc/ssl/cert.pem ~/.workshop-claude/ca.pem > ~/.workshop-claude/ca-bundle-uv.pem
SSL_CERT_FILE=~/.workshop-claude/ca-bundle-uv.pem uv python install 3.12
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

<a id="mac-e-so-09"></a>

### E-SO-09 · A variável da pasta temporária aponta para uma pasta que não serve

- **Porquê:** O TMPDIR (no Windows, o TEMP ou o TMP), entre parênteses, aponta para uma pasta que não existe ou sem escrita, muitas vezes um export copiado de outro computador. O setup usou outra pasta temporária, mas outros programas no teu terminal (Claude Code, uv, npm) podem falhar.
- **O que fazer:**
  - Encontra o export com o primeiro comando e apaga-o (o macOS define o TMPDIR sozinho), depois abre um terminal novo.

Comandos (macOS):

```
grep -n TMPDIR ~/.zshrc ~/.zprofile ~/.zshenv ~/.bash_profile ~/.profile 2>/dev/null
unset TMPDIR
```

<a id="mac-e-so-10"></a>

### E-SO-10 · A pasta temporária do setup foi apagada enquanto ele corria

- **Porquê:** Alguma coisa apagou a pasta temporária do setup (entre parênteses) a meio de um passo, normalmente uma app de limpeza ou um script que esvazia as pastas temporárias. O passo perdeu os ficheiros que tinha descarregado.
- **O que fazer:**
  - Põe a app de limpeza em pausa durante uns minutos e volta a correr o setup: os passos já feitos são saltados.

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

### E-CFG-04 · O Claude Code usa a cloud da tua empresa (Bedrock, Vertex ou Foundry)

- **Porquê:** A CLAUDE_CODE_USE_BEDROCK, a CLAUDE_CODE_USE_VERTEX ou a CLAUDE_CODE_USE_FOUNDRY está definida, no terminal ou no bloco "env" de um ficheiro de definições do Claude Code (aparece acima). O Claude Code passa a usar essa cloud e não o login do Console. Está tudo bem se foi a tua empresa que o configurou assim: o teste final (passo 12) confirma que o Claude responde. Os modelos do workshop (Haiku, Sonnet e Opus) têm de estar ativos nessa cloud.
- **O que fazer:**
  - Se a tua empresa usa esta cloud: não há nada a fazer. Se o teste final falhar, faz o login na cloud neste terminal (no Bedrock: aws sso login, ou AWS_PROFILE e AWS_REGION) e volta a correr o setup.
  - Se não querias usá-la: apaga a variável (o primeiro comando mostra onde está) e abre um terminal novo. No ~/.claude/settings.json, apaga-a do bloco "env".
  - Se os modelos do workshop não estiverem ativos na cloud da empresa, fala com o organizador antes do workshop.

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

<a id="mac-e-cfg-08"></a>

### E-CFG-08 · O CLAUDE_CONFIG_DIR não é um caminho absoluto

- **Porquê:** O CLAUDE_CONFIG_DIR (entre parênteses) é um caminho relativo, ou começa por um ~ dentro de aspas. Nem o Claude Code nem o setup o expandem, por isso cada pasta onde corresses o claude ficava com a sua cópia das definições, das skills e dos logins (por exemplo, uma pasta chamada ~ dentro da Arena). O setup parou antes de mudar o que quer que fosse.
- **O que fazer:**
  - Encontra a linha com o primeiro comando. Escreve o caminho com $HOME, por exemplo export CLAUDE_CONFIG_DIR="$HOME/.claude-work" (sem aspas à volta de um ~), ou apaga a linha se não precisas de uma pasta do Claude Code à parte.
  - Abre um terminal novo, confirma o valor com o segundo comando e volta a correr o setup.

Comandos (macOS):

```
grep -n CLAUDE_CONFIG_DIR ~/.zshrc ~/.zprofile ~/.zshenv ~/.bash_profile ~/.profile 2>/dev/null
echo "$CLAUDE_CONFIG_DIR"
```

<a id="mac-e-cfg-09"></a>

### E-CFG-09 · Os terminais novos não usam a mesma pasta do Claude Code

- **Porquê:** Este terminal tem o CLAUDE_CONFIG_DIR, por isso o setup pôs as skills, os hooks e os servidores MCP nessa pasta (entre parênteses). Um terminal novo tem outro valor, ou nenhum, e o claude que abrires lá não os vê. Acontece quando a variável foi exportada só neste terminal, por um IDE ou pelo direnv.
- **O que fazer:**
  - Para ficar com essa pasta: guarda a variável para os terminais novos com o primeiro comando, abre um terminal novo e volta a correr o setup.
  - Para usar a pasta normal (~/.claude): abre um terminal novo sem o CLAUDE_CONFIG_DIR e volta a correr o setup.

Comando (macOS):

```
echo "export CLAUDE_CONFIG_DIR=\"$CLAUDE_CONFIG_DIR\"" >> ~/.zshrc
```

<a id="mac-e-cfg-10"></a>

### E-CFG-10 · Há uma variável que troca os modelos do Claude Code

- **Porquê:** Uma variável (entre parênteses, da shell ou do "env" de um ficheiro de definições) troca os modelos que o Claude Code usa. É o modelo da sessão, ou os nomes sonnet, haiku e opus das skills e dos agentes do workshop. Um id de modelo retirado, ou que só existe no Bedrock ou no Vertex, falha com o login do Console, e outro modelo muda os custos. O teste final escolhe o seu próprio modelo, por isso não o mostra.
- **O que fazer:**
  - Se não precisas da troca, tira-a: corre o segundo comando neste terminal, apaga a linha do ~/.zshrc e, se estiver no ~/.claude/settings.json, tira-a do "env". Depois abre um terminal novo.
  - Se foi a empresa que a pôs (definições geridas), fala com o organizador antes do workshop.

Comandos (macOS):

```
env | grep -E '^(ANTHROPIC_(MODEL|DEFAULT_[A-Z]+_MODEL|SMALL_FAST_MODEL)|CLAUDE_CODE_SUBAGENT_MODEL)='
unset ANTHROPIC_MODEL ANTHROPIC_DEFAULT_OPUS_MODEL ANTHROPIC_DEFAULT_SONNET_MODEL ANTHROPIC_DEFAULT_HAIKU_MODEL ANTHROPIC_SMALL_FAST_MODEL CLAUDE_CODE_SUBAGENT_MODEL
```

<a id="mac-e-cfg-11"></a>

### E-CFG-11 · Os hooks do Claude Code estão desligados

- **Porquê:** O ~/.claude/settings.json tem "disableAllHooks": true. Assim o Claude Code não corre hooks nem a statusline, e os hooks de custo e a statusline do workshop não funcionam.
- **O que fazer:**
  - Tira a linha "disableAllHooks": true do ~/.claude/settings.json, ou põe-na a false.
  - Depois abre uma sessão nova do Claude. Não precisas de correr o setup outra vez.

Comando (macOS):

```
grep -n disableAllHooks ~/.claude/settings.json
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

<a id="mac-e-cc-05"></a>

### E-CC-05 · Um terminal novo corre outro claude

- **Porquê:** Um terminal novo não corre o Claude Code que o setup instalou (~/.local/bin/claude). Acima: o que o terminal corre. Vem primeiro um alias, uma função ou uma cópia antiga, muitas vezes o alias de 2025 para ~/.claude/local/claude, que já não existe.
- **O que fazer:**
  - Encontra a linha alias claude= com o primeiro comando e apaga-a desse ficheiro.
  - Tira-o também deste terminal, abre um terminal novo e confirma que o claude --version mostra 2.1.285 ou mais recente.

Comandos (macOS):

```
grep -ns 'alias claude=' ~/.zshrc ~/.zprofile ~/.aliases ~/.zsh_aliases ~/.bashrc ~/.bash_profile ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/*.zsh
unalias claude
type -a claude
claude --version
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

<a id="mac-e-node-03"></a>

### E-NODE-03 · O NODE_OPTIONS parte o Node no teu terminal

- **Porquê:** O NODE_OPTIONS (entre parênteses) faz falhar todos os scripts do Node. Normalmente é um --require de um ficheiro que já não existe (o "Debug: Auto Attach" do VS Code ou do Cursor, um agente de monitorização) ou uma opção que esta versão do Node recusa. O setup correu o Node sem ele, mas os hooks, a statusline e as skills do workshop correm o Node a partir do teu terminal: a indicação do custo e os avisos de orçamento não funcionariam.
- **O que fazer:**
  - Neste terminal, corre o primeiro comando. No VS Code ou no Cursor, corre "Debug: Toggle Auto Attach" e escolhe Disabled ou Smart, depois abre um terminal novo.
  - Se o export estiver no perfil do shell, encontra-o com o segundo comando e apaga-o, depois abre um terminal novo.

Comandos (macOS):

```
unset NODE_OPTIONS
grep -n NODE_OPTIONS ~/.zshrc ~/.zprofile ~/.zshenv ~/.bash_profile ~/.profile 2>/dev/null
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

<a id="mac-e-uv-03"></a>

### E-UV-03 · Não consigo ler o ficheiro de definições do uv

- **Porquê:** O uv para porque o ficheiro de definições dele (acima, com a linha) tem um erro de sintaxe. A sintaxe do pip.conf ([global], index-url = ...) não é a do uv.toml: no uv.toml os valores levam aspas.
- **O que fazer:**
  - Corrige o ficheiro, ou muda-lhe o nome (comando abaixo), e corre o setup outra vez.
  - A app Agent Memory é opcional: as skills funcionam sem ela.

Comando (macOS):

```
mv ~/.config/uv/uv.toml ~/.config/uv/uv.toml.bak
```

<a id="mac-e-uv-04"></a>

### E-UV-04 · O mirror da empresa nas definições do uv não responde

- **Porquê:** As tuas definições do uv (acima: o ficheiro e o servidor) mandam o download do Python e dos pacotes da app para um servidor da empresa (python-install-mirror ou um index), e esse servidor não responde. Normalmente só responde na VPN.
- **O que fazer:**
  - Liga a VPN e corre o setup outra vez.
  - Ou corre o setup uma vez sem as tuas definições do uv (comando abaixo). A app é opcional: as skills funcionam sem ela.

Comando (macOS):

```
curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/setup-mac.sh | UV_NO_CONFIG=1 bash
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
curl -sSI https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/workshop-kit-v1.0.0-rc.5.tar.gz
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

<a id="mac-e-tel-01"></a>

### E-TEL-01 · Não é possível chegar ao painel do workshop a partir desta rede

- **Porquê:** A tua participação no painel do workshop está ligada, mas o servidor do painel (indicado acima) não respondeu a partir desta rede: é provável que um proxy ou um filtro de conteúdos da empresa o esteja a bloquear. É só um aviso. A tua caderneta de missões (/missions e a statusline) funciona sem o painel; só o painel ao vivo na sala é que não vê o teu progresso.
- **O que fazer:**
  - No dia do workshop, liga-te à rede do evento ou ao hotspot do telemóvel e volta a correr a verificação (--check).
  - Se preferires não enviar nada para o painel, desliga a participação com o primeiro comando (podes voltar a ligá-la mais tarde com «on A» ou «on B»). O segundo comando mostra como está agora.

Comandos (macOS):

```
node ~/.workshop-claude/kit/telemetry/ctl.mjs off
node ~/.workshop-claude/kit/telemetry/ctl.mjs status
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
mv ~/workshop-claude/demo-project ~/workshop-claude/demo-project-antigo
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

<a id="mac-e-mem-08"></a>

### E-MEM-08 · O uv aponta para um espelho de pacotes que não funciona

- **Porquê:** Uma variável (entre parênteses: UV_DEFAULT_INDEX, UV_INDEX_URL, UV_INDEX ou UV_EXTRA_INDEX_URL) manda o uv para um espelho de pacotes da empresa em vez do pypi.org, e esse espelho não respondeu ou não tem os pacotes da app. Muitas vezes só funciona na VPN da empresa. As skills funcionam sem a app.
- **O que fazer:**
  - Liga-te à VPN da empresa e volta a correr o setup.
  - Ou, se não precisas do espelho, tira a variável neste terminal (comando abaixo), apaga-a do perfil do shell e volta a correr o setup.

Comando (macOS):

```
unset UV_DEFAULT_INDEX UV_INDEX_URL UV_INDEX UV_EXTRA_INDEX_URL
```

<a id="mac-e-mem-09"></a>

### E-MEM-09 · O PYTHONHOME ou o PYTHONPATH está definido no teu terminal

- **Porquê:** O teu terminal exporta o PYTHONHOME ou o PYTHONPATH (entre parênteses), muitas vezes um resto de uma instalação antiga do Anaconda ou do conda. Fazem o Python da app Agent Memory carregar os ficheiros errados e falhar ("No module named encodings", ImportError). O setup e o MCP de memória do Claude Code correm a app sem eles, mas o agent-memory escrito no teu terminal falha.
- **O que fazer:**
  - Encontra o export com o comando abaixo e apaga-o (ou o bloco antigo do conda), depois abre um terminal novo.

Comando (macOS):

```
grep -nE 'PYTHONHOME|PYTHONPATH|conda' ~/.zshrc ~/.zprofile ~/.zshenv ~/.bash_profile ~/.profile 2>/dev/null
```

<a id="mac-e-mem-10"></a>

### E-MEM-10 · O caminho da tua pasta pessoal é demasiado comprido para a app Agent Memory

- **Porquê:** A app guarda o índice de pesquisa em <pasta das memórias>/.index/index-v3.sqlite, e o SQLite do Python dela só abre bases de dados com caminhos de até 504 bytes (entre parênteses, o tamanho aqui). Com um caminho da pasta pessoal muito comprido o índice nunca abre: voltar a correr o setup ou o agent-memory reindex não resolve. As tuas notas estão a salvo, e as skills funcionam sem a app.
- **O que fazer:**
  - Põe as memórias numa pasta mais curta: junta a linha abaixo ao ~/.zshrc, abre um terminal novo e volta a correr o setup. As notas que já tens ficam na pasta antiga: copia-as se as quiseres.

Comando (macOS):

```
echo 'export AGENT_MEMORY_HOME="/Users/Shared/agent-memory-$USER"' >> ~/.zshrc
```

<a id="mac-e-mem-11"></a>

### E-MEM-11 · Outra pasta tem memórias que a app Agent Memory não mostra

- **Porquê:** A app lê uma só pasta dos dados: AGENT_MEMORY_HOME, senão MEMORIA_HOME, senão ~/.memoria (de versões antigas) enquanto ~/.agent-memory não tiver notas, senão ~/.agent-memory. Outra pasta (entre parênteses, com quantas notas tem) também tem notas, normalmente de uma versão antiga ou de uma variável definida noutro terminal. Nada foi movido nem apagado, e a app, o MCP dela e as skills funcionam.
- **O que fazer:**
  - Podes continuar. O primeiro comando mostra a pasta em uso (a linha "Memory folder") e a outra pasta.
  - Para veres essas notas, move as pastas dos projetos para a pasta em uso. Ou aponta o AGENT_MEMORY_HOME para a pasta que queres no perfil da shell (Windows: nas variáveis do utilizador), abre um terminal novo e volta a correr o setup.

Comando (macOS):

```
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

- **Porquê:** Os terminais novos leem este ficheiro quando arrancam, mas o setup não o conseguiu ler nem alterar. É só de leitura, pertence a outro utilizador (por exemplo, foi criado com sudo) ou aponta para um ficheiro que não existe ou é só de leitura (dotfiles, iCloud). O setup deixou-o como estava.
- **O que fazer:**
  - Acrescenta a primeira linha abaixo ao fim do ficheiro indicado pelo setup (ou do ficheiro dos teus dotfiles para onde ele aponta) e abre um terminal novo.
  - Se o ficheiro não é só de leitura de propósito, vê-o com o segundo comando, dá-te permissão para o ler e alterar (ou pede a quem gere o teu Mac) e volta a correr o setup.

Comandos (macOS):

```
export PATH="$HOME/.local/bin:$HOME/.workshop-claude/bin:$HOME/.workshop-claude/node/bin:$PATH"
ls -lO ~/.zshrc
```

<a id="mac-e-prof-02"></a>

### E-PROF-02 · Um perfil do shell tem um bloco do workshop incompleto

- **Porquê:** O ficheiro tem uma linha '# >>> workshop-claude >>>' sem a linha '# <<< workshop-claude <<<', ou o contrário (um bloco antigo ou editado à mão). O setup não lhe mexeu, por isso não perdeste nenhuma linha.
- **O que fazer:**
  - Abre o ficheiro indicado pelo setup e apaga as linhas antigas do workshop: a linha do marcador e as linhas do PATH a seguir. Mantém as tuas linhas.
  - Depois volta a correr o setup.

Comando (macOS):

```
grep -n workshop-claude ~/.zshrc
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

<a id="mac-e-smoke-05"></a>

### E-SMOKE-05 · Um hook teu bloqueou o pedido de teste

- **Porquê:** Um hook nas definições do Claude Code (~/.claude/settings.json, ou um gerido pela empresa) bloqueou o pedido antes de chegar ao Claude. Acima: o evento (normalmente UserPromptSubmit) e o motivo do hook. Todos os prompts do workshop seriam bloqueados da mesma maneira.
- **O que fazer:**
  - Faz o que a mensagem do hook pede, ou pede a quem criou esse hook que deixe passar os prompts do workshop.
  - Ou tira esse hook do ~/.claude/settings.json durante o workshop (o comando abaixo mostra-o) e corre o setup outra vez.

Comando (macOS):

```
grep -n -A12 '"hooks"' ~/.claude/settings.json
```

<a id="mac-e-smoke-06"></a>

### E-SMOKE-06 · Um hook teu faz o Claude ficar à espera

- **Porquê:** Com os teus hooks (acima: os eventos e o ficheiro), o Claude não respondeu a tempo. Sem eles respondeu, por isso o login e a rede estão bem. Um hook como o SessionStart está à espera de alguma coisa, muitas vezes um servidor que só responde na VPN, e todas as sessões do Claude no workshop iam esperar por ele também.
- **O que fazer:**
  - Liga a VPN se o hook precisar dela, ou dá a esse hook um "timeout" curto (em segundos).
  - Ou tira esse hook do ~/.claude/settings.json durante o workshop (o primeiro comando mostra-o) e corre o setup outra vez.
  - O segundo comando testa o Claude sem os teus hooks.

Comandos (macOS):

```
grep -n -A12 '"hooks"' ~/.claude/settings.json
claude -p "Reply in English with only the word OK" --model claude-haiku-5-5 --settings '{"disableAllHooks":true}'
```

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
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/bootstrap-windows.ps1 | iex
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
[Net.WebRequest]::DefaultWebProxy.Credentials = [Net.CredentialCache]::DefaultNetworkCredentials; irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/bootstrap-windows.ps1 | iex
```

<a id="windows-e-net-04"></a>

### E-NET-04 · A empresa interceta o tráfego HTTPS (certificado próprio)

- **Porquê:** Um site de que o setup precisa (api.anthropic.com, github.com ou pypi.org) mostra um certificado que não vem de uma autoridade pública: a rede da empresa abre o tráfego e volta a cifrá-lo. O setup exporta os certificados da empresa do sistema para ~/.workshop-claude/ca-company.pem, junta o teu ~/.workshop-claude/ca.pem se o tiveres, e configura o Claude Code para os usar e o uv para usar os certificados do sistema.
- **O que fazer:**
  - Normalmente não precisas de fazer nada: o setup já definiu NODE_EXTRA_CA_CERTS e UV_SYSTEM_CERTS.
  - Se o teste final ou a app Agent Memory continuarem a falhar com um erro de certificado, pede ao IT o certificado raiz da empresa em formato PEM e guarda-o como ~/.workshop-claude/ca.pem (o setup nunca escreve por cima desse ficheiro). Depois corre o setup outra vez.

Comando (Windows):

```
Get-ChildItem Cert:\LocalMachine\Root, Cert:\CurrentUser\Root | Select-Object Subject, Issuer
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
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/bootstrap-windows.ps1 | iex
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
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/bootstrap-windows.ps1 | iex
Select-String -Path "$env:USERPROFILE\.claude\settings.json" -Pattern proxy
```

<a id="windows-e-net-09"></a>

### E-NET-09 · Uma variável de certificados aponta para um ficheiro que não existe ou está errado

- **Porquê:** O SSL_CERT_FILE, CURL_CA_BUNDLE, GIT_SSL_CAINFO, NODE_EXTRA_CA_CERTS, REQUESTS_CA_BUNDLE ou SSL_CERT_DIR (entre parênteses), ou uma linha cacert no ~/.curlrc, aponta para um ficheiro de certificados que não existe ou não tem os certificados certos. Costuma ser um resto de uma instalação antiga do Homebrew, do Anaconda ou do Zscaler. O curl falha então em todos os sites com "curl: (77) error setting certificate verify locations", e o uv falha com "invalid peer certificate". O setup ignora a variável nos comandos dele, mas o teu terminal continua a tê-la.
- **O que fazer:**
  - Se o próprio comando de instalação parar com curl: (77), corre o primeiro comando abaixo no mesmo terminal e volta a colar o comando de instalação.
  - Encontra o export no perfil do shell com o segundo comando, apaga essa linha (ou aponta-a para o ficheiro certo) e abre um terminal novo.

Comandos (Windows):

```
Get-ChildItem Env: | Where-Object Name -match 'SSL_CERT|CA_BUNDLE|CAINFO|EXTRA_CA_CERTS'
[Environment]::SetEnvironmentVariable('SSL_CERT_FILE', $null, 'User')
```

<a id="windows-e-net-10"></a>

### E-NET-10 · O uv não confia no certificado da empresa

- **Porquê:** O download do Python da app (github.com) ou dos pacotes (pypi.org) falhou com um erro de certificado, mesmo com os certificados do sistema (UV_SYSTEM_CERTS) e com o ~/.workshop-claude/ca.pem, se o tiveres. O certificado raiz da empresa não está entre eles.
- **O que fazer:**
  - Pede ao IT o certificado raiz da empresa em formato PEM e guarda-o como ~/.workshop-claude/ca.pem. O setup nunca escreve por cima desse ficheiro.
  - Depois corre o setup outra vez: ele passa esse certificado ao uv. Os comandos abaixo fazem o mesmo à mão. A app é opcional: as skills funcionam sem ela.

Comandos (Windows):

```
$env:SSL_CERT_FILE = "$env:USERPROFILE\.workshop-claude\ca-bundle-uv.pem"
uv python install 3.12
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
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/bootstrap-windows.ps1 | iex
```

<a id="windows-e-so-09"></a>

### E-SO-09 · A variável da pasta temporária aponta para uma pasta que não serve

- **Porquê:** O TMPDIR (no Windows, o TEMP ou o TMP), entre parênteses, aponta para uma pasta que não existe ou sem escrita, muitas vezes um export copiado de outro computador. O setup usou outra pasta temporária, mas outros programas no teu terminal (Claude Code, uv, npm) podem falhar.
- **O que fazer:**
  - Encontra o export com o primeiro comando e apaga-o (o macOS define o TMPDIR sozinho), depois abre um terminal novo.

Comando (Windows):

```
[Environment]::GetEnvironmentVariable('TEMP', 'User'); [Environment]::GetEnvironmentVariable('TMP', 'User')
```

<a id="windows-e-so-10"></a>

### E-SO-10 · A pasta temporária do setup foi apagada enquanto ele corria

- **Porquê:** Alguma coisa apagou a pasta temporária do setup (entre parênteses) a meio de um passo, normalmente uma app de limpeza ou um script que esvazia as pastas temporárias. O passo perdeu os ficheiros que tinha descarregado.
- **O que fazer:**
  - Põe a app de limpeza em pausa durante uns minutos e volta a correr o setup: os passos já feitos são saltados.

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

### E-CFG-04 · O Claude Code usa a cloud da tua empresa (Bedrock, Vertex ou Foundry)

- **Porquê:** A CLAUDE_CODE_USE_BEDROCK, a CLAUDE_CODE_USE_VERTEX ou a CLAUDE_CODE_USE_FOUNDRY está definida, no terminal ou no bloco "env" de um ficheiro de definições do Claude Code (aparece acima). O Claude Code passa a usar essa cloud e não o login do Console. Está tudo bem se foi a tua empresa que o configurou assim: o teste final (passo 12) confirma que o Claude responde. Os modelos do workshop (Haiku, Sonnet e Opus) têm de estar ativos nessa cloud.
- **O que fazer:**
  - Se a tua empresa usa esta cloud: não há nada a fazer. Se o teste final falhar, faz o login na cloud neste terminal (no Bedrock: aws sso login, ou AWS_PROFILE e AWS_REGION) e volta a correr o setup.
  - Se não querias usá-la: apaga a variável (o primeiro comando mostra onde está) e abre um terminal novo. No ~/.claude/settings.json, apaga-a do bloco "env".
  - Se os modelos do workshop não estiverem ativos na cloud da empresa, fala com o organizador antes do workshop.

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

<a id="windows-e-cfg-08"></a>

### E-CFG-08 · O CLAUDE_CONFIG_DIR não é um caminho absoluto

- **Porquê:** O CLAUDE_CONFIG_DIR (entre parênteses) é um caminho relativo, ou começa por um ~ dentro de aspas. Nem o Claude Code nem o setup o expandem, por isso cada pasta onde corresses o claude ficava com a sua cópia das definições, das skills e dos logins (por exemplo, uma pasta chamada ~ dentro da Arena). O setup parou antes de mudar o que quer que fosse.
- **O que fazer:**
  - Encontra a linha com o primeiro comando. Escreve o caminho com $HOME, por exemplo export CLAUDE_CONFIG_DIR="$HOME/.claude-work" (sem aspas à volta de um ~), ou apaga a linha se não precisas de uma pasta do Claude Code à parte.
  - Abre um terminal novo, confirma o valor com o segundo comando e volta a correr o setup.

Comandos (Windows):

```
[Environment]::GetEnvironmentVariable('CLAUDE_CONFIG_DIR', 'User')
Remove-Item Env:CLAUDE_CONFIG_DIR
```

<a id="windows-e-cfg-09"></a>

### E-CFG-09 · Os terminais novos não usam a mesma pasta do Claude Code

- **Porquê:** Este terminal tem o CLAUDE_CONFIG_DIR, por isso o setup pôs as skills, os hooks e os servidores MCP nessa pasta (entre parênteses). Um terminal novo tem outro valor, ou nenhum, e o claude que abrires lá não os vê. Acontece quando a variável foi exportada só neste terminal, por um IDE ou pelo direnv.
- **O que fazer:**
  - Para ficar com essa pasta: guarda a variável para os terminais novos com o primeiro comando, abre um terminal novo e volta a correr o setup.
  - Para usar a pasta normal (~/.claude): abre um terminal novo sem o CLAUDE_CONFIG_DIR e volta a correr o setup.

Comando (Windows):

```
[Environment]::SetEnvironmentVariable('CLAUDE_CONFIG_DIR', $env:CLAUDE_CONFIG_DIR, 'User')
```

<a id="windows-e-cfg-10"></a>

### E-CFG-10 · Há uma variável que troca os modelos do Claude Code

- **Porquê:** Uma variável (entre parênteses, da shell ou do "env" de um ficheiro de definições) troca os modelos que o Claude Code usa. É o modelo da sessão, ou os nomes sonnet, haiku e opus das skills e dos agentes do workshop. Um id de modelo retirado, ou que só existe no Bedrock ou no Vertex, falha com o login do Console, e outro modelo muda os custos. O teste final escolhe o seu próprio modelo, por isso não o mostra.
- **O que fazer:**
  - Se não precisas da troca, tira-a: corre o segundo comando neste terminal, apaga a linha do ~/.zshrc e, se estiver no ~/.claude/settings.json, tira-a do "env". Depois abre um terminal novo.
  - Se foi a empresa que a pôs (definições geridas), fala com o organizador antes do workshop.

Comando (Windows):

```
Get-ChildItem Env: | Where-Object Name -match 'ANTHROPIC_.*MODEL|CLAUDE_CODE_SUBAGENT_MODEL'
```

<a id="windows-e-cfg-11"></a>

### E-CFG-11 · Os hooks do Claude Code estão desligados

- **Porquê:** O ~/.claude/settings.json tem "disableAllHooks": true. Assim o Claude Code não corre hooks nem a statusline, e os hooks de custo e a statusline do workshop não funcionam.
- **O que fazer:**
  - Tira a linha "disableAllHooks": true do ~/.claude/settings.json, ou põe-na a false.
  - Depois abre uma sessão nova do Claude. Não precisas de correr o setup outra vez.

Comando (Windows):

```
Select-String -Path "$env:USERPROFILE\.claude\settings.json" -Pattern disableAllHooks
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

<a id="windows-e-node-03"></a>

### E-NODE-03 · O NODE_OPTIONS parte o Node no teu terminal

- **Porquê:** O NODE_OPTIONS (entre parênteses) faz falhar todos os scripts do Node. Normalmente é um --require de um ficheiro que já não existe (o "Debug: Auto Attach" do VS Code ou do Cursor, um agente de monitorização) ou uma opção que esta versão do Node recusa. O setup correu o Node sem ele, mas os hooks, a statusline e as skills do workshop correm o Node a partir do teu terminal: a indicação do custo e os avisos de orçamento não funcionariam.
- **O que fazer:**
  - Neste terminal, corre o primeiro comando. No VS Code ou no Cursor, corre "Debug: Toggle Auto Attach" e escolhe Disabled ou Smart, depois abre um terminal novo.
  - Se o export estiver no perfil do shell, encontra-o com o segundo comando e apaga-o, depois abre um terminal novo.

Comandos (Windows):

```
Remove-Item Env:NODE_OPTIONS
[Environment]::GetEnvironmentVariable('NODE_OPTIONS', 'User')
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

<a id="windows-e-uv-03"></a>

### E-UV-03 · Não consigo ler o ficheiro de definições do uv

- **Porquê:** O uv para porque o ficheiro de definições dele (acima, com a linha) tem um erro de sintaxe. A sintaxe do pip.conf ([global], index-url = ...) não é a do uv.toml: no uv.toml os valores levam aspas.
- **O que fazer:**
  - Corrige o ficheiro, ou muda-lhe o nome (comando abaixo), e corre o setup outra vez.
  - A app Agent Memory é opcional: as skills funcionam sem ela.

Comando (Windows):

```
Rename-Item "$env:APPDATA\uv\uv.toml" uv.toml.bak
```

<a id="windows-e-uv-04"></a>

### E-UV-04 · O mirror da empresa nas definições do uv não responde

- **Porquê:** As tuas definições do uv (acima: o ficheiro e o servidor) mandam o download do Python e dos pacotes da app para um servidor da empresa (python-install-mirror ou um index), e esse servidor não responde. Normalmente só responde na VPN.
- **O que fazer:**
  - Liga a VPN e corre o setup outra vez.
  - Ou corre o setup uma vez sem as tuas definições do uv (comando abaixo). A app é opcional: as skills funcionam sem ela.

Comandos (Windows):

```
$env:UV_NO_CONFIG = '1'
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/bootstrap-windows.ps1 | iex
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
Invoke-WebRequest -UseBasicParsing -Method Head https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.5/workshop-kit-v1.0.0-rc.5.zip
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

<a id="windows-e-tel-01"></a>

### E-TEL-01 · Não é possível chegar ao painel do workshop a partir desta rede

- **Porquê:** A tua participação no painel do workshop está ligada, mas o servidor do painel (indicado acima) não respondeu a partir desta rede: é provável que um proxy ou um filtro de conteúdos da empresa o esteja a bloquear. É só um aviso. A tua caderneta de missões (/missions e a statusline) funciona sem o painel; só o painel ao vivo na sala é que não vê o teu progresso.
- **O que fazer:**
  - No dia do workshop, liga-te à rede do evento ou ao hotspot do telemóvel e volta a correr a verificação (--check).
  - Se preferires não enviar nada para o painel, desliga a participação com o primeiro comando (podes voltar a ligá-la mais tarde com «on A» ou «on B»). O segundo comando mostra como está agora.

Comandos (Windows):

```
node "$env:USERPROFILE\.workshop-claude\kit\telemetry\ctl.mjs" off
node "$env:USERPROFILE\.workshop-claude\kit\telemetry\ctl.mjs" status
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
Rename-Item ~/workshop-claude\demo-project demo-project-antigo
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

<a id="windows-e-mem-08"></a>

### E-MEM-08 · O uv aponta para um espelho de pacotes que não funciona

- **Porquê:** Uma variável (entre parênteses: UV_DEFAULT_INDEX, UV_INDEX_URL, UV_INDEX ou UV_EXTRA_INDEX_URL) manda o uv para um espelho de pacotes da empresa em vez do pypi.org, e esse espelho não respondeu ou não tem os pacotes da app. Muitas vezes só funciona na VPN da empresa. As skills funcionam sem a app.
- **O que fazer:**
  - Liga-te à VPN da empresa e volta a correr o setup.
  - Ou, se não precisas do espelho, tira a variável neste terminal (comando abaixo), apaga-a do perfil do shell e volta a correr o setup.

Comando (Windows):

```
Remove-Item Env:UV_DEFAULT_INDEX, Env:UV_INDEX_URL, Env:UV_INDEX, Env:UV_EXTRA_INDEX_URL -ErrorAction SilentlyContinue
```

<a id="windows-e-mem-09"></a>

### E-MEM-09 · O PYTHONHOME ou o PYTHONPATH está definido no teu terminal

- **Porquê:** O teu terminal exporta o PYTHONHOME ou o PYTHONPATH (entre parênteses), muitas vezes um resto de uma instalação antiga do Anaconda ou do conda. Fazem o Python da app Agent Memory carregar os ficheiros errados e falhar ("No module named encodings", ImportError). O setup e o MCP de memória do Claude Code correm a app sem eles, mas o agent-memory escrito no teu terminal falha.
- **O que fazer:**
  - Encontra o export com o comando abaixo e apaga-o (ou o bloco antigo do conda), depois abre um terminal novo.

Comando (Windows):

```
[Environment]::GetEnvironmentVariable('PYTHONHOME', 'User'); [Environment]::GetEnvironmentVariable('PYTHONPATH', 'User')
```

<a id="windows-e-mem-11"></a>

### E-MEM-11 · Outra pasta tem memórias que a app Agent Memory não mostra

- **Porquê:** A app lê uma só pasta dos dados: AGENT_MEMORY_HOME, senão MEMORIA_HOME, senão ~/.memoria (de versões antigas) enquanto ~/.agent-memory não tiver notas, senão ~/.agent-memory. Outra pasta (entre parênteses, com quantas notas tem) também tem notas, normalmente de uma versão antiga ou de uma variável definida noutro terminal. Nada foi movido nem apagado, e a app, o MCP dela e as skills funcionam.
- **O que fazer:**
  - Podes continuar. O primeiro comando mostra a pasta em uso (a linha "Memory folder") e a outra pasta.
  - Para veres essas notas, move as pastas dos projetos para a pasta em uso. Ou aponta o AGENT_MEMORY_HOME para a pasta que queres no perfil da shell (Windows: nas variáveis do utilizador), abre um terminal novo e volta a correr o setup.

Comando (Windows):

```
agent-memory selftest
```

<a id="windows-e-mem-12"></a>

### E-MEM-12 · O atalho da Agent Memory não usa a pasta das memórias desta janela

- **Porquê:** Esta janela tem AGENT_MEMORY_HOME (ou MEMORIA_HOME), mas as tuas variáveis de utilizador têm outro valor ou nenhum (entre parênteses, a pasta em uso e a que uma janela nova recebe). O atalho do menu Iniciar, um terminal novo e o Claude Code aberto a partir dele usam a outra pasta, por isso não mostram as mesmas notas. Acontece quando a variável foi definida só nesta janela ou por um IDE.
- **O que fazer:**
  - Para manteres esta pasta: guarda a variável para as janelas novas com o primeiro comando, abre uma janela nova do PowerShell e volta a correr o setup.
  - Para usares a pasta normal: abre uma janela nova do PowerShell onde a variável não esteja definida e volta a correr o setup.

Comando (Windows):

```
[Environment]::SetEnvironmentVariable('AGENT_MEMORY_HOME', $env:AGENT_MEMORY_HOME, 'User')
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

<a id="windows-e-smoke-05"></a>

### E-SMOKE-05 · Um hook teu bloqueou o pedido de teste

- **Porquê:** Um hook nas definições do Claude Code (~/.claude/settings.json, ou um gerido pela empresa) bloqueou o pedido antes de chegar ao Claude. Acima: o evento (normalmente UserPromptSubmit) e o motivo do hook. Todos os prompts do workshop seriam bloqueados da mesma maneira.
- **O que fazer:**
  - Faz o que a mensagem do hook pede, ou pede a quem criou esse hook que deixe passar os prompts do workshop.
  - Ou tira esse hook do ~/.claude/settings.json durante o workshop (o comando abaixo mostra-o) e corre o setup outra vez.

Comando (Windows):

```
Select-String -Path "$env:USERPROFILE\.claude\settings.json" -Pattern '"hooks"' -Context 0,12
```

<a id="windows-e-smoke-06"></a>

### E-SMOKE-06 · Um hook teu faz o Claude ficar à espera

- **Porquê:** Com os teus hooks (acima: os eventos e o ficheiro), o Claude não respondeu a tempo. Sem eles respondeu, por isso o login e a rede estão bem. Um hook como o SessionStart está à espera de alguma coisa, muitas vezes um servidor que só responde na VPN, e todas as sessões do Claude no workshop iam esperar por ele também.
- **O que fazer:**
  - Liga a VPN se o hook precisar dela, ou dá a esse hook um "timeout" curto (em segundos).
  - Ou tira esse hook do ~/.claude/settings.json durante o workshop (o primeiro comando mostra-o) e corre o setup outra vez.
  - O segundo comando testa o Claude sem os teus hooks.

Comandos (Windows):

```
Select-String -Path "$env:USERPROFILE\.claude\settings.json" -Pattern '"hooks"' -Context 0,12
claude -p "Reply in English with only the word OK" --model claude-haiku-5-5 --settings '{\"disableAllHooks\":true}'
```

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
- Se a empresa intercetar o HTTPS, o setup exporta as raízes da empresa para `~/.workshop-claude/ca-company.pem` (com o teu `~/.workshop-claude/ca.pem`, se o tiveres; o setup nunca o escreve) e define `NODE_EXTRA_CA_CERTS` e `UV_SYSTEM_CERTS=true`.
- Proxies só com NTLM ou Kerberos não são suportados (ver `E-NET-06`).

