# Checklist do Windows (um portátil, depois da noite de correções)

[English](../WINDOWS-CHECKLIST.md) · **Português**

Uma pessoa, um portátil real com Windows 10 ou 11, cerca de 60 a 90 minutos. Faz primeiro as partes A e B (cerca de 50 minutos, já com a primeira instalação) e depois a parte C, pela ordem, enquanto houver tempo. A parte D é só para o que por acaso tiveres à mão. Os testes mais amplos da release estão em [MANUAL-TESTS.md](MANUAL-TESTS.md): quando um check daqui também cobre um deles, diz qual.

O setup escreve sempre em inglês, por isso as mensagens esperadas aparecem aqui em inglês, tal como surgem no ecrã.

## Antes de começar

- **Utilizador:** se puderes, um utilizador local novo do Windows, **sem admin** (os checks partem do princípio de que ainda não há nada do kit instalado). **Release:** publica primeiro o build do `chaos-fixes` (`tools/build-release.sh` e `tools/publish-release.sh`), para que **o one-liner** do [INSTALL.md](INSTALL.md) (secção 2) descarregue as correções desta noite.
- **Atalhos:** **o check** é `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Check` e **a instalação** é o mesmo comando sem `-Check`. Uma variável definida com `$env:...` só vale nessa janela: define-a, corre lá o check e fecha a janela no fim.
- **Onde ficam os ficheiros:** `%USERPROFILE%\.workshop-claude` (kit, `setup.log`, `summary.txt`, a cópia guardada do `setup-windows.ps1`, Node, gh, acli), `%USERPROFILE%\.local\bin` (claude, uv), `%USERPROFILE%\.claude` (settings, skills, agents), `%USERPROFILE%\workshop-claude` (os dois projetos) e `%USERPROFILE%\.agent-memory` (memórias).
- **Repor:** `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Uninstall`. Deixa o git, o Claude Code, o Node, o uv, o gh e os backups; para começar mesmo do zero, usa outro utilizador novo.
- **Quando um check falha, envia:** o número, uma fotografia da janela, `%USERPROFILE%\.workshop-claude\setup.log` e `%USERPROFILE%\.workshop-claude\summary.txt` (o setup.log já vem sem segredos). Aponta passou ou falhou para cada número.

## A. O caminho principal (cerca de 30 minutos)

### 1. Instalação normal com o one-liner
Abre o **Windows PowerShell** a partir do menu Iniciar (não o ISE, não o "x86", não o PowerShell 7), cola o one-liner e responde que sim aos logins (não ao Atlassian, se não usares Jira).
- **Esperado:** nenhum texto a vermelho. No Windows Terminal: um cartão no início, uma linha por passo (✔ ▲ ✖) e, enquanto um passo corre, um spinner com o que está a fazer e a barra "N of 12" no fundo; não fica nada dele depois de uma pergunta, de um login ou do fim. Na janela antiga da consola (conhost): cartões com +--+ e [OK] [!!] [XX], sem spinner. Cada login abre **numa janela nova só sua** ("The login opens in a new window: finish it there...") com o URL ou o código; essa janela fecha-se quando o login termina e o setup continua, mesmo com o browser ainda aberto. O passo 12 mostra "Asking Claude for a short reply (up to 90 s)…" (com as reticências bem desenhadas) e passa. No fim aparece "Everything is ready for the workshop." e "(setup finished with exit code 0)".
- **No setup.log:** o passo 0 mostra `x64`; a linha `network: https://claude.ai/install.ps1 -> ...` diz que responde; `node in a new terminal: 24` (ou none/unknown, nunca um 0 sozinho); uma linha `result step N:` por passo.
- **Se não:** os ficheiros do costume e quanto tempo demorou a instalação. Este check cobre também o W1, o W2 e o W16.

### 2. Janela nova e depois o check
Fecha a janela, abre um Windows PowerShell novo e corre:
```powershell
(Get-Command claude).Source
claude --version
```
Depois corre o check e a seguir `echo $LASTEXITCODE`.
- **Esperado:** o claude é o `%USERPROFILE%\.local\bin\claude.exe`; o check acaba com "Check complete: everything is ready for the workshop." e o código de saída é 0.
- **Se não:** os ficheiros do costume e o resultado de `(Get-Item HKCU:\Environment).GetValue('Path', $null, 'DoNotExpandEnvironmentNames')`.

### 3. O check através do one-liner
```powershell
$env:WORKSHOP_SETUP_ARGS = '-Check'
```
Na mesma janela, cola o one-liner e depois corre `$env:WORKSHOP_SETUP_ARGS`.
- **Esperado:** a execução é só um check (não instala nada) e a variável fica vazia a seguir. Colar outra vez o one-liner faz uma instalação (passos "Already done"), não um check.
- **Se não:** os ficheiros do costume e o texto da janela.

