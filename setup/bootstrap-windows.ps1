# bootstrap-windows.ps1 - arranque minimo do setup do workshop no Windows (so ASCII).
#
#   irm <url>/bootstrap-windows.ps1 | iex
#   $env:WORKSHOP_SETUP_ARGS='-Check'; irm <url>/bootstrap-windows.ps1 | iex
#   & ([scriptblock]::Create((irm <url>/bootstrap-windows.ps1))) -Check
#
# Descarrega o setup-windows.ps1 da mesma release para %TEMP%, confirma o SHA-256 (injetado no build)
# e corre-o com: powershell -NoProfile -ExecutionPolicy Bypass -File <ficheiro> <opcoes>
# (sempre o Windows PowerShell 5.1 de 64 bits, tambem a partir do PowerShell 7 ou de um de 32 bits).
# No PowerShell ISE (sem consola: as perguntas e os logins ficavam a espera) abre o setup numa janela nova.
# Com a execucao de scripts bloqueada por Group Policy (AllSigned ou Restricted) explica e nao corre nada.
# Se este comando for bloqueado, descarrega o setup-windows.ps1 e corre:
#   powershell -ExecutionPolicy Bypass -File setup-windows.ps1

$ProgressPreference = 'SilentlyContinue'

# >>> WS-INJETADO >>>
# Na fonte este bloco esta vazio. tools/build-release.sh injeta aqui o URL do repositorio,
# a versao, o padrao das releases e o SHA-256 do setup-windows.ps1.
$WsRepoUrl = ''
$WsVersion = ''
$WsReleasePattern = ''
$WsSetupSha256 = ''
# <<< WS-INJETADO <<<

function Get-WsBootPowerShellPath {
  # O Windows PowerShell 5.1 de 64 bits: num PowerShell de 32 bits (x86) o System32 e o SysWOW64, e so o
  # Sysnative chega ao de 64 bits (o install.ps1 do Claude Code recusa correr em 32 bits).
  param([string]$SystemRoot, [bool]$Is64BitOs, [bool]$Is64BitProcess)
  if (-not $SystemRoot) { return 'powershell.exe' }
  $sub = 'System32'
  if ($Is64BitOs -and -not $Is64BitProcess) { $sub = 'Sysnative' }
  return (Join-Path $SystemRoot ($sub + '\WindowsPowerShell\v1.0\powershell.exe'))
}

function Get-WsBootPolicy {
  # Politica de execucao imposta por Group Policy ao Windows PowerShell (a da maquina primeiro), lida do registo
  # (vista de 64 bits): EnableScripts 0 = Restricted; 1 = o valor de ExecutionPolicy. Ganha ao "-ExecutionPolicy
  # Bypass". Devolve @(politica, ambito) ou $null.
  foreach ($h in @(@('LocalMachine', 'MachinePolicy'), @('CurrentUser', 'UserPolicy'))) {
    try {
      $k = [Microsoft.Win32.RegistryKey]::OpenBaseKey($h[0], [Microsoft.Win32.RegistryView]::Registry64).OpenSubKey('SOFTWARE\Policies\Microsoft\Windows\PowerShell')
      if (-not $k) { continue }
      $en = $k.GetValue('EnableScripts')
      if ($null -eq $en -or [string]$en -eq '') { continue }
      if ([int]$en -eq 0) { return @('Restricted', $h[1]) }
      $p = [string]$k.GetValue('ExecutionPolicy')
      if ($p) { return @($p, $h[1]) }
    } catch { }
  }
  return $null
}

