<!-- GERADO por tools/render.mjs a partir de setup/messages.pt.json. Não editar à mão. -->

# Resolução de problemas do setup

Cada erro do setup tem um **código** (por exemplo, `E-NET-01`). O setup mostra o código, a causa e o que fazer. Aqui está o catálogo completo, por sistema operativo.

## Antes de tudo

- Volta a correr o setup: os passos já feitos são saltados.
- Só verificar, sem instalar: `bash ~/.workshop-claude/setup-mac.sh --check` (Mac) ou `powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.workshop-claude\setup-windows.ps1" -Check` (Windows).
- Diagnóstico com ajuda do Claude: `bash ~/.workshop-claude/setup-mac.sh --doctor` (Mac) ou `powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.workshop-claude\setup-windows.ps1" -Doctor` (Windows).
- O log completo, sem segredos, está em `~/.workshop-claude/setup.log`. O resumo está em `~/.workshop-claude/resumo.txt`.
- Nunca envies a tua API key a ninguém. O setup nunca a pede nem a mostra.

## Índice

| Código | Problema | Onde |
|---|---|---|
| `E-SETUP-01` | Este passo ainda não foi feito | [macOS](#mac-e-setup-01) · [Windows](#windows-e-setup-01) |
| `E-NET-01` | Um domínio necessário está bloqueado | [macOS](#mac-e-net-01) · [Windows](#windows-e-net-01) |
| `E-NET-02` | O nome do servidor não resolve (DNS) | [macOS](#mac-e-net-02) · [Windows](#windows-e-net-02) |
| `E-NET-03` | O proxy pede autenticação ou está mal configurado | [macOS](#mac-e-net-03) · [Windows](#windows-e-net-03) |
| `E-NET-04` | A empresa interceta o tráfego HTTPS (certificado próprio) | [macOS](#mac-e-net-04) · [Windows](#windows-e-net-04) |
| `E-NET-05` | Sem ligação à API da Anthropic | [macOS](#mac-e-net-05) · [Windows](#windows-e-net-05) |
| `E-NET-06` | Proxy só com autenticação NTLM ou Kerberos | [macOS](#mac-e-net-06) · [Windows](#windows-e-net-06) |
| `E-NET-07` | O download falhou | [macOS](#mac-e-net-07) · [Windows](#windows-e-net-07) |
| `E-SO-01` | Windows anterior a 10.0.18362 (versão 1903) | [Windows](#windows-e-so-01) |
| `E-SO-02` | Windows em ARM64 | [Windows](#windows-e-so-02) |
| `E-SO-03` | A pasta pessoal está no OneDrive | [macOS](#mac-e-so-03) · [Windows](#windows-e-so-03) |
| `E-SO-04` | macOS antigo | [macOS](#mac-e-so-04) |
| `E-SO-05` | PowerShell em modo restrito | [Windows](#windows-e-so-05) |
| `E-SO-06` | Pouco espaço em disco | [macOS](#mac-e-so-06) · [Windows](#windows-e-so-06) |
| `E-CFG-01` | Há definições geridas pela empresa (managed-settings) | [macOS](#mac-e-cfg-01) · [Windows](#windows-e-cfg-01) |
| `E-CFG-02` | A variável ANTHROPIC_API_KEY está definida | [macOS](#mac-e-cfg-02) · [Windows](#windows-e-cfg-02) |
| `E-CFG-03` | A variável ANTHROPIC_BASE_URL está definida | [macOS](#mac-e-cfg-03) · [Windows](#windows-e-cfg-03) |
| `E-CFG-04` | O Claude Code está configurado para Bedrock ou Vertex | [macOS](#mac-e-cfg-04) · [Windows](#windows-e-cfg-04) |
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
| `E-AUTH-01` | O Claude Code não tem login | [macOS](#mac-e-auth-01) · [Windows](#windows-e-auth-01) |
| `E-AUTH-02` | O login é de uma assinatura claude.ai, não da Console | [macOS](#mac-e-auth-02) · [Windows](#windows-e-auth-02) |
| `E-AUTH-03` | O Claude Code usa outro método de autenticação | [macOS](#mac-e-auth-03) · [Windows](#windows-e-auth-03) |
| `E-NODE-01` | Não consegui instalar o Node.js | [macOS](#mac-e-node-01) · [Windows](#windows-e-node-01) |
| `E-NODE-02` | Há um Node antigo à frente no PATH | [macOS](#mac-e-node-02) · [Windows](#windows-e-node-02) |
| `E-UV-01` | Não consegui instalar o uv | [macOS](#mac-e-uv-01) · [Windows](#windows-e-uv-01) |
| `E-GH-01` | Não consegui instalar o GitHub CLI (gh) | [macOS](#mac-e-gh-01) · [Windows](#windows-e-gh-01) |
| `E-GH-02` | Falta o login no GitHub (obrigatório) | [macOS](#mac-e-gh-02) · [Windows](#windows-e-gh-02) |
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
| `E-MEM-01` | A release da app Memória ainda não foi publicada | [macOS](#mac-e-mem-01) · [Windows](#windows-e-mem-01) |
| `E-MEM-02` | O ficheiro da app Memória não confere (SHA-256) | [macOS](#mac-e-mem-02) · [Windows](#windows-e-mem-02) |
| `E-MEM-03` | A instalação da app Memória falhou | [macOS](#mac-e-mem-03) · [Windows](#windows-e-mem-03) |
| `E-MEM-04` | Falta o WebView2 (Windows) | [Windows](#windows-e-mem-04) |
| `E-MEM-05` | O teste da app Memória falhou | [macOS](#mac-e-mem-05) · [Windows](#windows-e-mem-05) |
| `E-DESK-01` | O Claude Desktop tem limitações com a Console | [macOS](#mac-e-desk-01) · [Windows](#windows-e-desk-01) |
| `E-DESK-02` | Não consegui instalar o Claude Desktop | [macOS](#mac-e-desk-02) · [Windows](#windows-e-desk-02) |
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
curl -fsSL https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.3/setup-mac.sh | bash
```

<a id="mac-e-net-01"></a>

### E-NET-01 · Um domínio necessário está bloqueado

- **Porquê:** A rede não deixa chegar a um ou mais domínios de que o workshop precisa. Costuma ser uma firewall ou um filtro da empresa.
- **O que fazer:**
  - Pede à equipa de IT para libertar os domínios da lista em docs/TROUBLESHOOTING.md (secção «Domínios necessários»).
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

### E-NET-03 · O proxy pede autenticação ou está mal configurado

- **Porquê:** A rede só sai por um proxy, e o pedido foi recusado (por exemplo, erro 407).
- **O que fazer:**
  - Define o proxy para esta sessão e volta a correr o setup.
  - Se o proxy pedir utilizador e palavra-passe, pede ao IT um proxy sem autenticação ou uma exceção para os domínios do workshop.

Comandos (macOS):

```
export HTTPS_PROXY=http://proxy.empresa:8080
export NO_PROXY=localhost,127.0.0.1
```

<a id="mac-e-net-04"></a>

### E-NET-04 · A empresa interceta o tráfego HTTPS (certificado próprio)

- **Porquê:** O certificado de api.anthropic.com não vem de uma autoridade pública. A rede da empresa abre e volta a cifrar o tráfego. O setup exporta os certificados da empresa para ~/.workshop-claude/ca.pem e configura o Claude Code para os usar.
- **O que fazer:**
  - Normalmente não precisas de fazer nada: o setup já configurou NODE_EXTRA_CA_CERTS e UV_SYSTEM_CERTS.
  - Se o teste final falhar com erro de certificado, pede ao IT o certificado raiz da empresa em formato PEM e guarda-o em ~/.workshop-claude/ca.pem. Depois volta a correr o setup.

Comando (macOS):

```
security find-certificate -a -p /Library/Keychains/System.keychain > ~/.workshop-claude/ca.pem
```

<a id="mac-e-net-05"></a>

### E-NET-05 · Sem ligação à API da Anthropic

- **Porquê:** O Claude Code não consegue falar com api.anthropic.com. Sem isto não há workshop, e o Claude também não pode ajudar a diagnosticar.
- **O que fazer:**
  - Confirma que abres https://api.anthropic.com no browser (uma página de erro em JSON é sinal de que chega lá).
  - Se usas proxy, define HTTPS_PROXY antes de correr o setup.
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

- **Porquê:** Um ficheiro não chegou a ser descarregado, ou chegou incompleto. Costuma ser uma falha de rede momentânea.
- **O que fazer:**
  - Volta a correr o setup. Os passos já feitos são saltados.
  - Se falhar sempre no mesmo ficheiro, verifica a rede e o proxy (códigos E-NET-01 e E-NET-03).

Comando (macOS):

```
curl -fsSL https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.3/setup-mac.sh | bash
```

<a id="mac-e-so-03"></a>

### E-SO-03 · A pasta pessoal está no OneDrive

- **Porquê:** A pasta pessoal (ou os Documentos) é sincronizada pelo OneDrive. A sincronização pode bloquear ficheiros a meio do trabalho dos agentes.
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

### E-CFG-02 · A variável ANTHROPIC_API_KEY está definida

- **Porquê:** Com esta variável, o Claude Code usa essa chave em vez do teu login. O custo vai para a conta dona da chave.
- **O que fazer:**
  - Se a chave for tua e da Console, podes continuar.
  - Se não for, remove a variável do teu perfil do terminal e abre um terminal novo.

Comando (macOS):

```
grep -n ANTHROPIC_API_KEY ~/.zshrc ~/.zprofile ~/.bash_profile 2>/dev/null
```

<a id="mac-e-cfg-03"></a>

### E-CFG-03 · A variável ANTHROPIC_BASE_URL está definida

- **Porquê:** Com esta variável, o Claude Code fala com outro servidor em vez da API da Anthropic (por exemplo, um gateway da empresa). Os preços e os modelos podem ser outros.
- **O que fazer:**
  - Se o IT te pediu para usar esse gateway, podes continuar.
  - Se não, remove a variável e abre um terminal novo.

Comando (macOS):

```
unset ANTHROPIC_BASE_URL
```

<a id="mac-e-cfg-04"></a>

### E-CFG-04 · O Claude Code está configurado para Bedrock ou Vertex

- **Porquê:** CLAUDE_CODE_USE_BEDROCK ou CLAUDE_CODE_USE_VERTEX está definida. O Claude Code usa a cloud da empresa, e o login na Console é ignorado.
- **O que fazer:**
  - Para o workshop, remove a variável e abre um terminal novo.
  - Se a empresa exigir Bedrock ou Vertex, confirma com o organizador que os modelos do workshop estão disponíveis.

Comando (macOS):

```
unset CLAUDE_CODE_USE_BEDROCK CLAUDE_CODE_USE_VERTEX
```

<a id="mac-e-cfg-05"></a>

### E-CFG-05 · O ficheiro settings.json do Claude Code tem um erro

- **Porquê:** O ~/.claude/settings.json não é JSON válido. O setup não lhe toca, para não perder as tuas definições.
- **O que fazer:**
  - Abre o ficheiro e corrige o erro (falta uma vírgula ou uma chaveta, por exemplo).
  - Depois volta a correr o setup.

Comando (macOS):

```
node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.claude/settings.json', 'utf8'))"
```

<a id="mac-e-cfg-06"></a>

### E-CFG-06 · Já tinhas uma statusline

- **Porquê:** O teu Claude Code já mostra uma statusline tua. O setup manteve-a e não instalou a do workshop, que mostra o custo.
- **O que fazer:**
  - Podes continuar: o custo também aparece no /demo-cost.
  - Para usar a statusline do workshop, volta a correr o setup com a opção abaixo. A tua fica no backup e volta com --desinstalar.

Comando (macOS):

```
bash ~/.workshop-claude/setup-mac.sh --substituir-statusline
```

<a id="mac-e-cfg-07"></a>

### E-CFG-07 · O uv está proibido de usar o Python gerido

- **Porquê:** Há uma variável de ambiente (UV_PYTHON_DOWNLOADS, UV_NO_MANAGED_PYTHON ou UV_PYTHON_PREFERENCE) que impede o uv de descarregar o seu próprio Python. A app Memória precisa desse Python. O setup ignora a variável só no comando dele, mas outros comandos uv continuam afetados.
- **O que fazer:**
  - Se a variável foi posta pela empresa, fala com o IT antes de a mudar.
  - Não precisas de ter Python instalado: o uv traz o dele.

Comando (macOS):

```
env | grep -E "^UV_(PYTHON_DOWNLOADS|NO_MANAGED_PYTHON|PYTHON_PREFERENCE)"
```

<a id="mac-e-perm-01"></a>

### E-PERM-01 · Sem permissão para escrever na pasta pessoal

- **Porquê:** O setup instala tudo na tua pasta pessoal, e uma pasta está protegida ou pertence a outro utilizador (por exemplo, criada com sudo ou por um administrador).
- **O que fazer:**
  - Vê no log qual é a pasta e corrige o dono.
  - Não corras o setup com sudo nem como administrador.

Comandos (macOS):

```
ls -ld ~/.local ~/.local/bin ~/.claude ~/.workshop-claude
sudo chown -R "$USER" ~/.local ~/.claude ~/.workshop-claude
```

<a id="mac-e-perm-02"></a>

### E-PERM-02 · Um programa foi bloqueado pela segurança do computador

- **Porquê:** Um antivírus, EDR, AppLocker ou o Gatekeeper impediu um programa instalado na pasta pessoal de correr.
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

- **Porquê:** Estás ligado com uma assinatura claude.ai (Pro ou Max). Funciona, mas o workshop foi preparado para a Console e mede o custo a preço de API.
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

### E-NODE-02 · Há um Node antigo à frente no PATH

- **Porquê:** O terminal encontra primeiro um Node com versão inferior a 22. Os hooks usam o Node novo, mas os testes do projeto podem usar o antigo.
- **O que fazer:**
  - Fecha e volta a abrir o terminal. Se usas nvm, escolhe o Node novo com o comando abaixo.
  - Confirma com node -v.

Comandos (macOS):

```
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
  - Confirma o acesso ao servidor do repositório (gitea.guilhermepinto.pt).
  - Volta a correr o setup. Se continuar, envia o log ao organizador.

Comando (macOS):

```
curl -sSI https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.3/workshop-kit-v1.0.0-dev.3.tar.gz
```

<a id="mac-e-kit-02"></a>

### E-KIT-02 · O arquivo do kit não confere (SHA-256)

- **Porquê:** O ficheiro descarregado é diferente do publicado. Pode estar incompleto, ou um proxy alterou-o.
- **O que fazer:**
  - Volta a correr o setup para descarregar outra vez.
  - Se repetir, não continues e avisa o organizador.

<a id="mac-e-kit-03"></a>

### E-KIT-03 · A instalação das skills e dos hooks falhou

- **Porquê:** O instalador em Node não conseguiu copiar os ficheiros ou atualizar o settings.json. O teu settings.json tem backup em ~/.workshop-claude/backup.
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
  - Lê a mensagem no log (procura «assemble»).
  - Se a pasta já existir com outro conteúdo, muda-lhe o nome e volta a correr o setup.

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

<a id="mac-e-mem-01"></a>

### E-MEM-01 · A release da app Memória ainda não foi publicada

- **Porquê:** Não encontrei os ficheiros da app Memória v0.4.0 no servidor. A app é opcional: as skills funcionam sem ela.
- **O que fazer:**
  - Podes continuar. Mais perto do workshop, volta a correr o setup para a instalar.

<a id="mac-e-mem-02"></a>

### E-MEM-02 · O ficheiro da app Memória não confere (SHA-256)

- **Porquê:** O wheel descarregado é diferente do publicado em SHA256SUMS. Não o instalei.
- **O que fazer:**
  - Volta a correr o setup. Se repetir, avisa o organizador.

<a id="mac-e-mem-03"></a>

### E-MEM-03 · A instalação da app Memória falhou

- **Porquê:** O uv não conseguiu instalar a app (Python 3.12 ou as dependências). Costuma ser rede (pypi.org, files.pythonhosted.org ou github.com).
- **O que fazer:**
  - Confirma o acesso a pypi.org e files.pythonhosted.org.
  - Volta a correr o setup. A app é opcional: as skills funcionam sem ela.

Comando (macOS):

```
uv python install 3.12
```

<a id="mac-e-mem-05"></a>

### E-MEM-05 · O teste da app Memória falhou

- **Porquê:** A app ficou instalada, mas o autoteste falhou. O Python que o uv instalou, a pesquisa nas notas (FTS5) ou a pasta das memórias não estão a funcionar. As skills funcionam sem a app.
- **O que fazer:**
  - Corre o comando abaixo e envia o resultado ao organizador.
  - Volta a correr o setup: o uv volta a instalar a app e o Python dela.

Comando (macOS):

```
memoria selftest
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
irm https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.3/bootstrap-windows.ps1 | iex
```

<a id="windows-e-net-01"></a>

### E-NET-01 · Um domínio necessário está bloqueado

- **Porquê:** A rede não deixa chegar a um ou mais domínios de que o workshop precisa. Costuma ser uma firewall ou um filtro da empresa.
- **O que fazer:**
  - Pede à equipa de IT para libertar os domínios da lista em docs/TROUBLESHOOTING.md (secção «Domínios necessários»).
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

### E-NET-03 · O proxy pede autenticação ou está mal configurado

- **Porquê:** A rede só sai por um proxy, e o pedido foi recusado (por exemplo, erro 407).
- **O que fazer:**
  - Define o proxy para esta sessão e volta a correr o setup.
  - Se o proxy pedir utilizador e palavra-passe, pede ao IT um proxy sem autenticação ou uma exceção para os domínios do workshop.

Comandos (Windows):

```
$env:HTTPS_PROXY = 'http://proxy.empresa:8080'
$env:NO_PROXY = 'localhost,127.0.0.1'
```

<a id="windows-e-net-04"></a>

### E-NET-04 · A empresa interceta o tráfego HTTPS (certificado próprio)

- **Porquê:** O certificado de api.anthropic.com não vem de uma autoridade pública. A rede da empresa abre e volta a cifrar o tráfego. O setup exporta os certificados da empresa para ~/.workshop-claude/ca.pem e configura o Claude Code para os usar.
- **O que fazer:**
  - Normalmente não precisas de fazer nada: o setup já configurou NODE_EXTRA_CA_CERTS e UV_SYSTEM_CERTS.
  - Se o teste final falhar com erro de certificado, pede ao IT o certificado raiz da empresa em formato PEM e guarda-o em ~/.workshop-claude/ca.pem. Depois volta a correr o setup.

Comando (Windows):

```
Get-ChildItem Cert:\LocalMachine\Root, Cert:\CurrentUser\Root | Select-Object Subject, Issuer
```

<a id="windows-e-net-05"></a>

### E-NET-05 · Sem ligação à API da Anthropic

- **Porquê:** O Claude Code não consegue falar com api.anthropic.com. Sem isto não há workshop, e o Claude também não pode ajudar a diagnosticar.
- **O que fazer:**
  - Confirma que abres https://api.anthropic.com no browser (uma página de erro em JSON é sinal de que chega lá).
  - Se usas proxy, define HTTPS_PROXY antes de correr o setup.
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

- **Porquê:** Um ficheiro não chegou a ser descarregado, ou chegou incompleto. Costuma ser uma falha de rede momentânea.
- **O que fazer:**
  - Volta a correr o setup. Os passos já feitos são saltados.
  - Se falhar sempre no mesmo ficheiro, verifica a rede e o proxy (códigos E-NET-01 e E-NET-03).

Comando (Windows):

```
irm https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.3/bootstrap-windows.ps1 | iex
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

- **Porquê:** A pasta pessoal (ou os Documentos) é sincronizada pelo OneDrive. A sincronização pode bloquear ficheiros a meio do trabalho dos agentes.
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

### E-CFG-02 · A variável ANTHROPIC_API_KEY está definida

- **Porquê:** Com esta variável, o Claude Code usa essa chave em vez do teu login. O custo vai para a conta dona da chave.
- **O que fazer:**
  - Se a chave for tua e da Console, podes continuar.
  - Se não for, remove a variável do teu perfil do terminal e abre um terminal novo.

Comando (Windows):

```
[Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', $null, 'User')
```

<a id="windows-e-cfg-03"></a>

### E-CFG-03 · A variável ANTHROPIC_BASE_URL está definida

- **Porquê:** Com esta variável, o Claude Code fala com outro servidor em vez da API da Anthropic (por exemplo, um gateway da empresa). Os preços e os modelos podem ser outros.
- **O que fazer:**
  - Se o IT te pediu para usar esse gateway, podes continuar.
  - Se não, remove a variável e abre um terminal novo.

Comando (Windows):

```
[Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', $null, 'User')
```

<a id="windows-e-cfg-04"></a>

### E-CFG-04 · O Claude Code está configurado para Bedrock ou Vertex

- **Porquê:** CLAUDE_CODE_USE_BEDROCK ou CLAUDE_CODE_USE_VERTEX está definida. O Claude Code usa a cloud da empresa, e o login na Console é ignorado.
- **O que fazer:**
  - Para o workshop, remove a variável e abre um terminal novo.
  - Se a empresa exigir Bedrock ou Vertex, confirma com o organizador que os modelos do workshop estão disponíveis.

Comando (Windows):

```
[Environment]::SetEnvironmentVariable('CLAUDE_CODE_USE_BEDROCK', $null, 'User')
```

<a id="windows-e-cfg-05"></a>

### E-CFG-05 · O ficheiro settings.json do Claude Code tem um erro

- **Porquê:** O ~/.claude/settings.json não é JSON válido. O setup não lhe toca, para não perder as tuas definições.
- **O que fazer:**
  - Abre o ficheiro e corrige o erro (falta uma vírgula ou uma chaveta, por exemplo).
  - Depois volta a correr o setup.

Comando (Windows):

```
Get-Content "$env:USERPROFILE\.claude\settings.json" -Raw | ConvertFrom-Json
```

<a id="windows-e-cfg-06"></a>

### E-CFG-06 · Já tinhas uma statusline

- **Porquê:** O teu Claude Code já mostra uma statusline tua. O setup manteve-a e não instalou a do workshop, que mostra o custo.
- **O que fazer:**
  - Podes continuar: o custo também aparece no /demo-cost.
  - Para usar a statusline do workshop, volta a correr o setup com a opção abaixo. A tua fica no backup e volta com --desinstalar.

Comando (Windows):

```
powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.workshop-claude\setup-windows.ps1" -SubstituirStatusline
```

<a id="windows-e-cfg-07"></a>

### E-CFG-07 · O uv está proibido de usar o Python gerido

- **Porquê:** Há uma variável de ambiente (UV_PYTHON_DOWNLOADS, UV_NO_MANAGED_PYTHON ou UV_PYTHON_PREFERENCE) que impede o uv de descarregar o seu próprio Python. A app Memória precisa desse Python. O setup ignora a variável só no comando dele, mas outros comandos uv continuam afetados.
- **O que fazer:**
  - Se a variável foi posta pela empresa, fala com o IT antes de a mudar.
  - Não precisas de ter Python instalado: o uv traz o dele.

Comando (Windows):

```
Get-ChildItem Env:UV_*
```

<a id="windows-e-perm-01"></a>

### E-PERM-01 · Sem permissão para escrever na pasta pessoal

- **Porquê:** O setup instala tudo na tua pasta pessoal, e uma pasta está protegida ou pertence a outro utilizador (por exemplo, criada com sudo ou por um administrador).
- **O que fazer:**
  - Vê no log qual é a pasta e corrige o dono.
  - Não corras o setup com sudo nem como administrador.

Comando (Windows):

```
icacls "$env:USERPROFILE\.workshop-claude"
```

<a id="windows-e-perm-02"></a>

### E-PERM-02 · Um programa foi bloqueado pela segurança do computador

- **Porquê:** Um antivírus, EDR, AppLocker ou o Gatekeeper impediu um programa instalado na pasta pessoal de correr.
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

- **Porquê:** O Claude Code no Windows usa o Git Bash para correr comandos e hooks. O git existe, mas sem o bash.exe ao lado.
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

- **Porquê:** Estás ligado com uma assinatura claude.ai (Pro ou Max). Funciona, mas o workshop foi preparado para a Console e mede o custo a preço de API.
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

### E-NODE-02 · Há um Node antigo à frente no PATH

- **Porquê:** O terminal encontra primeiro um Node com versão inferior a 22. Os hooks usam o Node novo, mas os testes do projeto podem usar o antigo.
- **O que fazer:**
  - Fecha e volta a abrir o terminal. Se usas nvm, escolhe o Node novo com o comando abaixo.
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
  - Confirma o acesso ao servidor do repositório (gitea.guilhermepinto.pt).
  - Volta a correr o setup. Se continuar, envia o log ao organizador.

Comando (Windows):

```
Invoke-WebRequest -UseBasicParsing -Method Head https://gitea.guilhermepinto.pt/guilherme/workshop-claude/releases/download/v1.0.0-dev.3/workshop-kit-v1.0.0-dev.3.zip
```

<a id="windows-e-kit-02"></a>

### E-KIT-02 · O arquivo do kit não confere (SHA-256)

- **Porquê:** O ficheiro descarregado é diferente do publicado. Pode estar incompleto, ou um proxy alterou-o.
- **O que fazer:**
  - Volta a correr o setup para descarregar outra vez.
  - Se repetir, não continues e avisa o organizador.

<a id="windows-e-kit-03"></a>

### E-KIT-03 · A instalação das skills e dos hooks falhou

- **Porquê:** O instalador em Node não conseguiu copiar os ficheiros ou atualizar o settings.json. O teu settings.json tem backup em ~/.workshop-claude/backup.
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
  - Lê a mensagem no log (procura «assemble»).
  - Se a pasta já existir com outro conteúdo, muda-lhe o nome e volta a correr o setup.

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

<a id="windows-e-mem-01"></a>

### E-MEM-01 · A release da app Memória ainda não foi publicada

- **Porquê:** Não encontrei os ficheiros da app Memória v0.4.0 no servidor. A app é opcional: as skills funcionam sem ela.
- **O que fazer:**
  - Podes continuar. Mais perto do workshop, volta a correr o setup para a instalar.

<a id="windows-e-mem-02"></a>

### E-MEM-02 · O ficheiro da app Memória não confere (SHA-256)

- **Porquê:** O wheel descarregado é diferente do publicado em SHA256SUMS. Não o instalei.
- **O que fazer:**
  - Volta a correr o setup. Se repetir, avisa o organizador.

<a id="windows-e-mem-03"></a>

### E-MEM-03 · A instalação da app Memória falhou

- **Porquê:** O uv não conseguiu instalar a app (Python 3.12 ou as dependências). Costuma ser rede (pypi.org, files.pythonhosted.org ou github.com).
- **O que fazer:**
  - Confirma o acesso a pypi.org e files.pythonhosted.org.
  - Volta a correr o setup. A app é opcional: as skills funcionam sem ela.

Comando (Windows):

```
uv python install 3.12
```

<a id="windows-e-mem-04"></a>

### E-MEM-04 · Falta o WebView2 (Windows)

- **Porquê:** A janela da app Memória usa o Microsoft Edge WebView2, e não o encontrei nem o consegui instalar. Sem ele, a app abre no browser.
- **O que fazer:**
  - Podes continuar: a app abre no browser.
  - Para a janela própria, instala o WebView2 Runtime pelo portal de software da empresa ou pede ao IT.

<a id="windows-e-mem-05"></a>

### E-MEM-05 · O teste da app Memória falhou

- **Porquê:** A app ficou instalada, mas o autoteste falhou. O Python que o uv instalou, a pesquisa nas notas (FTS5) ou a pasta das memórias não estão a funcionar. As skills funcionam sem a app.
- **O que fazer:**
  - Corre o comando abaixo e envia o resultado ao organizador.
  - Volta a correr o setup: o uv volta a instalar a app e o Python dela.

Comando (Windows):

```
memoria selftest
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
- `gitea.guilhermepinto.pt`

## Proxies e certificados da empresa

- O setup deteta o proxy do sistema (no Windows também resolve o PAC) e grava `HTTPS_PROXY` e `NO_PROXY=localhost,127.0.0.1` no `env` do `~/.claude/settings.json`.
- Se a empresa intercetar o HTTPS, o setup exporta as raízes da empresa para `~/.workshop-claude/ca.pem` e define `NODE_EXTRA_CA_CERTS` e `UV_SYSTEM_CERTS=true`.
- Proxies só com NTLM ou Kerberos não são suportados (ver `E-NET-06`).