### 4. O parser de JSON estrito do Windows PowerShell 5.1
No Windows PowerShell (não no pwsh), de preferência num perfil que já use o Claude Code há algum tempo:
```powershell
$J = [Windows.Data.Json.JsonValue, Windows.Data.Json, ContentType=WindowsRuntime]
foreach ($t in @('{"a":1,}', '{"a":1,"a":2}', '{"projects":{"C:/x":1,"c:/x":2}}')) { try { $null = $J::Parse($t); "parses: $t" } catch { "THROWS: $t" } }
$null = $J::Parse([IO.File]::ReadAllText("$env:USERPROFILE\.claude.json").TrimStart([char]0xFEFF)); 'the real .claude.json parses'
```
- **Esperado:** `THROWS: {"a":1,}`, depois `parses:` nas outras duas e por fim "the real .claude.json parses".
- **Se não:** as quatro linhas do resultado. Isto bloqueia toda a gente: um THROWS errado faz o passo 2 falhar com E-CC-04 e trava os passos 3, 7 e 12.

## B. Os bloqueios (cerca de 20 minutos)

### 5. Perfil numa unidade de rede (simulado)
Simula uma pasta pessoal do AD (`HOMEDRIVE`/`HOMEPATH` numa partilha). Numa janela nova:
```powershell
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\fakehome" | Out-Null
subst H: "$env:LOCALAPPDATA\fakehome"
$env:HOMEDRIVE = 'H:'; $env:HOMEPATH = '\'
powershell
```
No prompt interior, `$HOME` tem de mostrar `H:\`. Corre o uninstall, depois cola o one-liner e no fim corre o check.
- **Esperado:** o uninstall começa com "Uninstall mode: I undo what this setup installed, based on ...manifest.json" e acaba com "Uninstall complete...". Na instalação, o passo 2 não dá E-CC-01 e existe `%USERPROFILE%\.agent-memory\config.json`. `Get-ChildItem H:\ -Force` está vazio (nem `.workshop-claude`, nem `workshop-claude`).
- **No fim:** `exit` e depois `subst H: /d`. **Se não:** os ficheiros do costume e a listagem de `H:\`. Este check cobre também o W12.

### 6. OneDrive
Só se o OneDrive fizer cópia dos teus Documentos ou do Ambiente de Trabalho (Known Folder Move): corre o check.
- **Esperado:** nenhum aviso E-SO-03 (esse aviso é só para uma pasta pessoal ou de projetos dentro do OneDrive).
- **Se não:** os ficheiros do costume e o caminho da pasta do OneDrive.

### 7. PowerShell de 32 bits
Abre o **Windows PowerShell (x86)** a partir do menu Iniciar e cola o one-liner. Depois, na mesma janela, corre o check e `echo $LASTEXITCODE`.
- **Esperado:** o one-liner corre normalmente e o passo 0 mais recente do setup.log mostra `x64`. O check começa com "This is the 32-bit PowerShell (x86): I am starting the setup again in the 64-bit Windows PowerShell 5.1." e corre com cores e com as perguntas visíveis; o código de saída é 0.
- **Se não:** os ficheiros do costume e o texto da janela.

### 8. PowerShell 7
Só se tiveres o `pwsh` instalado (experimenta também se o Windows Terminal abrir o PowerShell 7 por omissão). Numa janela do pwsh, cola o one-liner e depois corre:
```powershell
pwsh -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Check
echo $LASTEXITCODE
```
- **Esperado:** o one-liner corre normalmente. O check começa com "This is PowerShell 7: I am starting the setup again in Windows PowerShell 5.1 (64-bit).", não dá um E-NODE-02 falso e o código de saída é o mesmo da execução no 5.1 (0).
- **Se não:** os ficheiros do costume e o texto da janela.

### 9. PowerShell ISE
Abre o **Windows PowerShell ISE** e cola o one-liner no painel da consola. Depois abre no ISE o `%USERPROFILE%\.workshop-claude\setup-windows.ps1` e carrega em F5.
- **Esperado:** "PowerShell ISE cannot answer the questions of the setup, so the setup opened in a new PowerShell window. Continue there." Abre-se uma janela de consola nova, que faz as perguntas e **fica aberta** no fim. O F5 dá a mesma janela nova (se o ISE disser que a execução de scripts está desativada, é a política por omissão: aponta e segue).
- **Falha conhecida:** escrever `powershell -File ...` no painel da consola do ISE ainda arranca um processo filho escondido. **Se não:** os ficheiros do costume e uma fotografia das duas janelas.

### 10. Política de execução imposta por Group Policy
Toda a gente: corre `Get-ExecutionPolicy -List`.
- Se o MachinePolicy ou o UserPolicy estiver em **AllSigned** ou **Restricted**, cola o one-liner. **Esperado:** "ERROR: a company policy (Group Policy, MachinePolicy) sets the PowerShell execution policy to AllSigned." e "See E-SO-07", sem erro vermelho do PowerShell e sem descarregar nada.
- Se estiver em **RemoteSigned**, o one-liner e o check têm de correr, e `Get-Item "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Stream *` só lista `:$DATA` (sem `Zone.Identifier`).
- **Opcional, se tiveres admin numa VM de teste:** numa janela de admin, `reg add HKLM\SOFTWARE\Policies\Microsoft\Windows\PowerShell /v EnableScripts /t REG_DWORD /d 1 /f` e `reg add HKLM\SOFTWARE\Policies\Microsoft\Windows\PowerShell /v ExecutionPolicy /t REG_SZ /d AllSigned /f`, e repete como utilizador normal. Com RemoteSigned, experimenta também a alternativa do INSTALL.md (descarregar o `setup-windows.ps1` com o browser, `Unblock-File`, `-File`). No fim, apaga os dois valores (`reg delete ... /v EnableScripts /f`, e o mesmo para `ExecutionPolicy`).
- **Se não:** o resultado de `Get-ExecutionPolicy -List` e o texto da janela.