function Invoke-WsBootstrap {
  param([string[]]$PassArgs)
  if ($ExecutionContext.SessionState.LanguageMode -ne 'FullLanguage') {
    Write-Host 'ERROR: PowerShell is in restricted mode (ConstrainedLanguage). See E-SO-05 in docs/TROUBLESHOOTING.md.'
    return
  }
  # As opcoes de $env:WORKSHOP_SETUP_ARGS valem so para esta vez: a variavel sai ja da sessao (senao o
  # one-liner simples, sugerido depois, voltava a correr -Check e nao instalava nada).
  $all = @()
  if ($PassArgs) { $all += $PassArgs }
  if ($env:WORKSHOP_SETUP_ARGS) { $all += @($env:WORKSHOP_SETUP_ARGS -split '\s+' | Where-Object { $_ }) }
  Remove-Item Env:WORKSHOP_SETUP_ARGS -ErrorAction SilentlyContinue
  # Group Policy: AllSigned ou Restricted nao deixam correr nenhum script sem assinatura, nem com Bypass.
  # Nunca se contorna: explica-se e para aqui.
  $gp = Get-WsBootPolicy
  if ($gp -and @('Restricted', 'AllSigned') -contains $gp[0]) {
    Write-Host ('ERROR: a company policy (Group Policy, ' + $gp[1] + ') sets the PowerShell execution policy to ' + $gp[0] + '.')
    Write-Host '  With it, no unsigned script can run, so the workshop setup cannot run on this computer.'
    Write-Host '  Ask IT for an exception for the workshop, or do the setup on another computer. See E-SO-07 in docs/TROUBLESHOOTING.md.'
    return
  }
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  try { [Net.WebRequest]::DefaultWebProxy.Credentials = [Net.CredentialCache]::DefaultNetworkCredentials } catch { }

  $repo = $WsRepoUrl
  $ver = $WsVersion
  $pattern = $WsReleasePattern
  if ($env:WORKSHOP_REPO_URL) { $repo = $env:WORKSHOP_REPO_URL }
  if ($env:WORKSHOP_VERSION) { $ver = $env:WORKSHOP_VERSION }
  if ($env:RELEASE_DOWNLOAD_URL) { $pattern = $env:RELEASE_DOWNLOAD_URL }
  if (-not $repo -or -not $ver -or -not $pattern) {
    Write-Host 'ERROR: this bootstrap does not have the release values. Use the file published in the release.'
    return
  }
  $r = $repo.Trim().TrimEnd('/')
  if ($r.EndsWith('.git')) { $r = $r.Substring(0, $r.Length - 4) }
  $m = [regex]::Match($r, '^([a-z]+://)([^/]+)/(.+)/([^/]+)$', 'IgnoreCase')
  $url = $pattern.Replace('{repo}', $r).Replace('{version}', $ver).Replace('{file}', 'setup-windows.ps1')
  if ($m.Success) { $url = $url.Replace('{host}', $m.Groups[2].Value).Replace('{owner}', $m.Groups[3].Value).Replace('{name}', $m.Groups[4].Value) }

  $dest = Join-Path ([IO.Path]::GetTempPath()) ('workshop-setup-windows-' + $ver + '.ps1')
  Write-Host ('Downloading the workshop setup (' + $ver + ')...')
  $headers = @{}
  # REPO_TOKEN (so em desenvolvimento): vai so para o servidor do repositorio, nunca para o ecra.
  if ($env:REPO_TOKEN -and $m.Success -and ([Uri]$url).Authority -eq $m.Groups[2].Value) { $headers['Authorization'] = 'token ' + $env:REPO_TOKEN }
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest -Headers $headers -UserAgent 'workshop-claude-bootstrap' -ErrorAction Stop
  } catch {
    Write-Host ('ERROR: could not download ' + $url)
    Write-Host ('  ' + $_.Exception.Message)
    Write-Host 'Check the network or the proxy (see E-NET-01 and E-NET-03 in docs/TROUBLESHOOTING.md).'
    return
  }
  if (-not (Test-Path -LiteralPath $dest)) {
    Write-Host ('ERROR: the downloaded setup was removed right away (' + $dest + '), usually by an antivirus. See E-PERM-02 in docs/TROUBLESHOOTING.md.')
    return
  }
  # Uma pagina web no lugar do script (bloqueio de um proxy ou de um filtro, portal de uma rede WiFi): explica-se, em
  # vez de um "SHA-256 errado" ou de erros de sintaxe do PowerShell. A mesma regra que o Test-WsHtmlFile do setup.
  $head = ''
  try {
    $fs = [IO.File]::OpenRead($dest)
    try { $buf = New-Object byte[] 512; $k = $fs.Read($buf, 0, 512); $head = ([Text.Encoding]::UTF8.GetString($buf, 0, $k)) -replace '[\s\uFEFF]', '' } finally { $fs.Close() }
  } catch { $head = '' }
  if ($head -match '^(<\?xml[^>]*>)?(<!--[^>]*-->)?<(!doctypehtml|html|head|body)') {
    Remove-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue
    Write-Host ('ERROR: a web page came instead of the setup (' + $url + '): a proxy, a company filter or a WiFi login page.')
    Write-Host 'Open that address in the browser to see the page, or use another network. See E-NET-01 in docs/TROUBLESHOOTING.md.'
    return
  }
  if ($WsSetupSha256) {
    $got = (Get-FileHash -Algorithm SHA256 -LiteralPath $dest).Hash.ToLowerInvariant()
    if ($got -ne $WsSetupSha256.ToLowerInvariant()) {
      Remove-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue
      Write-Host 'ERROR: the downloaded setup does not match the release SHA-256. I did not run it.'
      return
    }
  }
  $ps = Get-WsBootPowerShellPath $env:SystemRoot ([Environment]::Is64BitOperatingSystem) ([Environment]::Is64BitProcess)
  if (-not (Test-Path -LiteralPath $ps)) { $ps = 'powershell.exe' }
  # PowerShell ISE: um programa de consola corrido daqui nao recebe o teclado, e a primeira pergunta ficava a
  # espera para sempre (com o .lock preso). O setup abre numa janela nova do PowerShell, que fica aberta no fim.
  $ise = [bool](Get-Variable -Name psISE -ValueOnly -ErrorAction SilentlyContinue)
  if ($ise -or ([string]$Host.Name -match '\bISE\b')) {
    $line = '-NoProfile -ExecutionPolicy Bypass -NoExit -File "' + $dest + '"'
    if ($all.Count -gt 0) { $line += ' ' + ($all -join ' ') }
    try {
      Start-Process -FilePath $ps -ArgumentList $line -ErrorAction Stop
      Write-Host 'PowerShell ISE cannot answer the questions of the setup, so the setup opened in a new PowerShell window. Continue there.'
    } catch {
      Write-Host 'ERROR: PowerShell ISE cannot run the setup. Open "Windows PowerShell" (not ISE) from the Start menu and run the same command there. See E-SO-08 in docs/TROUBLESHOOTING.md.'
    }
    return
  }
  # "| Out-Default": o setup fica com a consola (cores, perguntas sem fim de linha), nunca com a saida capturada.
  & $ps -NoProfile -ExecutionPolicy Bypass -File $dest @all | Out-Default
  Write-Host ('(setup finished with exit code ' + $LASTEXITCODE + ')')
}

# WS_NO_MAIN=1: so define as funcoes (testes Pester).
if ($env:WS_NO_MAIN -ne '1') { Invoke-WsBootstrap -PassArgs $args }