### 11. Proxy da empresa (407)
Só numa rede da empresa com um proxy que pede autenticação. Cola o one-liner; se o primeiro download disser `(407) Proxy Authentication Required`, usa antes o one-liner do proxy do INSTALL.md.
- **Esperado:** o passo 0 tem a nota "The proxy only lets programs through with your Windows login (NTLM or Kerberos)..." e o aviso E-NET-03. Os passos 2, 5, 10 e 12 falham com E-NET-03, e não com E-CC-01, E-UV-01 ou E-MEM-03.
- **Se o proxy tiver exceções** ("Não utilizar o servidor proxy para..." nas definições do proxy): o `%USERPROFILE%\.claude\settings.json` tem `env.NO_PROXY` a começar por `localhost,127.0.0.1`, seguido das tuas exceções (`*.corp` passa a `.corp`), e o check mostra o passo 8 OK.
- **Se não:** os ficheiros do costume e o código que cada passo mostrou. Ver também o W7.

## C. O resto, por prioridade

Antes de mais, faz cópia de dois ficheiros e repõe-nos sempre que um check o pedir:
```powershell
Copy-Item "$env:USERPROFILE\.claude.json" "$env:USERPROFILE\claude.json.bak"
Copy-Item "$env:USERPROFILE\.claude\settings.json" "$env:USERPROFILE\settings.json.bak"
```

### 12. Cancelar um login
Termina as sessões (`claude auth logout`, ou `/logout` dentro do claude; depois `gh auth logout`) e corre a instalação. Em "Log in to the Console now?" responde y e carrega em Ctrl-C na janela do login. Corre outra vez e fecha a janela do login no X. Faz o mesmo em "Log in to GitHub now?".
- **Esperado:** a janela do login fecha-se, o setup continua, o passo 3 tem "Login cancelled (Ctrl-C). The setup carries on; you can log in later." e E-AUTH-01, e o resumo aparece. O setup.log tem `login exit -1073741510` (ou 130).
- **Se não:** todas as linhas `login exit N` do setup.log (o gh pode sair com 2; aí a nota pode faltar, mas o setup tem de continuar na mesma).
- Fica sem sessão até ao check 15: nos checks 13 e 14, responde n a "Log in to the Console now?".

### 13. Ctrl-C na janela do setup e o lock
Ainda sem sessão no gh. Cola o one-liner em duas janelas e carrega em Enter nas duas com menos de um segundo de intervalo. Na que corre, responde y a "Log in to GitHub now?" e carrega em Ctrl-C na janela **do setup** enquanto a janela do login do gh está aberta. Corre outra vez e, desta vez, fecha a janela do setup no X a meio de um passo; abre uma janela nova e corre outra vez.
- **Esperado:** a segunda janela mostra "The setup is already running in another window (PID n, since HH:mm). Wait for it to finish, or close that window, then run the same command again." e sai. O Ctrl-C para o setup em cerca de um segundo, a janela do login fecha-se e `Test-Path "$env:USERPROFILE\.workshop-claude\.lock"` dá False. Depois do X, a execução seguinte arranca normalmente, sem "already running".
- **Se não:** os ficheiros do costume e se ainda há algum instalador no Gestor de Tarefas.

### 14. Teclas escritas antes do tempo e respostas estranhas
Ainda sem sessão no gh. Corre a instalação; enquanto os passos correm, carrega três vezes em Enter, escreve umas letras e cola o one-liner outra vez. Em "Log in to GitHub now?" responde `maybe` e depois `  n  `.
- **Esperado:** a pergunta espera por uma resposta nova (as teclas perdidas e o texto colado são descartados, não contam como resposta). O `maybe` dá "Please answer y (yes) or n (no)." e a mesma pergunta; `  n  ` conta como não. O passo 6 mostra então E-GH-02 com a correção, e o setup **não** pergunta "Do you want Claude to analyze this error?".
- **Se não:** os ficheiros do costume; o setup.log regista a resposta que foi aceite.

### 15. Sem consola
Sem sessão no Claude Code (como no check 12):
```powershell
echo n | powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1"
```
- **Esperado:** o passo 3 falha com E-AUTH-01 **e** a nota "This window is not an interactive terminal (an AI agent, an IDE task or a script)...". Nenhum erro vermelho sobre o FlushInputBuffer.
- **No fim:** corre a instalação normalmente e termina os logins do Claude e do GitHub (os checks 16 a 38 precisam deles). **Se não:** os ficheiros do costume.

### 16. HTTPS_PROXY antigo do escritório
```powershell
$env:HTTPS_PROXY = 'http://user:pw@127.0.0.1:9'
```
Na mesma janela, corre a instalação.
- **Esperado:** o passo 0 tem a nota "System proxy: http://127.0.0.1:9 (HTTPS_PROXY)" (sem `user:pw`) e o aviso E-NET-03, sem E-NET-05. O passo 12 falha logo com E-NET-03, e não ao fim de uns 3 minutos com E-NET-05. O `settings.json` não fica com `env.HTTPS_PROXY`, e `Select-String -Path "$env:USERPROFILE\.workshop-claude\setup.log" -Pattern 'user:pw'` não encontra nada. O primeiro comando do E-NET-03 resolve.
- **Se não:** os ficheiros do costume.

### 17. Proxy do sistema morto
Definições > Rede e Internet > Proxy > Configuração manual do proxy: endereço `127.0.0.1`, porta `9`, guardar. Numa janela nova, corre o check.
- **Esperado:** E-NET-03 com `http://127.0.0.1:9`; os downloads que falham mostram E-NET-03, não E-NET-01; `$env:HTTPS_PROXY` continua vazio no fim.
- **No fim:** desliga o proxy manual. **Se não:** os ficheiros do costume.

### 18. Proxy morto guardado no settings.json
Abre o `%USERPROFILE%\.claude\settings.json` no Bloco de Notas e acrescenta `"HTTPS_PROXY": "http://127.0.0.1:9"` dentro de `"env"`. Corre o check e depois a instalação.
- **Esperado:** o passo 0 tem a nota "Claude Code is set to use a proxy that does not answer..." com o caminho do settings.json, e o passo 12 mostra logo E-NET-08. O comando do E-NET-08 (`Select-String ... -Pattern proxy`) encontra a linha. Como a puseste à mão, a instalação mantém-na e o passo 12 continua com E-NET-08.
- **No fim:** repõe o `settings.json.bak`. **Se não:** os ficheiros do costume.

### 19. O GitHub sem resposta da rede
Com sessão iniciada no gh:
```powershell
$env:HTTPS_PROXY = 'http://10.255.255.1:3128'
```
Corre o check na mesma janela e depois a instalação.
- **Esperado:** o passo 6 mostra E-GH-03 com os servidores (por exemplo `github.com`) ao fim de uns 25 s, e não E-GH-02 ao fim de 2 minutos; nenhuma pergunta "Log in to GitHub now?"; nenhum download do gh. A verificação do acli no passo 7 também demora uns 25 s.
- **Se não:** se o passo 6 mostrar E-GH-02, corre `Measure-Command { gh auth status 2>&1 | Out-Host }` na mesma janela e envia o tempo e o resultado.

### 20. Gateway da empresa em baixo
```powershell
$env:ANTHROPIC_BASE_URL = 'https://ana:pw@gw.invalid.example:8443/v1'
```
Corre o check e depois o mesmo comando com `-Doctor` em vez de `-Check`.
- **Esperado:** em cerca de 10 s, o passo 0 tem E-CFG-03 (`ANTHROPIC_BASE_URL`) e E-AUTH-05 (`https://gw.invalid.example:8443/`). O passo 12 mostra logo E-AUTH-05, sem a linha "Asking Claude..." e sem a pergunta "analyze this error?". O `-Doctor` mostra "Claude is not available ..." e não chama o Claude. `ana:pw` não aparece no setup.log.
- **Depois:** fecha a janela e põe antes `"ANTHROPIC_BASE_URL": "http://127.0.0.1:9"` no `env` do settings.json. **Esperado:** o mesmo, e o E-CFG-03 indica o ficheiro. Repõe o `settings.json.bak`. **Se não:** os ficheiros do costume.

### 21. Chave antiga no ambiente
Usa um valor inventado, nunca uma chave verdadeira:
```powershell
$env:ANTHROPIC_API_KEY = 'invalid-test-key'
```
Corre o check na mesma janela.
- **Esperado:** o passo 0 tem o aviso E-CFG-02 (`ANTHROPIC_API_KEY`), o passo 3 tem E-AUTH-03 e o passo 12 falha com E-AUTH-04 `ANTHROPIC_API_KEY`, e não com E-AUTH-01 ("log in"). `invalid-test-key` não aparece nem na janela nem no setup.log.
- **Se não:** os ficheiros do costume.

### 22. Bedrock ligado por engano
```powershell
$env:CLAUDE_CODE_USE_BEDROCK = '1'
```
Corre a instalação na mesma janela.
- **Esperado:** o passo 0 tem o aviso E-CFG-04 `CLAUDE_CODE_USE_BEDROCK (shell)`; o passo 3 falha com E-CFG-04 e não oferece o login da Console; o passo 12 fica "Not run", sem a espera de 90 s.
- **Depois:** fecha a janela e põe `"CLAUDE_CODE_USE_BEDROCK": true` no `env` do settings.json; o check mostra o caminho do ficheiro. Repõe o `settings.json.bak`. **Se não:** os ficheiros do costume e a linha `auth:` do setup.log (o valor de `apiProvider=`).

### 23. ~\.claude.json estragado
Corre `Get-FileHash "$env:USERPROFILE\.claude.json"`, abre o ficheiro no Bloco de Notas, acrescenta uma vírgula antes do último `}` e guarda. Corre o check e outra vez o `Get-FileHash`.
- **Esperado:** o passo 2 falha com E-CC-04 e o caminho; os passos 3, 7 e 12 ficam "Not run"; o hash não muda.
- **Depois:** repõe o `claude.json.bak`, guarda-o uma vez no Bloco de Notas como "UTF-8 com BOM" e corre o check: o passo 2 passa. Repõe outra vez a cópia. **Se não:** os ficheiros do costume; avisa se o setup.log disser ".claude.json: no strict JSON parser here, not checked".

### 24. Um claude antigo à frente do do kit
```powershell
$env:Path = "$env:USERPROFILE\.workshop-claude\node;$env:Path"
npm i -g --prefix "$env:APPDATA\npm" @anthropic-ai/claude-code@1.0.128
```
Em "Editar as variáveis de ambiente da sua conta", põe `%APPDATA%\npm` **antes** de `%USERPROFILE%\.local\bin` no `Path` do utilizador. Corre a instalação, abre uma janela nova e corre `(Get-Command claude).Source` e `claude --version`. Corre a instalação uma segunda vez.
- **Esperado:** o setup.log tem "user PATH: workshop folders moved to the front (...)"; na janela nova o claude é o `...\.local\bin\claude.exe`, com a versão do kit. A segunda execução não tem a linha "moved to the front".
- **No fim:** `npm rm -g --prefix "$env:APPDATA\npm" @anthropic-ai/claude-code` e tira o `%APPDATA%\npm` do Path do utilizador. Limite conhecido: um claude numa pasta do PATH da máquina ganha sempre (só desinstalá-lo resolve). **Se não:** os ficheiros do costume e o Path do utilizador.

### 25. Entradas antigas de MCP
```powershell
claude mcp remove atlassian -s user
claude mcp add --transport sse --scope user atlassian https://mcp.atlassian.com/v1/sse
claude mcp remove agent-memory -s user
claude mcp add --scope user agent-memory -- C:\nope\agent-memory.exe mcp
```
Corre o check, depois a instalação e no fim `claude mcp get atlassian` e `claude mcp get agent-memory`.
- **Esperado:** o check mostra no passo 7 E-MCP-01 `atlassian: https://mcp.atlassian.com/v1/sse` e no passo 10 o aviso E-MEM-03 `mcp`. A instalação corrige os dois, com as notas "The atlassian MCP pointed to ..." e "The agent-memory MCP pointed to C:\nope\agent-memory.exe...".
- **Se não:** os ficheiros do costume e o resultado dos dois `claude mcp get` (têm de ter as linhas `  URL:` e `  Command:`; sem elas, estes checks aceitam tudo).

### 26. ~\.local\bin bloqueada, ou um ficheiro
```powershell
icacls "$env:USERPROFILE\.local\bin" /deny "${env:USERNAME}:(OI)(CI)W"
```
Corre o check, experimenta o comando que ele sugere, corre outra vez o check e desfaz com `icacls "$env:USERPROFILE\.local\bin" /remove:d "$env:USERNAME"`. A seguir:
```powershell
Rename-Item "$env:USERPROFILE\.local\bin" bin.keep
Set-Content "$env:USERPROFILE\.local\bin" x
```
Corre o check, corre o comando que ele sugere, depois `Rename-Item "$env:USERPROFILE\.local\bin.keep" bin` e corre outra vez o check.
- **Esperado:** o passo 0 avisa E-PERM-01 com `~\.local\bin` e uma linha "To fix it, run this command": um `icacls ... /grant` só nessa pasta, nunca no perfil inteiro. Com o ficheiro: E-PERM-01 "(not a folder)" e um comando `Rename-Item -LiteralPath ... -NewName "bin.old"`. O último check dá OK.
- **Se não:** os ficheiros do costume, e **diz se o `/grant` sugerido resolveu o deny** (esperamos que não).

### 27. Outras pastas sem escrita
Uma de cada vez, corre o check depois de cada uma e desfaz:
```powershell
attrib +R "$env:USERPROFILE\.claude.json"
icacls "$env:USERPROFILE\.workshop-claude" /deny "${env:USERNAME}:(OI)(CI)W"
icacls "$env:USERPROFILE\.agent-memory" /deny "${env:USERNAME}:(OI)(CI)W"
attrib +R "$env:USERPROFILE\.workshop-claude\setup.log"
```
Desfaz com `attrib -R ...` e `icacls ... /remove:d "$env:USERNAME"`.
- **Esperado:** o `.claude.json` aparece no E-PERM-01 com `attrib -R`. `.workshop-claude`: E-PERM-01 com um comando icacls, código de saída 1, sem erro vermelho. `.agent-memory`: o passo 10 avisa E-MEM-07 com uma nota de icacls e o MCP continua registado. setup.log só de leitura: aparece um `setup.log.unwritable-<timestamp>` e começa um setup.log novo.
- **Se não:** os ficheiros do costume.

### 28. O atalho do menu Iniciar não pode ser criado
```powershell
$p = [Environment]::GetFolderPath('Programs')
Remove-Item "$p\Agent Memory.lnk"
```
Corre o check. Depois `icacls $p /deny "${env:USERNAME}:(OI)(CI)W"`, corre o check e a instalação. Desfaz com `icacls $p /remove:d "$env:USERNAME"` e corre outra vez a instalação.
- **Esperado:** primeiro, um aviso E-SETUP-01 (atalho). Com o deny: E-MEM-06 com `~\AppData\Roaming\Microsoft\Windows\Start Menu\Programs`; `claude mcp get agent-memory` continua a funcionar; o summary.txt mostra "Couldn't create the Agent Memory shortcut (E-MEM-06)" e "There are N warnings above". Depois de desfazer, o atalho volta e a app não é reinstalada (nenhum `uv tool install` novo no setup.log).
- **Se não:** os ficheiros do costume.

### 29. Um comentário no settings.json
Acrescenta uma linha `// test` no início do `%USERPROFILE%\.claude\settings.json`. Corre a instalação e depois o check.
- **Esperado:** o passo 8 falha com E-CFG-05 e `...\.claude\settings.json - not valid JSON at line N, column M ...`; a linha do resumo não diz "0 skills, 0 agents". O check mostra o mesmo.
- **No fim:** repõe o `settings.json.bak`. **Se não:** os ficheiros do costume.

### 30. -Doctor depois de um passo falhado
```powershell
Add-Content "$env:USERPROFILE\.workshop-claude\setup.log" '00:00:00 result step 10: aviso E-MEM-03|uv tool install'
uv tool uninstall agent-memory
```
Corre o check, depois o mesmo comando com `-Doctor` (custa menos de US$ 0,01) e no fim a instalação, para repor a app.
- **Esperado:** o check mostra no passo 10 E-SETUP-01 e também E-MEM-03 (uv tool install). O `-Doctor` dá um diagnóstico que usa o resultado do passo 10, sem chamadas a ferramentas inventadas.
- **Se não:** os ficheiros do costume e o texto do diagnóstico.

### 31. A cópia guardada do setup atualiza-se sozinha
```powershell
Add-Content "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" '# test'
```
Corre o check, `echo $LASTEXITCODE` e outra vez o check. A seguir, corre `Get-ChildItem "$env:USERPROFILE\.workshop-claude\kit-src"` para ver a pasta da tag, escreve `x` em `kit-src\<tag>\.ws-kit-ok` com `Set-Content` e corre o check e depois a instalação.
- **Esperado:** o setup.log tem "saved setup-windows.ps1 updated from the release"; há um resumo, não dois, e o código de saída é o dessa execução; o segundo check não atualiza nada. Com o `.ws-kit-ok` estragado, o check não descarrega nada e a instalação regista "kit-src <tag> is not the published kit ... downloading it again".
- **Se não:** os ficheiros do costume e o `Get-FileHash` da cópia guardada.

### 32. A Arena tem histórico próprio
```powershell
cd "$env:USERPROFILE\workshop-claude\demo-project"
git rev-list --max-parents=0 HEAD
git tag -d arena-start
```
Corre a instalação e depois o check.
- **Esperado:** o passo 9 fica "Done with warning" com E-DEMO-04 "The Arena has its own git history: I left it as it is", a pasta e uma linha `Rename-Item ... demo-project-old`. Os teus commits continuam lá (`git log`). O check mostra o mesmo aviso, e não E-SETUP-01 nem E-DEMO-01.
- **No fim:** `git tag arena-start <o commit mostrado acima>`. **Se não:** os ficheiros do costume.

### 33. Reconstruir a Arena: git no perfil, pasta em uso, fins de linha
```powershell
cd $env:USERPROFILE
git init
git -c user.name=test -c user.email=test@example.com commit --allow-empty -m x
git tag arena-start
Remove-Item -Recurse -Force "$env:USERPROFILE\workshop-claude\demo-project\.git"
```
Corre o check. Numa segunda janela, faz `cd "$env:USERPROFILE\workshop-claude\demo-project"` e deixa-a lá; corre a instalação. Fecha a segunda janela e corre outra vez a instalação. Depois `git -C "$env:USERPROFILE\workshop-claude\demo-project" status` e `git -C "$env:USERPROFILE\workshop-claude\demo-project" config core.autocrlf`.
- **Esperado:** o check mostra o passo 9 em falta (E-SETUP-01 ou E-DEMO-01), não OK. A primeira instalação falha com E-DEMO-01 "...could not move ... (is it open in another program?)" e não apaga nada. A segunda reconstrói a Arena com a nota "Your previous folder is saved in %USERPROFILE%\.workshop-claude\backup\<date>\demo-project." (com barras invertidas). O `status` está limpo e o `core.autocrlf` é false.
- **No fim:** `Remove-Item -Recurse -Force "$env:USERPROFILE\.git"`. **Se não:** os ficheiros do costume.

### 34. Tags assinadas sem gpg
```powershell
git config --global tag.gpgsign true
git config --global commit.gpgsign true
cd "$env:USERPROFILE\workshop-claude\demo-project"
git tag arena-inicial arena-start
git tag -d arena-start
```
Corre a instalação e depois `git cat-file -t arena-start`.
- **Esperado:** não abre nenhum editor nem janela do pinentry, o passo 9 fica feito e o `git cat-file` mostra `commit`.
- **No fim:** `git config --global --unset tag.gpgsign` e `git config --global --unset commit.gpgsign`. **Se não:** os ficheiros do costume.

### 35. Uma skill alterada
```powershell
Add-Content "$env:USERPROFILE\.claude\skills\task-plan\SKILL.md" 'local edit'
```
Corre a instalação.
- **Esperado:** o passo 8 tem a nota "You had changed task-plan: your copy is saved in %USERPROFILE%\.workshop-claude\backup\...\edited\skills\task-plan, and the kit's version is back in its place."
- **Se não:** os ficheiros do costume.

### 36. Escolha da língua
Numa janela nova, `$env:WORKSHOP_LANG = 'br'` e o check. Noutra janela nova, põe `WORKSHOP_LANG` na língua que **não** instalaste (`en` ou `pt-PT`), corre o check e depois a instalação. Numa terceira janela, sem `WORKSHOP_LANG`, corre o check. No fim, repõe a tua língua com `WORKSHOP_LANG` e a instalação.
- **Esperado:** `br` dá "WORKSHOP_LANG=br is not one of the workshop languages (pt-BR, pt-PT, en, hi or he), so I ignored it and used ..." e o kit fica na língua que tinha. A outra língua dá, no check, a nota do passo 8 "Language installed here: ..." e uma nota do passo 9 a dizer que os projetos estão na língua antiga; depois da instalação, o `kit\language.json` tem a língua nova e os projetos ficam intactos. Sem a variável: "Kept the language chosen at install (...); this computer is in ...".
- **Se não:** os ficheiros do costume e `Get-Content "$env:USERPROFILE\.workshop-claude\kit\language.json"`.

### 37. O Git Bash não é o primeiro no PATH
```powershell
$env:Path = "$env:LOCALAPPDATA\Programs\Git\mingw64\bin;$env:ProgramFiles\Git\mingw64\bin;$env:Path"
(Get-Command git).Source
```
Na mesma janela, corre o check e depois a instalação.
- **Esperado:** o git é o do `mingw64\bin`; nenhum E-GIT-03 falso; `Test-Path ((Get-Content "$env:USERPROFILE\.claude\settings.json" -Raw | ConvertFrom-Json).env.CLAUDE_CODE_GIT_BASH_PATH)` dá True.
- **Se não:** os ficheiros do costume.

### 38. O uninstall mantém o que é teu (faz por último)
Corre o uninstall. Depois acrescenta a tua própria entrada `.local\bin`, escrita à letra, cola o one-liner para instalar outra vez e volta a desinstalar:
```powershell
$old = (Get-Item HKCU:\Environment).GetValue('Path', $null, 'DoNotExpandEnvironmentNames')
Set-ItemProperty HKCU:\Environment Path ('%USERPROFILE%\.local\bin;' + $old) -Type ExpandString
```
- **Esperado:** o primeiro uninstall diz "PATH lines removed from ..." e o `.local\bin` sai do Path do utilizador; o settings.json volta ao que era. Depois da instalação, não há uma segunda entrada `C:\Users\<tu>\.local\bin`, o texto `%USERPROFILE%` fica como estava e `(Get-Item HKCU:\Environment).GetValueKind('Path')` é ExpandString. Depois do segundo uninstall, a tua entrada continua lá.
- **Se não:** os ficheiros do costume e o Path do utilizador antes e depois. Este check cobre também o W12.

## D. Opcional, se tiveres…

### 39. Uma pasta pessoal do AD numa partilha de rede
Repete o check 5 sem o `subst`. **Esperado:** o mesmo; nada é escrito na partilha. **Se não:** os ficheiros do costume e o `$HOME`.

### 40. AppData numa partilha de rede (perfil itinerante)
Corre o check. **Esperado:** a nota do passo 0 "Your AppData folder is on a network share (...). uv keeps the Python and the tools of the Agent Memory app in ... instead." e o passo 10 OK. **Se não:** os ficheiros do costume.

### 41. Windows 11 com o Windows Terminal como terminal por omissão
Repete o check 12 (só o login da Console). **Esperado:** o login abre numa janela ou separador do Windows Terminal, com os mesmos resultados e uma linha `login exit N` depois do Ctrl-C. **Se não:** os ficheiros do costume.

### 42. Uma rede lenta ou o hotspot do telemóvel
Apaga o `%USERPROFILE%\.workshop-claude\bin\gh.exe` e corre a instalação; desliga o Wi-Fi a meio do download do gh. **Esperado:** E-NET-07 "The download failed" (não E-NET-01) e o setup.log mostra `(..., partial)`. Numa instalação de raiz, o passo 2 mostra "Still downloading… N MB so far." mais ou menos a cada 30 s, e o N vai subindo. **Se não:** os ficheiros do costume; se o N ficar em 0.0, lista `%USERPROFILE%\.claude` e `%USERPROFILE%\.local\share\claude`.

### 43. Um portal cativo ou uma página de bloqueio do filtro web
Corre o one-liner e a instalação atrás dele. **Esperado:** o bootstrap diz "ERROR: a web page came instead of the setup (<url>)...", e um passo mostra E-NET-01 com "... - a web page came instead of the file"; nada é instalado a partir dela. **Se não:** os ficheiros do costume.

### 44. Uma rede que inspeciona o TLS só do github.com ou do pypi.org
Corre a instalação. **Esperado:** o passo 10 ou passa depois da linha do setup.log "uv: certificate error, retrying with UV_SYSTEM_CERTS=true", ou falha com E-NET-04 (não E-MEM-03). **Se não:** os ficheiros do costume.

### 45. Um antivírus ou uma regra do AppLocker que possas configurar
Bloqueia o `%USERPROFILE%\.workshop-claude\bin\gh.exe` e corre o check: o passo 6 mostra E-PERM-02 com o caminho, e não E-SETUP-01 nem E-GH-01. Bloqueia o `git.exe`: a Arena não vai para o backup e o passo 9 falha com E-PERM-02 (ou E-DEMO-01 "git rev-parse HEAD: ..."). **Se não:** os ficheiros do costume.

### 46. Modo de Programador (ligações simbólicas)
```powershell
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\settings.json" -Target C:\dotfiles\claude\settings.json
```
Instala e depois desinstala. **Esperado:** o settings.json continua a ser uma ligação (`(Get-Item ...).LinkType` é SymbolicLink), o destino tem as chaves do kit e a ligação sobrevive ao uninstall. **Se não:** os ficheiros do costume.

### 47. Um uv antigo (0.4.x)
Põe o `uv.exe` dele em `C:\olduv`, depois `$env:Path = 'C:\olduv;' + $env:Path` e o check. **Esperado:** o passo 5 OK com a versão do uv do kit, mais o aviso E-UV-02 `C:\olduv\uv.exe: uv 0.4.x`; o passo 10 OK. **Se não:** os ficheiros do costume.

### 48. Uma versão mais nova da app Agent Memory
Com o Claude Code aberto (o servidor MCP agent-memory a correr), corre a instalação de modo a que o passo 10 reinstale a app. **Esperado:** se o uv disser "Access is denied (os error 5)", o passo 10 mostra o seu próprio código (E-MEM-03 ou o aviso do passo 10), e não E-PERM-01. Fecha o Claude Code e corre outra vez: instala. **Se não:** os ficheiros do costume.

### 49. Pequenos extras, se sobrar tempo
`$env:NO_COLOR = 1` e o check: sem cores, o mesmo texto. `Get-Help "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Detailed` mostra o parágrafo da língua. Três respostas inválidas seguidas a uma pergunta y/n contam como não. Só com `kit\lingua.json` `{"kit":"pt","maquina":"pt-BR"}` (sem `language.json`), o check usa pt-BR. **Se não:** os ficheiros do costume.

### 50. Pester no Windows PowerShell 5.1
A partir de um clone do repositório, numa janela à parte do Windows PowerShell 5.1:
```powershell
Install-Module Pester -Scope CurrentUser -RequiredVersion 5.7.1 -Force -SkipPublisherCheck
Import-Module Pester -RequiredVersion 5.7.1
Invoke-Pester -Path setup/test/setup-windows.Tests.ps1
```
**Esperado:** 0 falhados (alguns testes são saltados no Windows). Corre-o numa janela só para isso: os testes definem `WS_NO_MAIN=1`. **Se não:** os nomes dos testes que falharam e as mensagens.
