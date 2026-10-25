#Requires -Version 5.1
<#
.SYNOPSIS
  Setup for the workshop "Agent Orchestration with Claude" on Windows 10/11 (x64 and ARM64). No admin needed.

.DESCRIPTION
  Usually run through the bootstrap:   irm <url>/bootstrap-windows.ps1 | iex
  Or directly:                         powershell -NoProfile -ExecutionPolicy Bypass -File setup-windows.ps1
  After the first time:                powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Check

  The setup speaks English (D-20). The machine language (Get-UICulture, Get-Culture) only configures Claude's
  answers (Claude Code "language" setting) and the language of the workshop texts (pt or en). The language chosen
  at the first install is kept on later runs. To choose it, set WORKSHOP_LANG (pt-BR, pt-PT, en, hi or he) in the
  same window before the one-liner:   $env:WORKSHOP_LANG='pt-BR'; irm <url>/bootstrap-windows.ps1 | iex
  A value the setup doesn't know is ignored, with a note.
  This file is ASCII only (PowerShell 5.1 reads UTF-8 without BOM as ANSI). All texts come from
  setup/messages.en.json (the same catalog as docs/TROUBLESHOOTING.md), read as UTF-8.

.PARAMETER Check
  Check only and show the state (2 to 3 minutes). Installs nothing.
.PARAMETER Doctor
  Check everything and, if something fails, ask Claude for a full diagnosis.
.PARAMETER Uninstall
  Undo what the setup installed (manifest.json): settings, MCP, agents, skills, kit, app and shortcut. Alias: -Desinstalar.
.PARAMETER Cleanup
  Remove the workshop's data (the exercise projects, the mission book, the panel registration and the Agent Memory
  notes of those projects) and keep the practice project and the tools. Asks first (y/N; -Yes answers yes). Alias: -Limpar.
.PARAMETER NoDesktop
  Do not install Claude Desktop (optional). Alias: -SemDesktop.
.PARAMETER Yes
  Answer "yes" to simple questions (for tests). Logins and suggested commands never run on their own. Alias: -Sim.
.PARAMETER ReplaceStatusline
  Replace an existing statusline with the workshop one (yours stays in the backup). Alias: -SubstituirStatusline.
.PARAMETER Help
  Show this help. Alias: -Ajuda.
#>
[CmdletBinding()]
param(
  [switch]$Check,
  [switch]$Doctor,
  [Alias('Desinstalar')][switch]$Uninstall,
  [Alias('Limpar')][switch]$Cleanup,
  [Alias('SemDesktop')][switch]$NoDesktop,
  [Alias('Sim')][switch]$Yes,
  [Alias('SubstituirStatusline')][switch]$ReplaceStatusline,
  [Alias('Ajuda')][switch]$Help
)

$script:Params = @{ Check = [bool]$Check; Doctor = [bool]$Doctor; Desinstalar = [bool]$Uninstall; Limpar = [bool]$Cleanup; SemDesktop = [bool]$NoDesktop; Sim = [bool]$Yes; SubstituirStatusline = [bool]$ReplaceStatusline; Ajuda = [bool]$Help }

# >>> WS-INJETADO >>>
# Na fonte este bloco esta vazio. tools/build-release.sh injeta aqui (em base64) o repos.conf,
# o pricing.json, as mensagens e o SHA-256 do arquivo do kit.
# <<< WS-INJETADO <<<

Set-StrictMode -Off
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$script:Utf8NoBom = New-Object System.Text.UTF8Encoding $false
$script:PublicCas = 'Google Trust Services|Let.s Encrypt|ISRG|DigiCert|Sectigo|COMODO|USERTrust|GlobalSign|Amazon|Starfield|Go Daddy|GoDaddy|Entrust|Microsoft|Cloudflare|Baltimore|IdenTrust|SSL\.com|Certainly|ZeroSSL|Buypass|HARICA|Actalis|QuoVadis|Certum|Telia|SwissSign|Trustwave|Apple'
$script:SecretEnvNames = @('REPO_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN')
$script:HelperSchema = '{"type":"object","properties":{"causa":{"type":"string"},"comandos":{"type":"array","items":{"type":"string"}}},"required":["causa","comandos"]}'
$script:WebView2Guid = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'

# =============================================================== funcoes puras (testadas com Pester)

function ConvertFrom-WsConf {
  # Le texto CHAVE=valor (repos.conf). As variaveis de ambiente com o mesmo nome tem prioridade.
  param([string]$Text, [hashtable]$EnvOverride)
  $conf = [ordered]@{}
  foreach ($raw in ($Text -split "`r?`n")) {
    $line = $raw.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { continue }
    $i = $line.IndexOf('=')
    if ($i -le 0) { continue }
    $k = $line.Substring(0, $i).Trim()
    if ($k -cnotmatch '^[A-Z][A-Z0-9_]*$') { continue }
    $v = $line.Substring($i + 1).Trim()
    if ($EnvOverride -and $EnvOverride.ContainsKey($k) -and $EnvOverride[$k]) { $v = [string]$EnvOverride[$k] }
    $conf[$k] = $v
  }
  return $conf
}

function Get-WsRepoParts {
  param([string]$Url)
  $u = $Url.Trim().TrimEnd('/')
  if ($u.EndsWith('.git')) { $u = $u.Substring(0, $u.Length - 4) }
  $m = [regex]::Match($u, '^([a-z]+://)([^/]+)/(.+)/([^/]+)$', 'IgnoreCase')
  if (-not $m.Success) { return @{ repo = $u; host = ''; owner = ''; name = '' } }
  $h = $m.Groups[2].Value -replace '^[^@]*@', ''
  return @{ repo = $u; host = $h; owner = $m.Groups[3].Value; name = $m.Groups[4].Value }
}

function Expand-WsPattern {
  param([string]$Pattern, [hashtable]$Values)
  $t = $Pattern
  foreach ($k in $Values.Keys) { $t = $t.Replace('{' + $k + '}', [string]$Values[$k]) }
  return $t
}

function ConvertTo-WsVersionParts {
  param([string]$Version)
  $m = [regex]::Match([string]$Version, '[0-9]+(\.[0-9]+)*')
  $parts = @(0, 0, 0, 0)
  if ($m.Success) {
    $i = 0
    foreach ($p in $m.Value.Split('.')) { if ($i -lt 4) { $parts[$i] = [int64]$p }; $i++ }
  }
  return , $parts
}

function Compare-WsVersion {
  # -1 se A < B, 0 se iguais, 1 se A > B (ignora sufixos como " (Claude Code)")
  param([string]$A, [string]$B)
  $x = ConvertTo-WsVersionParts $A
  $y = ConvertTo-WsVersionParts $B
  for ($i = 0; $i -lt 4; $i++) {
    if ($x[$i] -gt $y[$i]) { return 1 }
    if ($x[$i] -lt $y[$i]) { return -1 }
  }
  return 0
}

function Get-WsVersionOf {
  param([string]$Text)
  $m = [regex]::Match([string]$Text, '[0-9]+\.[0-9]+(\.[0-9]+)?')
  if ($m.Success) { return $m.Value }
  return ''
}

function Protect-WsText {
  # Filtro de redacao (mesmas regras que installer/lib/redact.mjs; casos em tools/test/redact-cases.json).
  param([string]$Text, [string[]]$Literals)
  $s = [string]$Text
  foreach ($lit in $Literals) { if ($lit -and $lit.Length -ge 4) { $s = $s.Replace($lit, '***') } }
  $s = [regex]::Replace($s, 'sk-ant-[A-Za-z0-9_-]{4,}', 'sk-ant-***')
  $s = [regex]::Replace($s, 'github_pat_[A-Za-z0-9_]{10,}', 'github_pat_***')
  $s = [regex]::Replace($s, '(gh[pousr]_)[A-Za-z0-9]{10,}', '$1***')
  $s = [regex]::Replace($s, '([Aa]uthorization["'']?[ \t]*[:=][ \t]*)[^"''\r\n]+', '$1***')
  $s = [regex]::Replace($s, '([Bb]earer[ \t]+)[A-Za-z0-9._~+/=-]+', '$1***')
  $s = [regex]::Replace($s, '(://)[^/@\s"'']+@', '$1***@')
  $s = [regex]::Replace($s, '((?:[Tt][Oo][Kk][Ee][Nn]|[Ss][Ee][Cc][Rr][Ee][Tt]|[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]|[Pp][Aa][Ss][Ss][Ww][Dd]|[Aa][Pp][Ii][_-]?[Kk][Ee][Yy])["'']?[ \t]*[:=][ \t]*["'']?)[^"''\s,&]+', '$1***')
  return $s
}

function Get-WsSecretLiterals {
  $out = @()
  foreach ($n in $script:SecretEnvNames) {
    $v = [Environment]::GetEnvironmentVariable($n)
    if ($v -and $v.Length -ge 4) { $out += $v }
  }
  return $out
}

function Get-WsPricingModelMap {
  # pricing.json has English keys (models, long_prompt.above_tokens); older copies used Portuguese ones
  # (modelos, prompt_longo.acima_de_tokens). Returns the models object either way.
  param($Pricing)
  if (-not $Pricing) { return $null }
  if ($Pricing.PSObject.Properties.Name -contains 'models') { return $Pricing.models }
  return $Pricing.modelos
}

function Get-WsLongPrompt {
  # The long-prompt tier of a model (or $null) and the token threshold: @{ Price; Above }.
  param($Model)
  foreach ($k in @('long_prompt', 'prompt_longo')) {
    if ($Model.PSObject.Properties.Name -contains $k) {
      $lp = $Model.$k
      $above = $lp.above_tokens
      if ($null -eq $above) { $above = $lp.acima_de_tokens }
      return @{ Price = $lp; Above = [double]$above }
    }
  }
  return $null
}

function Resolve-WsModel {
  param([string]$Id, $Pricing)
  if (-not $Id -or -not $Pricing) { return $null }
  $m = ($Id.ToLowerInvariant() -replace '\[.*\]$', '')
  if ($Pricing.aliases -and ($Pricing.aliases.PSObject.Properties.Name -contains $m)) { return $Pricing.aliases.$m }
  $keys = @((Get-WsPricingModelMap $Pricing).PSObject.Properties.Name | Sort-Object { $_.Length } -Descending)
  foreach ($k in $keys) { if ($m -eq $k -or $m.StartsWith($k + '-') -or $m.StartsWith($k + '@')) { return $k } }
  return $null
}

function Format-WsUsd {
  param($Value)
  if ($null -eq $Value) { return 'US$ ?' }
  $v = [double]$Value
  $casas = 2
  if ($v -lt 0.01) { $casas = 4 }
  return 'US$ ' + $v.ToString('F' + $casas, [Globalization.CultureInfo]::InvariantCulture)
}

function Get-WsCusto {
  # Custo de um resultado "claude -p --output-format json" pelos tokens de modelUsage e o pricing.json
  # (mesmas contas que installer/lib/cost.mjs; casos em tools/test/cost-cases.json).
  param($Result, $Pricing)
  $total = 0.0
  $unknown = @()
  $mu = $null
  if ($Result -and ($Result.PSObject.Properties.Name -contains 'modelUsage')) { $mu = $Result.modelUsage }
  if ($mu) {
    foreach ($prop in $mu.PSObject.Properties) {
      $k = Resolve-WsModel $prop.Name $Pricing
      if (-not $k) { $unknown += $prop.Name; continue }
      $u = $prop.Value
      $p = (Get-WsPricingModelMap $Pricing).$k
      $it = 0; $cr = 0; $cw = 0; $ot = 0
      if ($u.inputTokens) { $it = [double]$u.inputTokens }
      if ($u.cacheReadInputTokens) { $cr = [double]$u.cacheReadInputTokens }
      if ($u.cacheCreationInputTokens) { $cw = [double]$u.cacheCreationInputTokens }
      if ($u.outputTokens) { $ot = [double]$u.outputTokens }
      $lp = Get-WsLongPrompt $p
      if ($lp -and (($it + $cr + $cw) -gt $lp.Above)) { $p = $lp.Price }
      $total += ($it * $p.input + $ot * $p.output + $cw * $p.cache_write_5m + $cr * $p.cache_read) / 1e6
    }
  }
  $usd = $total
  if ($unknown.Count -gt 0 -or -not $Pricing) { $usd = $null }
  return @{ Usd = $usd; Texto = (Format-WsUsd $usd); Desconhecidos = $unknown }
}

function Format-WsMsg {
  # Substitui {NOME} por valores; os desconhecidos ficam como estao.
  param([string]$Template, [hashtable]$Values)
  $t = [string]$Template
  if ($Values) { foreach ($k in $Values.Keys) { $t = $t.Replace('{' + $k + '}', [string]$Values[$k]) } }
  return $t
}

function ConvertTo-WsArgLine {
  # Junta argumentos numa linha de comandos do Windows (regras do CommandLineToArgvW / MSVCRT).
  param([string[]]$Arguments)
  $parts = @()
  foreach ($a in $Arguments) {
    if ($null -eq $a) { $a = '' }
    if ($a -ne '' -and $a -notmatch '[\s"]') { $parts += $a; continue }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('"')
    $bs = 0
    foreach ($ch in $a.ToCharArray()) {
      if ($ch -eq '\') { $bs++; continue }
      if ($ch -eq '"') { [void]$sb.Append('\' * ($bs * 2 + 1)); [void]$sb.Append('"'); $bs = 0; continue }
      if ($bs -gt 0) { [void]$sb.Append('\' * $bs); $bs = 0 }
      [void]$sb.Append($ch)
    }
    if ($bs -gt 0) { [void]$sb.Append('\' * ($bs * 2)) }
    [void]$sb.Append('"')
    $parts += $sb.ToString()
  }
  return ($parts -join ' ')
}

function Get-WsNetCode {
  # Codigo do catalogo a partir do estado de uma WebException e do codigo HTTP.
  # 'Blocked': o antivirus (ou outra seguranca) bloqueou ou apagou o ficheiro descarregado.
  # 'HtmlPage': veio uma pagina web (bloqueio de um proxy ou de um filtro, portal de uma rede WiFi) em vez do ficheiro.
  # 403 e 451 sao a recusa de um filtro. $script:ProxyDead: o proxy do sistema (o dos downloads deste PowerShell) nao
  # responde, e "nao liga" ou "nao resolve" sao dele. $script:DlPartial: ja tinham chegado bytes e a transferencia
  # parou ou partiu-se a meio (uma falha passageira, nao um bloqueio).
  param([string]$Status, [int]$Http)
  if ($Status -eq 'Blocked') { return 'E-PERM-02' }
  # ERROR_DISK_FULL / ERROR_HANDLE_DISK_FULL ao escrever o ficheiro: o disco, nao a rede.
  if ($Status -eq 'DiskFull') { return 'E-SO-06' }
  if ($Http -eq 407) { return 'E-NET-03' }
  if ($Http -eq 403 -or $Http -eq 451 -or $Status -eq 'HtmlPage') { return 'E-NET-01' }
  if ($script:DlPartial -and @('Timeout', 'ReceiveFailure', 'ConnectionClosed', 'KeepAliveFailure', 'ConnectFailure', 'PipelineFailure', 'RequestCanceled') -contains $Status) { return 'E-NET-07' }
  switch ($Status) {
    'NameResolutionFailure' { if ($script:ProxyDead) { return 'E-NET-03' }; return 'E-NET-02' }
    'ProxyNameResolutionFailure' { return 'E-NET-03' }
    'TrustFailure' { return 'E-NET-04' }
    'SecureChannelFailure' { return 'E-NET-04' }
    'ConnectFailure' { if ($script:ProxyDead) { return 'E-NET-03' }; return 'E-NET-01' }
    'Timeout' { if ($script:ProxyDead) { return 'E-NET-03' }; return 'E-NET-01' }
    'ConnectionClosed' { return 'E-NET-01' }
    'ReceiveFailure' { return 'E-NET-01' }
  }
  return 'E-NET-07'
}

function Format-WsProxyShow {
  # Proxy para mostrar no ecra, sem utilizador nem palavra-passe (http://u:p@proxy:8080 -> http://proxy:8080).
  param([string]$Proxy)
  if ($Proxy -match '://') { return ($Proxy -replace '://.*@', '://') }
  return ($Proxy -replace '^.*@', '')
}

function Get-WsNetProbeUrls {
  # Os URLs do teste de rede do passo 0: https://<servidor>/ de cada um e a raiz do servidor do kit, sem repetidos.
  # A raiz do claude.ai responde 403 a quem nao e um browser, mesmo numa rede aberta: no lugar dela testa-se o
  # instalador (-Probe, 302 com a rede aberta), para o 403 de um filtro nao passar por "acessivel".
  param([string[]]$Hosts, [string]$KitUrl, [string]$Probe)
  $pb = ''
  try { $pu = [Uri]$Probe; $pb = $pu.Scheme + '://' + $pu.Authority + '/' } catch { $pb = '' }
  $out = @()
  foreach ($h in $Hosts) {
    if (-not $h) { continue }
    $u = 'https://' + $h + '/'
    if ($pb -and $u -eq $pb) { $u = $Probe }
    if ($out -notcontains $u) { $out += $u }
  }
  try { $k = [Uri]$KitUrl; $b = $k.Scheme + '://' + $k.Authority + '/'; if ($out -notcontains $b) { $out += $b } } catch { }
  return , $out
}

function Get-WsNetWarnings {
  # Os avisos do teste de rede do passo 0, por ordem: @(codigo, detalhe) de cada um. Se a causa e o proxy (E-NET-03),
  # o E-NET-05 ("define o HTTPS_PROXY") so confundia, e o detalhe e o proxy (-ProxyShow), nao a lista de servidores.
  # -ProxyWarned: o Test-WsProxy ja avisou que o proxy nao responde (o E-NET-03 nao se repete).
  param([string[]]$Fails, [string[]]$Codes, [bool]$ApiOk, [string]$ProxyShow, [bool]$ProxyWarned)
  # Um aviso por codigo, com os servidores desse codigo (o primeiro vai para os comandos do aviso).
  $out = @()
  if (@($Fails).Count -eq 0) { return , $out }
  $u = @($Codes | Where-Object { $_ } | Sort-Object -Unique)
  if (-not $ApiOk -and ($u -notcontains 'E-NET-03')) { $out += , @('E-NET-05', 'api.anthropic.com') }
  foreach ($c in $u) {
    $hs = @()
    for ($i = 0; $i -lt @($Fails).Count; $i++) { if (@($Codes)[$i] -eq $c) { $hs += @($Fails)[$i] } }
    $d = ($hs -join ', ')
    if ($c -eq 'E-NET-03') {
      if ($ProxyWarned) { continue }
      if ($ProxyShow) { $d = $ProxyShow }
    }
    $out += , @($c, $d)
  }
  return , $out
}

function Test-WsHtmlFile {
  # Uma pagina web (bloqueio de um proxy ou de um filtro, portal de uma rede WiFi) em vez do ficheiro: comeca por uma
  # marca HTML, depois de tirar os espacos e o BOM. Os scripts, as listas de SHA-256 e os arquivos que o setup
  # descarrega nunca comecam assim, e a marca tem de estar no inicio (um script que fala de <html> mais abaixo nao conta).
  param([string]$Path)
  $head = ''
  $fs = $null
  try {
    $fs = [IO.File]::OpenRead($Path)
    $buf = New-Object byte[] 512
    $k = $fs.Read($buf, 0, 512)
    $head = ([Text.Encoding]::UTF8.GetString($buf, 0, $k)) -replace '[\s\uFEFF]', ''
  } catch { return $false }
  finally { if ($fs) { $fs.Close() } }
  return ($head -match '^(<\?xml[^>]*>)?(<!--[^>]*-->)?<(!doctypehtml|html|head|body)')
}

function Get-WsDlFinalHost {
  # O servidor final de um download que falhou, so se nao for o do URL pedido: o pedido foi redirecionado (ex.:
  # github.com -> release-assets.githubusercontent.com, e esse que o IT tem de libertar). Vem do URI da resposta
  # (PowerShell 5.1 e 7) ou, sem resposta, do texto de um "nome que nao resolve". Nunca o URL completo: os de
  # release-assets levam uma assinatura na query string.
  param($Exception, [string]$Status, [string]$UrlHost)
  $h = ''
  try {
    $resp = $null
    if ($Exception -and ($Exception.PSObject.Properties.Name -contains 'Response')) { $resp = $Exception.Response }
    if ($resp) {
      $names = $resp.PSObject.Properties.Name
      if (($names -contains 'ResponseUri') -and $resp.ResponseUri) { $h = [string]$resp.ResponseUri.Host }
      elseif (($names -contains 'RequestMessage') -and $resp.RequestMessage) { $h = [string]$resp.RequestMessage.RequestUri.Host }
    }
  } catch { $h = '' }
  if (-not $h -and $Status -eq 'NameResolutionFailure' -and $Exception) {
    $msg = [string]$Exception.Message
    if ($msg -match "'([A-Za-z0-9.-]+)'") { $h = $Matches[1] }   # PowerShell 5.1: ... could not be resolved: 'servidor'
    elseif ($msg -match '\(([A-Za-z0-9.-]+):\d+\)') { $h = $Matches[1] }   # PowerShell 7: ... (servidor:443)
  }
  if ($h -and $h -ieq $UrlHost) { $h = '' }
  return $h
}

function Format-WsMb {
  # Bytes -> MB para mostrar: uma casa decimal abaixo de 10 MB (2.0), sem casas a partir dai (213).
  param([double]$Bytes)
  $m = $Bytes / 1MB
  if ($m -lt 0) { $m = 0 }
  if ($m -lt 10) { return $m.ToString('0.0', [Globalization.CultureInfo]::InvariantCulture) }
  return ([Math]::Floor($m)).ToString([Globalization.CultureInfo]::InvariantCulture)
}

function Get-WsSettingsProxy {
  # HTTPS_PROXY do "env" do settings.json do Claude Code: o Claude Code aplica-o por cima do ambiente do terminal.
  # As propriedades do PowerShell nao distinguem maiusculas, por isso tambem apanha o https_proxy.
  param([string]$File)
  if (-not $File -or -not (Test-Path -LiteralPath $File)) { return '' }
  $j = $null
  try { $j = [IO.File]::ReadAllText($File) | ConvertFrom-Json } catch { return '' }
  if ($j -and $j.env -and $j.env.HTTPS_PROXY) { return [string]$j.env.HTTPS_PROXY }
  return ''
}

# Codigos Win32 de "bloqueado pela seguranca do computador": 225 e 226 antivirus (ficheiro com virus ou apagado),
# 1260 AppLocker ou Software Restriction Policies, 4551 WDAC (Application Control), 4580 a 4583 Smart App Control.
$script:BlockedWin32 = @(225, 226, 1260, 4551, 4580, 4581, 4582, 4583)

function Get-WsBlockedCode {
  # Procura numa excecao (e nas interiores) um codigo Win32 de bloqueio, em NativeErrorCode ou num HRESULT
  # 0x8007xxxx. -AccessDenied tambem conta o 5 (acesso negado: ao arrancar um programa e quase sempre um EDR).
  # Devolve o codigo, ou 0.
  param($Exception, [switch]$AccessDenied)
  $e = $Exception
  for ($i = 0; $e -and $i -lt 10; $i++) {
    $codes = @()
    if ($e -is [ComponentModel.Win32Exception]) { $codes += [int]$e.NativeErrorCode }
    $hr = 0
    try { $hr = [int]$e.HResult } catch { $hr = 0 }
    if ((($hr -shr 16) -band 0xFFFF) -eq 0x8007) { $codes += ($hr -band 0xFFFF) }
    foreach ($c in $codes) { if ($script:BlockedWin32 -contains $c -or ($AccessDenied -and $c -eq 5)) { return [int]$c } }
    $e = $e.InnerException
  }
  return 0
}

function Get-WsWebErrorInfo {
  # Estado e codigo HTTP de uma falha de download, para o Get-WsNetCode: a WebException do PowerShell 5.1 e as
  # HttpResponseException e HttpRequestException do PowerShell 7 (que antes caiam todas em E-NET-07).
  # Devolve @{ Status; Http }, com os nomes do WebExceptionStatus (e 'Blocked' quando foi a seguranca).
  param($Exception)
  $ex = $Exception
  if (-not $ex) { return @{ Status = ''; Http = 0 } }
  if (Get-WsBlockedCode $ex) { return @{ Status = 'Blocked'; Http = 0 } }
  $st = ''; $http = 0
  if ($ex -is [System.Net.WebException]) { $st = [string]$ex.Status }
  if (($ex.PSObject.Properties.Name -contains 'Response') -and $ex.Response) { try { $http = [int]$ex.Response.StatusCode } catch { $http = 0 } }
  $e = $ex
  for ($i = 0; $e -and -not $st -and $i -lt 10; $i++) {
    if ($e -is [System.Net.Sockets.SocketException]) {
      switch ([string]$e.SocketErrorCode) {
        'HostNotFound' { $st = 'NameResolutionFailure' }
        'TryAgain' { $st = 'NameResolutionFailure' }
        'NoData' { $st = 'NameResolutionFailure' }
        'TimedOut' { $st = 'Timeout' }
        default { $st = 'ConnectFailure' }
      }
    } elseif ($e -is [IO.IOException] -and @(112, 39) -contains ($e.HResult -band 0xFFFF)) { $st = 'DiskFull' }
    elseif ($e -is [System.Security.Authentication.AuthenticationException]) { $st = 'TrustFailure' }
    elseif ($e -is [TimeoutException] -or $e.GetType().Name -eq 'TaskCanceledException') { $st = 'Timeout' }
    $e = $e.InnerException
  }
  # PowerShell 7: um 407 do proxy no CONNECT so aparece no texto ("... failed with status code '407'").
  if ($http -eq 0 -and [string]$ex.Message -match '\b407\b') { $http = 407 }
  if ($http -gt 0 -and -not $st) { $st = 'ProtocolError' }
  return @{ Status = $st; Http = $http }
}

function Test-WsPublicCa {
  param([string]$Issuer)
  return [bool]($Issuer -match $script:PublicCas)
}

function ConvertTo-WsPathKey {
  # Chave para comparar pastas do PATH (com -ieq): %VARIAVEIS% expandidas, sem aspas e sem barra no fim.
  param([string]$Entry)
  return ([Environment]::ExpandEnvironmentVariables([string]$Entry).Trim('"').TrimEnd('\'))
}

function Test-WsPathHas {
  # A lista PATH ja tem esta pasta? Outra caixa, a barra no fim, aspas ou %USERPROFILE%\... contam como a mesma.
  param([string]$PathValue, [string]$Entry)
  if (-not $PathValue -or -not $Entry) { return $false }
  $norm = ConvertTo-WsPathKey $Entry
  foreach ($i in $PathValue.Split(';')) { if ($i -ne '' -and (ConvertTo-WsPathKey $i) -ieq $norm) { return $true } }
  return $false
}

function Add-WsPathEntry {
  # Poe uma pasta no inicio de uma lista PATH. Se ja la estiver (em qualquer posicao), passa para o inicio com a
  # grafia que tinha (uma %USERPROFILE%\... do registo nao vira C:\Users\...): um claude, uv ou gh antigo que venha
  # antes no PATH (npm, pipx, winget) deixa de passar a frente do do workshop. As copias com a mesma grafia saem;
  # uma com outra grafia fica onde esta (e da pessoa: o --uninstall, que tira a grafia do kit, nunca a leva).
  # Devolve a lista nova.
  param([string]$PathValue, [string]$Entry)
  $items = @()
  if ($PathValue) { $items = @($PathValue.Split(';') | Where-Object { $_ -ne '' }) }
  if (-not $Entry) { return ($items -join ';') }
  $norm = ConvertTo-WsPathKey $Entry
  $keep = $null
  foreach ($i in $items) { if ((ConvertTo-WsPathKey $i) -ieq $norm) { $keep = $i; break } }
  if ($null -eq $keep) { $keep = $Entry }
  $raw = $keep.TrimEnd('\')
  $rest = @($items | Where-Object { $_.TrimEnd('\') -ine $raw })
  return ((@($keep) + $rest) -join ';')
}

function Remove-WsPathEntry {
  param([string]$PathValue, [string]$Entry)
  if (-not $PathValue) { return '' }
  $norm = $Entry.TrimEnd('\')
  return ((@($PathValue.Split(';') | Where-Object { $_ -ne '' -and $_.TrimEnd('\') -ine $norm })) -join ';')
}

function Move-WsPathFront {
  # As pastas de $Entries que ja estao na lista PATH passam para o inicio, pela ordem dada (a primeira fica a
  # frente de todas); as que nao estao nao entram. Devolve a lista nova, igual a dada se a ordem ja era essa.
  param([string]$PathValue, [string[]]$Entries)
  $p = $PathValue
  for ($k = $Entries.Count - 1; $k -ge 0; $k--) { if (Test-WsPathHas $p $Entries[$k]) { $p = Add-WsPathEntry $p $Entries[$k] } }
  return $p
}

function ConvertTo-WsLangTag {
  # Lingua da maquina (D-20): texto -> etiqueta como "pt-PT", "he" ou "en". Mesmas regras que
  # installer/lib/languages.mjs (casos partilhados em tools/test/language-cases.json). Vazio sem informacao.
  param([string]$Text)
  $t = (([string]$Text).Trim() -split '[.@]')[0].Replace('_', '-')
  if ($t -eq '' -or $t -match '^(?i:c|posix)$') { return '' }
  # So uma etiqueta BCP 47 (como eEtiqueta e ws_lang_tag): 2-3 letras ASCII e subetiquetas de ate 8 letras ou
  # algarismos. "brasil", "Portugues" com acento, "pt-*", "en,pt", "pt BR" e "UTF-8" nao dao informacao.
  # [0-9] e nao \d (no .NET o \d aceita algarismos Unicode) e -cnotmatch com as duas caixas: sem distinguir
  # maiusculas, o .NET usa a cultura atual e numa maquina turca o [a-z] tambem aceitava o I com ponto.
  # \z e nao $: no .NET o $ tambem aceita um \n no fim ("pt`n.UTF-8" passava como "pt`n").
  if ($t -cnotmatch '^[A-Za-z]{2,3}(-[A-Za-z0-9]{0,8})*\z' -or $t -match '^utf(-|$)') { return '' }
  $parts = @($t.Split('-') | Where-Object { $_ -ne '' })
  $base = $parts[0].ToLowerInvariant()
  if ($base -eq 'iw') { $base = 'he' }
  $out = @($base)
  for ($i = 1; $i -lt $parts.Count; $i++) {
    $p = $parts[$i]
    if ($p.Length -eq 2) { $p = $p.ToUpperInvariant() }
    elseif ($p.Length -eq 4) { $p = $p.Substring(0, 1).ToUpperInvariant() + $p.Substring(1).ToLowerInvariant() }
    $out += $p
  }
  return ($out -join '-')
}

function Select-WsLang {
  # WORKSHOP_LANG, lingua de apresentacao (Get-UICulture) e formato regional (Get-Culture) -> etiqueta; 'en' se nada servir.
  # Um WORKSHOP_LANG que nao seja pt, en, hi ou he nao conta (Test-WsLangOk): fica a lingua do sistema.
  param([string]$Override, [string]$UiCulture, [string]$Culture)
  if (-not (Test-WsLangOk $Override)) { $Override = '' }
  foreach ($c in @($Override, $UiCulture, $Culture)) {
    $t = ConvertTo-WsLangTag $c
    if ($t) { return $t }
  }
  return 'en'
}

function Get-WsLangKit {
  # O kit so tem textos em portugues e em ingles.
  param([string]$Tag)
  if ($Tag -match '^pt(-|$)') { return 'pt' }
  return 'en'
}

function Test-WsLangOk {
  # WORKSHOP_LANG (e a lingua guardada na instalacao) so contam se forem uma das linguas do workshop: uma
  # gralha como "br", "brasil" ou "pt-*" nao pode ganhar a lingua da maquina (o kit ficava em ingles).
  param([string]$Text)
  return ((ConvertTo-WsLangTag $Text) -cmatch '^(pt|en|hi|he)(-|$)')
}

function Get-WsInstallUserArgs {
  # Argumentos para "node install-user.mjs <sub>": caminhos completos, um argumento cada (espacos e acentos).
  # -NoProxy: o NO_PROXY completo (Merge-WsNoProxy); sem ele o install-user grava so localhost,127.0.0.1. So vai com
  # o --ca-pem ou o --https-proxy (como no Mac): sem nenhum, o install-user tira o NO_PROXY que um setup anterior gravou.
  # -Extra: argumentos a mais no fim (no instalar: --projects-dir e a participacao no painel).
  param([string]$Sub, [string]$NodePath, [string]$KitSrc, [string]$CaPem, [string]$Proxy, [switch]$SubstituirStatusline, [string]$Lang, [string]$NoProxy, [string[]]$Extra)
  $a = @([IO.Path]::Combine($KitSrc, 'installer', 'install-user.mjs'), $Sub, '--node', $NodePath, '--kit-src', $KitSrc)
  if ($Lang) { $a += @('--lingua-maquina', $Lang) }
  if ($CaPem) { $a += @('--ca-pem', $CaPem) }
  if ($Proxy) { $a += @('--https-proxy', $Proxy) }
  if ($NoProxy -and ($CaPem -or $Proxy)) { $a += @('--no-proxy', $NoProxy) }
  if ($SubstituirStatusline) { $a += '--substituir-statusline' }
  if ($Extra) { $a += $Extra }
  return , $a
}

function ConvertFrom-WsTsv {
  # Linhas "chave<TAB>valor" -> lista de pares
  param([string]$Text)
  $out = @()
  foreach ($l in ($Text -split "`r?`n")) {
    if ($l -eq '') { continue }
    $i = $l.IndexOf("`t")
    if ($i -lt 0) { $out += , @($l, ''); continue }
    $out += , @($l.Substring(0, $i), $l.Substring($i + 1))
  }
  return , $out
}

function New-WsStateTable {
  $t = [ordered]@{}
  for ($n = 0; $n -le 12; $n++) {
    $t["$n"] = @{ Estado = ''; Detalhe = ''; Avisos = @(); Falha = $null; Notas = @() }
  }
  return $t
}

function Get-WsSymbol {
  # Unicode de uma coluna (nao emoji) no Windows Terminal; ASCII na consola antiga (conhost), que nao os desenha.
  param([string]$State, [bool]$Emoji)
  if ($Emoji) {
    switch ($State) {
      'feito' { return [string][char]0x2714 }
      'ok' { return [string][char]0x2714 }
      'ja' { return [string][char]0x2714 }
      'aviso' { return [string][char]0x25B2 }
      'falhou' { return [string][char]0x2716 }
      'falta' { return [string][char]0x2716 }
      'naoexec' { return [string][char]0x25CB }
      'saltado' { return [string][char]0x2013 }
    }
    return '-'
  }
  switch ($State) {
    'feito' { return '[OK]' }
    'ok' { return '[OK]' }
    'ja' { return '[OK]' }
    'aviso' { return '[!!]' }
    'falhou' { return '[XX]' }
    'falta' { return '[XX]' }
    'naoexec' { return '[--]' }
    'saltado' { return '[--]' }
  }
  return '[  ]'
}

function Get-WsStateColor {
  param([string]$State)
  switch ($State) { 'feito' { return 'Green' } 'ok' { return 'Green' } 'ja' { return 'Green' } 'aviso' { return 'Yellow' } 'falhou' { return 'Red' } 'falta' { return 'Red' } }
  return 'DarkGray'
}

function Get-WsUiMode {
  # Aspeto da saida: 'fancy' (Windows Terminal: cartoes, lista de passos, spinner e barra), 'ascii' (consola antiga,
  # sem VT: cartoes +--+ e [OK] [!!] [XX], linhas como no plain, sem spinner) ou 'plain' (as linhas de sempre: saida
  # redirecionada, NO_COLOR, TERM=dumb ou menos de 70 colunas).
  param([bool]$Redirected, [int]$Width, [bool]$NoColor, [string]$Term, [bool]$Unicode)
  if ($Redirected -or $NoColor -or $Term -eq 'dumb' -or $Width -lt 70) { return 'plain' }
  if ($Unicode) { return 'fancy' }
  return 'ascii'
}

function Get-WsSummary {
  # Conta o que falta e monta a frase final. Devolve @{ Faltam; Lista; Avisos }.
  param($Table, [hashtable]$Titles)
  $faltam = 0; $lista = @(); $avisos = 0
  foreach ($n in $Table.Keys) {
    $st = $Table[$n].Estado
    if ($st -eq 'falhou' -or $st -eq 'falta' -or $st -eq 'naoexec') { $faltam++; $lista += ('{0} ({1})' -f $n, $Titles[$n]) }
    elseif ($st -eq 'aviso') { $avisos++ }
  }
  return @{ Faltam = $faltam; Lista = ($lista -join '; '); Avisos = $avisos }
}

function Test-WsDependencies {
  # Devolve o numero do primeiro passo de que este depende e que falhou, ou $null.
  param($Table, [int[]]$Deps)
  foreach ($d in $Deps) {
    $st = $Table["$d"].Estado
    if ($st -eq 'falhou' -or $st -eq 'falta' -or $st -eq 'naoexec') { return $d }
  }
  return $null
}

function Get-WsUvPythonBlockers {
  # Variaveis que impedem o uv de usar o Python gerido (a app Agent Memory precisa dele). Devolve os nomes.
  param([hashtable]$EnvValues)
  $out = @()
  $d = [string]$EnvValues['UV_PYTHON_DOWNLOADS']
  if ($d -and @('never', 'manual') -contains $d.ToLowerInvariant()) { $out += 'UV_PYTHON_DOWNLOADS' }
  $n = [string]$EnvValues['UV_NO_MANAGED_PYTHON']
  if ($n -and @('0', 'false', 'no', 'off') -notcontains $n.ToLowerInvariant()) { $out += 'UV_NO_MANAGED_PYTHON' }
  $p = [string]$EnvValues['UV_PYTHON_PREFERENCE']
  if ($p -and $p.ToLowerInvariant() -eq 'only-system') { $out += 'UV_PYTHON_PREFERENCE' }
  return , $out
}

function Read-WsSelftest {
  # Primeira linha do "agent-memory selftest": "Agent Memory 0.5.0 . Python 3.12.13 . Windows AMD64". Devolve @{ Python; Fts5; Falhas }.
  # Desde a v0.3.0 o texto segue a lingua da app: so a etiqueta [OK] e igual em todas; qualquer outra e uma falha.
  param([string]$Text)
  $py = ''
  $m = [regex]::Match([string]$Text, 'Python ([0-9]+\.[0-9]+(\.[0-9]+)?)')
  if ($m.Success) { $py = $m.Groups[1].Value }
  $fts = [bool]([regex]::IsMatch([string]$Text, '(?m)^\s*\[OK\].*FTS5'))
  # Um [WARN] tambem nao e uma falha (outra pasta com notas, E-MEM-11).
  $falhas = @([regex]::Matches([string]$Text, '(?m)^\s*\[(?!OK\]|WARN\])[^\]\r\n]+\]\s*(.+?)\s*$') | ForEach-Object { $_.Groups[1].Value.Trim() })
  return @{ Python = $py; Fts5 = $fts; Falhas = $falhas }
}

function ConvertTo-WsPem {
  param([byte[][]]$RawCerts)
  $sb = New-Object System.Text.StringBuilder
  foreach ($raw in $RawCerts) {
    [void]$sb.Append("-----BEGIN CERTIFICATE-----`n")
    $b = [Convert]::ToBase64String($raw)
    for ($i = 0; $i -lt $b.Length; $i += 64) { [void]$sb.Append($b.Substring($i, [Math]::Min(64, $b.Length - $i))); [void]$sb.Append("`n") }
    [void]$sb.Append("-----END CERTIFICATE-----`n")
  }
  return $sb.ToString()
}

function Get-WsUserHome {
  # A pasta do perfil (C:\Users\<nome>): a mesma que o Claude Code, o Node, o uv e o install.ps1 usam.
  # No Windows PowerShell 5.1 o $HOME e HOMEDRIVE+HOMEPATH, que com uma pasta pessoal do AD e H:\ (uma partilha
  # de rede, offline sem VPN): o setup instalava num sitio e procurava noutro.
  param([string]$FolderPath, [string]$UserProfile, [string]$PsHomeVar)
  foreach ($p in @($FolderPath, $UserProfile, $PsHomeVar)) { if ($p) { return $p } }
  return ''
}

function Find-WsInFolder {
  # A primeira pasta de -Paths que fica dentro de -Root (a pasta do OneDrive, por exemplo), ou ''.
  param([string]$Root, [string[]]$Paths)
  if (-not $Root) { return '' }
  $r = $Root.TrimEnd('\', '/')
  foreach ($p in $Paths) {
    if (-not $p) { continue }
    if ($p -ieq $r -or $p.StartsWith($r + '\', [StringComparison]::OrdinalIgnoreCase) -or $p.StartsWith($r + '/', [StringComparison]::OrdinalIgnoreCase)) { return $p }
  }
  return ''
}

function Test-WsNetworkPath {
  # Caminho numa partilha de rede: \\servidor\pasta, \\?\UNC\... ou uma letra de unidade de rede (DriveType).
  param([string]$Path, [string]$DriveType)
  if (-not $Path) { return $false }
  if ($Path -match '^\\\\\?\\UNC\\') { return $true }
  if ($Path -match '^\\\\[^\\?.]') { return $true }
  return ($DriveType -eq 'Network')
}

function Get-WsWinPowerShellPath {
  # O Windows PowerShell 5.1 de 64 bits. Num PowerShell de 32 bits (x86) o System32 e redirecionado para o
  # SysWOW64 e so o Sysnative chega ao de 64 bits (o install.ps1 do Claude Code recusa 32 bits); no PowerShell 7
  # o $PSHOME nao tem powershell.exe.
  param([string]$SystemRoot, [bool]$Is64BitOs, [bool]$Is64BitProcess)
  $sub = 'System32'
  if ($Is64BitOs -and -not $Is64BitProcess) { $sub = 'Sysnative' }
  return (Join-Path $SystemRoot ($sub + '\WindowsPowerShell\v1.0\powershell.exe'))
}

function Get-WsRelaunchReason {
  # Porque e que o setup tem de recomecar no Windows PowerShell 5.1 de 64 bits: 'core' (PowerShell 7), 'x86'
  # (PowerShell de 32 bits num Windows de 64 bits) ou '' (nao e preciso, ou ja e o processo que recomecou).
  param([string]$Edition, [bool]$Is64BitOs, [bool]$Is64BitProcess, [string]$Relaunched)
  if ($Relaunched -eq '1') { return '' }
  if ($Edition -eq 'Core') { return 'core' }
  if ($Is64BitOs -and -not $Is64BitProcess) { return 'x86' }
  return ''
}

function Get-WsSelfArgs {
  # As opcoes desta execucao (nomes ingleses), para voltar a chamar o setup noutra janela ou noutro PowerShell.
  param([hashtable]$Params)
  $map = [ordered]@{ Check = '-Check'; Doctor = '-Doctor'; Desinstalar = '-Uninstall'; Limpar = '-Cleanup'; SemDesktop = '-NoDesktop'; Sim = '-Yes'; SubstituirStatusline = '-ReplaceStatusline'; Ajuda = '-Help' }
  $out = @()
  foreach ($k in $map.Keys) { if ($Params -and $Params[$k]) { $out += $map[$k] } }
  return , $out
}

function Test-WsIse {
  # PowerShell ISE: nao tem consola, e um programa que pergunta alguma coisa (o login do Claude, do gh, do acli)
  # fica a espera para sempre.
  param([string]$HostName, [bool]$HasIseVar)
  return ($HasIseVar -or ([string]$HostName -match '\bISE\b'))
}

function Get-WsGpoPolicy {
  # Politica de execucao imposta por Group Policy ao Windows PowerShell (a da maquina ganha a do utilizador), das
  # chaves ...\Policies\Microsoft\Windows\PowerShell: EnableScripts 0 = Restricted; 1 = o valor de ExecutionPolicy.
  # Ganha sempre ao "-ExecutionPolicy Bypass". Cada argumento e @{ EnableScripts; ExecutionPolicy } ou $null.
  # Devolve @{ Policy; Scope; Blocks } ou $null. Blocks: nenhum script sem assinatura corre (AllSigned, Restricted).
  param($Machine, $User)
  foreach ($pair in @(@('MachinePolicy', $Machine), @('UserPolicy', $User))) {
    $v = $pair[1]
    if (-not $v -or $null -eq $v['EnableScripts'] -or [string]$v['EnableScripts'] -eq '') { continue }
    $pol = 'Restricted'
    if ([int]$v['EnableScripts'] -ne 0) { $pol = [string]$v['ExecutionPolicy'] }
    if (-not $pol) { continue }
    return @{ Policy = $pol; Scope = $pair[0]; Blocks = (@('Restricted', 'AllSigned') -contains $pol) }
  }
  return $null
}

function Merge-WsNoProxy {
  # NO_PROXY para as ferramentas (Claude Code, git, gh, uv): localhost,127.0.0.1, o que ja la estava, as excecoes
  # do proxy do Windows (ProxyOverride: "*.empresa.pt" passa a ".empresa.pt"; "<local>" e os outros curingas nao
  # tem equivalente) e os servidores que o PAC manda direto (-Extra). Sem repetidos.
  param([string]$Existing, [string]$Override, [string[]]$Extra)
  $items = @('localhost', '127.0.0.1') + @(([string]$Existing) -split ',')
  foreach ($o in (([string]$Override) -split '[;\s]+')) {
    $t = $o.Trim() -replace '^[A-Za-z][A-Za-z0-9+.-]*://', ''
    if ($t -eq '' -or $t -eq '<local>') { continue }
    if ($t.StartsWith('*.')) { $t = $t.Substring(1) }
    if ($t.Contains('*')) { continue }
    $items += $t
  }
  $items += @($Extra)
  $out = @()
  foreach ($i in $items) {
    $t = ([string]$i).Trim()
    if (-not $t) { continue }
    if (@($out | Where-Object { $_ -ieq $t }).Count -eq 0) { $out += $t }
  }
  return ($out -join ',')
}

function Get-WsGitBashCandidates {
  # Onde pode estar o bash.exe do Git for Windows: ao lado do git.exe (Git\bin), uma ou duas pastas acima
  # (Git\cmd, Git\mingw64\bin), tres acima do "git --exec-path" (resolve os shims do scoop e do choco) e nas
  # pastas habituais do Git for Windows (-Roots).
  param([string]$Git, [string]$ExecPath, [string[]]$Roots)
  $c = @()
  if ($Git) {
    $d = Split-Path -Parent $Git
    if ($d) { $c += (Join-Path $d 'bash.exe') }
    $up = $d
    for ($i = 0; $i -lt 2 -and $up; $i++) {
      $up = Split-Path -Parent $up
      if ($up) { $c += (Join-Path $up 'bin\bash.exe'); $c += (Join-Path $up 'usr\bin\bash.exe') }
    }
  }
  if ($ExecPath) {
    $r = $ExecPath.Trim().Replace('/', [string][IO.Path]::DirectorySeparatorChar)
    for ($i = 0; $i -lt 3 -and $r; $i++) { $r = Split-Path -Parent $r }
    if ($r) { $c += (Join-Path $r 'bin\bash.exe'); $c += (Join-Path $r 'usr\bin\bash.exe') }
  }
  foreach ($r in @($Roots)) { if ($r) { $c += (Join-Path $r 'bin\bash.exe') } }
  return , @($c | Select-Object -Unique)
}

function Test-WsLockHeld {
  # O .lock tem o PID (versoes antigas) ou o PID e a hora de arranque desse processo (ticks UTC). So esta ocupado
  # se esse PID ainda e um PowerShell, nao e este processo ($Self) e, quando o .lock tem a hora, com a mesma hora
  # de arranque: um PID que o Windows reutilizou (por exemplo depois de reiniciar) nao bloqueia o setup. Uma hora
  # que nao se le (StartTicks 0: um PowerShell de outro utilizador, do SYSTEM ou elevado, como os scripts do Intune)
  # tambem nao bloqueia: o setup corre sempre como a propria pessoa. $Proc: @{ Name; StartTicks } ou $null.
  param([string]$LockText, $Proc, [int]$Self = 0)
  $lines = @(([string]$LockText) -split "`r?`n" | Where-Object { $_ -match '\S' })
  if ($lines.Count -eq 0) { return $false }
  $id = $lines[0].Trim() -as [int64]
  if ($lines[0].Trim() -notmatch '^\d+$' -or $null -eq $id) { return $false }
  if (-not $Proc) { return $false }
  if ($Self -gt 0 -and $id -eq $Self) { return $false }
  if ([string]$Proc.Name -notmatch '^(powershell|pwsh|powershell_ise)$') { return $false }
  $since = $null
  if ($lines.Count -gt 1 -and $lines[1].Trim() -match '^\d+$') { $since = $lines[1].Trim() -as [int64] }
  if ($since -gt 0) { return ($since -eq [int64]$Proc.StartTicks) }
  return $true
}

function Resolve-WsFailCode {
  # Quando ha uma causa mais certa que o codigo do passo, e essa que se mostra: E-SO-07 (a Group Policy bloqueia
  # scripts e os instaladores oficiais sao scripts), E-PERM-02 (a seguranca bloqueou um programa ou apagou um
  # ficheiro) e E-NET-03 (o proxy pede o login do Windows, que o Claude Code, o Node e o uv nao enviam).
  # Em -Check so o bloqueio conta: o resto e "ainda nao instalado". Devolve @(codigo, detalhe).
  param([string]$Code, [string]$Detail, [string]$Step, [string]$Mode, [string]$Blocked, [bool]$GpoBlocks, [bool]$ProxyAuth)
  if ($Code -like 'E-AUTH-*' -or $Code -eq 'E-SO-07' -or $Code -eq 'E-PERM-02') { return @($Code, $Detail) }
  if ($Mode -eq 'install' -and $GpoBlocks -and @('E-CC-01', 'E-UV-01') -contains $Code) { return @('E-SO-07', $Code) }
  if ($Blocked -and $Code -notlike 'E-NET-*') { return @('E-PERM-02', $Blocked) }
  if ($Mode -ne 'install') { return @($Code, $Detail) }
  if ($ProxyAuth -and @('2', '5', '10', '12') -contains $Step -and @('E-CC-01', 'E-UV-01', 'E-MEM-03', 'E-SMOKE-01', 'E-NET-01', 'E-NET-05', 'E-NET-07') -contains $Code) { return @('E-NET-03', $Code) }
  return @($Code, $Detail)
}

function Format-WsHomePath {
  # Caminho para mostrar: ~\... dentro da pasta do perfil, o resto como esta.
  param([string]$Path, [string]$UserHome)
  if (-not $Path -or -not $UserHome) { return $Path }
  $h = $UserHome.TrimEnd('\', '/')
  if ($Path.TrimEnd('\', '/') -ieq $h) { return '~' }
  if (Find-WsInFolder $h @($Path)) { return ('~' + $Path.Substring($h.Length)) }
  return $Path
}

function Get-WsPermFixCmd {
  # O comando que devolve um caminho a pessoa. -Kind: 'dir' (pasta sem escrita: icacls para ela e o que tem dentro),
  # 'file' (ficheiro sem escrita), 'readonly' (ficheiro com o atributo "So de leitura") ou 'notdir' (um ficheiro onde
  # devia estar uma pasta: muda de nome e o setup cria a pasta). -User: DOMINIO\nome. Precisa de ser o dono (ou o IT).
  param([string]$Path, [string]$Kind, [string]$User)
  switch ($Kind) {
    'notdir' { return ('Rename-Item -LiteralPath "{0}" -NewName "{1}.old"' -f $Path, (($Path.TrimEnd('\', '/') -split '[\\/]')[-1])) }
    'readonly' { return ('attrib -R "{0}"' -f $Path) }
    'file' { return ('icacls "{0}" /grant "{1}:F"' -f $Path, $User) }
  }
  return ('icacls "{0}" /grant "{1}:(OI)(CI)F" /T' -f $Path, $User)
}

function Get-WsPermLine {
  # A primeira linha da saida de um passo com um erro de permissao (ou "nao e uma pasta"), com ~ no lugar da pasta
  # do perfil e no maximo 160 caracteres; '' se nao houver. O "Permission denied (publickey)" do ssh nao conta, nem
  # o "FullyQualifiedErrorId : UnauthorizedAccess" de um script bloqueado pela execution policy (so o nome da
  # excecao, UnauthorizedAccessException, conta: num Windows em portugues a frase vem traduzida).
  param([string]$Text, [string]$UserHome)
  foreach ($l in (([string]$Text) -split "`r?`n")) {
    if ($l -cnotmatch 'EACCES|EPERM|EEXIST|ENOTDIR|EROFS|is denied|UnauthorizedAccessException|Permission denied|File exists|Not a directory|Read-only file system') { continue }
    if ($l -match 'publickey') { continue }
    $t = $l
    if ($UserHome) { $t = [regex]::Replace($t, [regex]::Escape($UserHome.TrimEnd('\', '/')) + '(?![A-Za-z0-9_.-])', '~', 'IgnoreCase') }
    $t = $t.Trim()
    if ($t.Length -le 160) { return $t }
    # cortada no fim da ultima frase antes dos 160 caracteres, senao na ultima palavra (se ficarem pelo menos 80),
    # e nao a meio de uma palavra
    $t = $t.Substring(0, 160)
    $i = $t.LastIndexOf('. ')
    if ($i -gt 0) { return $t.Substring(0, $i + 1) }
    $i = $t.LastIndexOf(' ')
    if ($i -ge 76) { return $t.Substring(0, $i) + ' ...' }
    return $t
  }
  return ''
}

function Get-WsLastInstallResult {
  # O Invoke-WsStep escreve "result step N: estado [codigo|detalhe da falha]" no setup.log de cada instalacao: o
  # -Check e o -Doctor nao voltam a instalar, mas assim sabem porque falhou a ultima instalacao do passo N (num passo
  # nao bloqueante a falha aparece como aviso). Devolve @(codigo, detalhe), ou $null se essa instalacao correu bem.
  param([string]$N, [string]$LogFile)
  $r = $null
  $re = '^\S+ result step ' + [regex]::Escape($N) + ': (\S+) ?(.*)$'
  try {
    foreach ($l in (Get-Content -LiteralPath $LogFile -Encoding UTF8 -ErrorAction Stop)) {
      if ($l -match $re) { $r = @($Matches[1], $Matches[2].Trim()) }
    }
  } catch { return $null }
  if (-not $r -or @('falhou', 'aviso') -notcontains $r[0] -or $r[1] -notmatch '^E-') { return $null }
  $i = $r[1].IndexOf('|')
  if ($i -lt 0) { return @($r[1], '') }
  return @($r[1].Substring(0, $i), $r[1].Substring($i + 1))
}

function Get-WsLastStepOutput {
  # O ultimo bloco "--- command output (step N) ---" que uma instalacao (mode install) escreveu no setup.log. O
  # Write-WsLog poe a hora antes da primeira linha do bloco, por isso so se compara o fim da linha.
  param([string]$N, [string[]]$Lines)
  $mode = ''; $on = $false; $b = @(); $last = @()
  $head = '--- command output (step ' + $N + ') ---'
  foreach ($l in $Lines) {
    if ($on) {
      if ($l -eq '--- end ---') { $on = $false; $last = $b } else { $b += $l }
      continue
    }
    if ($l -match ' === step \d+: .* \(mode ([a-z]+)\)$') { $mode = $Matches[1] }
    elseif ($mode -eq 'install' -and $l.EndsWith($head)) { $on = $true; $b = @() }
  }
  return $last
}

# =============================================================== mensagens, log e saida

function M {
  param([string]$Key, [hashtable]$Values)
  $t = $Key
  if ($script:Msgs -and ($script:Msgs.ui.PSObject.Properties.Name -contains $Key)) { $t = $script:Msgs.ui.$Key }
  return (Format-WsFill $t $Values)
}

function Format-WsFill {
  param([string]$Text, [hashtable]$Values)
  $t = Format-WsMsg $Text $Values
  if ($t.Contains('{') -and $script:Fill) { $t = Format-WsMsg $t $script:Fill }
  return $t
}

function Get-WsErr {
  param([string]$Code)
  if ($script:Msgs -and ($script:Msgs.erros.PSObject.Properties.Name -contains $Code)) { return $script:Msgs.erros.$Code }
  return $null
}

function Write-WsLog {
  param([string]$Text)
  try {
    $line = (Get-Date -Format 'HH:mm:ss') + ' ' + (Protect-WsText $Text $script:Literals) + "`r`n"
    [IO.File]::AppendAllText($script:LogFile, $line, $script:Utf8NoBom)
  } catch { }
}

function Write-WsSay {
  param([string]$Text, [string]$Color)
  # Com a zona viva (spinner) na consola, tira-a primeiro e volta a po-la depois.
  $live = $script:Live.On
  if ($live) { Hide-WsLive }
  # NO_COLOR (no-color.org): sem cores, como no Mac.
  if ($Color -and -not $env:NO_COLOR) { Write-Host $Text -ForegroundColor $Color } else { Write-Host $Text }
  Write-WsLog $Text
  if ($live) { Show-WsLive }
}

# =============================================================== aspeto: cartao, lista de passos e spinner
# $script:Ui (Get-WsUiMode): 'fancy' no Windows Terminal, 'ascii' na consola antiga, 'plain' quando a saida esta
# redirecionada. No fancy, enquanto um passo corre, o fim da consola tem a zona viva: o passo com um spinner e o que esta
# a fazer (com os MB ja descarregados), os passos por fazer e a barra "N of 12". O spinner nao e outro processo: avanca
# enquanto o setup espera por um programa (Invoke-WsProcess, Invoke-WsLogin). A zona sai antes de cada linha, pergunta
# e login, no fim de cada passo e no finally do Invoke-WsMain (Ctrl-C). Os simbolos vem de [char] (o .ps1 e ASCII).
$script:Ui = 'plain'
$script:UiCols = 0
$script:UiRows = 0
$script:Live = @{ On = $false; Step = ''; Text = ''; H = 0; Name = ''; Bar = ''; Mb = ''; Frame = 0; T0 = (Get-Date); Last = [datetime]::MinValue }
$script:G = @{ Ell = [string][char]0x2026; Dot = [string][char]0x00B7; Arrow = [string][char]0x2192; Diamond = [string][char]0x25C6
  On = [string][char]0x25B0; Off = [string][char]0x25B1; NotRun = [string][char]0x25CB
  Hz = [string][char]0x2500; Vt = [string][char]0x2502; TL = [string][char]0x256D; TR = [string][char]0x256E; BL = [string][char]0x2570; BR = [string][char]0x256F }
$script:Frames = @(0x280B, 0x2819, 0x2839, 0x2838, 0x283C, 0x2834, 0x2826, 0x2827, 0x2807, 0x280F)

function Initialize-WsUi {
  $red = $true; $w = 0; $h = 0
  try { $red = [Console]::IsOutputRedirected } catch { $red = $true }
  try { $w = [Console]::WindowWidth; $h = [Console]::WindowHeight } catch { $w = 0; $h = 0 }
  $script:UiCols = $w; $script:UiRows = $h
  $script:Ui = Get-WsUiMode $red $w ([bool]$env:NO_COLOR) ([string]$env:TERM) $script:Emoji
  Write-WsLog ('output: {0} ({1}x{2})' -f $script:Ui, $w, $h)
}

function Write-WsRaw {
  # Escrita sem fim de linha (sequencias VT da zona viva). Uma consola que ja nao existe nunca para o setup.
  param([string]$Text)
  try { [Console]::Write($Text) } catch { }
}

function Write-WsParts {
  # Uma linha com partes de cores diferentes: @(@(texto, cor), ...). No log vai o texto todo, sem cores.
  param([object[]]$Parts)
  $live = $script:Live.On
  if ($live) { Hide-WsLive }
  $all = ''
  foreach ($p in $Parts) {
    $t = [string]$p[0]
    $c = $null
    if ($p.Count -gt 1) { $c = $p[1] }
    if ($c -and -not $env:NO_COLOR) { Write-Host $t -NoNewline -ForegroundColor $c } else { Write-Host $t -NoNewline }
    $all += $t
  }
  Write-Host ''
  Write-WsLog $all
  if ($live) { Show-WsLive }
}

function Get-WsStepName {
  # Nome curto do passo, para a lista de passos (o titulo inteiro se o catalogo nao o tiver).
  param([string]$N)
  # (PowerShell nao distingue maiusculas: uma variavel $n seria o proprio $N)
  $name = $null
  try { $name = $script:Msgs.passos_curtos.$N } catch { $name = $null }
  if (-not $name -and $script:Titles) { $name = $script:Titles[$N] }
  if (-not $name) { $name = $N }
  return [string]$name
}

function Format-WsCut {
  # Texto cortado a N caracteres, com reticencias no fim se foi cortado.
  param([string]$Text, [int]$Max)
  if ($Max -lt 2) { return '' }
  if ($Text.Length -le $Max) { return $Text }
  return ($Text.Substring(0, $Max - 1) + $script:G.Ell)
}

function Write-WsCard {
  # Cartao com as linhas dadas, @(@(texto, cor), ...). Unicode no fancy, +--+ no ascii. Largura: o texto (no minimo
  # 58, no maximo a consola).
  param([object[]]$Lines)
  $u = ($script:Ui -eq 'fancy')
  $w = 58
  foreach ($l in $Lines) { if (([string]$l[0]).Length + 4 -gt $w) { $w = ([string]$l[0]).Length + 4 } }
  $max = $script:UiCols - 4
  if ($max -lt 20) { $max = 76 }
  if ($w -gt $max) { $w = $max }
  if ($u) { $tl = $script:G.TL; $tr = $script:G.TR; $bl = $script:G.BL; $br = $script:G.BR; $hz = $script:G.Hz; $vt = $script:G.Vt }
  else { $tl = '+'; $tr = '+'; $bl = '+'; $br = '+'; $hz = '-'; $vt = '|' }
  Write-WsSay ($tl + ($hz * $w) + $tr) 'DarkGray'
  foreach ($l in $Lines) {
    $t = Format-WsCut ([string]$l[0]) ($w - 4)
    $c = $null
    if ($l.Count -gt 1) { $c = $l[1] }
    Write-WsParts @(@(($vt + '  '), 'DarkGray'), @($t, $c), @(((' ' * ($w - 4 - $t.Length)) + '  ' + $vt), 'DarkGray'))
  }
  Write-WsSay ($bl + ($hz * $w) + $br) 'DarkGray'
}

function Write-WsHeader {
  # Cartao do inicio (titulo, versao, sistema, lingua) no fancy e no ascii; a linha de sempre no plain.
  if ($script:Ui -eq 'plain') { Write-WsSay (M 'titulo') 'White'; return }
  $lang = [string]$script:Lang
  if ($lang -match '^en(-|$)') { $lang = (M 'lingua_en') } elseif ($lang -match '^pt(-|$)') { $lang = (M 'lingua_pt') + ' (' + $script:Lang + ')' }
  $mark = '*'
  if ($script:Ui -eq 'fancy') { $mark = $script:G.Diamond }
  Write-WsSay ''
  Write-WsCard @(@(($mark + ' ' + (M 'card_titulo')), 'White'), @(('  ' + (M 'card_sub' @{ SO = $script:OsText; LINGUA = $lang })), 'DarkGray'))
  Write-WsSay ''
}

function Get-WsLiveBar {
  param([int]$N)
  $e = [string][char]27
  return ('  ' + $e + '[38;5;173m' + ($script:G.On * $N) + $e + '[0m' + $e + '[2m' + ($script:G.Off * (12 - $N)) + '  ' + (M 'progresso' @{ N = $N }) + $e + '[0m')
}

function Get-WsLiveLine {
  # A linha do passo com o spinner: simbolo, nome, o que esta a fazer e, em cinzento, os MB e os segundos.
  $L = $script:Live
  $e = [string][char]27
  $f = [string][char]$script:Frames[$L.Frame % $script:Frames.Count]
  $ex = [string]$L.Mb
  $s = [int]((Get-Date) - $L.T0).TotalSeconds
  if ($s -ge 3) { if ($ex) { $ex += ' ' + $script:G.Dot + ' ' }; $ex += (M 'decorrido' @{ S = $s }) }
  $t = Format-WsCut ([string]$L.Text + $script:G.Ell) ($script:UiCols - 26 - $ex.Length)
  return ('  ' + $e + '[38;5;173m' + $f + $e + '[0m ' + $L.Name + $t + '  ' + $e + '[2m' + $ex + $e + '[0m')
}

function Start-WsLive {
  # Comeca a zona viva do passo N (so no fancy).
  param([string]$N)
  if ($script:Ui -ne 'fancy') { return }
  $L = $script:Live
  $L.Step = $N; $L.Mb = ''; $L.Frame = 0; $L.T0 = Get-Date; $L.Last = [datetime]::MinValue
  $t = (M 'a_trabalhar')
  if ($script:Mode -ne 'install') { $t = (M 'a_verificar') }
  $L.Text = $t.TrimEnd([char]0x2026)
  $L.Name = (Get-WsStepName $N).PadRight(19)
  $L.Bar = Get-WsLiveBar ([int]$N)
  Show-WsLive
}

function Stop-WsLive { Hide-WsLive; $script:Live.Step = '' }

function Show-WsLive {
  $L = $script:Live
  if ($script:Ui -ne 'fancy' -or -not $L.Step -or $L.On) { return }
  $e = [string][char]27
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append((Get-WsLiveLine))
  $h = 3
  # Os passos por fazer so se a consola tiver altura para eles (a zona tem de caber inteira).
  if ($script:UiRows -ge 26) {
    for ($i = [int]$L.Step + 1; $i -le 12; $i++) { [void]$sb.Append("`r`n  " + $e + '[2m' + $script:G.NotRun + ' ' + (Get-WsStepName "$i") + $e + '[0m'); $h++ }
  }
  [void]$sb.Append("`r`n`r`n" + $L.Bar)
  $L.H = $h; $L.On = $true
  Write-WsRaw $sb.ToString()
}

function Hide-WsLive {
  # Tira a zona viva da consola: o cursor volta ao inicio dela.
  $L = $script:Live
  if (-not $L.On) { return }
  $L.On = $false
  $e = [string][char]27
  Write-WsRaw ("`r" + $e + '[' + ($L.H - 1) + 'A' + $e + '[J')
}

function Update-WsLive {
  # Uma imagem do spinner (no maximo umas 8 por segundo): reescreve a linha do passo e a barra.
  param([switch]$Force)
  $L = $script:Live
  if (-not $L.On) { return }
  $now = Get-Date
  if (-not $Force -and ($now - $L.Last).TotalMilliseconds -lt 110) { return }
  $L.Last = $now; $L.Frame++
  $e = [string][char]27
  $up = $L.H - 1
  Write-WsRaw ("`r" + $e + '[' + $up + 'A' + (Get-WsLiveLine) + $e + '[K' + "`r" + $e + '[' + $up + 'B' + $L.Bar + $e + '[K')
}

function Write-WsActivity {
  # O que o passo esta a fazer ("Downloading X..."): no fancy vai para a linha do spinner, senao e uma linha como
  # sempre. -Keep: fica tambem como nota debaixo do resultado do passo.
  param([string]$Text, [switch]$Keep)
  if ($script:Live.On) {
    $script:Live.Text = $Text.TrimEnd([char]0x2026); $script:Live.Mb = ''
    Write-WsLog ('  ' + $Text)
    if ($Keep) { Add-WsNote $Text }
    Update-WsLive -Force
    return
  }
  Write-WsSay ('  ' + $Text)
}

function Test-WsInteractive {
  try { return (-not [Console]::IsInputRedirected) -and [Environment]::UserInteractive } catch { return $false }
}

function Clear-WsTypeAhead {
  # Deita fora as teclas escritas antes de uma pergunta ou de um login (um Enter carregado durante um download,
  # o comando colado duas vezes): so conta o que a pessoa escreve depois de ver a pergunta. O Read-Host e os
  # logins leem o que ja esta no buffer da consola. No ISE e em alguns anfitrioes do VS Code o FlushInputBuffer
  # da NotImplementedException ou o RawUI e $null: o try cobre os dois. Sem [Console]::KeyAvailable/ReadKey
  # (rebentam com o stdin redirecionado). -RawUI so para os testes.
  param($RawUI = $Host.UI.RawUI)
  if (-not (Test-WsInteractive)) { return }
  try { $RawUI.FlushInputBuffer() } catch { Write-WsLog ('type-ahead not cleared: ' + $_.Exception.Message) }
}

function Read-WsYesNo {
  # Pergunta sim/nao. -NeverSim: o -Sim nao responde por ti. A zona viva (spinner) sai antes da pergunta, que fica
  # sozinha na ultima linha ("? <pergunta> [Y/n]"), e volta depois.
  param([string]$Question, [bool]$DefaultYes, [switch]$NeverSim)
  $live = $script:Live.On
  Hide-WsLive
  try { return (Read-WsYesNoCore $Question $DefaultYes -NeverSim:$NeverSim) } finally { if ($live) { Show-WsLive } }
}

function Read-WsYesNoCore {
  param([string]$Question, [bool]$DefaultYes, [switch]$NeverSim)
  $hint = (M 'ns')
  if ($DefaultYes) { $hint = (M 'sn') }
  if ($script:Sim -and -not $NeverSim) { Write-WsSay ('  ? {0} {1} y (-Yes)' -f $Question, $hint); return $true }
  if ($script:Sim) { Write-WsSay ('  ? {0} {1} n (-Yes)' -f $Question, $hint); return $false }
  if (-not (Test-WsInteractive)) { Write-WsSay ('  ? {0} {1} n - {2}' -f $Question, $hint, (M 'sem_tty')); return $false }
  Clear-WsTypeAhead
  for ($i = 0; $i -lt 3; $i++) {
    # O Read-Host da $null quando o anfitriao esta a fechar: o [string] faz disso um Enter.
    $ans = ([string](Read-Host ('  ? {0} {1}' -f $Question, $hint))).Trim()
    $shown = $ans
    if ($shown -eq '') { $shown = '<enter>' }
    Write-WsLog ('question: {0} -> {1}' -f $Question, $shown)
    if ($ans -match '^[SsYy]') { return $true }
    if ($ans -match '^[Nn]') { return $false }
    if ($ans -eq '') { return $DefaultYes }
    # Outra coisa (um comando colado, "talvez"): pergunta outra vez; a terceira assim conta como "nao".
    if ($i -lt 2) { Write-WsSay ('  ' + (M 'sn_repetir')) }
  }
  return $false
}

# =============================================================== processos, rede, ficheiros

# Ambiente herdado que parte o que o setup le ou corre (o ws_env_sanitize do Mac), tirado so dos programas que o
# setup corre, nunca do terminal da pessoa: cores forcadas (o "uv tool dir --bin" vinha com codigos ESC), um
# NODE_OPTIONS que parte o Node (o "Auto Attach" do VS Code) e o Python de outro ambiente (Anaconda). As variaveis
# de certificados so saem quando apontam para um ficheiro (ou pasta) que nao existe.
$script:ChildEnvDrop = @('FORCE_COLOR', 'CLICOLOR_FORCE', 'NODE_OPTIONS', 'PYTHONHOME', 'PYTHONPATH', 'PYTHONSTARTUP')
$script:CaVars = @('SSL_CERT_FILE', 'CURL_CA_BUNDLE', 'GIT_SSL_CAINFO', 'NODE_EXTRA_CA_CERTS', 'REQUESTS_CA_BUNDLE', 'SSL_CERT_DIR')
function Test-WsCaPathOk {
  param([string]$Name, [string]$Value)
  if (-not $Value) { return $true }
  try {
    if ($Name -eq 'SSL_CERT_DIR') { return (Test-Path -LiteralPath $Value -PathType Container) }
    return (Test-Path -LiteralPath $Value -PathType Leaf)
  } catch { return $false }
}
function Get-WsCaBad {
  # "NOME=valor" de cada variavel de certificados deste processo que aponta para algo que nao existe (aviso E-NET-09).
  $out = @()
  foreach ($k in $script:CaVars) { $v = [Environment]::GetEnvironmentVariable($k); if ($v -and -not (Test-WsCaPathOk $k $v)) { $out += ($k + '=' + $v) } }
  return $out
}
function Invoke-WsProcess {
  # Corre um executavel com argumentos exatos (incluindo vazios), sem janela, com stdout/stderr em UTF-8.
  # -WatchPaths: pastas onde o programa descarrega; enquanto corre, mostra de 30 em 30 s quanto ja chegou (o que
  # mais cresceu desde o arranque), para nunca ficar mais de meio minuto sem nada no ecra.
  param([string]$FilePath, [string[]]$Arguments, [string]$StdinText, [int]$TimeoutSec = 900, [hashtable]$Environment, [string]$WorkingDirectory, [string[]]$RemoveEnv, [string[]]$WatchPaths)
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FilePath
  $psi.Arguments = ConvertTo-WsArgLine $Arguments
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.RedirectStandardInput = $true
  $psi.StandardOutputEncoding = [Text.Encoding]::UTF8
  $psi.StandardErrorEncoding = [Text.Encoding]::UTF8
  if ($WorkingDirectory) { $psi.WorkingDirectory = $WorkingDirectory }
  foreach ($k in $script:ChildEnvDrop) { if ($psi.EnvironmentVariables.ContainsKey($k)) { $psi.EnvironmentVariables.Remove($k) } }
  foreach ($k in $script:CaVars) { if ($psi.EnvironmentVariables.ContainsKey($k) -and -not (Test-WsCaPathOk $k $psi.EnvironmentVariables[$k])) { $psi.EnvironmentVariables.Remove($k) } }
  $psi.EnvironmentVariables['NO_COLOR'] = '1'
  if ($Environment) { foreach ($k in $Environment.Keys) { $psi.EnvironmentVariables[$k] = [string]$Environment[$k] } }
  if ($RemoveEnv) { foreach ($k in $RemoveEnv) { if ($psi.EnvironmentVariables.ContainsKey($k)) { $psi.EnvironmentVariables.Remove($k) } } }
  Write-WsLog ('$ {0} {1}' -f $FilePath, $psi.Arguments)
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  $hbBase = @{}; $hbNext = $null; $hbEvery = 30
  if ($script:HbEvery) { $hbEvery = [int]$script:HbEvery }
  if ($WatchPaths) { foreach ($w in $WatchPaths) { $hbBase[$w] = Get-WsPathBytes $w }; $hbNext = (Get-Date).AddSeconds($hbEvery) }
  try { [void]$p.Start() } catch {
    # Antivirus, AppLocker, WDAC ou um EDR: o passo mostra E-PERM-02 (e nao "rede, tenta de novo").
    $bc = Get-WsBlockedCode $_.Exception -AccessDenied
    if ($bc) { $script:Blocked = $FilePath; Write-WsLog ('  -> blocked by the computer security (Win32 {0})' -f $bc) }
    Write-WsLog ('  -> did not start: {0}' -f $_.Exception.Message)
    return @{ ExitCode = -1; StdOut = ''; StdErr = $_.Exception.Message }
  }
  $outTask = $p.StandardOutput.ReadToEndAsync()
  $errTask = $p.StandardError.ReadToEndAsync()
  # Espera aos bocados (e nao um WaitForExit longo): assim o Ctrl-C chega ao PowerShell, o finally deste passo e
  # o do Invoke-WsMain correm (o .lock sai) e o programa filho nao fica a correr sozinho, escondido.
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $done = $false
  try {
    if ($StdinText) {
      $bytes = [Text.Encoding]::UTF8.GetBytes($StdinText)
      $p.StandardInput.BaseStream.Write($bytes, 0, $bytes.Length)
    }
    $p.StandardInput.Close()
    # Com a zona viva (fancy) espera-se aos bocados mais pequenos, para o spinner andar; os MB do download vao para a
    # linha do spinner (de 2 em 2 s) em vez de uma linha nova de 30 em 30 s.
    $tick = 500
    if ($script:Live.On) { $tick = 120 }
    $mbNext = Get-Date
    while (-not $p.WaitForExit($tick)) {
      if ((Get-Date) -gt $deadline) {
        $done = $true
        Stop-WsProcessTree $p
        Write-WsLog '  -> timed out'
        return @{ ExitCode = -2; StdOut = ''; StdErr = 'timeout' }
      }
      if ($script:Live.On) {
        if ($WatchPaths -and (Get-Date) -gt $mbNext) {
          try {
            $grow = [int64]0
            foreach ($w in $WatchPaths) { $g = (Get-WsPathBytes $w) - $hbBase[$w]; if ($g -gt $grow) { $grow = $g } }
            $script:Live.Mb = (M 'mb' @{ MB = (Format-WsMb $grow) })
          } catch { }
          $mbNext = (Get-Date).AddSeconds(2)
        }
        Update-WsLive
      } elseif ($hbNext -and (Get-Date) -gt $hbNext) {
        # Um erro aqui nunca para o programa (o finally terminava-o): so se perde esta linha de progresso.
        try {
          $grow = [int64]0
          foreach ($w in $WatchPaths) { $g = (Get-WsPathBytes $w) - $hbBase[$w]; if ($g -gt $grow) { $grow = $g } }
          Write-WsSay ('  ' + (M 'a_descarregar_mb' @{ MB = (Format-WsMb $grow) }))
        } catch { }
        $hbNext = (Get-Date).AddSeconds($hbEvery)
      }
    }
    $done = $true
  } finally {
    if (-not $done) { Stop-WsProcessTree $p; Write-WsLog '  -> stopped (Ctrl-C)' }
  }
  $p.WaitForExit()
  # Um processo neto que herdou o stdout (um instalador que abre a app, por exemplo) pode deixa-lo aberto:
  # nunca esperar por ele mais de 30 s.
  $until = (Get-Date).AddSeconds(30)
  while (-not ($outTask.IsCompleted -and $errTask.IsCompleted) -and (Get-Date) -lt $until) { [void]$outTask.Wait(200) }
  $out = ''; $err = ''
  if ($outTask.IsCompleted) { $out = $outTask.Result } else { Write-WsLog '  -> output still open (a child process kept it)' }
  if ($errTask.IsCompleted) { $err = $errTask.Result }
  $r = @{ ExitCode = $p.ExitCode; StdOut = $out; StdErr = $err }
  Add-WsStepLog ($r.StdOut + "`n" + $r.StdErr)
  Write-WsLog ('  -> exit {0}' -f $r.ExitCode)
  return $r
}

function Stop-WsProcessTree {
  # Termina o processo e os filhos (o taskkill /T apanha o msiexec de um instalador, por exemplo). So chamadas
  # .NET: tambem corre num finally depois de um Ctrl-C.
  param($Process)
  try {
    if ($Process.HasExited) { return }
    $tk = [IO.Path]::Combine([string]$env:SystemRoot, 'System32', 'taskkill.exe')
    if ($env:SystemRoot -and [IO.File]::Exists($tk)) {
      $si = [Diagnostics.ProcessStartInfo]::new($tk, ('/T /F /PID ' + $Process.Id))
      $si.UseShellExecute = $false; $si.CreateNoWindow = $true
      $k = [Diagnostics.Process]::Start($si)
      [void]$k.WaitForExit(10000)
    }
  } catch { }
  try { if (-not $Process.HasExited) { $Process.Kill() } } catch { }
}

function Add-WsStepLog {
  param([string]$Text)
  if ($null -ne $script:StepLog -and $Text) { [void]$script:StepLog.Append($Text); [void]$script:StepLog.Append("`n") }
}

function Get-WsSha256 {
  # '' se o ficheiro desapareceu ou nao se deixa ler logo depois do download: quase sempre o antivirus
  # ($script:Blocked, e o passo mostra E-PERM-02 em vez de um SHA-256 errado).
  param([string]$Path)
  try {
    if (Test-Path -LiteralPath $Path) { return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path -ErrorAction Stop).Hash.ToLowerInvariant() }
  } catch { Write-WsLog ('  -> cannot read {0}: {1}' -f $Path, $_.Exception.Message) }
  Write-WsLog ('  -> file gone or unreadable: ' + $Path)
  $script:Blocked = $Path
  return ''
}

function Get-WsSumFor {
  param([string]$SumsFile, [string]$Name)
  foreach ($l in [IO.File]::ReadAllLines($SumsFile)) {
    $m = [regex]::Match($l, '^([0-9a-fA-F]{64})\s+\*?(.+)$')
    if ($m.Success -and $m.Groups[2].Value.Trim() -eq $Name) { return $m.Groups[1].Value.ToLowerInvariant() }
  }
  return ''
}

function Get-WsPathBytes {
  # Tamanho de um ficheiro ou de uma pasta (com as subpastas), em bytes; 0 se nao existe.
  # O Get-ChildItem le o tamanho da entrada da pasta, que o NTFS so atualiza quando quem escreve fecha o ficheiro:
  # num download ainda aberto dava 0. O Refresh() pergunta ao proprio ficheiro (GetFileAttributesEx) o tamanho atual.
  param([string]$Path)
  try {
    if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return [int64]0 }
    $s = [int64]0
    foreach ($f in @(Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue)) {
      # Um ficheiro que desapareceu entretanto (o instalador renomeia ou apaga os temporarios) conta 0.
      try { $f.Refresh() } catch { }
      try { $s += [int64]$f.Length } catch { }
    }
    return $s
  } catch { }
  return [int64]0
}

function Invoke-WsDownload {
  # Download via .part. -Auth envia o REPO_TOKEN so ao servidor dos repositorios (nunca vai para o log).
  # Define $script:DlHttp, $script:DlStatus ('HtmlPage' se veio uma pagina web em vez do ficheiro), $script:DlHost
  # (o servidor final, so se o pedido foi redirecionado para outro) e $script:DlPartial (ja tinham chegado bytes).
  param([string]$Url, [string]$OutFile, [switch]$Auth, [int]$TimeoutSec = 600)
  $part = $OutFile + '.part'
  Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
  $script:DlHttp = 0; $script:DlStatus = ''; $script:DlHost = ''; $script:DlPartial = $false; $script:DlUrlHost = ''
  Write-WsLog ('download: {0}' -f $Url)
  $headers = @{}
  $hostName = ''; $urlHost = ''
  try { $hostName = ([Uri]$Url).Authority; $urlHost = ([Uri]$Url).Host } catch { }
  $script:DlUrlHost = $urlHost
  if ($Auth -and $env:REPO_TOKEN -and ($hostName -eq $script:Fill.REPO_HOST -or $hostName -eq $script:Fill.MEMORY_HOST)) {
    $headers['Authorization'] = 'token ' + $env:REPO_TOKEN
  }
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $part -Headers $headers -UserAgent $script:UA -TimeoutSec $TimeoutSec -ErrorAction Stop
  } catch {
    $ex = $_.Exception
    $info = Get-WsWebErrorInfo $ex
    $script:DlStatus = $info.Status; $script:DlHttp = $info.Http
    if ($info.Status -eq 'Blocked') { $script:Blocked = $OutFile }
    # Bytes ja escritos: a resposta chegou e a transferencia parou ou partiu-se a meio (E-NET-07, nao um bloqueio).
    try { if ((Test-Path -LiteralPath $part) -and (Get-Item -LiteralPath $part).Length -gt 0) { $script:DlPartial = $true } } catch { }
    $script:DlHost = Get-WsDlFinalHost $ex $info.Status $urlHost
    $more = ''
    if ($script:DlPartial) { $more += ', partial' }
    if ($script:DlHost) { $more += ', redirected to ' + $script:DlHost }
    Write-WsLog ('  -> failed: {0} (HTTP {1}, {2}{3})' -f $ex.Message, $script:DlHttp, $script:DlStatus, $more)
    Add-WsStepLog ('download failed: ' + $Url + ' ' + $ex.Message)
    Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
    return $false
  }
  # Uma pagina web no lugar do ficheiro (bloqueio de um proxy ou de um filtro, portal de uma rede WiFi) nunca e usada.
  if (Test-WsHtmlFile $part) {
    Write-WsLog '  -> HTML page instead of the file (proxy, content filter or WiFi login page)'
    Add-WsStepLog ('download: a web page came instead of the file: ' + $Url)
    Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
    $script:DlHttp = 200; $script:DlStatus = 'HtmlPage'
    return $false
  }
  # O antivirus pode estar a ler o ficheiro (o rename falha uns instantes) ou apaga-lo: tenta umas vezes e
  # confirma que o ficheiro ficou la.
  $moved = $false
  for ($i = 0; $i -lt 6 -and -not $moved; $i++) {
    try { Move-Item -LiteralPath $part -Destination $OutFile -Force -ErrorAction Stop; $moved = $true }
    catch { Write-WsLog ('  -> rename: ' + $_.Exception.Message); if (-not (Test-Path -LiteralPath $part)) { break }; Start-Sleep -Milliseconds 500 }
  }
  if (-not $moved -or -not (Test-Path -LiteralPath $OutFile)) {
    $script:DlStatus = 'Blocked'; $script:Blocked = $OutFile
    Write-WsLog ('  -> the file was removed or locked right after the download: ' + $OutFile)
    Add-WsStepLog ('download removed or locked (antivirus?): ' + $OutFile)
    Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
    return $false
  }
  $script:DlHttp = 200
  return $true
}

function Get-WsDlCode { return (Get-WsNetCode $script:DlStatus $script:DlHttp) }

function Test-WsHostKnown {
  # Um dos servidores do workshop (NET_CHECK_HOSTS e os dos repositorios)? Um redirecionamento para outro e um filtro.
  param([string]$HostName)
  if (-not $HostName) { return $false }
  $h = ($HostName -split ':')[0]
  $known = @([string]$script:C.NET_CHECK_HOSTS -split '\s+') + @($script:Fill.REPO_HOST, $script:Fill.MEMORY_HOST)
  return (@($known | Where-Object { $_ -and $_ -ieq $h }).Count -gt 0)
}

function Get-WsDlDetail {
  # Detalhe de um download falhado (depois do Invoke-WsDownload): comeca sempre pelo servidor que o IT tem de libertar
  # (o final, se o pedido foi redirecionado para outro servidor do workshop; senao o do URL), depois o que falhou e o
  # codigo HTTP (>= 400) ou "veio uma pagina web". Um redirecionamento para outro servidor (a pagina de bloqueio de um
  # filtro) vai no fim, como "redirecionado para".
  param([string]$What)
  $d = $What
  $h = [string]$script:DlHost; $u = [string]$script:DlUrlHost
  if ($h -and (Test-WsHostKnown $h)) { $d = $h + ' - ' + $d }
  else {
    if ($h) { $d = $d + ' - ' + (M 'dl_redirigido' @{ HOST = $h }) }
    if ($u -and $d -and -not $d.Contains('://') -and -not $d.StartsWith($u + ' ')) { $d = $u + ' - ' + $d }
  }
  if ($script:DlStatus -eq 'HtmlPage') { $d = $d + ' - ' + (M 'dl_html') }
  elseif ($script:DlHttp -ge 400) { $d = $d + ' - HTTP ' + $script:DlHttp }
  return $d
}

function Invoke-WsDownloadChecked {
  # Download com SHA-256. Se nao bater certo (ficheiro truncado ou alterado pelo caminho), apaga-o e descarrega uma
  # segunda vez. 0 = ok; 1 = o download falhou (Get-WsDlCode e Get-WsDlDetail); 2 = o SHA-256 nao bate certo, ou nao
  # ha nenhum para comparar. Um ficheiro que desaparece logo (antivirus) nao se descarrega outra vez: o Get-WsSha256
  # ja marcou o $script:Blocked e o passo mostra E-PERM-02.
  param([string]$Url, [string]$OutFile, [string]$Want, [switch]$Auth)
  $w = ([string]$Want).Trim().ToLowerInvariant()
  foreach ($n in 1, 2) {
    if (-not (Invoke-WsDownload $Url $OutFile -Auth:$Auth)) { return 1 }
    $got = Get-WsSha256 $OutFile
    if ($w -and $got -eq $w) { return 0 }
    Write-WsLog ('  -> SHA-256 {0} != {1} (try {2})' -f $got, $w, $n)
    Remove-Item -LiteralPath $OutFile -Force -ErrorAction SilentlyContinue
    if (-not $w -or -not $got) { return 2 }
  }
  return 2
}

function Test-WsSignature {
  # Assinatura Authenticode valida e do editor esperado.
  param([string]$Path, [string]$Publisher)
  try {
    $s = Get-AuthenticodeSignature -LiteralPath $Path
    Write-WsLog ('signature of {0}: {1} {2}' -f $Path, $s.Status, $s.SignerCertificate.Subject)
    return ($s.Status -eq 'Valid' -and $s.SignerCertificate.Subject -match $Publisher)
  } catch { return $false }
}

function Update-WsSessionPath {
  # Recarrega o PATH desta sessao a partir do registo (Maquina + Utilizador) e poe as pastas do kit a frente
  # (mesmo as que ja la estavam), como o ws_path_setup no Mac.
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $p = ($machine, $user | Where-Object { $_ }) -join ';'
  foreach ($d in @((Join-Path $script:WsHome 'bin'), (Join-Path $script:WsHome 'node'), (Join-Path $script:UserHome '.local\bin'))) {
    $p = Add-WsPathEntry $p $d
  }
  $env:Path = $p
}

function Get-WsUserEnvRaw {
  param([string]$Name)
  $k = Get-Item -Path 'HKCU:\Environment' -ErrorAction SilentlyContinue
  if (-not $k) { return $null }
  return $k.GetValue($Name, $null, 'DoNotExpandEnvironmentNames')
}

function Send-WsEnvChanged {
  # Avisa as outras aplicacoes (Explorer, terminais novos) de que o ambiente mudou.
  try {
    [Environment]::SetEnvironmentVariable('WS_SETUP_TMP', '1', 'User')
    [Environment]::SetEnvironmentVariable('WS_SETUP_TMP', $null, 'User')
  } catch { }
}

function Add-WsUserPath {
  # Poe a pasta a frente do PATH do utilizador (registo) e desta sessao. So fica registada para o --uninstall se
  # nao estava la antes: uma pasta que a pessoa ja tinha so muda de lugar, e o --uninstall deixa-a ficar.
  param([string]$Dir)
  $cur = Get-WsUserEnvRaw 'Path'
  $had = Test-WsPathHas $cur $Dir
  $new = Add-WsPathEntry $cur $Dir
  if ($new -ne $cur) {
    New-ItemProperty -Path 'HKCU:\Environment' -Name 'Path' -Value $new -PropertyType ExpandString -Force | Out-Null
    if (-not $had) { Register-WsExtra 'path_utilizador' $Dir '' '' '' }
    Send-WsEnvChanged
  }
  Update-WsSessionPath
}

function Update-WsUserPathFront {
  # No fim de cada instalacao (como o bloco do perfil no Mac): as pastas do kit passam para o inicio do PATH do
  # utilizador, so se a ordem mudar. Assim um claude, uv ou gh antigo que venha antes (npm em %APPDATA%\npm, pipx,
  # winget) deixa de passar a frente num terminal novo, tambem quando os passos ja estavam feitos e nenhum
  # Install-WsStepN correu. Uma pasta do kit que existe no disco mas saiu do PATH do utilizador (uma GPO ou um
  # perfil itinerante que o repoe no logon, uma limpeza a mao) volta a entrar pelo Add-WsUserPath, que a regista
  # para o --uninstall; o Test-WsStepN encontrava-a na mesma (o Update-WsSessionPath poe-na no PATH desta sessao)
  # e um terminal novo nao. Nao mexe no PATH da maquina (precisa de admin; num terminal novo vem sempre antes).
  try {
    $dirs = @(Join-Path $script:UserHome '.local\bin')
    # o node do kit so quando e o que esta em uso (como o WS_NODE_BIN_DIR no Mac): nao passa a frente de um mais novo
    $kn = Join-Path $script:WsHome 'node'
    if ($script:NodeExe -and (Split-Path $script:NodeExe) -ieq $kn) { $dirs += $kn }
    $dirs += (Join-Path $script:WsHome 'bin')
    foreach ($d in $dirs) {
      if ((Test-Path -LiteralPath $d -PathType Container) -and -not (Test-WsPathHas (Get-WsUserEnvRaw 'Path') $d)) {
        Write-WsLog ('user PATH: workshop folder missing, added back: ' + $d)
        Add-WsUserPath $d
      }
    }
    $cur = Get-WsUserEnvRaw 'Path'
    if (-not $cur) { return }
    $new = Move-WsPathFront $cur $dirs
    if ($new -eq $cur) { return }
    New-ItemProperty -Path 'HKCU:\Environment' -Name 'Path' -Value $new -PropertyType ExpandString -Force -ErrorAction Stop | Out-Null
    Write-WsLog ('user PATH: workshop folders moved to the front (' + ($dirs -join ', ') + ')')
    Send-WsEnvChanged
    Update-WsSessionPath
  } catch { Write-WsLog ('user PATH not reordered: ' + $_.Exception.Message) }
}

function Set-WsUserEnv {
  param([string]$Name, [string]$Value)
  $prev = Get-WsUserEnvRaw $Name
  if ($prev -eq $Value) { return }
  Register-WsExtra 'env_utilizador' $Name '' $Value ([string]$prev)
  [Environment]::SetEnvironmentVariable($Name, $Value, 'User')
  Set-Item -Path ('Env:' + $Name) -Value $Value
}

# =============================================================== estado dos passos

function Set-WsWarn {
  param([string]$Code, [string]$Detail)
  foreach ($w in $script:T[$script:Cur].Avisos) { if ($w[0] -eq $Code -and $w[1] -eq $Detail) { return } }   # o mesmo aviso uma vez so
  $script:T[$script:Cur].Avisos += , @($Code, $Detail); Write-WsLog ('warning {0} {1}' -f $Code, $Detail)
}
function Set-WsFail { param([string]$Code, [string]$Detail) $script:T[$script:Cur].Falha = @($Code, $Detail); Write-WsLog ('failure {0} {1}' -f $Code, $Detail) }
function Set-WsDetail { param([string]$Text) $script:T[$script:Cur].Detalhe = $Text }
function Add-WsNote { param([string]$Text) $script:T[$script:Cur].Notas += $Text }

function Get-WsStateLabel {
  param([string]$State)
  switch ($State) {
    'feito' { return (M 'estado_feito') } 'ja' { return (M 'estado_ja') } 'aviso' { return (M 'estado_aviso') }
    'falhou' { return (M 'estado_falhou') } 'naoexec' { return (M 'estado_naoexec') } 'saltado' { return (M 'estado_saltado') }
    'ok' { return (M 'estado_ok_check') } 'falta' { return (M 'estado_falta_check') }
  }
  return $State
}

function Get-WsHintHost {
  # Servidor que falhou (o primeiro do detalhe: "host - url ..." ou "host1, host2"), para os comandos do E-NET-01/02.
  param([string]$Detail)
  $h = ([string]$Detail).Trim()
  $h = ($h -split '\s+')[0].TrimEnd(',')
  $h = $h -replace '^[A-Za-z][A-Za-z0-9+.-]*://', ''
  $h = ($h -split '[/:?]')[0]
  if ($h -match '^[A-Za-z0-9.-]*\.[A-Za-z0-9-]*[A-Za-z]$') { return $h }
  return 'api.anthropic.com'
}

function Get-WsHintUrl {
  # URL para testar esse servidor. A raiz do claude.ai e do downloads.claude.ai responde 403 a quem nao e um browser
  # mesmo numa rede aberta: para esses testa-se o instalador.
  param([string]$Detail)
  $h = Get-WsHintHost $Detail
  if ($h -eq 'claude.ai' -or $h -eq 'downloads.claude.ai') { return [string]$script:C.CLAUDE_INSTALL_PS1_URL }
  return ('https://' + $h + '/')
}

function Write-WsCode {
  # -Prefix (com -PrefixColor): simbolo antes do titulo; -Sub: indentacao a mais do resto (a lista de passos do fancy).
  param([string]$Code, [string]$Detail, [string]$Indent, [string]$Prefix, [string]$PrefixColor, [string]$Sub)
  $e = Get-WsErr $Code
  if (-not $e) { Write-WsSay ($Indent + $Code); return }
  if ($Prefix) { Write-WsParts @(@($Indent, $null), @($Prefix, $PrefixColor), @((Format-WsFill $e.titulo), 'White')) }
  else { Write-WsSay ($Indent + (Format-WsFill $e.titulo)) 'White' }
  $Indent = $Indent + $Sub
  $d = ''
  if ($Detail) { $d = ' (' + $Detail + ')' }
  Write-WsSay ($Indent + (M 'porque') + ': ' + (Format-WsFill $e.causa) + $d)
  Write-WsSay ($Indent + (M 'fazer') + ':')
  foreach ($f in $e.fazer) { Write-WsSay ($Indent + '  - ' + (Format-WsFill $f)) }
  # Nos comandos PS> a pasta dos projetos vai como $env:USERPROFILE (o PowerShell nao expande %USERPROFILE%);
  # sem aspas continua a ser um so argumento, mesmo com espacos no nome. As frases ficam com %USERPROFILE%.
  # O servidor que falhou (E-NET-01/02) e a pasta do projeto (E-DEMO-03) vem do detalhe.
  $leaf = ''
  if ($Detail) { $leaf = ($Detail -split '[\\/]')[-1] }
  $fv = @{ PROJETOS = '$env:USERPROFILE\workshop-claude'; HOST = (Get-WsHintHost $Detail); URL = (Get-WsHintUrl $Detail); NOME = $leaf }
  foreach ($c in $e.windows) { Write-WsSay ($Indent + '    PS> ' + (Format-WsFill $c $fv)) 'Cyan' }
  Write-WsSay ($Indent + (M 'codigo' @{ CODIGO = $Code })) 'DarkGray'
}

function Write-WsResultFancy {
  # Resultado de um passo no fancy: a linha do passo (simbolo, nome curto, detalhe), as notas em cinzento e, debaixo,
  # a explicacao de cada falha ou aviso, como no plain.
  param([string]$N)
  Stop-WsLive
  $s = $script:T[$N]
  # Sem detalhe, a linha (e o resumo) mostra o titulo do codigo (da falha ou do primeiro aviso).
  if (-not $s.Detalhe) {
    $c = ''
    if ($s.Falha -and ($s.Estado -eq 'falhou' -or $s.Estado -eq 'falta')) { $c = [string]$s.Falha[0] }
    elseif ($s.Avisos.Count -gt 0) { $c = [string]$s.Avisos[0][0] }
    $e = $null
    if ($c) { $e = Get-WsErr $c }
    if ($e) { $s.Detalhe = (Format-WsFill $e.titulo) + ' (' + $c + ')' }
  }
  $parts = @(@('  ', $null), @((Get-WsSymbol $s.Estado $true), (Get-WsStateColor $s.Estado)), @((' ' + (Get-WsStepName $N).PadRight(19) + $s.Detalhe), $null))
  if ($s.Estado -eq 'ja') {
    $sep = ''
    if ($s.Detalhe) { $sep = ' ' + $script:G.Dot + ' ' }
    $parts += , @(($sep + (M 'ja_sufixo')), 'DarkGray')
  }
  Write-WsParts $parts
  foreach ($nt in $s.Notas) { Write-WsSay ('    ' + $nt) 'DarkGray' }
  $any = $false
  if ($s.Falha -and ($s.Estado -eq 'falhou' -or $s.Estado -eq 'falta')) {
    Write-WsCode $s.Falha[0] $s.Falha[1] '    ' -Prefix ((Get-WsSymbol 'falhou' $true) + ' ') -PrefixColor 'Red' -Sub '  '; $any = $true
  }
  foreach ($w in $s.Avisos) { Write-WsCode $w[0] $w[1] '    ' -Prefix ((Get-WsSymbol 'aviso' $true) + ' ') -PrefixColor 'Yellow' -Sub '  '; $any = $true }
  if ($any) { Write-WsSay '' }
}

function Write-WsResult {
  param([string]$N)
  if ($script:Ui -eq 'fancy') { Write-WsResultFancy $N; return }
  $s = $script:T[$N]
  $line = '  ' + (Get-WsSymbol $s.Estado $script:Emoji) + ' ' + (Get-WsStateLabel $s.Estado)
  if ($s.Detalhe) { $line += ' - ' + $s.Detalhe }
  $color = $null
  switch ($s.Estado) { 'falhou' { $color = 'Red' } 'falta' { $color = 'Red' } 'aviso' { $color = 'Yellow' } 'feito' { $color = 'Green' } 'ok' { $color = 'Green' } }
  Write-WsSay $line $color
  foreach ($n in $s.Notas) { Write-WsSay ('     ' + $n) }
  if ($s.Falha -and ($s.Estado -eq 'falhou' -or $s.Estado -eq 'falta')) { Write-WsCode $s.Falha[0] $s.Falha[1] '     ' }
  foreach ($w in $s.Avisos) {
    Write-WsSay ('     ' + (Get-WsSymbol 'aviso' $script:Emoji) + ' ' + (M 'estado_aviso')) 'Yellow'
    Write-WsCode $w[0] $w[1] '        '
  }
  # Sem detalhe, o resumo mostra o titulo do codigo (da falha ou do primeiro aviso), para a linha nao ficar vazia.
  if (-not $s.Detalhe) {
    $c = ''
    if ($s.Falha -and ($s.Estado -eq 'falhou' -or $s.Estado -eq 'falta')) { $c = [string]$s.Falha[0] }
    elseif ($s.Avisos.Count -gt 0) { $c = [string]$s.Avisos[0][0] }
    $e = $null
    if ($c) { $e = Get-WsErr $c }
    if ($e) { $s.Detalhe = (Format-WsFill $e.titulo) + ' (' + $c + ')' }
  }
}

function Get-WsDefaultCode {
  param([string]$N)
  switch ($N) { '1' { 'E-GIT-02' } '2' { 'E-CC-01' } '3' { 'E-AUTH-01' } '4' { 'E-NODE-01' } '5' { 'E-UV-01' } '6' { 'E-GH-01' }
    '7' { 'E-MCP-01' } '8' { 'E-KIT-03' } '9' { 'E-DEMO-01' } '10' { 'E-MEM-03' } '11' { 'E-DESK-02' } default { 'E-SMOKE-01' } }
}

function Test-WsMissingCode {
  # Em -Check, "nao instalado" mostra-se como E-SETUP-01 (correr o setup) e nao como uma falha de instalacao.
  param([string]$Code)
  return (@('E-CC-01', 'E-NODE-01', 'E-UV-01', 'E-GH-01', 'E-GIT-02', 'E-MCP-01', 'E-KIT-01', 'E-KIT-03', 'E-DEMO-01', 'E-MEM-01', 'E-MEM-03', 'E-DESK-02') -contains $Code)
}

function Get-WsDiskFull {
  # Disco cheio: menos de 50 MB livres no disco da pasta pessoal, ou a mensagem do Windows no log do passo.
  # Devolve o detalhe ("NN MB free") ou ''.
  try {
    $drive = Get-PSDrive -Name ($script:UserHome.Substring(0, 1)) -ErrorAction Stop
    if ($null -ne $drive.Free -and $drive.Free -lt 50MB) { return ('{0} MB free' -f [int][math]::Floor($drive.Free / 1MB)) }
  } catch { }
  if ($script:StepLog -and $script:StepLog.ToString() -match 'not enough space on the disk|ENOSPC|No space left on device|os error 112') { return 'No space left on device' }
  return ''
}

function Invoke-WsPermReclass {
  # Um erro de permissao (ou "nao e uma pasta") na saida do passo ganha ao codigo generico do passo, que fala da rede
  # ou de reinstalar: mostra-se E-PERM-01 com a linha que o diz (restos de uma execucao como administrador ou de
  # outro utilizador, pastas bloqueadas). As causas mais certas (Group Policy, antivirus, login, saldo) ficam.
  # No Windows o "Access is denied" e o EPERM tambem aparecem com um ficheiro em uso (o uv a apagar a pasta do
  # agent-memory com o servidor MCP aberto, o antivirus a meio de um rename): se a pasta de cima do caminho da linha
  # aceita escrita, a pasta nao e de outro utilizador e fica o codigo do passo.
  $s = $script:T[$script:Cur]
  if (-not $s.Falha) { return }
  $c = [string]$s.Falha[0]
  if ($c -like 'E-PERM-*' -or $c -like 'E-AUTH-*' -or @('E-SO-06', 'E-SO-07', 'E-CFG-05', 'E-GH-02', 'E-SMOKE-02', 'E-SMOKE-03') -contains $c) { return }
  # Disco cheio (como o ws_disk_reclass do Mac): cada passo falhava com outra causa (a rede, o kit, reinstalar).
  $full = Get-WsDiskFull
  if ($full) { Set-WsFail 'E-SO-06' ($full + ' - ' + $c); return }
  $l = Get-WsPermLine (Protect-WsText $script:StepLog.ToString() $script:Literals) $script:UserHome
  if (-not $l) { return }
  $m = [regex]::Match($l, '[''`"]((?:~|[A-Za-z]:)[\\/][^''`"]+)[''`"]')
  if ($m.Success) {
    $p = $m.Groups[1].Value
    if ($p.StartsWith('~')) { $p = ([string]$script:UserHome).TrimEnd('\', '/') + $p.Substring(1) }
    if (Test-WsDirWritable (Split-Path -Parent $p)) { return }
  }
  Set-WsFail 'E-PERM-01' $l
}

function Invoke-WsStep {
  param([int]$N, [int[]]$Deps = @(), [switch]$Retry)
  $key = "$N"
  $script:Cur = $key
  $script:StepLog = New-Object System.Text.StringBuilder
  $script:Blocked = ''
  $script:T[$key] = @{ Estado = ''; Detalhe = ''; Avisos = @(); Falha = $null; Notas = @() }
  $title = $script:Titles[$key]
  # fancy: a zona viva com o spinner (a linha do passo so aparece no fim); senao o cabecalho "Step N/12 . ...".
  if ($script:Ui -eq 'fancy') { Start-WsLive $key }
  else {
    Write-WsSay ''
    Write-WsSay (M 'passo' @{ N = $key; TITULO = $title }) 'White'
  }
  Write-WsLog ('=== step {0}: {1} (mode {2})' -f $key, $title, $script:Mode)
  # Cada instalacao deixa "result step N: estado [codigo|detalhe]" no setup.log (ver Get-WsLastInstallResult).
  $failed = ''
  $dep = Test-WsDependencies $script:T $Deps
  if ($null -ne $dep) {
    $script:T[$key].Estado = 'naoexec'; Set-WsDetail (M 'dep_falhou' @{ N = $dep }); Write-WsResult $key
    if ($script:Mode -eq 'install') { Write-WsLog ('result step {0}: naoexec' -f $key) }
    return
  }
  if ($N -eq 11 -and $script:SemDesktop) { $script:T[$key].Estado = 'saltado'; Set-WsDetail '-NoDesktop'; Write-WsResult $key; return }
  $nonBlocking = ($N -eq 10 -or $N -eq 11)
  $detected = $false
  try { $detected = [bool](& ('Test-WsStep' + $N)) } catch { Write-WsLog ('detection error: ' + $_.Exception.Message); $detected = $false }
  $s = $script:T[$key]
  if ($detected) {
    if ($s.Avisos.Count -gt 0) { $s.Estado = 'aviso' }
    elseif ($script:Mode -eq 'install' -and $N -ne 0) { $s.Estado = 'ja' }
    elseif ($script:Mode -eq 'install') { $s.Estado = 'feito' }
    else { $s.Estado = 'ok' }
  } elseif ($script:Mode -ne 'install') {
    if (-not $s.Falha) { Set-WsFail (Get-WsDefaultCode $key) '' }
    $rc = Resolve-WsFailCode $s.Falha[0] $s.Falha[1] $key $script:Mode $script:Blocked $script:GpoBlocks $script:ProxyAuth
    if ($rc[0] -ne $s.Falha[0]) { Set-WsFail $rc[0] $rc[1] } else { Invoke-WsPermReclass }
    # "Ainda nao instalado": a causa real da ultima instalacao (se falhou) vem do setup.log, porque o -Check e o
    # -Doctor nao voltam a correr a instalacao.
    $prev = $null
    # o detalhe do que falta (ex.: a pasta de um projeto) fica a seguir ao codigo, para a pessoa saber o que e
    if (Test-WsMissingCode $script:T[$key].Falha[0]) {
      $prev = Get-WsLastInstallResult $key $script:LogFile
      $fd = $script:T[$key].Falha[1]
      $why = $script:T[$key].Falha[0]
      if ($fd) { $why = $why + ': ' + (Format-WsHomePath $fd $script:UserHome) }
      Set-WsFail 'E-SETUP-01' $why
    }
    $s = $script:T[$key]
    if ($nonBlocking) { $s.Estado = 'aviso'; $s.Avisos += , $s.Falha; $s.Falha = $null } else { $s.Estado = 'falta' }
    if ($prev) { Set-WsWarn $prev[0] $prev[1] }
  } else {
    $s.Avisos = @(); $s.Falha = $null
    $ok = $false
    try { $ok = [bool](& ('Install-WsStep' + $N)) } catch { Write-WsLog ('error: ' + $_.Exception.Message); Add-WsStepLog $_.Exception.ToString(); $ok = $false }
    $s = $script:T[$key]
    if ($ok) { if ($s.Avisos.Count -gt 0) { $s.Estado = 'aviso' } else { $s.Estado = 'feito' } }
    else {
      if (-not $s.Falha) { Set-WsFail (Get-WsDefaultCode $key) '' }
      $rc = Resolve-WsFailCode $s.Falha[0] $s.Falha[1] $key $script:Mode $script:Blocked $script:GpoBlocks $script:ProxyAuth
      if ($rc[0] -ne $s.Falha[0]) { Set-WsFail $rc[0] $rc[1] } else { Invoke-WsPermReclass }
      $s = $script:T[$key]
      # A falha fica registada antes de o passo nao bloqueante a passar a aviso.
      $failed = (@($s.Falha) -join '|') -replace '[\r\n]+', ' '
      if ($nonBlocking) { $s.Estado = 'aviso'; $s.Avisos += , $s.Falha; $s.Falha = $null } else { $s.Estado = 'falhou' }
    }
  }
  if ($script:StepLog.Length -gt 0) { Write-WsLog ("--- command output (step $key) ---`r`n" + $script:StepLog.ToString() + "`r`n--- end ---") }
  if ($script:Mode -eq 'install') { Write-WsLog (('result step {0}: {1} {2}' -f $key, $script:T[$key].Estado, $failed).TrimEnd()) }
  Write-WsResult $key
  if ($script:T[$key].Estado -eq 'falhou' -and $script:Mode -eq 'install' -and -not $Retry) {
    if (Invoke-WsHelper $key) {
      Write-WsSay ('  ' + (M 'helper_repetir' @{ N = $key }))
      Invoke-WsStep -N $N -Deps $Deps -Retry
    }
  }
}

# =============================================================== kit e manifest

function Register-WsExtra {
  param([string]$Tipo, [string]$Nome, [string]$Caminho, [string]$Valor, [string]$Anterior)
  $line = ($Tipo, $Nome, $Caminho, $Valor, $Anterior) -join "`t"
  [IO.File]::AppendAllText((Join-Path $script:WsHome 'extras-pendentes.tsv'), $line + "`n", $script:Utf8NoBom)
  Sync-WsExtras
}

function Sync-WsExtras {
  $p = Join-Path $script:WsHome 'extras-pendentes.tsv'
  if (-not (Test-Path -LiteralPath $p)) { return }
  if (-not $script:NodeExe -or -not $script:KitSrc) { return }
  $iu = Join-Path $script:KitSrc 'installer\install-user.mjs'
  if (-not (Test-Path -LiteralPath $iu)) { return }
  foreach ($l in [IO.File]::ReadAllLines($p, $script:Utf8NoBom)) {
    if (-not $l) { continue }
    $f = $l.Split("`t")
    $a = @($iu, 'registar', '--tipo', $f[0], '--nome', $f[1])
    if ($f.Count -gt 2 -and $f[2]) { $a += @('--caminho', $f[2]) }
    if ($f.Count -gt 3 -and $f[3]) { $a += @('--valor', $f[3]) }
    if ($f.Count -gt 4) { $a += @('--anterior', $f[4]) }
    $r = Invoke-WsProcess $script:NodeExe $a
    if ($r.ExitCode -ne 0) { return }
  }
  Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
}

function Initialize-WsKit {
  if ($script:KitSrc -and (Test-Path -LiteralPath (Join-Path $script:KitSrc 'installer\install-user.mjs'))) { return $true }
  $dest = Join-Path $script:WsHome ('kit-src\' + $script:C.WORKSHOP_VERSION)
  $okFile = Join-Path $dest '.ws-kit-ok'
  # O .ws-kit-ok guarda o SHA-256 do arquivo: uma release republicada com a mesma tag (outro SHA-256) volta a ser
  # descarregada ao instalar. O -Check e o -Doctor usam o que houver.
  if (Test-Path -LiteralPath $okFile) {
    $have = ''
    try { $have = ([IO.File]::ReadAllText($okFile)).Trim() } catch { $have = '' }
    if ($script:Mode -ne 'install' -or -not $script:InjKitSha -or $have -eq $script:InjKitSha) { $script:KitSrc = $dest; return $true }
    Write-WsLog ('kit-src {0} is not the published kit (republished release?): downloading it again' -f $script:C.WORKSHOP_VERSION)
  }
  if ($script:Mode -ne 'install') { return $false }
  $name = 'workshop-kit-' + $script:C.WORKSHOP_VERSION + '.zip'
  $tmpd = Join-Path $script:Tmp 'kit'
  Remove-Item -LiteralPath $tmpd -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path (Join-Path $tmpd 'x') -Force | Out-Null
  Write-WsActivity (M 'a_descarregar' @{ O_QUE = $name })
  $zip = Join-Path $tmpd $name
  $kitUrl = Get-WsReleaseUrl 'workshop' $name
  # Com o SHA-256 injetado (release), um arquivo truncado ou alterado e descarregado uma segunda vez.
  $rc = 1
  if ($script:InjKitSha) { $rc = Invoke-WsDownloadChecked $kitUrl $zip $script:InjKitSha -Auth }
  elseif (Invoke-WsDownload $kitUrl $zip -Auth) { $rc = 0 }
  if ($rc -ne 1) {
    if ($rc -eq 2) {
      Write-WsLog ('kit SHA-256 mismatch (expected {0})' -f $script:InjKitSha)
      Set-WsWarn 'E-KIT-02' $name
    } else {
      try {
        $sum = Get-WsSha256 $zip
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [IO.Compression.ZipFile]::ExtractToDirectory($zip, (Join-Path $tmpd 'x'))
        $inner = Join-Path $tmpd ('x\workshop-kit-' + $script:C.WORKSHOP_VERSION)
        if (Test-Path -LiteralPath $inner) {
          # O .ws-kit-ok sai primeiro: um kit meio apagado nunca volta a contar como bom.
          Remove-Item -LiteralPath $okFile -Force -ErrorAction SilentlyContinue
          Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue
          # Um kit antigo que nao saiu todo (um ficheiro aberto): o novo nao vai para dentro dele.
          if (Test-Path -LiteralPath $dest) { throw ('kit-src not replaced: ' + $dest) }
          New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
          Move-Item -LiteralPath $inner -Destination $dest -ErrorAction Stop
          [IO.File]::WriteAllText($okFile, $sum)
          $script:KitSrc = $dest
          return $true
        }
      } catch { Add-WsStepLog $_.Exception.Message }
    }
  }
  # Sem o arquivo novo, o kit que ja estava descarregado continua a servir.
  if (Test-Path -LiteralPath $okFile) { $script:KitSrc = $dest; return $true }
  # Recurso: git clone da tag. O REPO_TOKEN, se existir, vai por variaveis de configuracao do git.
  $git = Get-WsGit
  if (-not $git) { return $false }
  $clone = Join-Path $tmpd 'clone'
  $envs = @{ GIT_TERMINAL_PROMPT = '0' }
  if ($env:REPO_TOKEN) { $envs['GIT_CONFIG_COUNT'] = '1'; $envs['GIT_CONFIG_KEY_0'] = 'http.extraHeader'; $envs['GIT_CONFIG_VALUE_0'] = 'Authorization: token ' + $env:REPO_TOKEN }
  $r = Invoke-WsProcess $git @('clone', '-q', '--depth', '1', '--branch', $script:C.WORKSHOP_VERSION, $script:C.WORKSHOP_REPO_URL, $clone) -Environment $envs
  if ($r.ExitCode -ne 0) { return $false }
  Remove-Item -LiteralPath (Join-Path $clone '.git') -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $okFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue
  # Com o kit antigo ainda la (um ficheiro aberto), o Move-Item punha o clone dentro dele.
  if (Test-Path -LiteralPath $dest) { Add-WsStepLog ('kit-src not replaced: ' + $dest); return $false }
  New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
  try { Move-Item -LiteralPath $clone -Destination $dest -ErrorAction Stop } catch { Add-WsStepLog $_.Exception.Message; return $false }
  [IO.File]::WriteAllText($okFile, (Get-Date -Format o))
  $script:KitSrc = $dest
  return $true
}

function Get-WsReleaseUrl {
  param([string]$Which, [string]$File)
  if ($Which -eq 'memory') { $p = Get-WsRepoParts $script:C.MEMORY_APP_REPO_URL; $v = $script:C.MEMORY_APP_VERSION }
  else { $p = Get-WsRepoParts $script:C.WORKSHOP_REPO_URL; $v = $script:C.WORKSHOP_VERSION }
  $p['version'] = $v; $p['file'] = $File
  return (Expand-WsPattern $script:C.RELEASE_DOWNLOAD_URL $p)
}

function Get-WsWinPowerShell {
  # Para os instaladores oficiais (install.ps1 do Claude Code e do uv) e para o "terminal novo" do passo 4.
  if ($env:SystemRoot) {
    $p = Get-WsWinPowerShellPath $env:SystemRoot ([Environment]::Is64BitOperatingSystem) ([Environment]::Is64BitProcess)
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return 'powershell.exe'
}

# Primeiro o uv do workshop (~\.local\bin\uv.exe): um uv antigo mais a frente no PATH nao serve (ver Test-WsStep5).
function Get-WsUv { $p = Join-Path $script:UserHome '.local\bin\uv.exe'; if (Test-Path -LiteralPath $p) { return $p }; $c = Get-Command uv -ErrorAction SilentlyContinue; if ($c) { return $c.Source }; return $null }
# O claude do kit (~\.local\bin) primeiro, seja qual for a ordem do PATH: um claude.cmd antigo do npm nao o esconde.
function Get-WsClaude { $p = Join-Path $script:UserHome '.local\bin\claude.exe'; if (Test-Path -LiteralPath $p) { return $p }; $c = Get-Command claude -ErrorAction SilentlyContinue; if ($c -and $c.CommandType -eq 'Application' -and $c.Source -notmatch '[\\/]node_modules[\\/]') { return $c.Source }; return $null }

function Get-WsGit {
  $c = Get-Command git -ErrorAction SilentlyContinue
  if ($c -and $c.CommandType -eq 'Application') { return $c.Source }
  foreach ($p in @((Join-Path $env:LOCALAPPDATA 'Programs\Git\cmd\git.exe'), (Join-Path $env:ProgramFiles 'Git\cmd\git.exe'))) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  return $null
}

function Test-WsWinget {
  if ($script:OsBuild -lt 18362) { return $false }
  $w = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $w) { return $false }
  # Um winget bloqueado (AppLocker, comum nas empresas) e so "sem winget": nao conta como E-PERM-02.
  $keep = $script:Blocked
  $r = Invoke-WsProcess $w.Source @('--version') -TimeoutSec 60
  $script:Blocked = $keep
  return ($r.ExitCode -eq 0)
}

function Invoke-WsWinget {
  param([string]$Id)
  $w = (Get-Command winget -ErrorAction SilentlyContinue).Source
  $keep = $script:Blocked
  $r = Invoke-WsProcess $w @('install', '--id', $Id, '-e', '--scope', 'user', '--source', 'winget', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity') -TimeoutSec 1800
  $script:Blocked = $keep
  Update-WsSessionPath
  return ($r.ExitCode -eq 0)
}

# =============================================================== PASSO 0 - ambiente

function Add-WsStep0LangNotes {
  # Lingua: a escolhida, um WORKSHOP_LANG ignorado (gralha) e a lingua guardada quando o sistema diz outra.
  Add-WsNote (M 's0_lingua' @{ LINGUA = $script:Lang })
  if ($script:LangIgnored) { Add-WsNote (M 's0_lingua_ignorada' @{ VALOR = $script:LangIgnored; LINGUA = $script:Lang }) }
  if ($script:LangSaved -and $script:LangSaved -ne $script:LangMachine) { Add-WsNote (M 's0_lingua_guardada' @{ LINGUA = $script:LangSaved; MAQUINA = $script:LangMachine }) }
}

function Set-WsOsInfo {
  # Sistema e arquitetura ($script:OsText, $script:Arch, $script:OsBuild): para o cartao do inicio e para o passo 0.
  $v = [Environment]::OSVersion.Version
  $script:OsBuild = $v.Build
  # Arquitetura nativa, mesmo quando o PowerShell corre emulado (x64 num Windows ARM64).
  $arch = 'x64'
  $oa = ''
  try { $oa = [string][System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture } catch { $oa = '' }
  $regArch = ''
  try { $regArch = [string](Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -Name PROCESSOR_ARCHITECTURE -ErrorAction Stop).PROCESSOR_ARCHITECTURE } catch { $regArch = '' }
  if ($oa -eq 'Arm64' -or $env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64' -or $regArch -eq 'ARM64') { $arch = 'arm64' }
  $script:Arch = $arch
  $script:OsText = ('Windows {0}.{1}.{2} {3} - PowerShell {4}' -f $v.Major, $v.Minor, $v.Build, $arch, $PSVersionTable.PSVersion)
  return $v
}

function Test-WsStep0 {
  $v = Set-WsOsInfo
  $arch = $script:Arch
  Add-WsNote (M 's0_so' @{ SO = $script:OsText })
  Add-WsStep0LangNotes
  if ($v.Major -lt 10 -or $v.Build -lt 18362) { Set-WsWarn 'E-SO-01' ('{0}.{1}.{2}' -f $v.Major, $v.Minor, $v.Build) }
  if ($arch -eq 'arm64') { Set-WsWarn 'E-SO-02' 'ARM64' }

  foreach ($f in @((Join-Path $env:ProgramFiles 'ClaudeCode\managed-settings.json'), (Join-Path $env:ProgramData 'ClaudeCode\managed-settings.json'))) {
    # Common on company laptops: only a note (the E-CFG-01 help stays in TROUBLESHOOTING, if a step is blocked).
    if ($f -and (Test-Path -LiteralPath $f)) { Add-WsNote (M 's0_gerido' @{ CAMINHO = $f }) }
  }
  if (Test-Path 'HKLM:\SOFTWARE\Policies\ClaudeCode') { Add-WsNote (M 's0_gerido' @{ CAMINHO = 'HKLM:\SOFTWARE\Policies\ClaudeCode' }) }
  $uvEnv = @{}
  foreach ($k in @('UV_PYTHON_DOWNLOADS', 'UV_NO_MANAGED_PYTHON', 'UV_PYTHON_PREFERENCE')) {
    $v = [Environment]::GetEnvironmentVariable($k)
    if (-not $v) { $v = Get-WsUserEnvRaw $k }
    if ($v) { $uvEnv[$k] = $v }
  }
  foreach ($b in (Get-WsUvPythonBlockers $uvEnv)) { Set-WsWarn 'E-CFG-07' ($b + '=' + $uvEnv[$b]) }
  # Chaves da API e cloud (Bedrock, Vertex, Foundry), no ambiente ou no "env" das definicoes do Claude Code. So os
  # nomes (e o ficheiro), nunca os valores. O ANTHROPIC_BASE_URL ve-se depois da rede (Test-WsGateway).
  $keys = Get-WsEnvKeys -User
  if ($keys) { Set-WsWarn 'E-CFG-02' $keys }
  # Bedrock, Vertex ou Foundry: o aviso (E-CFG-04) fica no passo 3, onde o Claude Code diz qual usa.
  $cloud = Get-WsCloudWhere
  if ($cloud) { Write-WsLog ('cloud provider: ' + $cloud) }
  Test-WsEnvWarnings

  try {
    $drive = Get-PSDrive -Name ($script:UserHome.Substring(0, 1)) -ErrorAction Stop
    # Com uma casa decimal: "0 GB" com 590 MB livres escondia quanto falta.
    $g = $drive.Free / 1GB; $dec = 1; if ($g -lt 0.1) { $dec = 2 }
    $gb = ([math]::Round($g, $dec)).ToString([Globalization.CultureInfo]::InvariantCulture)
    Add-WsNote (M 's0_disco' @{ GB = $gb })
    if ($drive.Free -lt 3GB) { Set-WsWarn 'E-SO-06' ('{0} GB' -f $gb) }
  } catch { }
  # So as pastas onde o kit escreve (como no Mac). Os Documentos e o Ambiente de Trabalho no OneDrive (o
  # "Known Folder Move", normal nos portateis da empresa) nao tem nada do kit.
  $inOd = Find-WsInFolder $env:OneDrive @($script:UserHome, $script:Proj, $script:ClaudeDir)
  if ($inOd) { Set-WsWarn 'E-SO-03' $inOd }
  Test-WsPermScan
  Write-WsLog ('home: profile {0}; $HOME {1}' -f $script:UserHome, $HOME)
  Test-WsRoamingAppData
  $gpo = Get-WsGpoPolicy (Read-WsGpoKey 'LocalMachine') (Read-WsGpoKey 'CurrentUser')
  if ($gpo) {
    Write-WsLog ('execution policy from Group Policy: {0} ({1})' -f $gpo.Policy, $gpo.Scope)
    if ($gpo.Blocks) { $script:GpoBlocks = $true; Set-WsWarn 'E-SO-07' ('{0} ({1})' -f $gpo.Policy, $gpo.Scope) }
  }

  Test-WsProxy
  Test-WsTls
  Test-WsNetwork
  # O Claude Code usa o proxy do settings.json mesmo que o terminal ja nao tenha nenhum (o passo 8 tira o que o setup gravou).
  $spd = Get-WsSettingsProxyDead
  if ($spd) { Add-WsNote (M 's0_proxy_settings' @{ PROXY = $spd }) }
  Test-WsGateway
  Set-WsDetail ($script:OsText + ' - ' + $script:Lang + ' - ' + (M 's0_rede_ok' @{ OK = $script:NetOk; TOTAL = $script:NetTotal }))
  return $true
}
function Install-WsStep0 { return (Test-WsStep0) }

function Test-WsEnvWarnings {
  # Variaveis do terminal que o setup contorna mas que continuam a partir o que a pessoa corre la (como no Mac).
  # Modelos trocados (shell ou "env" das definicoes): mudam o sonnet/haiku das skills e o modelo da sessao.
  $mv = @()
  foreach ($k in @('ANTHROPIC_MODEL', 'ANTHROPIC_DEFAULT_OPUS_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_HAIKU_MODEL', 'ANTHROPIC_SMALL_FAST_MODEL', 'CLAUDE_CODE_SUBAGENT_MODEL')) {
    $v = [Environment]::GetEnvironmentVariable($k)
    if ($v) { $mv += ($k + '=' + $v + ' (shell)'); continue }
    $r = Get-WsSettingsEnv $k
    if ($r) { $mv += ('{0}={1} ({2})' -f $k, $r[0], $r[1]) }
  }
  if ($mv.Count -gt 0) { Set-WsWarn 'E-CFG-10' ($mv -join ' - ') }
  $ca = @(Get-WsCaBad)
  if ($ca.Count -gt 0) { Set-WsWarn 'E-NET-09' ($ca -join ' - ') }
  if ($script:TmpBad) { Set-WsWarn 'E-SO-09' $script:TmpBad }
}

function Test-WsTruthy { param([string]$V) return ($V -match '^(1|true|yes|on)$') }

function Get-WsSettingsEnv {
  # Valor de uma variavel no bloco "env" das definicoes do Claude Code (as do utilizador e as geridas pela empresa,
  # que e como as empresas ligam o Bedrock ou um gateway). Devolve @(valor, ficheiro) ou $null.
  # O valor pode ser uma chave: nunca se mostra nem vai para o log. Um JSON booleano chega como 'True'.
  param([string]$Name)
  $files = @()
  if ($script:ClaudeDir) { $files += (Join-Path $script:ClaudeDir 'settings.json') }
  foreach ($base in @($env:ProgramFiles, $env:ProgramData)) {
    if (-not $base) { continue }
    $files += (Join-Path $base 'ClaudeCode\managed-settings.json')
    $dropIn = Join-Path $base 'ClaudeCode\managed-settings.d'
    if (Test-Path -LiteralPath $dropIn) { foreach ($d in (Get-ChildItem -LiteralPath $dropIn -Filter '*.json' -ErrorAction SilentlyContinue | Sort-Object Name)) { $files += $d.FullName } }
  }
  foreach ($f in $files) {
    if (-not (Test-Path -LiteralPath $f -PathType Leaf)) { continue }
    try { $j = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8) | ConvertFrom-Json -ErrorAction Stop } catch { continue }
    if ($j -and $j.env -and ($j.env.PSObject.Properties.Name -contains $Name)) { $v = [string]$j.env.$Name; if ($v) { return @($v, $f) } }
  }
  return $null
}

function Get-WsEnvKeys {
  # Chaves da API que passam a frente do login: no ambiente deste processo (que o Claude herda) ou no "env" das
  # definicoes. -User: tambem as variaveis do utilizador no registo (as de um terminal novo). So os nomes, nunca os
  # valores: "ANTHROPIC_API_KEY" ou "ANTHROPIC_API_KEY (ficheiro)", separados por ', '; '' se nao houver.
  param([switch]$User)
  $out = @()
  foreach ($k in @('ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY')) {
    $v = [Environment]::GetEnvironmentVariable($k)
    if (-not $v -and $User) { $v = Get-WsUserEnvRaw $k }
    if ($v) { $out += $k; continue }
    $s = Get-WsSettingsEnv $k
    if ($s) { $out += ('{0} ({1})' -f $k, $s[1]) }
  }
  return ($out -join ', ')
}

function Get-WsCloudWhere {
  # Claude Code configurado para uma cloud (Bedrock, Vertex, Foundry): o login do Console e ignorado e, sem as
  # credenciais da cloud, os pedidos nunca acabam. Devolve "VARIAVEL (shell)" ou "VARIAVEL (ficheiro)", ou $null.
  $names = @('CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY')
  foreach ($n in $names) {
    $v = [Environment]::GetEnvironmentVariable($n)
    if (-not $v) { $v = Get-WsUserEnvRaw $n }
    if (Test-WsTruthy $v) { return ('{0} (shell)' -f $n) }
  }
  foreach ($n in $names) { $s = Get-WsSettingsEnv $n; if ($s -and (Test-WsTruthy $s[0])) { return ('{0} ({1})' -f $n, $s[1]) } }
  return $null
}

function Get-WsUserName {
  # DOMINIO\nome, para o icacls (so o nome pode ser ambiguo entre uma conta local e uma do dominio).
  if ($env:USERDOMAIN -and $env:USERNAME) { return ($env:USERDOMAIN + '\' + $env:USERNAME) }
  if ($env:USERNAME) { return $env:USERNAME }
  return [Environment]::UserName
}

function Test-WsDirWritable {
  # Uma pasta aceita escrita se se consegue criar e apagar um ficheiro nela: com as ACL do Windows e o unico teste
  # certo. Uma pasta que ainda nao existe conta como a primeira pasta de cima que existe.
  param([string]$Dir)
  $d = $Dir
  while ($d -and -not (Test-Path -LiteralPath $d)) { $d = Split-Path -Parent $d }
  if (-not $d -or -not (Test-Path -LiteralPath $d -PathType Container)) { return $false }
  $f = Join-Path $d ('.ws-write-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
  try { [IO.File]::WriteAllText($f, ''); [IO.File]::Delete($f); return $true } catch { return $false }
}

function Get-WsPermProblems {
  # Os caminhos que existem e nao aceitam escrita: pastas (-Dirs; um ficheiro onde devia estar uma pasta conta) e
  # ficheiros (-Files, abertos para ler e escrever). Um caminho dentro de outro ja contado nao conta outra vez.
  # Devolve uma lista de @{ Path; Kind }, com o Kind do Get-WsPermFixCmd.
  param([string[]]$Dirs, [string[]]$Files)
  $out = @()
  foreach ($p in $Dirs) {
    if (-not $p -or @($out | Where-Object { Find-WsInFolder $_.Path @($p) }).Count -gt 0) { continue }
    if (-not (Test-Path -LiteralPath $p)) { continue }
    if (-not (Test-Path -LiteralPath $p -PathType Container)) { $out += @{ Path = $p; Kind = 'notdir' }; continue }
    if (-not (Test-WsDirWritable $p)) { $out += @{ Path = $p; Kind = 'dir' } }
  }
  foreach ($p in $Files) {
    if (-not $p -or @($out | Where-Object { Find-WsInFolder $_.Path @($p) }).Count -gt 0) { continue }
    if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { continue }
    try { $fs = [IO.File]::Open($p, 'Open', 'ReadWrite', 'ReadWrite'); $fs.Dispose(); continue } catch { }
    $k = 'file'
    try { if ((Get-Item -LiteralPath $p -Force -ErrorAction Stop).IsReadOnly) { $k = 'readonly' } } catch { }
    $out += @{ Path = $p; Kind = $k }
  }
  return , $out
}

function Get-WsPermFix {
  # O comando que devolve -Path (ou a primeira pasta de cima que exista) a pessoa; '' se nao ha nenhuma. Um icacls
  # /T na pasta do perfil (todo o AppData) ou numa pasta de cima fora do perfil (C:\Program Files, com um
  # AGENT_MEMORY_HOME que nao existe) nao se mostra: o E-PERM-01 manda falar com o IT.
  param([string]$Path)
  $p = $Path
  while ($p -and -not (Test-Path -LiteralPath $p)) { $p = Split-Path -Parent $p }
  $h = ([string]$script:UserHome).TrimEnd('\', '/')
  if (-not $p -or $p.TrimEnd('\', '/') -ieq $h -or ($p -ne $Path -and -not (Find-WsInFolder $h @($p)))) { return '' }
  $k = 'dir'
  if (Test-Path -LiteralPath $p -PathType Leaf) { $k = 'notdir' }
  return (Get-WsPermFixCmd $p $k (Get-WsUserName))
}

function Test-WsPermScan {
  # Restos de uma execucao como administrador ou de outro utilizador, pastas com ACL proprias e caminhos que deviam
  # ser pastas e nao sao (ex.: ~\.local\bin como ficheiro). O Claude Code, o uv, o gh, o Node e o kit escrevem ai:
  # deteta-se antes dos downloads e mostra-se o comando exato que resolve. So avisa: os passos que nao precisam
  # desses caminhos continuam, e os que precisam (2 e 5, ver Test-WsPermBlocked) falham logo com E-PERM-01.
  $script:PermBad = @()
  $h = $script:UserHome
  $dirs = @($script:WsHome, (Join-Path $script:WsHome 'bin'), (Join-Path $script:WsHome 'kit'), (Join-Path $script:WsHome 'kit-src'),
    (Join-Path $script:WsHome 'node'), (Join-Path $script:WsHome 'backup'),
    $script:ClaudeDir, (Join-Path $script:ClaudeDir 'skills'), (Join-Path $script:ClaudeDir 'agents'), (Join-Path $h '.claude\downloads'),
    (Join-Path $h '.local'), (Join-Path $h '.local\bin'), (Join-Path $h '.local\share'), (Join-Path $h '.local\share\claude'), (Join-Path $h '.local\share\uv'))
  # O uv guarda as ferramentas e o Python no AppData\Roaming e a cache no AppData\Local; o gh a configuracao no Roaming.
  foreach ($a in @($env:APPDATA, $env:LOCALAPPDATA)) { if ($a) { $dirs += (Join-Path $a 'uv') } }
  if ($env:APPDATA) { $dirs += (Join-Path $env:APPDATA 'GitHub CLI') }
  # Uma partilha de rede sem ligacao demora a responder: essas ficam para o Test-WsRoamingAppData.
  $dirs = @($dirs | Where-Object { $_ -and -not (Test-WsNetworkPath $_ (Get-WsDriveType $_)) })
  $cj = Get-WsClaudeJson
  $files = @($cj, (Join-Path $script:ClaudeDir 'settings.json'), $script:LogFile, (Join-Path $script:WsHome 'manifest.json'))
  $bad = Get-WsPermProblems $dirs $files
  if ($bad.Count -eq 0) { return }
  $script:PermBad = @($bad | ForEach-Object { $_.Path })
  $show = @()
  foreach ($b in $bad) {
    $t = Format-WsHomePath $b.Path $h
    if ($b.Kind -eq 'notdir') { $t += ' (' + (M 'perm_nao_pasta') + ')' }
    $show += $t
  }
  Write-WsLog ('permissions: no write access to: ' + ($show -join ' '))
  Set-WsWarn 'E-PERM-01' ($show -join ' ')
  $u = Get-WsUserName
  foreach ($b in $bad) { Add-WsNote (M 'perm_corrigir' @{ CMD = (Get-WsPermFixCmd $b.Path $b.Kind $u) }) }
}

function Get-WsClaudeJson {
  # O ~/.claude.json do Claude Code (os registos MCP), ou o da pasta CLAUDE_CONFIG_DIR.
  if ($env:CLAUDE_CONFIG_DIR) { return (Join-Path $env:CLAUDE_CONFIG_DIR '.claude.json') }
  $h = $script:UserHome
  if (-not $h) { $h = $env:USERPROFILE }
  if (-not $h) { return '' }
  return (Join-Path $h '.claude.json')
}

function Test-WsPermBlocked {
  # Um passo que vai escrever num destes caminhos, se o passo 0 os viu sem escrita: E-PERM-01 sem descarregar nada.
  param([string[]]$Paths)
  foreach ($q in @($script:PermBad)) {
    if ($q -and (Find-WsInFolder $q $Paths)) { Set-WsFail 'E-PERM-01' (Format-WsHomePath $q $script:UserHome); return $true }
  }
  return $false
}

function Read-WsGpoKey {
  # Valores da Group Policy do Windows PowerShell (vista de 64 bits, tambem num PowerShell de 32 bits ou no 7).
  param([string]$Hive)
  try {
    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($Hive, [Microsoft.Win32.RegistryView]::Registry64)
    $k = $base.OpenSubKey('SOFTWARE\Policies\Microsoft\Windows\PowerShell')
    if (-not $k) { return $null }
    return @{ EnableScripts = $k.GetValue('EnableScripts'); ExecutionPolicy = $k.GetValue('ExecutionPolicy') }
  } catch { return $null }
}

function Get-WsDriveType {
  param([string]$Path)
  try { if ($Path -match '^([A-Za-z]):') { return [string]([IO.DriveInfo]::new($Matches[1])).DriveType } } catch { }
  return ''
}

function Test-WsRoamingAppData {
  # AppData\Roaming numa partilha (Folder Redirection, VDI): o uv guarda la os ambientes das ferramentas e o
  # Python gerido, e a app Agent Memory ficava a correr de \\servidor (lenta, e parada sem rede). Passam para o
  # AppData\Local, com variaveis do utilizador (o -Uninstall repoe-nas) para os updates da app usarem o mesmo.
  $roam = [Environment]::GetFolderPath('ApplicationData')
  if (-not (Test-WsNetworkPath $roam (Get-WsDriveType $roam))) { return }
  $local = [Environment]::GetFolderPath('LocalApplicationData')
  if (-not $local -or (Test-WsNetworkPath $local (Get-WsDriveType $local))) { Write-WsLog ('AppData on a network share, and LocalAppData too: ' + $local); return }
  $uvLocal = Join-Path $local 'uv'
  Add-WsNote (M 's0_appdata_rede' @{ CAMINHO = $roam; LOCAL = $uvLocal })
  if ($script:Mode -ne 'install') { return }
  foreach ($pair in @(@('UV_TOOL_DIR', 'uv\tools'), @('UV_PYTHON_INSTALL_DIR', 'uv\python'))) {
    if ([Environment]::GetEnvironmentVariable($pair[0]) -or (Get-WsUserEnvRaw $pair[0])) { continue }
    Set-WsUserEnv $pair[0] (Join-Path $local $pair[1])
  }
}

function Test-WsProxy {
  # Proxy da sessao. $script:Proxy vai para o settings.json do Claude Code (--https-proxy): o HTTPS_PROXY ou o proxy
  # do sistema, e nunca um proxy que nao responde (um que ficou da rede do escritorio ou de uma VPN antiga).
  # $script:ProxyShow e o proxy em uso, para mostrar (sem palavra-passe). O PowerShell 5.1 descarrega pelo proxy do
  # sistema (ignora o HTTPS_PROXY); o Claude Code, o uv, o Node e o git usam o HTTPS_PROXY. Por isso:
  # $script:ProxyDead = o do sistema nao responde (Get-WsNetCode); $script:EnvProxyDead = o HTTPS_PROXY nao responde.
  $script:Proxy = ''
  $script:NoProxy = ''
  $script:ProxyShow = ''; $script:ProxyDead = $false; $script:EnvProxyDead = $false
  $override = ''
  $direct = @()
  $sysP = ''; $sys = $null
  try {
    $sys = [System.Net.WebRequest]::GetSystemWebProxy()
    $target = [Uri]'https://api.anthropic.com/'
    if (-not $sys.IsBypassed($target)) {
      $px = $sys.GetProxy($target)
      if ($px -and $px.AbsoluteUri -ne $target.AbsoluteUri) { $sysP = ('http://{0}:{1}' -f $px.Host, $px.Port) }
    }
  } catch { Write-WsLog ('proxy: ' + $_.Exception.Message) }
  $envP = [string]$env:HTTPS_PROXY
  if ($envP) {
    $script:Proxy = $envP
    $script:ProxyShow = (Format-WsProxyShow $envP) + ' (HTTPS_PROXY)'
  } elseif ($sysP) {
    $script:Proxy = $sysP
    $script:ProxyShow = $sysP
    # As excecoes do proxy do Windows e os servidores do kit que o PAC manda direto (GitHub Enterprise,
    # por exemplo) ficam no NO_PROXY: sem isso o git, o gh e o uv iam pelo proxy para servidores internos.
    try { $override = [string](Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyOverride -ErrorAction Stop).ProxyOverride } catch { $override = '' }
    foreach ($h in @($script:Fill.REPO_HOST, $script:Fill.MEMORY_HOST)) {
      if ($h) { try { if ($sys.IsBypassed([Uri]('https://' + $h + '/'))) { $direct += $h } } catch { } }
    }
  }
  # Sem proxy, o NO_PROXY tambem vai com o certificado da empresa (--ca-pem): o da pessoa nunca se perde.
  if (-not $script:Proxy) { $script:NoProxy = Merge-WsNoProxy $env:NO_PROXY '' @(); Add-WsNote (M 's0_sem_proxy'); return }
  Add-WsNote (M 's0_proxy_sistema' @{ PROXY = $script:ProxyShow })
  if ($sysP -and (Test-WsProxyDead $sysP)) { $script:ProxyDead = $true; Write-WsLog ('system proxy does not answer: ' + $sysP) }
  if ($envP -and (Test-WsProxyDead $envP)) { $script:EnvProxyDead = $true; Write-WsLog ('proxy does not answer: ' + $script:ProxyShow) }
  # HTTPS_PROXY vivo, mas os downloads deste PowerShell vao pelo proxy do sistema, que nao responde.
  if ($script:ProxyDead -and $envP -and -not $script:EnvProxyDead) { Set-WsWarn 'E-NET-03' $sysP }
  if (($envP -and $script:EnvProxyDead) -or (-not $envP -and $script:ProxyDead)) {
    # Nunca vai para o settings.json (o passo 8 tira o que um setup anterior gravou) nem para os programas filhos.
    Set-WsWarn 'E-NET-03' $script:ProxyShow
    $script:Proxy = ''
    $script:NoProxy = Merge-WsNoProxy $env:NO_PROXY '' @()
    return
  }
  if (-not $envP) { $env:HTTPS_PROXY = $script:Proxy }
  # O NO_PROXY que ja existia fica (como no Mac); acrescenta-se, nunca se substitui.
  $script:NoProxy = Merge-WsNoProxy $env:NO_PROXY $override $direct
  $env:NO_PROXY = $script:NoProxy
  Write-WsLog ('NO_PROXY: ' + $script:NoProxy)
}

function Test-WsProxyDead {
  # $true se o proxy nao responde: nome que nao resolve, ligacao recusada, ou nem aceita a ligacao em 5 s. Um proxy que
  # aceita a ligacao conta como vivo (as recusas, como o 407 ou o 403, sao do Get-WsNetCode). Basta uma ligacao TCP.
  # Cada proxy e testado uma vez por execucao ($script:ProxyProbe).
  param([string]$Proxy, [int]$TimeoutMs = 5000)
  if (-not $Proxy) { return $false }
  if (-not $script:ProxyProbe) { $script:ProxyProbe = @{} }
  if ($script:ProxyProbe.ContainsKey($Proxy)) { return [bool]$script:ProxyProbe[$Proxy] }
  $dead = $true
  $c = $null
  try {
    $addr = $Proxy
    if ($addr -notmatch '^[A-Za-z][A-Za-z0-9+.-]*://') { $addr = 'http://' + $addr }
    $u = [Uri]$addr
    $port = $u.Port
    if ($port -le 0) { if ($u.Scheme -like 'socks*') { $port = 1080 } else { $port = 80 } }
    $c = New-Object Net.Sockets.TcpClient
    $ar = $c.BeginConnect($u.DnsSafeHost, $port, $null, $null)
    if ($ar.AsyncWaitHandle.WaitOne($TimeoutMs)) { $c.EndConnect($ar); $dead = $false }
  } catch { $dead = $true }
  finally { if ($c) { try { $c.Close() } catch { } } }
  $res = 'answers'
  if ($dead) { $res = 'no answer' }
  Write-WsLog ('proxy probe: {0} -> {1}' -f (Format-WsProxyShow $Proxy), $res)
  $script:ProxyProbe[$Proxy] = $dead
  return $dead
}

function Get-WsSettingsProxyDead {
  # O proxy do settings.json do Claude Code, se nao responde nesta rede (ex.: o do escritorio, gravado por um setup
  # anterior): o proxy (sem palavra-passe) e o ficheiro, para mostrar. '' se nao ha proxy ou se ele responde.
  $f = Join-Path $script:ClaudeDir 'settings.json'
  $p = Get-WsSettingsProxy $f
  if (-not $p -or -not (Test-WsProxyDead $p)) { return '' }
  $show = $f
  $h = ([string]$script:UserHome).TrimEnd('\', '/')
  if ($h -and $f.StartsWith($h + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { $show = '%USERPROFILE%' + $f.Substring($h.Length) }
  return ((Format-WsProxyShow $p) + ' - ' + $show)
}

function Test-WsProxyAuth {
  # O passo 0 manda as credenciais do Windows ao proxy (NTLM/Kerberos); o Claude Code, o Node e o uv nao as sabem
  # mandar. Um pedido sem elas mostra o que esses vao ter: 407 = o proxy so deixa passar com o login do Windows.
  # Devolve o codigo HTTP (0 sem resposta).
  if (-not $script:Proxy) { return 0 }
  $http = 0
  try {
    $addr = $script:Proxy
    if ($addr -notmatch '^[A-Za-z][A-Za-z0-9+.-]*://') { $addr = 'http://' + $addr }
    $u = [Uri]$addr
    $wp = [System.Net.WebProxy]::new($u.Scheme + '://' + $u.Authority)
    $wp.UseDefaultCredentials = $false
    if ($u.UserInfo) {
      $ui = $u.UserInfo.Split(':', 2)
      $pw = ''
      if ($ui.Count -gt 1) { $pw = [Uri]::UnescapeDataString($ui[1]) }
      $wp.Credentials = [System.Net.NetworkCredential]::new([Uri]::UnescapeDataString($ui[0]), $pw)
    }
    $req = [System.Net.WebRequest]::Create('https://api.anthropic.com/')
    $req.Method = 'HEAD'; $req.Timeout = 12000; $req.UserAgent = $script:UA; $req.AllowAutoRedirect = $false
    $req.Proxy = $wp
    try { $r = $req.GetResponse(); $http = [int]$r.StatusCode; $r.Close() }
    catch [System.Net.WebException] {
      if ($_.Exception.Response) { try { $http = [int]$_.Exception.Response.StatusCode } catch { }; $_.Exception.Response.Close() }
    }
  } catch { Write-WsLog ('proxy without Windows credentials: ' + $_.Exception.Message) }
  Write-WsLog ('proxy without Windows credentials: HTTP ' + $http)
  return $http
}

function Test-WsTls {
  $script:CaPem = ''
  $issuer = ''
  try {
    $req = [System.Net.WebRequest]::Create('https://api.anthropic.com/')
    $req.Method = 'GET'; $req.Timeout = 15000; $req.UserAgent = $script:UA
    try { $resp = $req.GetResponse(); $resp.Close() } catch [System.Net.WebException] { if ($_.Exception.Response) { $_.Exception.Response.Close() } }
    if ($req.ServicePoint.Certificate) { $issuer = $req.ServicePoint.Certificate.Issuer }
  } catch { Write-WsLog ('tls: ' + $_.Exception.Message) }
  if ($env:WS_FORCAR_EMISSOR) { $issuer = $env:WS_FORCAR_EMISSOR }
  if (-not $issuer) { return }
  if (Test-WsPublicCa $issuer) { Add-WsNote (M 's0_tls_ok' @{ EMISSOR = $issuer }); return }
  $raws = @()
  foreach ($store in @('Cert:\LocalMachine\Root', 'Cert:\CurrentUser\Root')) {
    try { foreach ($c in (Get-ChildItem -Path $store -ErrorAction Stop)) { $raws += , $c.RawData } } catch { }
  }
  # ca.pem e da pessoa (o PEM que o IT deu, ver E-NET-04): o setup nunca o escreve. O que o setup exporta do Windows
  # vai para ca-system.pem, e o Claude Code recebe os dois juntos (ca-company.pem).
  $pem = Join-Path $script:WsHome 'ca-company.pem'
  $mine = Join-Path $script:WsHome 'ca.pem'
  if ($raws.Count -gt 0) {
    $sys = ConvertTo-WsPem $raws
    [IO.File]::WriteAllText((Join-Path $script:WsHome 'ca-system.pem'), $sys, $script:Utf8NoBom)
    if (Test-Path -LiteralPath $mine -PathType Leaf) { try { $sys += "`n" + [IO.File]::ReadAllText($mine) } catch { } }
    [IO.File]::WriteAllText($pem, $sys, $script:Utf8NoBom)
    $script:CaPem = $pem
    $env:NODE_EXTRA_CA_CERTS = $pem
    $env:UV_SYSTEM_CERTS = 'true'
  }
  Add-WsNote (M 's0_tls_corp' @{ EMISSOR = $issuer; CA = $pem })
  Set-WsWarn 'E-NET-04' $issuer
}

function Test-WsNetwork {
  # No lugar da raiz do claude.ai (403 a quem nao e um browser) testa-se o instalador: ai um 403 ou 451 e um bloqueio.
  $cprobe = [string]$script:C.CLAUDE_INSTALL_PS1_URL
  $hosts = Get-WsNetProbeUrls (@($script:C.NET_CHECK_HOSTS -split '\s+') + @($script:Fill.REPO_HOST, $script:Fill.MEMORY_HOST)) $script:Fill.KIT_URL_WINDOWS $cprobe
  $script:NetTotal = $hosts.Count
  Write-WsActivity (M 'a_verificar_rede' @{ N = $hosts.Count })
  $jobs = @()
  foreach ($h in $hosts) {
    $req = [System.Net.WebRequest]::Create($h)
    $req.Method = 'HEAD'; $req.Timeout = 12000; $req.UserAgent = $script:UA; $req.AllowAutoRedirect = $false
    $jobs += , @($h, $req, $req.BeginGetResponse($null, $null))
  }
  $script:NetOk = 0; $script:NetApiOk = $true
  $fails = @(); $codes = @()
  foreach ($j in $jobs) {
    $h = $j[0]; $req = $j[1]; $ar = $j[2]
    $okH = $false; $st = ''; $http = 0
    if ($ar.AsyncWaitHandle.WaitOne(13000)) {
      try {
        $r = $req.EndGetResponse($ar); $http = [int]$r.StatusCode; $okH = $true
        # O instalador do claude.ai: um 3xx so conta se for para um servidor do workshop (com a rede aberta,
        # downloads.claude.ai), senao e a pagina de bloqueio de um filtro (Forcepoint, Websense).
        if ($h -eq $cprobe -and $http -ge 300 -and $http -lt 400) {
          $lh = ''
          try { $lh = ([Uri]::new([Uri]$h, [string]$r.Headers['Location'])).Host } catch { }
          if (-not (Test-WsHostKnown $lh)) { $okH = $false; $st = 'HtmlPage'; Write-WsLog ('network: {0} redirected to {1}' -f $h, $lh) }
        }
        $r.Close()
      }
      catch [System.Net.WebException] {
        $st = [string]$_.Exception.Status
        if ($_.Exception.Response) { try { $http = [int]$_.Exception.Response.StatusCode } catch { }; $_.Exception.Response.Close(); if ($http -ne 407) { $okH = $true } }
      } catch { $st = 'Unknown' }
    } else { try { $req.Abort() } catch { }; $st = 'Timeout' }
    if ($okH -and $h -eq $cprobe -and ($http -eq 403 -or $http -eq 451)) { $okH = $false; if (-not $st) { $st = 'ProtocolError' } }
    Write-WsLog ('network: {0} -> {1} HTTP {2}' -f $h, $st, $http)
    if ($okH) { $script:NetOk++; continue }
    $fails += ([Uri]$h).Authority
    if ($h -match 'api\.anthropic\.com') { $script:NetApiOk = $false }
    $codes += (Get-WsNetCode $st $http)
  }
  if ($fails.Count -gt 0) { Add-WsNote (M 's0_rede_falha' @{ LISTA = ($fails -join ', ') }) }
  foreach ($w in (Get-WsNetWarnings $fails $codes $script:NetApiOk $script:ProxyShow ($script:ProxyDead -or $script:EnvProxyDead))) { Set-WsWarn $w[0] $w[1] }
  # Os pedidos acima levam o login do Windows ao proxy; o Claude Code, o Node e o uv nao. Se o proxy so aceita esse
  # login, diz-se ja aqui (E-NET-03), e nao com E-CC-01, E-UV-01 ou E-MEM-03 nos passos seguintes.
  $script:ProxyAuth = $false
  if ($script:Proxy -and $script:NetApiOk -and (Test-WsProxyAuth) -eq 407) {
    $script:ProxyAuth = $true
    Add-WsNote (M 's0_proxy_ntlm')
    if ($codes -notcontains 'E-NET-03') { Set-WsWarn 'E-NET-03' ((Protect-WsText $script:Proxy @()) + ': 407') }
  }
}

function Test-WsGateway {
  # Gateway da empresa (ANTHROPIC_BASE_URL: no ambiente, nas variaveis do utilizador ou no "env" das definicoes):
  # aviso e, se nao responder, $script:GwDown. Nesse caso o teste final, o ajudante e o -Doctor nao chamam o Claude
  # (esperariam minutos pelas novas tentativas e o erro apontaria para o api.anthropic.com, que pode estar bem).
  # Corre depois do Test-WsNetwork: o proxy ja esta configurado.
  $script:GwUrl = ''; $script:GwDown = $false
  $src = ''
  $u = [Environment]::GetEnvironmentVariable('ANTHROPIC_BASE_URL')
  if (-not $u) { $u = Get-WsUserEnvRaw 'ANTHROPIC_BASE_URL' }
  if (-not $u) { $s = Get-WsSettingsEnv 'ANTHROPIC_BASE_URL'; if ($s) { $u = $s[0]; $src = ' (' + $s[1] + ')' } }
  if (-not $u) { return }
  $script:GwUrl = [string]$u
  Set-WsWarn 'E-CFG-03' ('ANTHROPIC_BASE_URL' + $src)
  if (-not (Test-WsGatewayUp $script:GwUrl)) { $script:GwDown = $true; Set-WsWarn 'E-AUTH-05' (Get-WsGatewayShow $script:GwUrl) }
}

function Test-WsGatewayUp {
  # $false = o gateway nao responde. O URL nunca vai para o log (pode ter utilizador e password).
  param([string]$Url)
  try {
    $null = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method Get -TimeoutSec 10 -UserAgent $script:UA -ErrorAction Stop
    Write-WsLog 'gateway: HTTP answer'
    return $true
  } catch {
    $i = Get-WsWebErrorInfo $_.Exception
    Write-WsLog ('gateway: {0} HTTP {1}' -f $i.Status, $i.Http)
    return (Test-WsGatewayAnswer $i.Status $i.Http)
  }
}

function Test-WsGatewayAnswer {
  # Estado de um pedido ao gateway (Get-WsWebErrorInfo) -> responde? Qualquer resposta HTTP conta (mesmo 401 ou 404);
  # so a falta de ligacao (DNS, recusada, sem resposta) ou um 502/503/504 de um proxy pelo meio conta como em baixo.
  # Um erro de TLS (certificado da empresa) conta como vivo, como no Mac: sem falsos alarmes.
  param([string]$Status, [int]$Http)
  if ($Http -gt 0) { return (@(502, 503, 504) -notcontains $Http) }
  return (@('NameResolutionFailure', 'ProxyNameResolutionFailure', 'ConnectFailure', 'Timeout') -notcontains $Status)
}

function Get-WsGatewayShow {
  # URL do gateway para mostrar: so esquema://host:porta/ (sem caminho, utilizador nem password).
  param([string]$Url)
  if (-not $Url) { return '' }
  try { $u = [Uri]$Url; if ($u.IsAbsoluteUri -and $u.Authority) { return ('{0}://{1}/' -f $u.Scheme, $u.Authority) } } catch { }
  # Um URL que o [Uri] nao le: tira tudo ate ao ultimo '@' (nunca mostra uma password, mesmo com '/') e o caminho.
  $t = $Url -replace '^([A-Za-z][A-Za-z0-9+.-]*://)?.*@', '$1'
  return ($t -replace '^([A-Za-z][A-Za-z0-9+.-]*://)?([^/?#]*).*$', '$1$2/')
}

# =============================================================== PASSO 1 - git

function Set-WsGitBash {
  # Encontra o bash.exe (Get-WsGitBashCandidates) e grava CLAUDE_CODE_GIT_BASH_PATH. Um valor que o utilizador ja
  # tinha e que aponta para um bash.exe que existe fica como esta. Sem bash: $script:GitBashMissing e E-GIT-03.
  param([string]$Git)
  $script:GitBashMissing = $false
  # Cada chamada volta a decidir: tira o E-GIT-03 de uma tentativa anterior (antes de instalar o Git for Windows).
  $keep = @()
  foreach ($w in $script:T[$script:Cur].Avisos) { if ($w[0] -ne 'E-GIT-03') { $keep += , $w } }
  $script:T[$script:Cur].Avisos = $keep
  $cur = Get-WsUserEnvRaw 'CLAUDE_CODE_GIT_BASH_PATH'
  if ($cur) { $cur = [Environment]::ExpandEnvironmentVariables($cur) } else { $cur = $env:CLAUDE_CODE_GIT_BASH_PATH }
  if ($cur -and (Test-Path -LiteralPath $cur -PathType Leaf)) { Write-WsLog ('git bash (already set): ' + $cur); return }
  $exec = ''
  $r = Invoke-WsProcess $Git @('--exec-path') -TimeoutSec 60
  if ($r.ExitCode -eq 0) { $exec = ([string]$r.StdOut).Trim() }
  $roots = @()
  if ($env:LOCALAPPDATA) { $roots += (Join-Path $env:LOCALAPPDATA 'Programs\Git') }
  foreach ($pf in @($env:ProgramW6432, $env:ProgramFiles)) { if ($pf) { $roots += (Join-Path $pf 'Git') } }
  $bash = $null
  foreach ($c in (Get-WsGitBashCandidates $Git $exec $roots)) { if (Test-Path -LiteralPath $c -PathType Leaf) { $bash = $c; break } }
  if (-not $bash) { $script:GitBashMissing = $true; Set-WsWarn 'E-GIT-03' (Split-Path -Parent $Git); return }
  Write-WsLog ('git bash: ' + $bash)
  if ($script:Mode -eq 'install') { Set-WsUserEnv 'CLAUDE_CODE_GIT_BASH_PATH' $bash }
  else { Set-WsWarn 'E-GIT-03' 'CLAUDE_CODE_GIT_BASH_PATH' }
}

function Test-WsStep1 {
  $g = Get-WsGit
  if (-not $g) { Set-WsFail 'E-GIT-02' ''; return $false }
  $r = Invoke-WsProcess $g @('--version') -TimeoutSec 60
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-GIT-02' 'git --version'; return $false }
  $script:GitExe = $g
  $script:GitVer = Get-WsVersionOf $r.StdOut
  Set-WsDetail (M 's1_ja' @{ VERSAO = $script:GitVer })
  Set-WsGitBash $g
  # Um git sem Git Bash (MinGit de outra aplicacao, por exemplo): instala-se o Git for Windows uma vez.
  if ($script:GitBashMissing -and $script:Mode -eq 'install' -and -not $script:GitBashTried) { return $false }
  if ($script:CaPem -and $script:Mode -eq 'install') {
    $cur = Invoke-WsProcess $g @('config', '--global', '--get', 'http.sslBackend')
    if ($cur.StdOut.Trim() -ne 'schannel') {
      [void](Invoke-WsProcess $g @('config', '--global', 'http.sslBackend', 'schannel'))
      Register-WsExtra 'gitconfig' 'http.sslBackend' '' 'schannel' ($cur.StdOut.Trim())
    }
  }
  return $true
}

function Install-WsStep1 {
  # Com um git que ja funciona (so faltava o Git Bash), falhar a instalacao do Git for Windows nao falha o passo:
  # fica o aviso E-GIT-03 (e o motivo da falha), como antes, e os passos que precisam do git correm.
  $hadGit = [bool]$script:GitBashMissing
  $script:GitBashTried = $true
  if (Install-WsGitForWindows) { return $true }
  if (-not $hadGit) { return $false }
  $f = $script:T[$script:Cur].Falha
  $script:T[$script:Cur].Falha = $null
  if ($f) { Set-WsWarn $f[0] $f[1] }
  return (Test-WsStep1)
}

function Install-WsGitForWindows {
  Write-WsActivity (M 'a_instalar')
  if ((Test-WsWinget) -and (Invoke-WsWinget 'Git.Git')) { if ((Test-WsStep1) -and -not $script:GitBashMissing) { return $true } }
  $file = $script:C.GIT_WINDOWS_FILE_X64; $want = $script:C.GIT_WINDOWS_SHA256_X64
  if ($script:Arch -eq 'arm64') { $file = $script:C.GIT_WINDOWS_FILE_ARM64; $want = $script:C.GIT_WINDOWS_SHA256_ARM64 }
  $url = Expand-WsPattern $script:C.GIT_WINDOWS_URL @{ version = $script:C.GIT_WINDOWS_VERSION; file = $file }
  $exe = Join-Path $script:Tmp $file
  Write-WsActivity (M 'a_descarregar' @{ O_QUE = $file })
  $rc = Invoke-WsDownloadChecked $url $exe $want
  if ($rc -eq 1) { Set-WsFail (Get-WsDlCode) (Get-WsDlDetail $url); return $false }
  if ($rc -eq 2) { Set-WsFail 'E-GIT-02' ('SHA-256 ' + $file); return $false }
  $r = Invoke-WsProcess $exe @('/VERYSILENT', '/CURRENTUSER', '/NORESTART', '/SUPPRESSMSGBOXES', '/SP-', '/NOCANCEL') -TimeoutSec 1800
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-GIT-02' ('installer ' + $r.ExitCode); return $false }
  Update-WsSessionPath
  return (Test-WsStep1)
}

# =============================================================== PASSO 2 - Claude Code

function Test-WsStrictJson {
  # O texto e JSON valido com as regras do JSON.parse do Claude Code (sem virgulas a mais nem comentarios)?
  # $true, $false, ou $null quando nao ha um leitor estrito (o ConvertFrom-Json aceita virgulas a mais, e falha com
  # chaves que so diferem nas maiusculas, normais nos caminhos dos projetos do ~\.claude.json).
  # PowerShell 7: System.Text.Json. Windows PowerShell 5.1: Windows.Data.Json (WinRT, do Windows 10).
  param([string]$Text)
  $t = ([string]$Text).TrimStart([char]0xFEFF)
  $jd = $null
  try { Add-Type -AssemblyName System.Text.Json -ErrorAction Stop; $jd = 'System.Text.Json.JsonDocument' -as [type] } catch { $jd = $null }
  if ($jd) {
    try {
      $o = New-Object ('System.Text.Json.JsonDocumentOptions' -as [type])
      $o.MaxDepth = 512
      $d = $jd::Parse($t, $o); $d.Dispose(); return $true
    } catch { return $false }
  }
  $wj = $null
  try { $wj = [Type]::GetType('Windows.Data.Json.JsonValue, Windows.Data.Json, ContentType=WindowsRuntime', $false) } catch { $wj = $null }
  if (-not $wj) { try { $wj = 'Windows.Data.Json.JsonValue, Windows.Data.Json, ContentType=WindowsRuntime' -as [type] } catch { $wj = $null } }
  if (-not $wj) { try { $wj = [scriptblock]::Create('[Windows.Data.Json.JsonValue, Windows.Data.Json, ContentType = WindowsRuntime]').Invoke()[0] } catch { $wj = $null } }
  if ($wj) { try { $null = $wj::Parse($t); return $true } catch { return $false } }
  return $null
}

function Test-WsClaudeJson {
  # ~\.claude.json invalido (ex.: uma virgula a mais de uma edicao a mao): o instalador oficial e o "claude auth status"
  # trocam-no por um ficheiro novo, e os servidores MCP da pessoa so ficam numa copia em ~\.claude\backups.
  # Por isso verifica-se antes de qualquer comando do Claude Code (os passos 3, 7 e 12 dependem deste).
  # Vazio, so espacos ou sem leitor estrito: passa (nunca bloqueia por o setup nao o conseguir ler).
  $dir = $env:CLAUDE_CONFIG_DIR
  if (-not $dir) { $dir = $script:UserHome }
  if (-not $dir) { return $true }
  $f = Join-Path $dir '.claude.json'
  if (-not (Test-Path -LiteralPath $f -PathType Leaf)) { return $true }
  $t = ''
  try { $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8) } catch { Write-WsLog ('.claude.json not read: ' + $_.Exception.Message); return $true }
  if ([string]::IsNullOrWhiteSpace($t.TrimStart([char]0xFEFF))) { return $true }
  $ok = Test-WsStrictJson $t
  if ($null -eq $ok) { Write-WsLog '.claude.json: no strict JSON parser here, not checked'; return $true }
  if ($ok) { return $true }
  Write-WsLog ('not valid JSON: ' + $f)
  Set-WsFail 'E-CC-04' $f
  return $false
}

function Test-WsStep2 {
  if (-not (Test-WsClaudeJson)) { return $false }
  $c = Get-WsClaude
  if (-not $c) { return $false }
  $r = Invoke-WsProcess $c @('--version') -TimeoutSec 120
  if ($r.ExitCode -ne 0) { return $false }
  $script:ClaudeExe = $c
  $script:ClaudeVer = Get-WsVersionOf $r.StdOut
  if ((Compare-WsVersion $script:ClaudeVer $script:C.CLAUDE_CODE_MIN_VERSION) -lt 0) {
    if ($script:Mode -eq 'install') { return $false }
    Set-WsFail 'E-CC-03' ('{0} < {1}' -f $script:ClaudeVer, $script:C.CLAUDE_CODE_MIN_VERSION); return $false
  }
  Set-WsDetail (M 's2_ja' @{ VERSAO = $script:ClaudeVer })
  return $true
}

function Install-WsStep2 {
  if (-not (Test-WsClaudeJson)) { return $false }
  if (Test-WsPermBlocked @((Join-Path $script:UserHome '.claude\downloads'), (Join-Path $script:UserHome '.local\bin\claude.exe'), (Join-Path $script:UserHome '.local\share\claude'))) { return $false }
  Write-WsActivity (M 'a_instalar')
  $f = Join-Path $script:Tmp 'claude-install.ps1'
  if (-not (Invoke-WsDownload $script:C.CLAUDE_INSTALL_PS1_URL $f)) { Set-WsFail (Get-WsDlCode) (Get-WsDlDetail $script:C.CLAUDE_INSTALL_PS1_URL); return $false }
  # O install.ps1 descarrega mais de 200 MB sem mostrar nada: o progresso vai aparecendo enquanto descarrega.
  $watch = @((Join-Path $script:UserHome '.claude\downloads'), (Join-Path $script:ClaudeDir 'downloads'), (Join-Path $script:UserHome '.local\share\claude')) | Select-Object -Unique
  $r = Invoke-WsProcess (Get-WsWinPowerShell) @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $f, $script:C.CLAUDE_CODE_VERSION) -TimeoutSec 1800 -WatchPaths $watch
  if ($r.ExitCode -ne 0) {
    # Rede de seguranca: o Claude Code achou o ~\.claude.json corrompido, guardou-o e escreveu um novo.
    $m = [regex]::Match(([string]$r.StdOut + "`n" + [string]$r.StdErr), '[Bb]acked up to:\s*(\S[^\r\n]*)')
    if ($m.Success) { Set-WsFail 'E-CC-04' $m.Groups[1].Value.Trim() } else { Set-WsFail 'E-CC-01' 'install.ps1' }
    return $false
  }
  Add-WsUserPath (Join-Path $script:UserHome '.local\bin')
  $c = Join-Path $script:UserHome '.local\bin\claude.exe'
  if (-not (Test-Path -LiteralPath $c)) { Set-WsFail 'E-CC-01' $c; return $false }
  $v = Invoke-WsProcess $c @('--version') -TimeoutSec 120
  if ($v.ExitCode -ne 0) { Set-WsFail 'E-PERM-02' 'claude --version'; return $false }
  $script:ClaudeExe = $c
  $script:ClaudeVer = Get-WsVersionOf $v.StdOut
  Set-WsDetail (M 's2_ja' @{ VERSAO = $script:ClaudeVer })
  if ((Compare-WsVersion $script:ClaudeVer $script:C.CLAUDE_CODE_MIN_VERSION) -lt 0) { Set-WsWarn 'E-CC-03' $script:ClaudeVer }
  return $true
}

# =============================================================== PASSO 3 - login

# Codigos de saida de um login cancelado: 0xC000013A (STATUS_CONTROL_C_EXIT: Ctrl-C ou a janela fechada) e 130.
# Cada login pode juntar os seus com -CancelCodes (o gh sai com 2 num Ctrl-C nas perguntas dele: "gh help exit-codes").
$script:LoginCancelCodes = @(-1073741510, 130)

function Invoke-WsLogin {
  # Corre um login interativo (claude, gh, acli) numa janela de consola sua. Um Ctrl-C la, ou fechar essa janela,
  # termina so o login: o setup continua e verifica o login como sempre. Na mesma consola, o Ctrl-C parava o setup
  # inteiro (so o finally corria: sem os outros passos nem o resumo).
  # Sem -Wait: no Windows PowerShell 5.1 o -Wait espera tambem pelos filhos, e o browser que o login abre pode ser
  # um deles (o setup ficava a espera ate a pessoa fechar o browser). Espera-se so por este processo, aos bocados
  # (como no Invoke-WsProcess), para um Ctrl-C na janela do setup ainda chegar ao PowerShell.
  param([string]$Exe, [string[]]$Arguments, [int[]]$CancelCodes = @())
  $p = $null
  # A janela do login fecha-se quando ele acaba: dizer onde olhar, senao o setup parece parado.
  Write-WsSay ('  ' + (M 'login_janela'))
  try {
    $line = ConvertTo-WsArgLine $Arguments
    if ($line) { $p = Start-Process -FilePath $Exe -ArgumentList $line -PassThru -ErrorAction Stop }
    else { $p = Start-Process -FilePath $Exe -PassThru -ErrorAction Stop }
  } catch {
    $bc = Get-WsBlockedCode $_.Exception -AccessDenied
    if ($bc) { $script:Blocked = $Exe; Write-WsLog ('  -> blocked by the computer security (Win32 {0})' -f $bc) }
    Write-WsLog ('login did not start: {0}' -f $_.Exception.Message)
    return
  }
  if (-not $p) { Write-WsLog 'login did not start'; return }
  try { $null = $p.Handle } catch { }   # sem isto o ExitCode de um Start-Process -PassThru (sem -Wait) fica vazio
  $done = $false
  # O login corre noutra janela: aqui o spinner diz que se esta a espera dela.
  if ($script:Live.On) { Write-WsActivity (M 'a_esperar_login') }
  try {
    try { while (-not $p.WaitForExit(120)) { Update-WsLive } } catch { Write-WsLog ('login: ' + $_.Exception.Message) }
    $done = $true
  } finally {
    if (-not $done) { Stop-WsProcessTree $p; Write-WsLog '  -> login stopped (Ctrl-C in the setup window)' }
  }
  $code = $null
  try { $code = $p.ExitCode } catch { }
  if ($null -eq $code) { return }
  if ($code -ne 0) { Write-WsLog ('login exit {0}' -f $code) }
  if (($script:LoginCancelCodes + $CancelCodes) -contains [int]$code) { Write-WsLog 'login cancelled (Ctrl-C)'; Add-WsNote (M 'login_cancelado') }
}

function Read-WsAuth {
  # Na pasta temporaria, como o teste final: o .claude\settings.json da pasta onde a pessoa corre o setup (ex.: um
  # repositorio da empresa aberto no terminal do VS Code) pode ligar o Bedrock so ali.
  $r = Invoke-WsProcess $script:ClaudeExe @('auth', 'status') -WorkingDirectory $script:Tmp -TimeoutSec 120
  $j = $null
  try { $j = $r.StdOut | ConvertFrom-Json } catch { }
  $a = @{ Logged = $false; Method = ''; Source = ''; Sub = ''; Org = ''; Provider = '' }
  if ($j) {
    $a.Logged = [bool]$j.loggedIn; $a.Method = [string]$j.authMethod
    if ($j.PSObject.Properties.Name -contains 'apiKeySource') { $a.Source = [string]$j.apiKeySource }
    if ($j.PSObject.Properties.Name -contains 'subscriptionType') { $a.Sub = [string]$j.subscriptionType }
    if ($j.PSObject.Properties.Name -contains 'orgName') { $a.Org = [string]$j.orgName }
    if ($j.PSObject.Properties.Name -contains 'apiProvider') { $a.Provider = [string]$j.apiProvider }
  }
  # Versoes sem "apiProvider": o metodo "third_party" e uma cloud (Bedrock, Vertex ou Foundry).
  if (-not $a.Provider -and $a.Method -eq 'third_party') { $a.Provider = 'third_party' }
  Write-WsLog ('auth: loggedIn={0} authMethod={1} apiKeySource={2} subscriptionType={3} apiProvider={4}' -f $a.Logged, $a.Method, $a.Source, $a.Sub, $a.Provider)
  return $a
}

function Get-WsAuthKind {
  param($A)
  if (-not $A.Logged) { return 'nenhum' }
  if ($A.Source -eq '/login managed key') { return 'console' }
  if ($A.Method -eq 'claude.ai' -and $A.Sub -and $A.Sub -ne 'null') { return 'assinatura' }
  return 'outro'
}

function Test-WsStep3 {
  if (-not $script:ClaudeExe) { $script:ClaudeExe = Get-WsClaude }
  $script:Auth = Read-WsAuth
  # Bedrock, Vertex ou Foundry (no ambiente ou no "env" das definicoes): e uma forma valida de usar o Claude Code
  # (ha empresas que so permitem essa). O login do Console nao e usado: so um aviso, e o teste final (passo 12)
  # confirma que a cloud responde.
  $script:AuthCloud = ''
  if ($script:Auth.Provider -and $script:Auth.Provider -ne 'firstParty') {
    $w = Get-WsCloudWhere
    if (-not $w) { $w = 'Claude Code settings' }
    $script:AuthCloud = $script:Auth.Provider + ': ' + $w
    Set-WsDetail (M 's3_outro' @{ METODO = $script:Auth.Provider })
    Set-WsWarn 'E-CFG-04' $script:AuthCloud
    $script:AuthOk = $true
    return $true
  }
  switch (Get-WsAuthKind $script:Auth) {
    'console' { $o = $script:Auth.Org; if (-not $o) { $o = 'Console' }; Set-WsDetail (M 's3_console' @{ EMAIL = $o }); $script:AuthOk = $true; return $true }
    'assinatura' {
      if ($script:Mode -eq 'install' -and -not $script:AuthAsked) { return $false }
      Set-WsDetail (M 's3_outro' @{ METODO = ('claude.ai ({0})' -f $script:Auth.Sub) }); Set-WsWarn 'E-AUTH-02' $script:Auth.Sub; $script:AuthOk = $true; return $true
    }
    'outro' {
      $m = $script:Auth.Method; if (-not $m) { $m = '?' }
      # A origem (ANTHROPIC_API_KEY, apiKeyHelper...) diz mais do que o metodo; so o nome, nunca o valor.
      $src = $script:Auth.Source; if (-not $src) { $src = $script:Auth.Method }
      Set-WsDetail (M 's3_outro' @{ METODO = $m }); Set-WsWarn 'E-AUTH-03' $src; $script:AuthOk = $true; return $true
    }
  }
  Set-WsFail 'E-AUTH-01' ''
  return $false
}

function Install-WsStep3 {
  # Com uma cloud configurada, o login do Console seria ignorado: nao o oferecer.
  if ($script:AuthCloud) { return (Test-WsStep3) }
  $kind = Get-WsAuthKind $script:Auth
  $script:AuthAsked = $true
  if ($kind -eq 'assinatura') {
    if ($script:Sim -or -not (Read-WsYesNo (M 's3_pergunta_trocar') $false -NeverSim)) { Add-WsNote (M 's3_manter'); return (Test-WsStep3) }
  } elseif ($script:Sim) {
    Add-WsNote (M 's3_login_sim'); Set-WsFail 'E-AUTH-01' ''; return $false
  } elseif (-not (Read-WsYesNo (M 's3_pergunta_login') $true)) {
    # Sem consola (agente de IA, tarefa do IDE, script): diz onde fazer o login.
    if (-not (Test-WsInteractive)) { Add-WsNote (M 's3_sem_tty') }
    Set-WsFail 'E-AUTH-01' ''; return $false
  }
  if (-not (Test-WsInteractive)) { Add-WsNote (M 's3_sem_tty'); Set-WsFail 'E-AUTH-01' ''; return $false }
  Write-WsLog '$ claude auth login --console (interactive)'
  Clear-WsTypeAhead
  # Numa janela sua (Invoke-WsLogin): um Ctrl-C ou fechar a janela cancela so o login.
  Invoke-WsLogin $script:ClaudeExe @('auth', 'login', '--console')
  return (Test-WsStep3)
}

# =============================================================== PASSO 4 - Node

function Get-WsNodeMajor {
  param([string]$Exe)
  # Com -e e nao -v: um node que responde ao -v mas nao corre scripts nao serve.
  $r = Invoke-WsProcess $Exe @('-e', 'process.stdout.write(process.versions.node)') -TimeoutSec 60
  $m = [regex]::Match($r.StdOut, '^v?([0-9]+)')
  if ($m.Success) { return [int]$m.Groups[1].Value }
  return 0
}

function Get-WsFreshNodeMajor {
  # O node que um terminal novo encontra: PATH do registo (Maquina + Utilizador), como num login novo.
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $p = [Environment]::ExpandEnvironmentVariables((($machine, $user | Where-Object { $_ }) -join ';'))
  $ps = Get-WsWinPowerShell
  $r = Invoke-WsProcess $ps @('-NoProfile', '-NonInteractive', '-Command', 'node -v') -Environment @{ Path = $p } -TimeoutSec 120
  # -1: nao deu para saber (o PowerShell nao arrancou ou passou do tempo). Nao e um Node antigo.
  if ($r.ExitCode -lt 0) { return -1 }
  $m = [regex]::Match($r.StdOut, 'v([0-9]+)')
  if ($m.Success) { return [int]$m.Groups[1].Value }
  return 0
}

function Format-WsFreshNode {
  # Para o log: o major, "none" (nenhum node que arranque) ou "unknown" (nao deu para saber), como no Mac.
  param([int]$Major)
  if ($Major -lt 0) { return 'unknown' }
  if ($Major -eq 0) { return 'none' }
  return [string]$Major
}

function Test-WsStep4 {
  $cands = @()
  if ($script:NodeExe) { $cands += $script:NodeExe }
  $c = Get-Command node -ErrorAction SilentlyContinue
  # O node de um projeto (node_modules\.bin, o terminal do VS Code) nao e o do workshop.
  if ($c -and $c.CommandType -eq 'Application' -and $c.Source -notmatch '[\\/]node_modules[\\/]') { $cands += $c.Source }
  $cands += (Join-Path $script:WsHome 'node\node.exe')
  $found = $null
  foreach ($x in $cands) {
    if (-not (Test-Path -LiteralPath $x)) { continue }
    if ($x -eq (Join-Path $script:WsHome 'node\node.exe') -and -not (Test-WsNodeComplete (Join-Path $script:WsHome 'node'))) { Write-WsLog ('incomplete node, npm does not start: ' + $x); continue }
    # Os hooks e a statusline correm este node a cada passo do Claude: numa partilha (o H:\ de uma versao antiga
    # do setup, por exemplo) ficavam lentos e parados sem rede. Instala-se um local.
    if (Test-WsNetworkPath $x (Get-WsDriveType $x)) { Write-WsLog ('node on a network share, not used: ' + $x); continue }
    if ((Get-WsNodeMajor $x) -ge [int]$script:C.NODE_MIN_MAJOR) { $found = $x; break }
  }
  $script:NodeExe = $found
  if (-not $found) { Set-WsFail 'E-NODE-01' ('node >= ' + $script:C.NODE_MIN_MAJOR); return $false }
  $v = (Invoke-WsProcess $found @('-v')).StdOut.Trim()
  Set-WsDetail (M 's4_ja' @{ VERSAO = $v; CAMINHO = $found })
  # O setup corre o node sem o NODE_OPTIONS da pessoa (Invoke-WsProcess); se esse partir o Node, os hooks, a
  # statusline e as skills partem no terminal dela.
  if ($env:NODE_OPTIONS -and (Invoke-WsProcess $found @('-e', '0') -TimeoutSec 60 -Environment @{ NODE_OPTIONS = $env:NODE_OPTIONS }).ExitCode -ne 0) {
    Set-WsWarn 'E-NODE-03' ('NODE_OPTIONS=' + $env:NODE_OPTIONS)
  }
  Sync-WsExtras
  # O -Uninstall so precisa do $script:NodeExe.
  if ($script:Mode -eq 'uninstall' -or $script:Mode -eq 'cleanup') { return $true }
  $fresh = Get-WsFreshNodeMajor
  Write-WsLog ('node in a new terminal: {0}' -f (Format-WsFreshNode $fresh))
  if ($fresh -ge 0 -and $fresh -lt [int]$script:C.NODE_MIN_MAJOR -and $script:Mode -eq 'install') {
    Add-WsUserPath (Split-Path $found)
    $fresh = Get-WsFreshNodeMajor
    Write-WsLog ('node in a new terminal: {0}' -f (Format-WsFreshNode $fresh))
  }
  # -1 (nao deu para saber) fica so no log: nao e um Node antigo.
  if ($fresh -ge 0 -and $fresh -lt [int]$script:C.NODE_MIN_MAJOR) { $d = ''; if ($fresh -gt 0) { $d = 'v' + $fresh }; Set-WsWarn 'E-NODE-02' $d }
  return $true
}

function Test-WsNodeComplete {
  # O Node do workshop inteiro (node.exe e o npm que arranca)? Uma extracao a meio deixa o node.exe sem o npm.
  param([string]$Dir)
  $n = Join-Path $Dir 'node.exe'; $cli = Join-Path $Dir 'node_modules\npm\bin\npm-cli.js'
  if (-not (Test-Path -LiteralPath $n) -or -not (Test-Path -LiteralPath $cli)) { return $false }
  return ((Invoke-WsProcess $n @($cli, '-v') -TimeoutSec 120).ExitCode -eq 0)
}

function Install-WsStep4 {
  $a = 'x64'
  if ($script:Arch -eq 'arm64') { $a = 'arm64' }
  $file = 'node-v{0}-win-{1}.zip' -f $script:C.NODE_VERSION, $a
  $d = Join-Path $script:Tmp 'node'
  Remove-Item -LiteralPath $d -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path (Join-Path $d 'x') -Force | Out-Null
  $sumsUrl = Expand-WsPattern $script:C.NODE_DIST_URL @{ version = $script:C.NODE_VERSION; file = 'SHASUMS256.txt' }
  $url = Expand-WsPattern $script:C.NODE_DIST_URL @{ version = $script:C.NODE_VERSION; file = $file }
  Write-WsActivity (M 'a_descarregar' @{ O_QUE = $file })
  if (-not (Invoke-WsDownload $sumsUrl (Join-Path $d 'SHASUMS256.txt'))) { Set-WsFail (Get-WsDlCode) (Get-WsDlDetail $sumsUrl); return $false }
  $want = Get-WsSumFor (Join-Path $d 'SHASUMS256.txt') $file
  $rc = Invoke-WsDownloadChecked $url (Join-Path $d $file) $want
  if ($rc -eq 1) { Set-WsFail (Get-WsDlCode) (Get-WsDlDetail $url); return $false }
  if ($rc -eq 2) { Set-WsFail 'E-NODE-01' ('SHA-256 ' + $file); return $false }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  # Extrai-se ao lado do destino (fora da pasta temporaria) e so se troca depois de o npm arrancar.
  $nn = Join-Path $script:WsHome 'node.new'
  Remove-Item -LiteralPath $nn -Recurse -Force -ErrorAction SilentlyContinue
  [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $d $file), $nn)
  $inner = Join-Path $nn ('node-v{0}-win-{1}' -f $script:C.NODE_VERSION, $a)
  if (-not (Test-WsNodeComplete $inner)) { Remove-Item -LiteralPath $nn -Recurse -Force -ErrorAction SilentlyContinue; Set-WsFail 'E-NODE-01' 'zip (incomplete)'; return $false }
  $dest = Join-Path $script:WsHome 'node'
  Remove-Item -LiteralPath ($dest + '.old') -Recurse -Force -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $dest) { Move-Item -LiteralPath $dest -Destination ($dest + '.old') }
  Move-Item -LiteralPath $inner -Destination $dest
  Remove-Item -LiteralPath ($dest + '.old'), $nn -Recurse -Force -ErrorAction SilentlyContinue
  $script:NodeExe = Join-Path $dest 'node.exe'
  if ((Get-WsNodeMajor $script:NodeExe) -lt 1) { Set-WsFail 'E-PERM-02' $script:NodeExe; return $false }
  Add-WsUserPath $dest
  return (Test-WsStep4)
}

# =============================================================== PASSO 5 - uv

function Test-WsStep5 {
  # O uv usa-se sempre pelo caminho ($script:UvExe): primeiro o do workshop (~\.local\bin\uv.exe), depois o do PATH.
  # Um uv antigo primeiro no PATH (pipx, scoop, um instalador antigo) nao serve: o passo 10 precisa de
  # "uv tool install --managed-python" (UV_MIN_VERSION no repos.conf). Se so houver um antigo, o passo instala o do workshop.
  $min = $script:C.UV_MIN_VERSION
  if (-not $min) { $min = '0.6.8' }
  $script:UvExe = $null
  $first = $null
  $c = Get-Command uv -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) { $first = $c.Source }
  $seen = @()
  foreach ($uv in @((Join-Path $script:UserHome '.local\bin\uv.exe'), $first)) {
    if (-not $uv -or $seen -contains $uv -or -not (Test-Path -LiteralPath $uv)) { continue }
    $seen += $uv
    $r = Invoke-WsProcess $uv @('--version') -TimeoutSec 60
    if ($r.ExitCode -ne 0) { continue }
    $ver = Get-WsVersionOf $r.StdOut
    if ((Compare-WsVersion $ver $min) -lt 0) { Write-WsLog ('uv too old: {0} ({1} < {2})' -f $uv, $ver, $min); continue }
    $script:UvExe = $uv
    $script:UvVer = $ver
    break
  }
  if (-not $script:UvExe) { return $false }
  if ($first -and $first -ne $script:UvExe) {
    $r = Invoke-WsProcess $first @('--version') -TimeoutSec 60
    $txt = ([string]$r.StdOut).Trim()
    if ($r.ExitCode -ne 0 -or (Compare-WsVersion (Get-WsVersionOf $txt) $min) -lt 0) {
      if (-not $txt) { $txt = '?' }
      Set-WsWarn 'E-UV-02' ('{0}: {1}' -f $first, $txt)
    }
  }
  Set-WsDetail (M 's5_ja' @{ VERSAO = $script:UvVer })
  return $true
}

function Install-WsStep5 {
  if (Test-WsPermBlocked @((Join-Path $script:UserHome '.local\bin\uv.exe'))) { return $false }
  $f = Join-Path $script:Tmp 'uv-install.ps1'
  $url = Expand-WsPattern $script:C.UV_INSTALL_PS1_URL @{ version = $script:C.UV_VERSION }
  if (-not (Invoke-WsDownload $url $f)) { Set-WsFail (Get-WsDlCode) (Get-WsDlDetail $url); return $false }
  $r = Invoke-WsProcess (Get-WsWinPowerShell) @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $f) -Environment @{ UV_NO_MODIFY_PATH = '1'; UV_INSTALL_DIR = (Join-Path $script:UserHome '.local\bin') } -TimeoutSec 900
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-UV-01' 'install.ps1'; return $false }
  Add-WsUserPath (Join-Path $script:UserHome '.local\bin')
  if (-not (Test-WsStep5)) { Set-WsFail 'E-UV-01' 'uv --version'; return $false }
  return $true
}

# =============================================================== PASSO 6 - gh

# Limite (segundos) dos comandos do gh e do acli que falam com os servidores: sem VPN ou com um proxy parado nunca
# acabariam (e um "sem resposta" nao e "sem login").
$script:TmoGh = 25

function Get-WsGhHosts {
  # Servidores com login no gh (as chaves de topo do hosts.yml), para dizer qual nao respondeu. 'github.com' se nao houver.
  # A pasta do gh no Windows: GH_CONFIG_DIR, XDG_CONFIG_HOME\gh, ou %APPDATA%\GitHub CLI.
  $d = $env:GH_CONFIG_DIR
  if (-not $d -and $env:XDG_CONFIG_HOME) { $d = Join-Path $env:XDG_CONFIG_HOME 'gh' }
  if (-not $d -and $env:APPDATA) { $d = Join-Path $env:APPDATA 'GitHub CLI' }
  $h = @()
  if ($env:GH_HOST) { $h += $env:GH_HOST }
  if ($d) {
    $f = Join-Path $d 'hosts.yml'
    try {
      if (Test-Path -LiteralPath $f -PathType Leaf) {
        foreach ($m in [regex]::Matches([IO.File]::ReadAllText($f, [Text.Encoding]::UTF8), '(?m)^([A-Za-z0-9][A-Za-z0-9.:-]*):')) { if ($h -notcontains $m.Groups[1].Value) { $h += $m.Groups[1].Value } }
      }
    } catch { }
  }
  if ($h.Count -eq 0) { return 'github.com' }
  return ($h -join ' ')
}

function Test-WsStep6 {
  # -Exe: depois de instalar, o gh que o setup acabou de por (e nao o primeiro do PATH, que pode estar estragado).
  # Os nomes de variaveis do PowerShell nao distinguem maiusculas: $exe e $Exe sao a mesma. Daqui o $ghExe.
  param([string]$Exe)
  $ghExe = $null
  if ($Exe) { if (Test-Path -LiteralPath $Exe) { $ghExe = $Exe } }
  else {
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if ($gh -and $gh.CommandType -eq 'Application') { $ghExe = $gh.Source }
    elseif (Test-Path -LiteralPath (Join-Path $script:WsHome 'bin\gh.exe')) { $ghExe = Join-Path $script:WsHome 'bin\gh.exe' }
  }
  if (-not $ghExe) { return $false }
  $exe = $ghExe
  $r = Invoke-WsProcess $exe @('--version') -TimeoutSec 60
  if ($r.ExitCode -ne 0) { return $false }
  $script:GhExe = $exe
  $script:GhVer = Get-WsVersionOf $r.StdOut
  Set-WsDetail (M 's6_ja' @{ VERSAO = $script:GhVer })
  # O login no GitHub e obrigatorio (o Projeto 2 le issues e abre PRs com o gh; o registo no painel, D-34, le o email
  # verificado da conta: daqui o scope user:email). O "gh auth status" fala com cada servidor do hosts.yml: com
  # limite de tempo, e -2 (sem resposta) e a rede, nao o login.
  $st = Invoke-WsProcess $exe @('auth', 'status') -TimeoutSec $script:TmoGh
  $rc = $st.ExitCode
  if ($rc -ne 0 -and $rc -ne -2 -and $script:Mode -eq 'install' -and -not $script:Sim -and -not $script:GhAsked -and (Test-WsInteractive)) {
    $script:GhAsked = $true
    if (Read-WsYesNo (M 's6_pergunta_login') $true) {
      Write-WsLog '$ gh auth login --hostname github.com --git-protocol https --web --scopes user:email (interactive)'
      Clear-WsTypeAhead
      Invoke-WsLogin $exe @('auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web', '--scopes', 'user:email') -CancelCodes @(2)
      $st = Invoke-WsProcess $exe @('auth', 'status') -TimeoutSec $script:TmoGh
      $rc = $st.ExitCode
    }
  }
  if ($rc -eq -2) {
    # Sem resposta: o problema e a rede (VPN, proxy), nao o login. Nao perguntar nem voltar a instalar.
    Write-WsLog ('gh auth status: no answer in {0} s' -f $script:TmoGh)
    $script:GhSemLogin = $true; $script:GhSemRede = $true
    Set-WsDetail ''
    Set-WsFail 'E-GH-03' (Get-WsGhHosts)
    return $false
  }
  if ($rc -ne 0) {
    $script:GhSemLogin = $true
    Set-WsDetail ''
    Set-WsFail 'E-GH-02' ''
    return $false
  }
  $script:GhSemLogin = $false; $script:GhSemRede = $false
  $null = Test-WsStep6Scope $exe ([string]$st.StdOut + "`n" + [string]$st.StdErr)
  # O git passa a usar as credenciais do gh (push e PR no /task-report sem pedir password).
  if ($script:Mode -eq 'install') { $null = Invoke-WsProcess $exe @('auth', 'setup-git') -TimeoutSec $script:TmoGh }
  return $true
}

function Get-WsGhScopes {
  # Os scopes do token da conta ativa no github.com, da saida do "gh auth status" ('-' se nao se sabe: sem a linha
  # "Token scopes", ex.: um token fine-grained ou o GH_TOKEN). Com varias contas no github.com conta a ativa
  # ("Active account: true"; um gh antigo so tem uma). Ver ws_gh_scopes no setup-mac.sh.
  param([string]$Text)
  $sec = $false; $n = 0; $act = @{}; $sc = @{}
  foreach ($line in ([string]$Text -split "`r?`n")) {
    if ($line -match '^[^ \t]') { $sec = ($line -match '^github\.com[ \t]*$'); continue }
    if (-not $sec) { continue }
    if ($line -match 'Logged in to github\.com') { $n++; $act[$n] = $false; $sc[$n] = '-'; continue }
    if ($line -match 'Active account:[ \t]*true') { if ($n) { $act[$n] = $true }; continue }
    if ($line -match 'Token scopes:[ \t]*(.*)$') {
      $v = $Matches[1]
      if (-not $n) { $n = 1; $act[$n] = $false }
      $sc[$n] = $v
    }
  }
  if (-not $n) { return '-' }
  $k = 1
  for ($i = 1; $i -le $n; $i++) { if ($act[$i]) { $k = $i; break } }
  return [string]$sc[$k]
}

function Test-WsGhEmailScope {
  # $true se o token pode ler os emails da conta (scope user:email ou user), ou se nao se sabe ('-'): o registo no
  # painel (passo 8, D-34) precisa dele. "none" (um token sem scopes) nao pode.
  param([string]$Scopes)
  $s = (([string]$Scopes -replace "['`"]", '') -replace ',', ' ').Trim()
  if (-not $s -or $s -eq '-') { return $true }
  foreach ($w in ($s -split '\s+')) { if ($w -ceq 'user' -or $w -ceq 'user:email') { return $true } }
  return $false
}

function Test-WsStep6Scope {
  # O login sem o scope user:email (feito antes do workshop v2): ao instalar, com consola, pergunta e corre o
  # "gh auth refresh" (abre o browser, como o login). Sem consola, com -Yes ou no -Check: so o aviso E-TEL-03 com o
  # comando. Nunca falha o passo: o gh serve na mesma para o Projeto 2. Ver ws_s6_scope no setup-mac.sh.
  param([string]$Exe, [string]$Text)
  $script:GhScopeWarn = $false
  $scopes = Get-WsGhScopes $Text
  if (Test-WsGhEmailScope $scopes) { return }
  Write-WsLog ('gh: the github.com token has no user:email scope (' + $scopes + ')')
  if ($script:Mode -eq 'install' -and -not $script:Sim -and -not $script:GhScopeAsked -and (Test-WsInteractive)) {
    $script:GhScopeAsked = $true
    if (Read-WsYesNo (M 's6_pergunta_scope') $true) {
      Write-WsLog '$ gh auth refresh -h github.com -s user:email (interactive)'
      Clear-WsTypeAhead
      Invoke-WsLogin $Exe @('auth', 'refresh', '-h', 'github.com', '-s', 'user:email') -CancelCodes @(2)
      $r = Invoke-WsProcess $Exe @('auth', 'status') -TimeoutSec $script:TmoGh
      if (Test-WsGhEmailScope (Get-WsGhScopes ([string]$r.StdOut + "`n" + [string]$r.StdErr))) { return }
    }
  }
  $script:GhScopeWarn = $true
  Set-WsWarn 'E-TEL-03' 'gh auth refresh -h github.com -s user:email'
}

function Install-WsStep6 {
  # O GitHub nao respondeu (VPN, proxy): descarregar outra vez nao ajuda.
  if ($script:GhSemRede) { Set-WsFail 'E-GH-03' (Get-WsGhHosts); return $false }
  # Ja instalado, so falta o login: nao voltar a descarregar.
  if ($script:GhSemLogin -and $script:GhExe) { Set-WsFail 'E-GH-02' ''; return $false }
  if ((Test-WsWinget) -and (Invoke-WsWinget 'GitHub.cli')) {
    # O gh que o winget acabou de por (o Invoke-WsWinget ja recarregou o PATH): o melhor que se sabe.
    $w = ''
    $c = Get-Command gh -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($c) { $w = $c.Source }
    if (Test-WsStep6 -Exe $w) { return $true }
    if ($script:GhSemLogin) { return $false }
  }
  $a = 'amd64'
  if ($script:Arch -eq 'arm64') { $a = 'arm64' }
  $file = 'gh_{0}_windows_{1}.zip' -f $script:C.GH_VERSION, $a
  $d = Join-Path $script:Tmp 'gh'
  Remove-Item -LiteralPath $d -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path (Join-Path $d 'x') -Force | Out-Null
  $sums = Expand-WsPattern $script:C.GH_RELEASE_URL @{ version = $script:C.GH_VERSION; file = ('gh_{0}_checksums.txt' -f $script:C.GH_VERSION) }
  $url = Expand-WsPattern $script:C.GH_RELEASE_URL @{ version = $script:C.GH_VERSION; file = $file }
  Write-WsActivity (M 'a_descarregar' @{ O_QUE = $file })
  if (-not (Invoke-WsDownload $sums (Join-Path $d 'sums'))) { Set-WsFail (Get-WsDlCode) (Get-WsDlDetail $sums); return $false }
  $want = Get-WsSumFor (Join-Path $d 'sums') $file
  $rc = Invoke-WsDownloadChecked $url (Join-Path $d $file) $want
  if ($rc -eq 1) { Set-WsFail (Get-WsDlCode) (Get-WsDlDetail $url); return $false }
  if ($rc -eq 2) { Set-WsFail 'E-GH-01' ('SHA-256 ' + $file); return $false }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $d $file), (Join-Path $d 'x'))
  $src = Get-ChildItem -Path (Join-Path $d 'x') -Recurse -Filter 'gh.exe' | Select-Object -First 1
  if (-not $src) { Set-WsFail 'E-GH-01' 'gh.exe'; return $false }
  New-Item -ItemType Directory -Path (Join-Path $script:WsHome 'bin') -Force | Out-Null
  Copy-Item -LiteralPath $src.FullName -Destination (Join-Path $script:WsHome 'bin\gh.exe') -Force
  Add-WsUserPath (Join-Path $script:WsHome 'bin')
  # Pelo caminho: um gh estragado mais a frente no PATH nao faz o passo culpar o download.
  $mine = Join-Path $script:WsHome 'bin\gh.exe'
  if (Test-WsStep6 -Exe $mine) { return $true }
  if ($script:GhSemLogin) { return $false }
  Set-WsFail 'E-GH-01' ($mine + ' --version'); return $false
}

# =============================================================== PASSO 7 - Jira: MCP Atlassian + Atlassian CLI (reserva)

function Get-WsAcli {
  $c = Get-Command acli -ErrorAction SilentlyContinue
  if ($c -and $c.CommandType -eq 'Application') { return $c.Source }
  $p = Join-Path $script:WsHome 'bin\acli.exe'
  if (Test-Path -LiteralPath $p) { return $p }
  return $null
}

function Test-WsAcliLogin {
  # Ha dois logins no acli: o global (acli auth login, Jira + Confluence) e o so do Jira (acli jira auth login).
  # Com limite de tempo (sem VPN ou com um proxy parado, o acli espera pela rede); sem resposta, nao tenta o segundo.
  param([string]$Exe)
  $rc = (Invoke-WsProcess $Exe @('auth', 'status') -TimeoutSec $script:TmoGh).ExitCode
  if ($rc -eq 0) { return $true }
  if ($rc -eq -2) { Write-WsLog ('acli auth status: no answer in {0} s' -f $script:TmoGh); return $false }
  return ((Invoke-WsProcess $Exe @('jira', 'auth', 'status') -TimeoutSec $script:TmoGh).ExitCode -eq 0)
}

function Test-WsAcli {
  # O acli e a reserva do MCP: faltar ou nao ter login nunca bloqueia o passo (aviso ou nota).
  param([bool]$Tried)
  $exe = Get-WsAcli
  $r = $null
  if ($exe) { $r = Invoke-WsProcess $exe @('--version') -TimeoutSec 60 }
  if (-not $exe -or $r.ExitCode -ne 0) {
    if ($script:Mode -eq 'install' -and -not $Tried) { return $false }
    if ([string]$script:Blocked -match 'acli') { Set-WsWarn 'E-PERM-02' $script:Blocked }
    else { Set-WsWarn 'E-ACLI-01' $script:AcliErr }
    return $true
  }
  Set-WsDetail (M 's7_ja_acli' @{ VERSAO = (Get-WsVersionOf $r.StdOut) })
  if (Test-WsAcliLogin $exe) { return $true }
  if ($script:Mode -eq 'install' -and -not $script:Sim -and -not $script:AcliAsked -and (Test-WsInteractive)) {
    $script:AcliAsked = $true
    if (Read-WsYesNo (M 's7_pergunta_acli') $true) {
      Write-WsLog '$ acli auth login (interactive)'
      Clear-WsTypeAhead
      Invoke-WsLogin $exe @('auth', 'login')
    }
  }
  if (-not (Test-WsAcliLogin $exe)) { Add-WsNote (M 's7_acli_login') }
  return $true
}

function Get-WsMcpField {
  # Um campo da saida do "claude mcp get" (linhas "  Command: ..." e "  URL: ..."); '' se nao houver.
  # O codigo de saida so diz que o registo existe, mesmo que aponte para um programa ou URL que ja nao serve.
  param([string]$Out, [string]$Field)
  $m = [regex]::Match([string]$Out, '(?m)^[ \t]*' + [regex]::Escape($Field) + ':[ \t]*(.*?)[ \t]*\r?$')
  if ($m.Success) { return $m.Groups[1].Value.Trim('"') }
  return ''
}

function Test-WsAtlassianMcp {
  # O registo atlassian (saida do "claude mcp get") aponta para o MCP do workshop? Um antigo (o SSE .../v1/sse, ou um
  # servidor local como o mcp-remote) nao serve. Sem nenhum destes campos na saida, nao da para comparar: aceita.
  param([string]$Out)
  $u = Get-WsMcpField $Out 'URL'
  if ($u) { return ($u -eq $script:C.ATLASSIAN_MCP_URL) }
  return (-not (Get-WsMcpField $Out 'Command'))
}

function Get-WsMcpUser {
  # Registo MCP do ambito "user" lido do .claude.json, sem se ligar ao servidor: o "mcp get" arranca o comando de um
  # registo stdio (ex.: um "npx -y mcp-remote .../v1/sse" antigo, que abre o browser para o OAuth, ou um programa
  # que fica preso 30 s). Devolve @{ Kind = nenhum|cmd|url; Exe; Cmd (comando e argumentos, sem os valores de opcoes
  # com token/key/secret/pass/auth/header); Args; Url }, ou $null se nao deu para ler (fica o "mcp get").
  param([string]$Name, $Text = $null)
  if ($null -eq $Text) {
    $dir = $env:CLAUDE_CONFIG_DIR
    if (-not $dir) { $dir = $script:UserHome }
    if (-not $dir) { return $null }
    $f = Join-Path $dir '.claude.json'
    # Sem o ficheiro fica o "mcp get" (que sem registos nao arranca nada).
    if (-not (Test-Path -LiteralPath $f -PathType Leaf)) { return $null }
    try { $Text = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8) } catch { return $null }
  }
  $j = $null
  try { $j = ([string]$Text).TrimStart([char]0xFEFF) | ConvertFrom-Json -ErrorAction Stop } catch { return $null }
  $o = @{ Kind = 'nenhum'; Exe = ''; Cmd = ''; Args = ''; Url = ''; Env = @() }
  if (-not $j -or -not $j.mcpServers -or -not ($j.mcpServers.PSObject.Properties.Name -contains $Name)) { return $o }
  $e = $j.mcpServers.$Name
  if (-not $e) { return $o }
  if ($e.command) {
    $o.Kind = 'cmd'; $o.Exe = [string]$e.command
    if ($e.env) { $o.Env = @($e.env.PSObject.Properties.Name) }
    $show = @($o.Exe); $esc = $false; $all = @()
    foreach ($a in @($e.args)) {
      if ($null -eq $a) { continue }
      $x = [string]$a; $all += $x
      if ($esc) { $show += '***'; $esc = $false; continue }
      if ($x -match 'token|key|secret|pass|auth|header') {
        if ($x -match '^-' -and $x -notmatch '=') { $esc = $true; $show += $x } elseif ($x -match '=') { $show += ($x -replace '=.*', '=***') } else { $show += '***' }
        continue
      }
      $show += $x
    }
    $o.Args = ($all -join ' ')
    $o.Cmd = ($show -join ' ')
    if ($o.Cmd.Length -gt 200) { $o.Cmd = $o.Cmd.Substring(0, 200) }
    return $o
  }
  $o.Kind = 'url'; $o.Url = [string]$e.url
  return $o
}

function Test-WsStep7 {
  param([switch]$AcliTried)
  if (-not $script:ClaudeExe) { $script:ClaudeExe = Get-WsClaude }
  # Um .claude.json sem leitura parece vazio ao "claude mcp get" (so "No MCP server named"): e E-PERM-01, nao E-MCP-01.
  if (Test-WsPermBlocked @(Get-WsClaudeJson)) { return $false }
  # Um registo antigo no .claude.json decide-se sem o "mcp get" (que o arrancava duas vezes, aqui e no Install).
  # $script:S7Old fica com o destino antigo, para o Install-WsStep7 o trocar sem o voltar a ler.
  $script:S7Old = ''
  $u = Get-WsMcpUser 'atlassian'
  if ($u) {
    if ($u.Kind -eq 'cmd') { $script:S7Old = $u.Cmd }
    elseif ($u.Kind -eq 'url' -and $u.Url -ne $script:C.ATLASSIAN_MCP_URL) { $script:S7Old = $u.Url; if (-not $script:S7Old) { $script:S7Old = '?' } }
    if ($script:S7Old) { Set-WsFail 'E-MCP-01' ('atlassian: ' + $script:S7Old); return $false }
  }
  $r = Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'atlassian') -TimeoutSec 120
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-MCP-01' ''; return $false }
  if (-not (Test-WsAtlassianMcp $r.StdOut)) { $script:S7Old = (Get-WsMcpField $r.StdOut 'URL') + (Get-WsMcpField $r.StdOut 'Command'); Set-WsFail 'E-MCP-01' ('atlassian: ' + $script:S7Old); return $false }
  Set-WsDetail (M 's7_ja')
  Add-WsNote (M 's7_oauth')
  $script:TodoMcp = $true
  return (Test-WsAcli $AcliTried.IsPresent)
}

function Install-WsAcli {
  # Falhar aqui so deixa um aviso ($script:AcliErr).
  $file = $script:C.ACLI_WINDOWS_FILE_X64; $want = $script:C.ACLI_WINDOWS_SHA256_X64
  if ($script:Arch -eq 'arm64') { $file = $script:C.ACLI_WINDOWS_FILE_ARM64; $want = $script:C.ACLI_WINDOWS_SHA256_ARM64 }
  $url = Expand-WsPattern $script:C.ACLI_WINDOWS_URL @{ version = $script:C.ACLI_VERSION; file = $file }
  $d = Join-Path $script:Tmp 'acli'
  Remove-Item -LiteralPath $d -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path (Join-Path $d 'x') -Force | Out-Null
  Write-WsActivity (M 'a_descarregar' @{ O_QUE = $file })
  $rc = Invoke-WsDownloadChecked $url (Join-Path $d $file) $want
  if ($rc -eq 1) { $script:AcliErr = (Get-WsDlCode) + ' ' + (Get-WsDlDetail $url); return $false }
  if ($rc -eq 2) { $script:AcliErr = 'SHA-256 ' + $file; return $false }
  try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $d $file), (Join-Path $d 'x'))
  } catch { $script:AcliErr = 'unzip ' + $file; return $false }
  $src = Get-ChildItem -Path (Join-Path $d 'x') -Recurse -Filter 'acli.exe' | Select-Object -First 1
  if (-not $src) { $script:AcliErr = 'acli.exe'; return $false }
  $bin = Join-Path $script:WsHome 'bin'
  try {
    New-Item -ItemType Directory -Path $bin -Force | Out-Null
    Copy-Item -LiteralPath $src.FullName -Destination (Join-Path $bin 'acli.exe') -Force -ErrorAction Stop
  } catch { $script:AcliErr = $bin; return $false }
  Add-WsUserPath $bin
  return $true
}

function Install-WsStep7 {
  $script:T['7'].Notas = @()   # o Test volta a escrever as notas
  if (Test-WsPermBlocked @(Get-WsClaudeJson)) { return $false }
  # Um registo atlassian antigo (ex.: o SSE .../v1/sse) e trocado pelo do workshop, com uma nota a dizer qual era.
  # O Test-WsStep7 (corre sempre antes) deixou o destino antigo em $script:S7Old: nao se volta a ler (nem a arrancar).
  # Sem esse valor (o .claude.json nao se leu), o "mcp get" diz qual era.
  if (-not $script:S7Old) {
    $g = Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'atlassian') -TimeoutSec 120
    if ($g.ExitCode -eq 0 -and -not (Test-WsAtlassianMcp $g.StdOut)) { $script:S7Old = (Get-WsMcpField $g.StdOut 'URL') + (Get-WsMcpField $g.StdOut 'Command'); if (-not $script:S7Old) { $script:S7Old = '?' } }
  }
  if ($script:S7Old) {
    $old = $script:S7Old; $script:S7Old = ''
    if ((Invoke-WsProcess $script:ClaudeExe @('mcp', 'remove', '--scope', 'user', 'atlassian') -TimeoutSec 120).ExitCode -ne 0 -and
      (Invoke-WsProcess $script:ClaudeExe @('mcp', 'remove', 'atlassian') -TimeoutSec 120).ExitCode -ne 0) {
      Set-WsFail 'E-MCP-01' 'claude mcp remove atlassian'; return $false
    }
    Add-WsNote (M 's7_substituido' @{ ANTIGO = $old })
  }
  $g = Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'atlassian') -TimeoutSec 120
  if ($g.ExitCode -ne 0) {
    $r = Invoke-WsProcess $script:ClaudeExe @('mcp', 'add', '--transport', 'http', '--scope', 'user', 'atlassian', $script:C.ATLASSIAN_MCP_URL) -TimeoutSec 120
    if ($r.ExitCode -ne 0) { Set-WsFail 'E-MCP-01' ''; return $false }
    Register-WsExtra 'mcp' 'atlassian' '' '' ''
    # "mcp get" e nao "mcp list": o list verifica todos os servidores da pessoa (lento se algum nao responder).
    if ((Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'atlassian') -TimeoutSec 120).ExitCode -ne 0) { Set-WsFail 'E-MCP-01' 'claude mcp get atlassian'; return $false }
  }
  if (-not (Get-WsAcli)) { $null = Install-WsAcli }
  return (Test-WsStep7 -AcliTried)
}

# =============================================================== PASSO 8 - nivel do utilizador

function Invoke-WsInstallUser {
  param([string]$Sub, [string[]]$Extra)
  $a = Get-WsInstallUserArgs -Sub $Sub -NodePath $script:NodeExe -KitSrc $script:KitSrc -CaPem $script:CaPem -Proxy $script:Proxy -SubstituirStatusline:($Sub -eq 'instalar' -and $script:SubstSl) -Lang $script:Lang -NoProxy $script:NoProxy -Extra $Extra
  return (Invoke-WsProcess $script:NodeExe $a -TimeoutSec 600)
}

# Painel do workshop (D-34): a participacao e obrigatoria e faz-se com o registo pelo GitHub. Um so board para todos
# (sem salas). O install-user grava %USERPROFILE%\.workshop-claude\telemetry\config.json e depois o passo 8 regista a
# pessoa com telemetry\ctl.mjs register (o gh confirma no portatil o email verificado da empresa; ao painel so vao o
# nome e um hash da conta, nunca o token). Ver ws_s8_register no setup-mac.sh.

# O painel so existe nos kits que o trazem (a pasta telemetry): sem ela, nao ha registo.
function Test-WsTelemetryKit { return [bool]($script:KitSrc -and (Test-Path -LiteralPath (Join-Path $script:KitSrc 'telemetry') -PathType Container)) }
function Test-WsTelemetryConfig { return [bool]($script:WsHome -and (Test-Path -LiteralPath (Join-Path $script:WsHome 'telemetry\config.json') -PathType Leaf)) }

function Read-WsTelemetryConfig {
  # O config.json da telemetria (objeto), ou $null.
  if (-not (Test-WsTelemetryConfig)) { return $null }
  try { return (([IO.File]::ReadAllText((Join-Path $script:WsHome 'telemetry\config.json'), [Text.Encoding]::UTF8)).TrimStart([char]0xFEFF) | ConvertFrom-Json -ErrorAction Stop) } catch { return $null }
}

function Get-WsTelParticipant {
  # O registo no config.json: o id do participante (32 hex) que o painel deu, ou ''.
  param($Config)
  if (-not $Config -or -not $Config.participant) { return '' }
  $p = [string]$Config.participant.p
  if ($p -cmatch '^[0-9a-f]{32}$') { return $p }
  return ''
}

function Test-WsTelActive {
  # A config em vigor: expira no fim do dia a seguir ao workshop (o kit deixa de gravar e de enviar). $true tambem
  # sem expires_at. O PowerShell 7 ja le o expires_at como data; o 5.1 deixa o texto.
  param($Config, [datetime]$Now = [datetime]::UtcNow)
  if (-not $Config) { return $false }
  $exp = $Config.expires_at
  $when = $null
  if ($exp -is [datetime]) { $when = $exp.ToUniversalTime() }
  elseif ($exp) {
    $d = [datetime]::MinValue
    $sty = [Globalization.DateTimeStyles]::AdjustToUniversal -bor [Globalization.DateTimeStyles]::AssumeUniversal
    if ([datetime]::TryParse([string]$exp, [Globalization.CultureInfo]::InvariantCulture, $sty, [ref]$d)) { $when = $d }
  }
  return -not ($null -ne $when -and $Now.ToUniversalTime() -ge $when)
}

function Get-WsStep8RegisterCmd {
  # O comando de registo que se mostra (no -Check e nas notas), pronto a colar no PowerShell ($env:USERPROFILE, nao
  # %USERPROFILE%).
  $p = (Format-WsShowPath (Join-Path $script:WsHome 'kit\telemetry\ctl.mjs')) -replace '^%USERPROFILE%', '$env:USERPROFILE'
  return ('node "' + $p + '" register')
}

function Add-WsStep8RegisteredNote {
  param($Config)
  $nome = [string]$Config.participant.name; if (-not $nome) { $nome = '?' }
  Add-WsNote (M 's8_painel_registado' @{ NOME = $nome })
}

function Set-WsStep8RegisterResult {
  # O resultado do ctl.mjs register -> nota ou aviso. Nunca falha o passo (o workshop faz-se igual sem o painel).
  #   0 registado (nota com o nome) - 3 sem email verificado da empresa (E-TEL-02) - 4 gh sem login ou sem o scope
  #   user:email (E-TEL-03; se o passo 6 ja o disse, so uma nota) - 5 ou sem resposta a tempo (-2): painel
  #   inacessivel (E-TEL-01) - outro (1 sem config ou expirada): so no log. Ver ws_s8_register_result.
  param([int]$Code, $Config)
  if ($Code -eq 0) { Add-WsStep8RegisteredNote $Config; return }
  if ($Code -eq 3) {
    $d = ''
    if ($Config) { $d = [string]$Config.email_domain }
    if (-not $d) { $d = 'checkmarx.com' }
    Set-WsWarn 'E-TEL-02' ('@' + $d); return
  }
  if ($Code -eq 4) {
    if ($script:GhScopeWarn) { Add-WsNote (M 's8_painel_ver_gh' @{ CMD = (Get-WsStep8RegisterCmd) }) }
    else { Set-WsWarn 'E-TEL-03' 'gh auth refresh -h github.com -s user:email' }
    return
  }
  if ($Code -eq 5 -or $Code -eq -2) {
    $u = ''
    if ($Config) { $u = ([string]$Config.panel_url).Trim() }
    if ($u) { Set-WsWarn 'E-TEL-01' ((Get-WsGatewayShow $u) + ' - register') } else { Write-WsLog 'panel: no panel_url in this kit' }
    return
  }
  Write-WsLog ('panel: register exit ' + $Code)
}

function Invoke-WsStep8Register {
  # Regista a pessoa no painel (so ao instalar): node <kit instalado>\telemetry\ctl.mjs register, com o node do kit e
  # o gh do passo 6 (no PATH e em WORKSHOP_GH). O proxy e os certificados ja estao no ambiente (passo 0). Tambem quando
  # o config.json ja tem o participante (rc.4): o painel apaga tudo a meia-noite, por isso o registo de outro dia ja
  # nao vale, e o register e idempotente (a mesma conta fica na mesma linha). Voltar a correr o setup no dia regista.
  if ($script:Mode -ne 'install' -or -not (Test-WsTelemetryKit)) { return }
  $ctl = Join-Path $script:WsHome 'kit\telemetry\ctl.mjs'
  $cfg = Read-WsTelemetryConfig
  if (-not $cfg -or -not (Test-Path -LiteralPath $ctl -PathType Leaf)) { return }
  if (Get-WsTelParticipant $cfg) { Write-WsLog 'panel: registered before; registering again (the panel is cleared every midnight)' }
  $envs = @{}
  $gh = [string]$script:GhExe
  if ($gh) { $envs['WORKSHOP_GH'] = $gh; $envs['PATH'] = (Split-Path $gh -Parent) + ';' + $env:PATH }
  $r = Invoke-WsProcess $script:NodeExe @($ctl, 'register') -TimeoutSec 60 -Environment $envs
  Write-WsLog ('  -> exit ' + $r.ExitCode)
  Set-WsStep8RegisterResult ([int]$r.ExitCode) (Read-WsTelemetryConfig)
}

function Test-WsStep8Register {
  # No -Check e no -Doctor: sem registo (config.json sem "participant"), um aviso com o comando. So com a config em
  # vigor (depois do workshop nao ha nada a pedir) e sem o unregister da pessoa.
  if ($script:Mode -eq 'install' -or -not (Test-WsTelemetryKit)) { return }
  $cfg = Read-WsTelemetryConfig
  if (-not $cfg -or -not (Test-WsTelActive $cfg) -or (Get-WsTelParticipant $cfg)) { return }
  # quem saiu do painel (ctl.mjs unregister) escolheu nao enviar: nada a pedir
  if ($cfg.PSObject.Properties['unregistered_at'] -and $cfg.unregistered_at) { Write-WsLog 'panel: left the panel (unregister)'; return }
  Set-WsWarn 'E-TEL-04' (Get-WsStep8RegisterCmd)
}

# O painel no -Check (spec 6.8): o setup pede GET <panel_url>/health, para quem esta numa rede que o bloqueia saber
# no dia anterior. So com o registo feito (enabled: true), um panel_url e a config em vigor (expires_at ainda no
# futuro). Nunca falha nem bloqueia: o E-TEL-01 e um aviso (a caderneta de missoes funciona sem o painel). Ver
# ws_tel_panel_url e ws_s8_panel_check no setup-mac.sh.
function Get-WsPanelTarget {
  # Texto do config.json da telemetria -> @{ Url (sem a '/' do fim) }, ou $null quando nao ha nada a testar.
  param([string]$Text, [datetime]$Now = [datetime]::UtcNow)
  $j = $null
  try { $j = ([string]$Text).TrimStart([char]0xFEFF) | ConvertFrom-Json -ErrorAction Stop } catch { return $null }
  if (-not $j -or $j.enabled -isnot [bool] -or -not $j.enabled) { return $null }
  $u = ([string]$j.panel_url).Trim()
  if ($u -notmatch '^https?://.') { return $null }
  # A config expirada (o kit deixa de gravar e de enviar): nada a testar.
  if (-not (Test-WsTelActive $j $Now)) { return $null }
  return @{ Url = $u.TrimEnd('/') }
}

function Test-WsPanelHealthBody {
  # A resposta do /health: {"ok":true} (com ou sem espacos e outros campos) -> $true.
  param([string]$Body)
  return ([string]$Body -match '(?s)^\s*\{(.*[,{\s])?"ok"\s*:\s*true\s*[,}]' -and [string]$Body -match '\}\s*$')
}

function Get-WsPanelProblem {
  # O resultado de um pedido ao /health -> '' (o painel responde) ou o motivo, para o detalhe do aviso.
  # $Status: o estado de uma falha (Get-WsWebErrorInfo); '' quando houve resposta.
  param([string]$Status, [int]$Http, [string]$Body)
  if ($Http -gt 0 -and ($Http -lt 200 -or $Http -gt 299)) { return ('HTTP ' + $Http) }
  if ($Status) { return $Status }
  if ($Http -eq 0) { return 'no answer' }
  if (-not (Test-WsPanelHealthBody $Body)) { return 'not {"ok":true}' }
  return ''
}

function Get-WsPanelReach {
  # GET <url>/health com o proxy e os certificados dos outros testes de rede (o Test-WsNetwork ja os configurou) e
  # um limite curto. Devolve '' (responde) ou o motivo.
  param([string]$Url)
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri ($Url + '/health') -Method Get -TimeoutSec 10 -UserAgent $script:UA -ErrorAction Stop
    $body = $r.Content
    if ($body -is [byte[]]) { $body = [Text.Encoding]::UTF8.GetString($body) }
    $why = Get-WsPanelProblem '' ([int]$r.StatusCode) ([string]$body)
    Write-WsLog ('panel: HTTP {0}' -f [int]$r.StatusCode)
  } catch {
    $i = Get-WsWebErrorInfo $_.Exception
    $why = Get-WsPanelProblem ([string]$i.Status) ([int]$i.Http) ''
    Write-WsLog ('panel: {0} HTTP {1}' -f $i.Status, $i.Http)
  }
  return $why
}

function Test-WsStep8Panel {
  # No -Check e no -Doctor (o install nunca testa o painel): aviso E-TEL-01 se nao responder; se responder, uma nota.
  if ($script:Mode -eq 'install') { return }
  $f = Join-Path (Join-Path $script:WsHome 'telemetry') 'config.json'
  $t = $null
  if (Test-Path -LiteralPath $f -PathType Leaf) { try { $t = Get-WsPanelTarget ([IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)) } catch { $t = $null } }
  if (-not $t) { Write-WsLog 'panel: nothing to test (not registered, expired or no panel_url)'; return }
  $why = Get-WsPanelReach $t.Url
  if (-not $why) { Add-WsNote (M 's8_painel_acessivel'); return }
  Set-WsWarn 'E-TEL-01' ((Get-WsGatewayShow $t.Url) + ' - ' + $why)
}

function Test-WsCheckOkWanted {
  # check_ok (spec 6.4): o "pronto" da vista de Abertura do painel. No fim de uma instalacao ou de um -Check sem
  # falhas (avisos podem ficar); nunca no -Doctor nem no -Uninstall (rc.3: antes so o -Check, e a vista ficava em 0).
  # Quem ainda nao esta registado fica com ele na caderneta local, e o register leva-o ao painel (backfill).
  param([string]$Mode, [int]$Faltam)
  return (($Mode -eq 'check' -or $Mode -eq 'install') -and $Faltam -eq 0)
}

function Send-WsCheckOk {
  # node ~/.workshop-claude/kit/telemetry/emit.mjs check_ok, com o node do kit. O emit.mjs nunca escreve nada e sai
  # sempre com 0; um erro dele nunca muda o resultado do -Check.
  param([int]$Faltam)
  if (-not (Test-WsCheckOkWanted $script:Mode $Faltam)) { return }
  $e = Join-Path (Join-Path (Join-Path $script:WsHome 'kit') 'telemetry') 'emit.mjs'
  $n = [string]$script:NodeExe
  if (-not $n -or -not (Test-Path -LiteralPath $e -PathType Leaf)) { Write-WsLog 'check_ok: not sent (no emit.mjs or node)'; return }
  try { $null = Invoke-WsProcess $n @($e, 'check_ok') -TimeoutSec 20; Write-WsLog 'check_ok: recorded' } catch { Write-WsLog 'check_ok: not sent' }
}

function Read-WsInstallUserOutput {
  param([string]$Text)
  $skills = 0; $agentes = 0; $lang = ''; $nossa = '0'; $kit = ''; $temLingua = $false; $err = ''; $det = ''; $de = ''; $para = ''
  # S8SoLingua: so falta mudar a lingua (WORKSHOP_LANG diferente da instalada); S8De/S8Para: de qual para qual
  $soLingua = $false; $outra = $false
  # S8Panel: a participacao no painel como o instalar a gravou ("on" ou "off")
  $script:S8SoLingua = $false; $script:S8De = ''; $script:S8Para = ''; $script:S8Panel = ''
  foreach ($kv in (ConvertFrom-WsTsv $Text)) {
    switch ($kv[0]) {
      'skills' { $skills = $kv[1] }
      'painel' { $script:S8Panel = [string]$kv[1] }
      'agentes' { $agentes = $kv[1] }
      'lingua' { $temLingua = $true }
      'language' { $lang = $kv[1] }
      'language_nossa' { $nossa = $kv[1] }
      'lingua_kit' { $kit = $kv[1] }
      'aviso' {
        if ($kv[1] -eq 'E-CFG-06') { Add-WsNote (M 's8_statusline_mantida') }
        if ($kv[1] -eq 'E-CFG-11') { Set-WsWarn $kv[1] ((Join-Path $script:ClaudeDir 'settings.json') + ': disableAllHooks') } else { Set-WsWarn $kv[1] 'statusLine' }
      }
      'erro' { $err = $kv[1] }
      'erro_detalhe' { $det = $kv[1] }
      'falta' {
        Write-WsLog ('missing: ' + $kv[1])
        # "lingua do kit (pt -> en)" ou "language do Claude (European Portuguese -> Brazilian Portuguese)";
        # a segunda vem depois e fica (a mais especifica).
        $mm = [regex]::Match([string]$kv[1], '^(lingua do kit|language do Claude) \((.+) -> (.+)\)$')
        if (-not $mm.Success) { $outra = $true }
        if ($mm.Success) {
          $soLingua = $true
          $de = $mm.Groups[2].Value; $para = $mm.Groups[3].Value
          if ($mm.Groups[1].Value -eq 'lingua do kit') {
            if (($de -eq 'pt' -or $de -eq 'en') -and ($para -eq 'pt' -or $para -eq 'en')) { $de = M ('lingua_' + $de); $para = M ('lingua_' + $para) } else { $de = '' }
          }
        }
      }
      # skills/agentes do kit que a pessoa tinha alterado: a copia dela ficou no backup
      'editado' { Add-WsNote (M 's8_editado' @{ NOME = (Split-Path ($kv[1] -replace '/', '\') -Leaf); PASTA = (Format-WsShowPath $kv[1]) }) }
      'anteriores' { Add-WsNote (M 's8_anteriores' @{ PASTA = (Format-WsShowPath $kv[1]) }) }
      # skill/agente da pessoa com o nome de um do kit: foi para o backup (o -Uninstall repoe-o)
      'alheio' { $pa = ($kv[1] -replace '/', '\'); Add-WsNote (M 's8_alheio' @{ NOME = (Split-Path $pa -Leaf); PASTA = (Format-WsShowPath (Split-Path $pa -Parent)) }) }
    }
  }
  $script:S8SoLingua = ($soLingua -and -not $outra -and -not $err)
  $script:S8De = $de; $script:S8Para = $para
  # settings.json com erro: o caminho e onde esta o erro (linha e coluna, ou o campo) ficam no ecra, sem o
  # "0 skills, 0 agents".
  if ($err) {
    $p = $det
    if ($err -eq 'E-CFG-05') { $p = Join-Path $script:ClaudeDir 'settings.json'; if ($det) { $p += ' - ' + $det } }
    Set-WsFail $err $p
    return
  }
  Set-WsDetail (M 's8_ja' @{ SKILLS = $skills; AGENTES = $agentes })
  # Em -Check/-Doctor, a lingua instalada diferente da pedida (WORKSHOP_LANG) nao e uma instalacao a meio: diz-se qual e.
  if ($de -and $script:Mode -ne 'install') {
    $cmd = "`$env:WORKSHOP_LANG='" + $script:Lang + "'; "
    if ($script:Fill) { $cmd += $script:Fill['ONE_LINER_WINDOWS'] }
    Add-WsNote (M 's8_lingua_muda' @{ DE = $de; PARA = $para; CMD = $cmd })
  }
  if (-not $temLingua) { return }
  if (-not $kit) { $kit = $script:LangKit }
  $kitName = M ('lingua_' + $kit)
  if (-not $lang) { Add-WsNote (M 's8_lingua_nenhuma' @{ LINGUA = $script:Lang; KIT = $kitName }) }
  elseif ($nossa -eq '1') { Add-WsNote (M 's8_lingua_nossa' @{ NOME = $lang; KIT = $kitName }) }
  else { Add-WsNote (M 's8_lingua_tua' @{ NOME = $lang; KIT = $kitName }) }
}

function Test-WsStep8 {
  if (-not (Initialize-WsKit)) { Set-WsFail 'E-KIT-01' ''; return $false }
  Sync-WsExtras
  $r = Invoke-WsInstallUser 'verificar'
  Read-WsInstallUserOutput $r.StdOut
  if ($r.ExitCode -eq 0) {
    # -ReplaceStatusline (o comando do E-CFG-06): uma statusline alheia conta como em falta, para o passo 8 instalar com
    # a opcao. Sem isto o passo ficava "ja feito" e o mesmo aviso voltava.
    if ($script:Mode -eq 'install' -and $script:SubstSl -and ([string]$r.StdOut -match '(?m)^statusline\talheia')) { return $false }
    # Sem o config.json do painel (kit novo numa instalacao antiga): o passo 8 corre para o gravar.
    if ($script:Mode -eq 'install' -and (Test-WsTelemetryKit) -and -not (Test-WsTelemetryConfig)) { Write-WsLog 'missing: telemetry config'; return $false }
    # Ao instalar, o registo no painel tambem se faz (ou refaz) com o passo ja feito: um registo que falhou da ultima
    # vez (rede, email, scope) tenta-se outra vez; ja registado, so a nota.
    $null = Invoke-WsStep8Register
    Test-WsClaudeConfigDir; Test-WsStep8Register; Test-WsStep8Panel; return $true
  }
  # -Check/-Doctor: so a lingua diferente da pedida (WORKSHOP_LANG) nao e uma instalacao a meio (ver a nota)
  if ($script:Mode -ne 'install' -and $script:S8SoLingua) { Test-WsStep8Register; Test-WsStep8Panel; return $true }
  return $false
}

function Test-WsClaudeConfigDir {
  # Com CLAUDE_CONFIG_DIR, as skills, os hooks e os MCP vao para essa pasta: diz-se qual e e, se um terminal novo
  # (variaveis do Utilizador, senao da Maquina) nao tiver o mesmo valor, o claude de la nao os ve (E-CFG-09).
  if (-not $env:CLAUDE_CONFIG_DIR) { return }
  Add-WsNote (M 's8_claude_dir' @{ CAMINHO = $script:ClaudeDir })
  $nt = [Environment]::GetEnvironmentVariable('CLAUDE_CONFIG_DIR', 'User')
  if (-not $nt) { $nt = [Environment]::GetEnvironmentVariable('CLAUDE_CONFIG_DIR', 'Machine') }
  if ($nt) { $nt = [Environment]::ExpandEnvironmentVariables($nt) }
  if (([string]$nt).TrimEnd('\', '/') -ne ([string]$env:CLAUDE_CONFIG_DIR).TrimEnd('\', '/')) {
    $show = 'not set'; if ($nt) { $show = $nt }
    Set-WsWarn 'E-CFG-09' ($script:ClaudeDir + ' - new terminal: ' + $show)
  }
}

function Install-WsStep8 {
  $script:T['8'].Notas = @()   # as notas do verificar (lingua antes da instalacao) nao valem: o instalar volta a escreve-las (como o ws_s8_install)
  if (-not (Initialize-WsKit)) { Set-WsFail 'E-KIT-01' ''; return $false }
  # O detalhe e as notas sao os desta instalacao (o Test do passo ja os tinha escrito uma vez).
  $script:T['8'].Detalhe = ''; $script:T['8'].Notas = @()
  # a mudanca de lingua que o Test viu (a saida do instalar nao a diz): no fim, uma nota a dizer qual foi
  $de = $script:S8De; $para = $script:S8Para
  # A pasta dos projetos vai sempre.
  $extra = @('--projects-dir', $script:Proj)
  $r = Invoke-WsInstallUser 'instalar' $extra
  Read-WsInstallUserOutput $r.StdOut
  # Numa falha o detalhe ("0 skills, 0 agents") e as notas da lingua nao valem: fica o titulo do codigo.
  if ($r.ExitCode -ne 0) { $script:T['8'].Detalhe = ''; $script:T['8'].Notas = @() }
  if ($r.ExitCode -eq 3) { if (-not $script:T['8'].Falha) { Set-WsFail 'E-CFG-05' (Join-Path $script:ClaudeDir 'settings.json') }; return $false }
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-KIT-03' ('install-user ({0})' -f $r.ExitCode); return $false }
  if ($de) { Add-WsNote (M 's8_lingua_mudou' @{ DE = $de; PARA = $para }) }
  $null = Invoke-WsStep8Register
  Sync-WsExtras
  Test-WsClaudeConfigDir
  return $true
}

# =============================================================== PASSO 9 - projetos

# git so no .git da propria pasta: com -C o git procura nas pastas de cima, e um %USERPROFILE% com os dotfiles em
# git fazia passar por "feito" um projeto sem .git. Sem tag assinada (um tag.gpgsign=true global abria o editor ou
# um pedido do 1Password / pinentry). Ver ws_git_own no setup-mac.sh.
function Get-WsGitOwnArgs {
  param([string]$Dir)
  return @(('--git-dir=' + (Join-Path $Dir '.git')), '-c', 'tag.gpgsign=false')
}

function Test-WsGitTag {
  param([string]$Dir, [string]$Ref)
  if (-not $script:GitExe) { $script:GitExe = Get-WsGit }
  $r = Invoke-WsProcess $script:GitExe ((Get-WsGitOwnArgs $Dir) + @('rev-parse', '-q', '--verify', $Ref)) -TimeoutSec 60
  return ($r.ExitCode -eq 0)
}

# Estado de um projeto do workshop (ver ws_proj_state no setup-mac.sh):
#   vazia       nao existe ou esta vazia
#   alheia      tem ficheiros e nao tem a marca do kit (E-DEMO-03: o setup nao lhe toca)
#   incompleta  montagem interrompida: marca {"status":"incomplete"} (Ctrl-C a meio da copia) ou sem commits no
#               proprio .git (o git falhou, ou a pessoa apagou o .git); o assembler volta a montar e, se a pasta
#               nao for so a copia incompleta do kit, guarda-a primeiro em %USERPROFILE%\.workshop-claude\backup\
#   ok          marca e ref (a tag arena-start da Arena, o HEAD do projeto de treino)
#   propria     marca e commits, mas sem a ref: historico da pessoa (E-DEMO-04, fica como esta)
#   semgit      so no Windows: o git nem arrancou (AppLocker, WDAC, antivirus) ou passou do tempo, e nao se sabe;
#               o projeto nao e tocado (com --force a pasta da pessoa ia para o backup e a montagem falhava no git)
function Get-WsProjState {
  param([string]$Dir, [string]$Mark, [string]$Ref)
  if (-not (Test-Path -LiteralPath $Dir) -or @(Get-ChildItem -LiteralPath $Dir -Force -ErrorAction SilentlyContinue).Count -eq 0) { return 'vazia' }
  $mf = Join-Path $Dir $Mark
  if (-not (Test-Path -LiteralPath $mf -PathType Leaf)) { return 'alheia' }
  $txt = ''
  try { $txt = [IO.File]::ReadAllText($mf) } catch { $txt = '' }
  if ($txt -match '"status"\s*:\s*"incomplete"') { return 'incompleta' }
  if (-not (Test-Path -LiteralPath (Join-Path $Dir '.git'))) { return 'incompleta' }
  if (-not $script:GitExe) { $script:GitExe = Get-WsGit }
  $r = Invoke-WsProcess $script:GitExe ((Get-WsGitOwnArgs $Dir) + @('rev-parse', '-q', '--verify', 'HEAD')) -TimeoutSec 60
  if ($r.ExitCode -lt 0) { return 'semgit' }
  if ($r.ExitCode -ne 0) { return 'incompleta' }
  if (Test-WsGitTag $Dir $Ref) { return 'ok' }
  return 'propria'
}

# Caminho para mostrar: barras do Windows e a pasta do perfil como %USERPROFILE% (o install-user e os assemblers
# escrevem C:/Users/...).
function Format-WsShowPath {
  param([string]$Path, [string]$UserHome)
  $p = ([string]$Path) -replace '/', '\'
  $homes = @($UserHome)
  if (-not $UserHome) { $homes = @($script:UserHome, $env:USERPROFILE) }
  foreach ($h in $homes) {
    $h = ([string]$h -replace '/', '\').TrimEnd('\')
    if (-not $h) { continue }
    if ($p.Equals($h, [StringComparison]::OrdinalIgnoreCase)) { return '%USERPROFILE%' }
    if ($p.StartsWith($h + '\', [StringComparison]::OrdinalIgnoreCase)) { return '%USERPROFILE%' + $p.Substring($h.Length) }
  }
  return $p
}

# Nomes desde a v1.0.0-rc.2: o projeto de treino e %USERPROFILE%\workshop-claude\practice-project (era
# exemplo-projeto-real) e a tag do estado inicial da Arena e arena-start (era arena-inicial). Instalacoes antigas
# sao migradas sem perder trabalho: a pasta antiga so e movida se a nova nao existir; a tag nova aponta para o
# mesmo commit.
$script:PracticeDir = 'practice-project'
$script:PracticeDirOld = 'exemplo-projeto-real'
# Workshop v2: o projeto das missoes (%USERPROFILE%\workshop-claude\missions-project), so nos kits com o
# assemble-missions.mjs.
$script:MissionsDir = 'missions-project'
# Workshop v2 (A4): o Projeto 1 e o Canivete (%USERPROFILE%\workshop-claude\canivete-project, tag canivete-start);
# a Arena (demo-project) so com WORKSHOP_P1=arena. Uma Arena ja montada numa instalacao anterior fica como esta
# (nunca e apagada): com o Canivete, monta-se ao lado dela.
$script:CaniveteDir = 'canivete-project'
$script:P1 = 'arena'
$script:P1Ignored = ''

function Select-WsP1 {
  # WORKSHOP_P1 (maiusculas ou minusculas, espacos a volta nao contam) -> 'canivete' | 'arena' (ver ws_p1_pick no
  # setup-mac.sh): vazio ou canivete -> canivete; arena -> arena; outra coisa -> canivete e $script:P1Ignored (para
  # a nota do passo 9). Um kit sem o installer\assemble-canivete.mjs (anterior ao v2) monta a Arena, como antes.
  param([string]$Value, [string]$KitSrc)
  $script:P1Ignored = ''
  if (-not $KitSrc -or -not (Test-Path -LiteralPath (Join-Path $KitSrc 'installer\assemble-canivete.mjs') -PathType Leaf)) { return 'arena' }
  $v = ([string]$Value).Trim().ToLowerInvariant()
  if ($v -eq '' -or $v -eq 'canivete') { return 'canivete' }
  if ($v -eq 'arena') { return 'arena' }
  $raw = [string]$Value
  if ($raw.Length -gt 40) { $raw = $raw.Substring(0, 40) }
  $script:P1Ignored = ($raw -replace '[\x00-\x1F\x7F]', '')
  return 'canivete'
}

function Initialize-WsP1 {
  # Sem WORKSHOP_P1, o -Check e o -Doctor usam a escolha gravada na ultima instalacao (Get-WsP1Saved): assim veem o
  # Projeto 1 instalado com WORKSHOP_P1=arena. Ao instalar, vazio continua a ser o Canivete (A4). Ver ws_p1_pick.
  $v = $env:WORKSHOP_P1
  $src = ''
  if (-not ([string]$v).Trim() -and $script:Mode -ne 'install') { $v = Get-WsP1Saved; if ($v) { $src = ' (saved)' } }
  $script:P1 = Select-WsP1 $v $script:KitSrc
  $ig = ''
  if ($script:P1Ignored) { $ig = ' (WORKSHOP_P1 ignored: ' + $script:P1Ignored + ')' }
  Write-WsLog ('project 1: ' + $script:P1 + $src + $ig)
}

function Get-WsP1Saved {
  # A escolha do Projeto 1 gravada ao instalar (o extra "opcao p1" do manifest: canivete|arena), ou ''. Primeiro o
  # que ainda esta por registar (extras-pendentes.tsv), depois o manifest.json. Ver ws_p1_saved no setup-mac.sh.
  if (-not $script:WsHome) { return '' }
  $v = ''
  $p = Join-Path $script:WsHome 'extras-pendentes.tsv'
  if (Test-Path -LiteralPath $p -PathType Leaf) {
    try { foreach ($l in [IO.File]::ReadAllLines($p, $script:Utf8NoBom)) { $f = $l.Split("`t"); if ($f.Count -gt 3 -and $f[0] -ceq 'opcao' -and $f[1] -ceq 'p1') { $v = $f[3] } } } catch { $v = '' }
  }
  $m = Join-Path $script:WsHome 'manifest.json'
  if (-not $v -and (Test-Path -LiteralPath $m -PathType Leaf)) {
    try {
      $j = ([IO.File]::ReadAllText($m, [Text.Encoding]::UTF8)).TrimStart([char]0xFEFF) | ConvertFrom-Json -ErrorAction Stop
      foreach ($x in @($j.extras)) { if ($x -and [string]$x.tipo -ceq 'opcao' -and [string]$x.nome -ceq 'p1') { $v = [string]$x.valor } }
    } catch { $v = '' }
  }
  if ($v -ceq 'canivete' -or $v -ceq 'arena') { return $v }
  return ''
}

function Save-WsP1 {
  # Grava a escolha do Projeto 1 no manifest (so ao instalar, e so nos kits com o Canivete): o -Check le-a.
  if ($script:Mode -ne 'install' -or -not $script:WsHome -or -not $script:KitSrc) { return }
  if (-not (Test-Path -LiteralPath $script:WsHome -PathType Container)) { return }
  if (-not (Test-Path -LiteralPath (Join-Path $script:KitSrc 'installer\assemble-canivete.mjs') -PathType Leaf)) { return }
  Register-WsExtra 'opcao' 'p1' '' $script:P1 ''
}

# A pasta e a marca do Projeto 1 escolhido ($script:P1).
function Get-WsP1Dir { if ($script:P1 -eq 'arena') { return 'demo-project' }; return $script:CaniveteDir }
function Get-WsP1Mark { if ($script:P1 -eq 'arena') { return '.arena-kit.json' }; return '.canivete-kit.json' }

function Set-WsStep9Detail {
  # O detalhe do passo 9 diz qual e o Projeto 1 e onde esta; um WORKSHOP_P1 nao reconhecido fica numa nota.
  if ($script:P1 -eq 'arena') { Set-WsDetail (M 's9_p1_arena' @{ CAMINHO = ($script:ProjShow + '\demo-project') }) }
  else { Set-WsDetail (M 's9_p1_canivete' @{ CAMINHO = ($script:ProjShow + '\' + $script:CaniveteDir) }) }
  if ($script:P1Ignored) { Add-WsNote (M 's9_p1_ignorado' @{ VALOR = $script:P1Ignored }) }
}

function Invoke-WsStep9Migrate {
  $demo = Join-Path $script:Proj 'demo-project'
  if ((Test-Path -LiteralPath (Join-Path $demo '.arena-kit.json')) -and -not (Test-WsGitTag $demo 'refs/tags/arena-start') -and (Test-WsGitTag $demo 'refs/tags/arena-inicial')) {
    $r = Invoke-WsProcess $script:GitExe ((Get-WsGitOwnArgs $demo) + @('tag', 'arena-start', 'arena-inicial')) -TimeoutSec 60
    if ($r.ExitCode -eq 0) { Write-WsLog 'demo-project: tag arena-start added (from arena-inicial)' }
  }
  # Montagem interrompida entre o commit do kit e a tag: com a marca final, so o commit do kit e nada alterado, a
  # Arena e a do kit e ganha a tag (sem ela parecia historico da pessoa, E-DEMO-04).
  $mf = Join-Path $demo '.arena-kit.json'
  $txt = ''
  if (Test-Path -LiteralPath $mf -PathType Leaf) { try { $txt = [IO.File]::ReadAllText($mf) } catch { $txt = '' } }
  if ($txt -and $txt -notmatch '"status"\s*:\s*"incomplete"' -and (Test-Path -LiteralPath (Join-Path $demo '.git')) -and -not (Test-WsGitTag $demo 'refs/tags/arena-start')) {
    $n = Invoke-WsProcess $script:GitExe ((Get-WsGitOwnArgs $demo) + @('rev-list', '--count', 'HEAD')) -TimeoutSec 60
    $st = Invoke-WsProcess $script:GitExe ((Get-WsGitOwnArgs $demo) + @(('--work-tree=' + $demo), 'status', '--porcelain', '--untracked-files=all')) -TimeoutSec 60
    if ($n.ExitCode -eq 0 -and ([string]$n.StdOut).Trim() -eq '1' -and $st.ExitCode -eq 0 -and -not ([string]$st.StdOut).Trim()) {
      $r = Invoke-WsProcess $script:GitExe ((Get-WsGitOwnArgs $demo) + @('tag', 'arena-start', 'HEAD')) -TimeoutSec 60
      if ($r.ExitCode -eq 0) { Write-WsLog 'demo-project: tag arena-start added (interrupted assembly)' }
    }
  }
  $old = Join-Path $script:Proj $script:PracticeDirOld
  $new = Join-Path $script:Proj $script:PracticeDir
  if (-not (Test-Path -LiteralPath $new) -and (Test-Path -LiteralPath (Join-Path $old '.sandbox-kit.json'))) {
    try { Move-Item -LiteralPath $old -Destination $new -ErrorAction Stop; Write-WsLog ('practice project moved: ' + $old + ' -> ' + $new) } catch { Write-WsLog ('practice project not moved: ' + $_.Exception.Message) }
  }
}

function Test-WsStep9 {
  if (-not (Initialize-WsKit)) { Set-WsFail 'E-KIT-01' ''; return $false }
  $demo = Join-Path $script:Proj 'demo-project'
  $sb = Join-Path $script:Proj $script:PracticeDir
  Initialize-WsP1
  # Ao instalar, as migracoes (arena-inicial -> arena-start, a pasta do projeto de treino) vem antes do estado: sem
  # elas uma Arena antiga e intacta parecia historico da pessoa (E-DEMO-04). No -Check, que nao muda nada, a tag
  # antiga conta como a nova (o /demo-reset dessa Arena usa a arena-inicial).
  $arenaRef = 'refs/tags/arena-start'
  if ($script:Mode -eq 'install') { Invoke-WsStep9Migrate }
  elseif ((Test-Path -LiteralPath (Join-Path $demo '.git')) -and -not (Test-WsGitTag $demo $arenaRef)) { $arenaRef = 'refs/tags/arena-inicial' }
  # Um Projeto 1 com historico proprio (commits, sem a tag arena-start ou canivete-start) e um aviso e fica como esta.
  if ($script:P1 -eq 'arena') {
    switch (Get-WsProjState $demo '.arena-kit.json' $arenaRef) {
      'ok' { }
      'propria' { Set-WsWarn 'E-DEMO-04' (Format-WsShowPath $demo) }
      default { Set-WsFail 'E-DEMO-01' $demo; return $false }
    }
  } else {
    $cv = Join-Path $script:Proj $script:CaniveteDir
    switch (Get-WsProjState $cv '.canivete-kit.json' 'refs/tags/canivete-start') {
      'ok' { }
      'propria' { Set-WsWarn 'E-DEMO-06' (Format-WsShowPath $cv) }
      default { Set-WsFail 'E-DEMO-01' $cv; return $false }
    }
  }
  if (Test-Path -LiteralPath (Join-Path $script:KitSrc 'installer\assemble-sandbox.mjs')) {
    if ((Get-WsProjState $sb '.sandbox-kit.json' 'HEAD') -ne 'ok') { Set-WsFail 'E-DEMO-01' $sb; return $false }
  }
  if (Test-Path -LiteralPath (Join-Path $script:KitSrc 'installer\assemble-missions.mjs')) {
    $mp = Join-Path $script:Proj $script:MissionsDir
    if ((Get-WsProjState $mp '.missions-kit.json' 'HEAD') -ne 'ok') { Set-WsFail 'E-DEMO-01' $mp; return $false }
  }
  if ($script:Mode -eq 'install') { $null = Save-WsP1 }
  Set-WsStep9Detail
  Add-WsStep9LangNote
  if ($script:Mode -ne 'install') { return (Test-WsAppTests) }
  return $true
}

function Add-WsStep9LangNote {
  # Os projetos ja montados nao mudam de lingua sozinhos (tem o trabalho da pessoa): se a lingua do kit mudou
  # (WORKSHOP_LANG), diz-se como os ter na lingua nova em vez de um "Already done" calado. Do Projeto 1 so conta o
  # escolhido ($script:P1): uma Arena antiga ao lado do Canivete nao faz parte deste workshop.
  foreach ($p in @(@((Get-WsP1Dir), (Get-WsP1Mark)), @($script:PracticeDir, '.sandbox-kit.json'), @($script:MissionsDir, '.missions-kit.json'))) {
    $f = Join-Path (Join-Path $script:Proj $p[0]) $p[1]
    if (-not (Test-Path -LiteralPath $f)) { continue }
    $l = ''
    try {
      $raw = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
      if ($raw.Trim()) {
        $j = $raw | ConvertFrom-Json
        $l = [string]$j.language
        if (-not $l) { $l = [string]$j.lingua }
      }
    } catch { $l = '' }
    if (($l -cne 'pt' -and $l -cne 'en') -or $l -ceq $script:LangKit) { continue }
    Add-WsNote (M 's9_lingua_diferente' @{ CAMINHO = ($script:ProjShow + '\' + $p[0]); LINGUA = (M ('lingua_' + $l)); KIT = (M ('lingua_' + $script:LangKit)) })
  }
}

# Os testes do Projeto 1 escolhido: os da app da Arena, ou o "node tools/gen.mjs --check" do Canivete (as specs e
# os testes das ferramentas sao os gerados). Os tool.test.js do Canivete nao correm aqui: as ferramentas so existem
# depois do swarm.
function Test-WsAppTests {
  if ($script:P1 -ne 'arena') { return (Test-WsCaniveteCheck) }
  $demo = Join-Path $script:Proj 'demo-project'
  if (-not (Test-Path -LiteralPath (Join-Path $demo 'test\app.test.js'))) { Add-WsNote (M 's9_sem_testes'); return $true }
  $r = Invoke-WsProcess $script:NodeExe @('--test', 'test/app.test.js') -WorkingDirectory $demo -TimeoutSec 300
  $m = [regex]::Matches($r.StdOut, '(?m)^\S*\s*pass\s+([0-9]+)')
  $n = '?'
  if ($m.Count -gt 0) { $n = $m[$m.Count - 1].Groups[1].Value }
  if ($r.ExitCode -eq 0) { Add-WsNote (M 's9_testes_ok' @{ OK = $n }); return $true }
  Set-WsFail 'E-DEMO-02' 'node --test test/app.test.js'
  return $false
}

function Test-WsCaniveteCheck {
  $cv = Join-Path $script:Proj $script:CaniveteDir
  if (-not (Test-Path -LiteralPath (Join-Path $cv 'tools\gen.mjs') -PathType Leaf)) { Add-WsNote (M 's9_sem_gen'); return $true }
  $r = Invoke-WsProcess $script:NodeExe @('tools/gen.mjs', '--check') -WorkingDirectory $cv -TimeoutSec 300
  $n = @(Get-ChildItem -LiteralPath (Join-Path $cv 'tools') -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'spec.md') -PathType Leaf }).Count
  if ($r.ExitCode -eq 0) { Add-WsNote (M 's9_canivete_ok' @{ N = $n }); return $true }
  Set-WsFail 'E-DEMO-05' 'node tools/gen.mjs --check'
  return $false
}

# Monta um projeto conforme o estado (Get-WsProjState). Nunca apaga trabalho da pessoa: o historico proprio fica
# como esta (E-DEMO-04) e uma pasta substituida vai para o backup (o assembler diz onde: "backup" no JSON). O
# --force so vai para uma montagem incompleta (antes ia tambem para uma Arena sem a tag, e apagava os commits, as
# notas e as cartas alteradas da pessoa).
function Invoke-WsAssemble {
  param([string]$Script, [string]$Dest, [string]$Mark, [string]$Ref, [string[]]$Extra)
  $force = @()
  switch (Get-WsProjState $Dest $Mark $Ref) {
    'alheia' { Set-WsFail 'E-DEMO-03' $Dest; return $false }
    'incompleta' { $force = @('--force') }
    'propria' {
      $code = 'E-DEMO-04'
      if ($Mark -eq '.canivete-kit.json') { $code = 'E-DEMO-06' }
      Set-WsWarn $code (Format-WsShowPath $Dest)
      Register-WsExtra 'projeto' (Split-Path $Dest -Leaf) $Dest '' ''
      return $true
    }
    'semgit' { Set-WsFail 'E-DEMO-01' ('git rev-parse HEAD: ' + $Dest); return $false }
  }
  $a = @((Join-Path $script:KitSrc ('installer\' + $Script)), '--dest', $Dest) + $Extra + $force
  $r = Invoke-WsProcess $script:NodeExe $a -TimeoutSec 600
  if ($r.ExitCode -ne 0) {
    # A causa no ecra (ex.: "git commit ... failed: ..." ou "could not move ... (is it open in another program?)").
    $d = $Script
    # -clike: o "error: ..." do proprio git (minusculas, nas linhas a seguir) nao conta, como no sed do Mac.
    $why = @(([string]$r.StdErr -split "`r?`n") | Where-Object { $_ -clike 'ERROR: *' } | Select-Object -Last 1)
    if ($why.Count -gt 0) {
      $w = Protect-WsText (([string]$why[0]).Substring(7).Trim()) $script:Literals
      if ($w.Length -gt 200) { $w = $w.Substring(0, 200) }
      if ($w) { $d = $Script + ': ' + $w }
    }
    Set-WsFail 'E-DEMO-01' $d
    return $false
  }
  $last = [string](@(([string]$r.StdOut).Trim() -split "`r?`n") | Select-Object -Last 1)
  $j = $null
  if ($last -match '^\s*\{') { try { $j = ConvertFrom-Json -InputObject $last -ErrorAction Stop } catch { $j = $null } }
  if ($j -and $j.backup) { Add-WsNote (M 's9_backup' @{ PASTA = (Format-WsShowPath ([string]$j.backup)) }) }
  Register-WsExtra 'projeto' (Split-Path $Dest -Leaf) $Dest '' ''
  return $true
}

# Os projetos do workshop ficam "trusted" no .claude.json (D-34, install-user.mjs confiar), como se a pessoa
# aceitasse o dialogo de confianca: sem isso um "claude -p" ignora as permissions.allow do projeto. Nao bloqueia: um
# .claude.json invalido (o passo 3 ja o trata) ou um kit antigo sem o "confiar" ficam so no log.
function Set-WsProjectTrust {
  Sync-WsExtras
  $iu = Join-Path $script:KitSrc 'installer\install-user.mjs'
  if (-not $script:NodeExe -or -not (Test-Path -LiteralPath $iu)) { return }
  $r = Invoke-WsProcess $script:NodeExe @($iu, 'confiar')
  Write-WsLog ("trust (exit {0}): {1}" -f $r.ExitCode, (($r.StdOut -replace "[`t`r`n]+", ' ').Trim()))
}

function Install-WsStep9 {
  if (-not (Initialize-WsKit)) { Set-WsFail 'E-KIT-01' ''; return $false }
  New-Item -ItemType Directory -Path $script:Proj -Force | Out-Null
  if (-not $script:GitExe) { $script:GitExe = Get-WsGit }
  Invoke-WsStep9Migrate
  Initialize-WsP1
  if ($script:P1 -eq 'arena') {
    if (-not (Invoke-WsAssemble 'assemble-demo.mjs' (Join-Path $script:Proj 'demo-project') '.arena-kit.json' 'refs/tags/arena-start' @('--node', $script:NodeExe, '--language', $script:LangKit))) { return $false }
  } else {
    if (-not (Invoke-WsAssemble 'assemble-canivete.mjs' (Join-Path $script:Proj $script:CaniveteDir) '.canivete-kit.json' 'refs/tags/canivete-start' @('--node', $script:NodeExe, '--language', $script:LangKit))) { return $false }
  }
  $null = Save-WsP1
  if (Test-Path -LiteralPath (Join-Path $script:KitSrc 'installer\assemble-sandbox.mjs')) {
    if (-not (Invoke-WsAssemble 'assemble-sandbox.mjs' (Join-Path $script:Proj $script:PracticeDir) '.sandbox-kit.json' 'HEAD' @('--language', $script:LangKit))) { return $false }
  }
  # As missoes usam o kit instalado (o reporter dos testes, a caderneta): --kit-dir e o %USERPROFILE%\.workshop-claude\kit.
  if (Test-Path -LiteralPath (Join-Path $script:KitSrc 'installer\assemble-missions.mjs')) {
    if (-not (Invoke-WsAssemble 'assemble-missions.mjs' (Join-Path $script:Proj $script:MissionsDir) '.missions-kit.json' 'HEAD' @('--language', $script:LangKit, '--kit-dir', (Join-Path $script:WsHome 'kit')))) { return $false }
  }
  Set-WsProjectTrust
  Set-WsStep9Detail
  Add-WsStep9LangNote
  return (Test-WsAppTests)
}

# =============================================================== PASSO 10 - app Agent Memory (nao bloqueante)
# Desde a v0.5.0 os comandos da app sao "agent-memory" e "agent-memory-gui"; "memoria" e "memoria-gui" ficam como
# sinonimos, e as versoes antigas so tem esses. O servidor MCP regista-se como "agent-memory" (um registo antigo
# "memoria" e substituido). As memorias ficam em ~\.agent-memory (ou ~\.memoria, de versoes antigas; ver
# Get-WsMemoryHome) e o -Uninstall nunca lhes toca.
$script:McpName = 'agent-memory'

function Get-WsWebView2Version {
  $keys = @(
    ('HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\' + $script:WebView2Guid),
    ('HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\' + $script:WebView2Guid),
    ('HKCU:\Software\Microsoft\EdgeUpdate\Clients\' + $script:WebView2Guid)
  )
  foreach ($k in $keys) {
    try {
      $pv = (Get-ItemProperty -Path $k -Name pv -ErrorAction Stop).pv
      if ($pv -and $pv -ne '0.0.0.0') { return $pv }
    } catch { }
  }
  return $null
}

function Get-WsUvBin {
  if (-not $script:UvExe) { $script:UvExe = Get-WsUv }
  if (-not $script:UvExe) { return (Join-Path $script:UserHome '.local\bin') }
  $r = Invoke-WsProcess $script:UvExe @('tool', 'dir', '--bin') -TimeoutSec 60
  $d = $r.StdOut.Trim()
  if ($r.ExitCode -eq 0 -and $d) { return $d }
  return (Join-Path $script:UserHome '.local\bin')
}

function Get-WsShortcutPath {
  return (Join-Path ([Environment]::GetFolderPath('Programs')) 'Agent Memory.lnk')
}

function Get-WsOldShortcutPath {
  # The shortcut of the versions before the rename (the app was called Memoria, with an accent).
  $name = 'Mem' + [char]0x00F3 + 'ria.lnk'
  return (Join-Path ([Environment]::GetFolderPath('Programs')) $name)
}

function Get-WsMemoryExe {
  # agent-memory.exe (v0.5.0 or newer) or memoria.exe (older versions); $null if neither exists.
  param([string]$Bin)
  foreach ($n in @('agent-memory.exe', 'memoria.exe')) {
    $p = Join-Path $Bin $n
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

function Get-WsMemoryHome {
  # The app's data folder (the app's own rule, src/memoria/config.py): AGENT_MEMORY_HOME; else MEMORIA_HOME; else
  # ~\.memoria if it exists (or is a link) and ~\.agent-memory has no notes (see below); else ~\.agent-memory.
  # Nothing is ever moved or deleted.
  # ~ e a pasta do perfil ($script:UserHome), como na app (Path.home() = USERPROFILE), nunca o H:\ do $HOME.
  param([hashtable]$EnvValues = $null, [string]$UserHome = '')
  if (-not $UserHome) { $UserHome = $script:UserHome }
  if (-not $UserHome) { $UserHome = Get-WsUserHome ([Environment]::GetFolderPath('UserProfile')) $env:USERPROFILE $HOME }
  if ($null -eq $EnvValues) { $EnvValues = @{ AGENT_MEMORY_HOME = $env:AGENT_MEMORY_HOME; MEMORIA_HOME = $env:MEMORIA_HOME } }
  $v = Get-WsMemoryHomeEnv $EnvValues $UserHome
  if ($v) { return $v }
  # ~\.memoria (de versoes antigas) continua a ser a pasta se ~\.agent-memory nao existir, ou se nao tiver notas (so
  # o config.json de um setup, ou o .index) e ~\.memoria tiver notas ou for um link partido (pasta na nuvem).
  $new = Join-Path $UserHome '.agent-memory'
  $old = Join-Path $UserHome '.memoria'
  $oldDir = Test-Path -LiteralPath $old -PathType Container
  if ($oldDir -or (Test-WsReparsePoint $old)) {
    if (-not (Test-Path -LiteralPath $new) -or (-not (Test-WsMemoryNotes $new) -and (-not $oldDir -or (Test-WsMemoryNotes $old)))) { return $old }
  }
  return $new
}

function Get-WsMemoryHomeEnv {
  # AGENT_MEMORY_HOME (senao MEMORIA_HOME) sem espacos a volta e absoluta: um ~ no inicio e um caminho relativo
  # contam a partir da pasta do perfil, nunca da pasta onde o setup corre. '' sem nada definido.
  param([hashtable]$EnvValues, [string]$UserHome)
  $v = [string]$EnvValues['AGENT_MEMORY_HOME']
  if (-not $v) { $v = [string]$EnvValues['MEMORIA_HOME'] }
  $v = $v.Trim()
  if (-not $v) { return '' }
  if ($v -eq '~') { $v = $UserHome }
  elseif ($v.StartsWith('~/') -or $v.StartsWith('~\')) { $v = Join-Path $UserHome $v.Substring(2) }
  if (-not [IO.Path]::IsPathRooted($v)) { $v = Join-Path $UserHome $v }
  return $v
}

function Test-WsReparsePoint {
  # Um link (simbolico ou juncao), mesmo partido: o Test-Path segue o link e diz que nao existe.
  param([string]$Path)
  $it = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  return [bool]($it -and ($it.Attributes -band [IO.FileAttributes]::ReparsePoint))
}

function Test-WsMemoryNotes {
  # A pasta tem notas (<pasta que nao comeca por .>\*.md, as que a app mostra)?
  param([string]$Dir)
  try {
    foreach ($d in [IO.Directory]::EnumerateDirectories($Dir)) {
      if ([IO.Path]::GetFileName($d).StartsWith('.')) { continue }
      foreach ($f in [IO.Directory]::EnumerateFiles($d, '*.md')) { if ($f) { return $true } }
    }
  } catch { }
  return $false
}

function Test-WsMemoryHomeNewWindow {
  # O atalho do menu Iniciar (e um terminal novo) recebe as variaveis do Utilizador (HKCU\Environment), senao as da
  # Maquina, e nao as desta janela: com AGENT_MEMORY_HOME/MEMORIA_HOME so nesta janela abria outra pasta (E-MEM-12).
  if (-not ($env:AGENT_MEMORY_HOME -or $env:MEMORIA_HOME)) { return }
  $nw = @{}
  foreach ($k in @('AGENT_MEMORY_HOME', 'MEMORIA_HOME')) {
    $v = Get-WsNewWindowEnv $k
    if ($v) { $nw[$k] = [Environment]::ExpandEnvironmentVariables($v) }
  }
  $cur = (Get-WsMemoryHome).TrimEnd('\', '/')
  $new = (Get-WsMemoryHome $nw).TrimEnd('\', '/')
  if ($cur -ne $new) { Set-WsWarn 'E-MEM-12' ((Format-WsHomePath $cur $script:UserHome) + ' - new window: ' + (Format-WsHomePath $new $script:UserHome)) }
}

function Get-WsNewWindowEnv {
  param([string]$Name)
  $v = [Environment]::GetEnvironmentVariable($Name, 'User')
  if (-not $v) { $v = [Environment]::GetEnvironmentVariable($Name, 'Machine') }
  return [string]$v
}

function Get-WsMemoryWheel {
  # The published wheel for a version, read from SHA256SUMS ("memoria-..." up to v0.4, the new name after it).
  param([string]$SumsFile, [string]$Ver)
  $suffix = '-' + $Ver + '-py3-none-any.whl'
  if ($SumsFile -and (Test-Path -LiteralPath $SumsFile)) {
    foreach ($l in [IO.File]::ReadAllLines($SumsFile)) {
      $m = [regex]::Match($l, '^[0-9a-fA-F]{64}\s+\*?(.+)$')
      if ($m.Success -and $m.Groups[1].Value.Trim().EndsWith($suffix)) { return $m.Groups[1].Value.Trim() }
    }
  }
  return ('memoria' + $suffix)
}

$script:UvBlockEnv = @('UV_PYTHON_DOWNLOADS', 'UV_NO_MANAGED_PYTHON', 'UV_PYTHON_PREFERENCE', 'UV_PYTHON')

function Invoke-WsMemorySelftest {
  # Corre "agent-memory selftest" (em ingles, como o resto do setup) e mostra o Python gerido pelo uv.
  # O resultado vem do codigo de saida (contrato da app desde a v0.3.0). Falha -> aviso E-MEM-05, ou E-MEM-07 com
  # o comando que resolve quando a pasta das memorias nao aceita escrita (reinstalar nao resolve).
  param([string]$Exe, [string]$Ver)
  $r = Invoke-WsProcess $Exe @('selftest') -TimeoutSec 300 -Environment @{ PYTHONUTF8 = '1'; AGENT_MEMORY_LANG = 'en'; MEMORIA_LANG = 'en' }
  $st = Read-WsSelftest $r.StdOut
  # O setup corre a app sem o PYTHONHOME/PYTHONPATH da pessoa (Invoke-WsProcess) e o MCP regista-se sem eles; no
  # terminal dela, "agent-memory" escrito a mao continua a falhar.
  $pyEnv = @()
  foreach ($k in @('PYTHONHOME', 'PYTHONPATH')) { $v = [Environment]::GetEnvironmentVariable($k); if ($v) { $pyEnv += ($k + '=' + $v) } }
  if ($pyEnv.Count -gt 0) { Set-WsWarn 'E-MEM-09' ($pyEnv -join ' ') }
  Test-WsMemoryHomeNewWindow
  if ($r.ExitCode -eq 0) {
    Set-WsDetail (M 's10_ok' @{ VERSAO = $Ver; PY = $st.Python })
    # Outra pasta dos dados com notas que a app nao mostra (uma linha [WARN], que nao faz falhar o selftest): nada
    # se move, so se avisa (E-MEM-11).
    $ign = @([regex]::Matches([string]$r.StdOut, '(?m)^\s*\[WARN\]\s*(.*?memories that are not shown)') | ForEach-Object { $_.Groups[1].Value.Trim() })
    if ($ign.Count -gt 0) { Set-WsWarn 'E-MEM-11' ($ign -join '; ') }
    return $true
  }
  Set-WsDetail (M 's10_ja' @{ VERSAO = $Ver })
  $d = ($st.Falhas -join '; ')
  if (-not $d) { $d = [IO.Path]::GetFileNameWithoutExtension($Exe) + ' selftest (' + $r.ExitCode + ')' }
  if ($script:Blocked -eq $Exe) { Set-WsWarn 'E-PERM-02' $Exe }
  elseif ($d -match 'Cannot write to|readonly database|Permission denied|is denied|Read-only file system|Not a directory|File exists|file when that file already exists|directory name is invalid') {
    Set-WsWarn 'E-MEM-07' $d
    $fix = Get-WsPermFix (Get-WsMemoryHome)
    if ($fix) { Add-WsNote (M 'perm_corrigir' @{ CMD = $fix }) }
  } else { Set-WsWarn 'E-MEM-05' $d }
  return $false
}

function Get-WsMemoryGui {
  # agent-memory-gui.exe (ou memoria-gui.exe), para o atalho; sem ele, o proprio agent-memory.exe.
  param([string]$Bin, [string]$Exe)
  foreach ($n in @('agent-memory-gui.exe', 'memoria-gui.exe')) { $p = Join-Path $Bin $n; if (Test-Path -LiteralPath $p) { return $p } }
  return $Exe
}

function New-WsMemoryShortcut {
  # O atalho "Agent Memory" no menu Iniciar. Falhar aqui (a pasta Programas sem escrita ou numa partilha offline, o
  # WScript.Shell bloqueado por um EDR, AppLocker ou WDAC) e so um aviso, E-MEM-06: o MCP e a app funcionam sem
  # atalho, e o erro fica no log do passo.
  param([string]$Gui)
  try {
    # The old shortcut ("Memoria" with an accent) was ours: it goes.
    $oldLnk = Get-WsOldShortcutPath
    if (Test-Path -LiteralPath $oldLnk) { Remove-Item -LiteralPath $oldLnk -Force -ErrorAction SilentlyContinue }
    $lnk = Get-WsShortcutPath
    $sh = New-Object -ComObject WScript.Shell
    $s = $sh.CreateShortcut($lnk)
    $s.TargetPath = $Gui
    $s.WorkingDirectory = $script:UserHome
    $s.Description = 'Agent Memory (Claude workshop)'
    $s.Save()
    Register-WsExtra 'atalho' 'agent-memory' $lnk '' ''
    return $true
  } catch {
    Add-WsStepLog ('shortcut: ' + $_.Exception.Message)
    $dir = [Environment]::GetFolderPath('Programs')
    if ($lnk) { $dir = Split-Path -Parent $lnk }
    Set-WsWarn 'E-MEM-06' (Format-WsHomePath $dir $script:UserHome)
    return $false
  }
}

function Test-WsStep10 {
  # O MCP vem antes do atalho: e o MCP que o workshop usa, e um atalho que nao se consegue criar nao pode
  # esconder (nem impedir) o registo do MCP.
  $ver = $script:C.MEMORY_APP_VERSION.TrimStart('v')
  $bin = Get-WsUvBin
  $exe = Get-WsMemoryExe $bin
  if (-not $exe) { Set-WsFail 'E-MEM-01' ''; return $false }
  $l = Invoke-WsProcess $script:UvExe @('tool', 'list') -TimeoutSec 60
  if ($l.StdOut -notmatch ('(?m)^(agent-memory|agent_memory|memoria) v?' + [regex]::Escape($ver) + '(\s|$)')) { Set-WsFail 'E-MEM-03' ('version ' + $ver); return $false }
  if ($script:ClaudeExe) {
    # .claude.json sem leitura: o "mcp get" falha como se a app nao estivesse registada (reinstalar nao resolve)
    if (Test-WsPermBlocked @(Get-WsClaudeJson)) { return $false }
    if (-not (Test-WsMemoryMcp $exe)) { Set-WsFail 'E-MEM-03' 'mcp'; return $false }
  }
  # O config.json e o atalho sao extras: ao instalar refazem-se aqui, sem reinstalar a app (que falhava da mesma
  # maneira). No -Check, uma pasta sem escrita (dados ou menu Iniciar) nao se resolve a reinstalar: fica um aviso
  # (o selftest diz o resto); com escrita, falta correr o setup (E-SETUP-01).
  $mh = Get-WsMemoryHome
  if (-not (Test-Path -LiteralPath (Join-Path $mh 'config.json'))) {
    if ($script:Mode -eq 'install') { if (-not (Write-WsMemoryConfig)) { Write-WsLog 'config.json not written: memories folder not writable' } }
    elseif (Test-WsDirWritable $mh) { Set-WsFail 'E-MEM-03' 'config.json'; return $false }
  }
  $lnk = Get-WsShortcutPath
  if (-not (Test-Path -LiteralPath $lnk)) {
    $lnkDir = Split-Path -Parent $lnk
    if ($script:Mode -eq 'install') { [void](New-WsMemoryShortcut (Get-WsMemoryGui $bin $exe)) }
    elseif (Test-WsDirWritable $lnkDir) { Set-WsWarn 'E-SETUP-01' 'shortcut' }
    else { Set-WsWarn 'E-MEM-06' (Format-WsHomePath $lnkDir $script:UserHome) }
  }
  if (-not (Get-WsWebView2Version)) { Set-WsWarn 'E-MEM-04' '' }
  [void](Invoke-WsMemorySelftest $exe $ver)
  return $true
}

function Test-WsMcpCommand {
  # A saida do "claude mcp get" aponta para este programa? A linha "Command:" igual (sem distinguir maiusculas, como
  # os caminhos do Windows; "\\" conta como "\"). Sem essa linha (outro formato), basta o caminho aparecer na saida.
  param([string]$Out, [string]$Exe)
  if (-not $Exe) { return $false }
  $o = ([string]$Out).Replace('\\', '\')
  $c = Get-WsMcpField $o 'Command'
  if ($c) { return ($c -eq $Exe) }
  return ($o.IndexOf($Exe, [StringComparison]::OrdinalIgnoreCase) -ge 0)
}

function Test-WsMemoryMcp {
  # O registo MCP "agent-memory" aponta para este programa? O "claude mcp get" sai com 0 para qualquer registo, mesmo
  # um que aponte para um programa que ja nao existe (ex.: de uma versao antiga ou de outro utilizador). Um registo
  # antigo "memoria" tambem fica por arrumar (o Register-WsMemoryMcp tira-o).
  param([string]$Exe)
  # Lido do .claude.json (sem arrancar um programa antigo): o setup regista no ambito "user".
  $mo = Get-WsMcpUser 'memoria'
  if ($mo) {
    if ($mo.Kind -ne 'nenhum') { return $false }
    $u = Get-WsMcpUser $script:McpName
    if ($u) {
      if (-not ($u.Kind -eq 'cmd' -and $Exe -and $u.Exe -ieq $Exe -and $u.Args -eq 'mcp')) { return $false }
      # Com um PYTHONHOME/PYTHONPATH no terminal, um registo sem as variaveis vazias nao arranca.
      return (-not ($env:PYTHONHOME -or $env:PYTHONPATH) -or (@($u.Env) -contains 'PYTHONHOME'))
    }
  }
  $g = Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', $script:McpName) -TimeoutSec 120
  if ($g.ExitCode -ne 0 -or -not (Test-WsMcpCommand $g.StdOut $Exe)) { return $false }
  # Com um PYTHONHOME/PYTHONPATH no terminal, um registo sem as variaveis vazias nao arranca.
  if (($env:PYTHONHOME -or $env:PYTHONPATH) -and [string]$g.StdOut -notmatch 'PYTHONHOME=') { return $false }
  return ((Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'memoria') -TimeoutSec 120).ExitCode -ne 0)
}

function Install-WsWebView2 {
  if (Get-WsWebView2Version) { return $true }
  $f = Join-Path $script:Tmp 'MicrosoftEdgeWebview2Setup.exe'
  # Opcional (o aviso e E-MEM-04): um bloqueio aqui nao muda o codigo do passo.
  $keep = $script:Blocked
  $ok = Invoke-WsDownload $script:C.WEBVIEW2_URL $f
  if ($ok -and -not (Test-WsSignature $f 'Microsoft')) { Write-WsLog 'WebView2: invalid signature'; $ok = $false }
  if ($ok) { [void](Invoke-WsProcess $f @('/silent', '/install') -TimeoutSec 900) }
  $script:Blocked = $keep
  return ($ok -and [bool](Get-WsWebView2Version))
}

function Install-WsStep10 {
  if ($script:ClaudeExe -and (Test-WsPermBlocked @(Get-WsClaudeJson))) { return $false }
  $ver = $script:C.MEMORY_APP_VERSION.TrimStart('v')
  $d = Join-Path $script:Tmp 'agent-memory'
  Remove-Item -LiteralPath $d -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $d -Force | Out-Null
  if (-not (Invoke-WsDownload (Get-WsReleaseUrl 'memory' 'SHA256SUMS') (Join-Path $d 'SHA256SUMS') -Auth)) {
    if (@(403, 404, 410) -contains $script:DlHttp) { Set-WsFail 'E-MEM-01' $script:C.MEMORY_APP_VERSION } else { Set-WsFail (Get-WsDlCode) (Get-WsDlDetail 'SHA256SUMS') }
    return $false
  }
  $whl = Get-WsMemoryWheel (Join-Path $d 'SHA256SUMS') $ver
  $dist = $whl.Split('-')[0]
  Write-WsActivity (M 'a_descarregar' @{ O_QUE = $whl })
  foreach ($f in @($whl, 'constraints.txt')) {
    $rc = Invoke-WsDownloadChecked (Get-WsReleaseUrl 'memory' $f) (Join-Path $d $f) (Get-WsSumFor (Join-Path $d 'SHA256SUMS') $f) -Auth
    if ($rc -eq 1) {
      if (@(403, 404, 410) -contains $script:DlHttp) { Set-WsFail 'E-MEM-01' $f } else { Set-WsFail (Get-WsDlCode) (Get-WsDlDetail $f) }
      return $false
    }
    if ($rc -eq 2) { Set-WsFail 'E-MEM-02' $f; return $false }
  }
  if (-not (Install-WsWebView2)) { Set-WsWarn 'E-MEM-04' '' }
  Write-WsActivity (M 'a_instalar')
  # O uv traz o seu proprio Python (--managed-python): nao depende de nenhum Python do sistema.
  # As variaveis que o proibiriam sao retiradas so deste processo, nunca globalmente.
  $uvArgs = @('tool', 'install', '--managed-python', '--python', $script:C.PYTHON_VERSION, (Join-Path $d $whl), '--constraints', (Join-Path $d 'constraints.txt'), '--force')
  $uvEnv = @{}
  $r = Invoke-WsProcess $script:UvExe $uvArgs -TimeoutSec 1800 -RemoveEnv $script:UvBlockEnv
  if ($r.ExitCode -ne 0) {
    # As definicoes do uv da pessoa (erro de sintaxe, mirror da empresa sem VPN) antes de tudo: com elas, nenhuma
    # nova tentativa resolve e o E-MEM-03 apontava para o pypi.org.
    $cfgs = @($env:UV_CONFIG_FILE)
    if ($env:APPDATA) { $cfgs += (Join-Path $env:APPDATA 'uv\uv.toml') }
    $uc = Get-WsUvConfigCause ($r.StdOut + "`n" + $r.StdErr) $cfgs ([Environment]::CurrentDirectory)
    if ($uc) { Set-WsFail $uc[0] $uc[1]; return $false }
    # Certificado da empresa: o passo 0 so testa a api.anthropic.com, e um proxy pode inspecionar so o github.com (o
    # Python do uv) ou o pypi.org. Repete com os certificados do Windows (o uv usa os seus por defeito), sem um
    # SSL_CERT_FILE antigo, e, se ainda falhar, com a raiz que o IT deu (ca.pem) mais as do Windows.
    if (($r.StdOut + ' ' + $r.StdErr) -notmatch 'certificate|UnknownIssuer|CERTIFICATE_VERIFY_FAILED|local issuer|self.signed') {
      # O uv apontado para um espelho de pacotes da empresa que nao responde ou nao tem os pacotes (como no Mac).
      $ix = Get-WsUvIndex
      if ($ix) { Set-WsFail 'E-MEM-08' $ix } else { Set-WsFail 'E-MEM-03' 'uv tool install' }
      return $false
    }
    $sslFile = [string]$env:SSL_CERT_FILE
    $uvEnv['UV_SYSTEM_CERTS'] = 'true'
    if (@('true', '1') -notcontains [string]$env:UV_SYSTEM_CERTS -or ($sslFile + $env:SSL_CERT_DIR)) {
      Write-WsLog 'uv: certificate error, retrying with UV_SYSTEM_CERTS=true, without SSL_CERT_FILE/SSL_CERT_DIR'
      $r = Invoke-WsProcess $script:UvExe $uvArgs -TimeoutSec 1800 -RemoveEnv ($script:UvBlockEnv + @('SSL_CERT_FILE', 'SSL_CERT_DIR')) -Environment $uvEnv
    }
    $mine = ''
    if ($script:WsHome) { $mine = Join-Path $script:WsHome 'ca.pem' }
    if ($r.ExitCode -ne 0 -and $mine -and (Test-Path -LiteralPath $mine -PathType Leaf)) {
      $bundle = Join-Path $script:WsHome 'ca-bundle-uv.pem'
      $raws = @()
      foreach ($store in @('Cert:\LocalMachine\Root', 'Cert:\CurrentUser\Root')) {
        try { foreach ($c in (Get-ChildItem -Path $store -ErrorAction Stop)) { $raws += , $c.RawData } } catch { }
      }
      try {
        [IO.File]::WriteAllText($bundle, ((ConvertTo-WsPem $raws) + "`n" + [IO.File]::ReadAllText($mine)), $script:Utf8NoBom)
        Write-WsLog ('uv: certificate error, retrying with SSL_CERT_FILE=' + $bundle)
        $uvEnv['SSL_CERT_FILE'] = $bundle
        $r = Invoke-WsProcess $script:UvExe $uvArgs -TimeoutSec 1800 -RemoveEnv $script:UvBlockEnv -Environment $uvEnv
      } catch { Write-WsLog ('uv: ' + $bundle + ': ' + $_.Exception.Message) }
    }
    if ($r.ExitCode -ne 0) { if ($sslFile) { Set-WsFail 'E-NET-09' ('SSL_CERT_FILE=' + $sslFile) } else { Set-WsFail 'E-NET-10' 'uv: github.com / pypi.org' }; return $false }
    if ($sslFile) { Set-WsWarn 'E-NET-09' ('SSL_CERT_FILE=' + $sslFile) }
  }
  # The distribution changed its name? Take the old one out of uv (only the program: the data stays).
  if ($dist -ne 'memoria') {
    $l = Invoke-WsProcess $script:UvExe @('tool', 'list') -TimeoutSec 60
    if ($l.StdOut -match '(?m)^memoria v?[0-9]') {
      [void](Invoke-WsProcess $script:UvExe @('tool', 'uninstall', 'memoria') -TimeoutSec 300)
      [void](Invoke-WsProcess $script:UvExe $uvArgs -TimeoutSec 1800 -RemoveEnv $script:UvBlockEnv -Environment $uvEnv)
    }
  }
  Register-WsExtra 'app' $dist '' '' ''
  $bin = Get-WsUvBin
  $exe = Get-WsMemoryExe $bin
  if (-not $exe) { Set-WsFail 'E-MEM-03' (Join-Path $bin 'agent-memory.exe'); return $false }
  Add-WsUserPath $bin
  # Primeiro o MCP (e o que o workshop usa), depois a configuracao e o atalho (que so pode dar um aviso).
  if (-not (Register-WsMemoryMcp $exe)) { Set-WsFail 'E-MEM-03' ('claude mcp add ' + $script:McpName); return $false }
  # O config.json e o atalho nao impedem o resto: sem eles a app, o MCP e o selftest continuam.
  if (-not (Write-WsMemoryConfig)) { Write-WsLog 'config.json not written: memories folder not writable' }
  [void](New-WsMemoryShortcut (Get-WsMemoryGui $bin $exe))
  if (Invoke-WsMemorySelftest $exe $ver) {
    $g = Invoke-WsProcess $exe @('selftest', '--gui', '--timeout', '30') -TimeoutSec 120 -Environment @{ PYTHONUTF8 = '1' }
    if ($g.ExitCode -eq 3) { Set-WsWarn 'E-MEM-04' 'selftest --gui' } elseif ($g.ExitCode -ne 0) { Set-WsWarn 'E-MEM-05' 'selftest --gui' }
  }
  Add-WsNote (M 's10_update')
  return $true
}

function Get-WsUvIndex {
  # Espelho de pacotes para o uv (o primeiro definido), sem utilizador nem palavra-passe no URL.
  foreach ($k in @('UV_DEFAULT_INDEX', 'UV_INDEX_URL', 'UV_INDEX', 'UV_EXTRA_INDEX_URL')) {
    $v = [Environment]::GetEnvironmentVariable($k)
    if ($v) { return ($k + '=' + (Format-WsProxyShow $v)) }
  }
  return ''
}

function Get-WsUvConfigCause {
  # As definicoes do uv da pessoa (%APPDATA%\uv\uv.toml ou $env:UV_CONFIG_FILE) partiram o "uv tool install": um erro
  # de sintaxe (ex.: um pip.conf colado) ou um mirror da empresa que nao responde (so na VPN). O setup nunca lhes
  # mexe. Devolve @(codigo, detalhe), ou $null se a causa nao e esse ficheiro. Ver ws_uv_config_cause no Mac.
  param([string]$Text, [string[]]$ConfigFiles, [string]$BaseDir)
  $sep = ' ' + [char]0x00B7 + ' '
  # "error: Failed to parse: `AppData\Roaming\uv\uv.toml`" (relativo a pasta do processo) e, a seguir, a linha.
  $m = [regex]::Matches([string]$Text, '(?m)^error: Failed to parse: `?([^`\r\n]*uv\.toml)`?[ \t]*\r?$')
  if ($m.Count -gt 0) {
    $f = $m[$m.Count - 1].Groups[1].Value
    if (-not [IO.Path]::IsPathRooted($f) -and $BaseDir) { $f = [IO.Path]::Combine($BaseDir, $f) }
    $d = $f
    $l = [regex]::Match([string]$Text, 'TOML parse error at line [0-9]+, column [0-9]+')
    if ($l.Success) { $d += $sep + $l.Value }
    return @('E-UV-03', $d)
  }
  $cfg = $null
  foreach ($c in $ConfigFiles) { if ($c -and (Test-Path -LiteralPath $c -PathType Leaf)) { $cfg = $c; break } }
  if (-not $cfg) { return $null }
  # "Failed to download http://mirror/..." ou "Failed to fetch: `http://mirror/...`": o servidor esta no ficheiro?
  $h = [regex]::Matches([string]$Text, 'Failed to (download|fetch)[: `]+[A-Za-z]+://([^/`: \r\n]+)')
  if ($h.Count -eq 0) { return $null }
  $host0 = $h[$h.Count - 1].Groups[2].Value
  $t = ''
  try { $t = [IO.File]::ReadAllText($cfg) } catch { return $null }
  if ($t.IndexOf($host0, [StringComparison]::OrdinalIgnoreCase) -lt 0) { return $null }
  return @('E-UV-04', ($cfg + $sep + $host0))
}

function Register-WsMemoryMcp {
  # Registers the app's MCP server as "agent-memory" (command "<exe> mcp"). An old "memoria" registration goes,
  # and an "agent-memory" one that points to another program (e.g. an older memoria.exe) is redone.
  param([string]$Exe)
  if (-not $script:ClaudeExe) { return $true }
  # Como no Test-WsMemoryMcp: o .claude.json decide sem o "mcp get" (que arrancava o programa antigo).
  $mo = Get-WsMcpUser 'memoria'
  $u = $null
  if ($mo) {
    if ($mo.Kind -ne 'nenhum') { [void](Invoke-WsProcess $script:ClaudeExe @('mcp', 'remove', '--scope', 'user', 'memoria') -TimeoutSec 120) }
    $u = Get-WsMcpUser $script:McpName
  }
  if ($u) {
    if ($u.Kind -eq 'cmd' -and $u.Exe -ieq $Exe -and $u.Args -eq 'mcp' -and (@($u.Env) -contains 'PYTHONHOME')) { return $true }
    if ($u.Kind -ne 'nenhum') {
      $c = $u.Exe; if (-not $c) { $c = $u.Url }
      if ($c) { Add-WsNote (M 's10_mcp_substituido' @{ ANTIGO = $c }) }
      [void](Invoke-WsProcess $script:ClaudeExe @('mcp', 'remove', '--scope', 'user', $script:McpName) -TimeoutSec 120)
    }
    $m = Invoke-WsProcess $script:ClaudeExe @('mcp', 'add', '--scope', 'user', $script:McpName, '-e', 'PYTHONHOME=', '-e', 'PYTHONPATH=', '-e', 'PYTHONSTARTUP=', '--', $Exe, 'mcp') -TimeoutSec 120
    if ($m.ExitCode -ne 0) { return $false }
    Register-WsExtra 'mcp' $script:McpName '' '' ''
    return $true
  }
  if ((Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'memoria') -TimeoutSec 120).ExitCode -eq 0) {
    [void](Invoke-WsProcess $script:ClaudeExe @('mcp', 'remove', '--scope', 'user', 'memoria') -TimeoutSec 120)
  }
  $cur = Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', $script:McpName) -TimeoutSec 120
  if ($cur.ExitCode -eq 0) {
    # Um registo de uma versao anterior do setup (sem o PYTHONHOME vazio, ver abaixo) e refeito.
    if ((Test-WsMcpCommand $cur.StdOut $Exe) -and ([string]$cur.StdOut -match 'PYTHONHOME=')) { return $true }
    $c = (Get-WsMcpField $cur.StdOut 'Command').Replace('\\', '\')
    if ($c -and -not (Test-WsMcpCommand $cur.StdOut $Exe)) { Add-WsNote (M 's10_mcp_substituido' @{ ANTIGO = $c }) }
    [void](Invoke-WsProcess $script:ClaudeExe @('mcp', 'remove', '--scope', 'user', $script:McpName) -TimeoutSec 120)
  }
  # O Claude Code passa ao servidor o ambiente do terminal: um PYTHONHOME ou PYTHONPATH de um Anaconda antigo partia
  # o Python da app. Vazios, o Python ignora-os. O nome vem antes do -e (o -e aceita varios valores).
  $m = Invoke-WsProcess $script:ClaudeExe @('mcp', 'add', '--scope', 'user', $script:McpName, '-e', 'PYTHONHOME=', '-e', 'PYTHONPATH=', '-e', 'PYTHONSTARTUP=', '--', $Exe, 'mcp') -TimeoutSec 120
  if ($m.ExitCode -ne 0) { return $false }
  Register-WsExtra 'mcp' $script:McpName '' '' ''
  return $true
}

function Write-WsMemoryConfig {
  # <pasta dos dados>\config.json com as chaves que a app usa para se atualizar. Sem escrita na pasta (de outro
  # utilizador, um ficheiro, so de leitura) devolve $false: o erro vai para o log do passo, nunca para o ecra.
  try {
    $dir = Get-WsMemoryHome
    # Um link que nao leva a uma pasta (pasta na nuvem por sincronizar, partilha offline): nunca se cria nada
    # atraves dele (a app passava a usar outra pasta).
    if ((Test-WsReparsePoint $dir) -and -not (Test-Path -LiteralPath $dir -PathType Container)) { Add-WsStepLog ('config.json: ' + $dir + ' is a link that does not lead to a folder (nothing created)'); return $false }
    New-Item -ItemType Directory -Path $dir -Force -ErrorAction Stop | Out-Null
    $f = Join-Path $dir 'config.json'
    $cfg = [ordered]@{}
    if (Test-Path -LiteralPath $f) {
      try { $old = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8) | ConvertFrom-Json; foreach ($p in $old.PSObject.Properties) { $cfg[$p.Name] = $p.Value } } catch { }
    }
    $cfg['MEMORY_APP_REPO_URL'] = $script:C.MEMORY_APP_REPO_URL
    $cfg['RELEASE_DOWNLOAD_URL'] = $script:C.RELEASE_DOWNLOAD_URL
    $cfg['PYTHON_VERSION'] = $script:C.PYTHON_VERSION
    if ($script:UvExe) { $cfg['UV'] = $script:UvExe }
    [IO.File]::WriteAllText($f, (($cfg | ConvertTo-Json) + "`n"), $script:Utf8NoBom)
    return $true
  } catch { Add-WsStepLog ('config.json: ' + $_.Exception.Message); return $false }
}

# =============================================================== PASSO 11 - Claude Desktop (opcional)

function Test-WsStep11 {
  foreach ($p in @((Join-Path $env:LOCALAPPDATA 'AnthropicClaude\claude.exe'), (Join-Path $env:LOCALAPPDATA 'Programs\Claude\Claude.exe'), (Join-Path $env:LOCALAPPDATA 'Programs\claude\Claude.exe'))) {
    if ($p -and (Test-Path -LiteralPath $p)) { Set-WsDetail (M 's11_ja' @{ CAMINHO = $p }); Set-WsWarn 'E-DESK-01' ''; return $true }
  }
  try { if (Get-AppxPackage -Name '*Claude*' -ErrorAction Stop | Where-Object { $_.Publisher -match 'Anthropic' }) { Set-WsDetail (M 's11_ja' @{ CAMINHO = 'MSIX' }); Set-WsWarn 'E-DESK-01' ''; return $true } } catch { }
  if ($script:Mode -ne 'install') { Set-WsFail 'E-DESK-02' '' }
  return $false
}

function Install-WsStep11 {
  if ((Test-WsWinget) -and (Invoke-WsWinget 'Anthropic.Claude')) { if (Test-WsStep11) { return $true } }
  $url = $script:C.DESKTOP_WIN_X64_URL
  if ($script:Arch -eq 'arm64') { $url = $script:C.DESKTOP_WIN_ARM64_URL }
  $f = Join-Path $script:Tmp 'ClaudeSetup.exe'
  if (-not (Invoke-WsDownload $url $f)) { Set-WsFail 'E-DESK-02' (Get-WsDlDetail $url); Set-WsWarn 'E-DESK-01' ''; return $false }
  if (-not (Test-WsSignature $f 'Anthropic')) { Set-WsFail 'E-DESK-02' 'assinatura'; return $false }
  [void](Invoke-WsProcess $f @() -TimeoutSec 1800)
  if (Test-WsStep11) { return $true }
  Set-WsFail 'E-DESK-02' ''
  Set-WsWarn 'E-DESK-01' ''
  return $false
}

# =============================================================== PASSO 12 - teste final

function Read-WsResult {
  param([string]$Json)
  $o = @{ Json = $false; Erro = $true; Resposta = ''; Curta = ''; Custo = (Get-WsCusto $null $script:Pricing); Causa = ''; Comandos = @(); Raw = $null; Turnos = $null; Hook = ''; HookMotivo = '' }
  $j = $null
  try { $j = $Json | ConvertFrom-Json } catch { return $o }
  if (-not $j) { return $o }
  $o.Json = $true; $o.Raw = $j
  $o.Erro = [bool]$j.is_error
  if ($j.PSObject.Properties.Name -contains 'result') { $o.Resposta = [string]$j.result }
  # Para o resumo: so a primeira linha com texto, com no maximo 40 caracteres (o resto fica no log).
  $r1 = ($o.Resposta.Trim() -split '\r?\n')[0].Trim()
  if ($r1.Length -gt 40) { $r1 = $r1.Substring(0, 39) + [string][char]0x2026 }
  $o.Curta = $r1
  # O modelo respondeu? Um hook UserPromptSubmit da pessoa que bloqueia o pedido da exit 0, is_error false e
  # num_turns 0, com o motivo no result ("UserPromptSubmit operation blocked by hook:`n<motivo>...").
  if ($j.PSObject.Properties.Name -contains 'num_turns') { $o.Turnos = [int]$j.num_turns }
  if (-not $o.Turnos -and $o.Resposta -match '^(\w+) operation blocked by hook:[ \t]*\r?\n[ \t]*([^\r\n]*)') {
    $o.Hook = $Matches[1]; $o.HookMotivo = $Matches[2]
    if ($o.HookMotivo.Length -gt 160) { $o.HookMotivo = $o.HookMotivo.Substring(0, 160) }
  }
  $o.Custo = Get-WsCusto $j $script:Pricing
  $so = $null
  if ($j.PSObject.Properties.Name -contains 'structured_output') { $so = $j.structured_output }
  if (-not $so -and $o.Resposta -match '(?s)\{.*\}') { try { $so = $Matches[0] | ConvertFrom-Json } catch { } }
  if ($so) { $o.Causa = [string]$so.causa; $o.Comandos = @($so.comandos) }
  return $o
}

function Test-WsStep12 {
  if ($script:Mode -eq 'install') { return $false }
  return (Install-WsStep12)
}

# Definicoes para os "claude -p" do proprio setup sem os hooks da pessoa (o ajudante e a 2.a tentativa do teste
# final): --settings vale por cima do settings.json, que nao muda. Os hooks de custo do kit tambem nao correm.
$script:NoHooks = '{"disableAllHooks":true}'

function Get-WsUserHooks {
  # Eventos com hooks da pessoa (os do kit nao contam) no settings.json dela e nos da empresa, ex.: "SessionStart".
  $files = @()
  if ($script:ClaudeDir) { $files += (Join-Path $script:ClaudeDir 'settings.json') }
  foreach ($base in @($env:ProgramFiles, $env:ProgramData)) { if ($base) { $files += (Join-Path $base 'ClaudeCode\managed-settings.json') } }
  $out = @()
  foreach ($f in $files) {
    if (-not (Test-Path -LiteralPath $f -PathType Leaf)) { continue }
    try { $j = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8) | ConvertFrom-Json -ErrorAction Stop } catch { continue }
    if (-not $j -or $j.disableAllHooks -eq $true -or -not $j.hooks) { continue }
    foreach ($ev in $j.hooks.PSObject.Properties) {
      foreach ($g in @($ev.Value)) {
        foreach ($h in @($g.hooks)) {
          if ($h -and $h.command -and ([string]$h.command).Replace('\', '/') -notlike '*/.workshop-claude/kit/*' -and $out -notcontains $ev.Name) { $out += $ev.Name }
        }
      }
    }
  }
  return ($out -join ', ')
}

# Limites (segundos) das chamadas ao Claude: sem resposta, o Claude Code tenta outra vez durante minutos.
$script:TmoSmoke = 90
$script:TmoHelper = 90
$script:TmoDoctor = 180

# O modelo do teste final e do ajudante: o id exato com a conta da Anthropic; numa cloud (Bedrock, Vertex, Foundry)
# o alias "haiku", que o Claude Code traduz para o modelo dessa cloud (o id da Anthropic pode nao existir la).
function Get-WsSmokeModel { if ($script:AuthCloud) { return 'haiku' }; return 'claude-haiku-5-5' }

# Numa cloud (Bedrock, Vertex, Foundry) uma falha do teste final quase sempre e o login nessa cloud: diz-se isso, e
# a analise paga (que tambem passaria pela cloud) nao e oferecida.
function Install-WsStep12 {
  if (Invoke-WsStep12Run) { return $true }
  if ($script:AuthCloud) { $c = [string]$script:Auth.Provider; if (-not $c) { $c = 'cloud' }; Add-WsNote (M 's12_cloud' @{ CLOUD = $c }) }
  return $false
}

function Invoke-WsStep12Run {
  if (-not $script:ClaudeExe) { $script:ClaudeExe = Get-WsClaude }
  # Um proxy morto no settings.json (ou, sem nenhum la, no HTTPS_PROXY deste terminal) faz o claude -p tentar em
  # silencio durante uns 3 minutos e acabar num E-NET-05 enganador: falha ja, com a causa.
  $spd = Get-WsSettingsProxyDead
  if ($spd) { Set-WsFail 'E-NET-08' $spd; return $false }
  if ($script:EnvProxyDead -and $env:HTTPS_PROXY -and -not (Get-WsSettingsProxy (Join-Path $script:ClaudeDir 'settings.json'))) { Set-WsFail 'E-NET-03' $script:ProxyShow; return $false }
  $gw = Get-WsGatewayShow $script:GwUrl
  # O gateway da empresa nao respondeu no passo 0: o Claude ficaria minutos a tentar outra vez.
  if ($script:GwDown) { Set-WsFail 'E-AUTH-05' $gw; return $false }
  Write-WsActivity (M 's12_a_testar' @{ SEG = $script:TmoSmoke })
  $t0 = Get-Date
  # Sem servidores MCP (--strict-mcp-config sem --mcp-config): o teste so fala com o modelo e nao espera por MCPs.
  $r = Invoke-WsProcess $script:ClaudeExe @('-p', (M 's12_prompt'), '--model', (Get-WsSmokeModel), '--output-format', 'json', '--tools', '', '--strict-mcp-config') -WorkingDirectory $script:Tmp -TimeoutSec $script:TmoSmoke
  $secs = [int]((Get-Date) - $t0).TotalSeconds
  $o = Read-WsResult $r.StdOut
  Write-WsLog ('final test: exit {0} error {1} turns {2} cost {3}' -f $r.ExitCode, $o.Erro, $o.Turnos, $o.Custo.Texto)
  # Nenhuma resposta do modelo (0 turnos): um hook da pessoa bloqueou o pedido. Todos os pedidos do workshop vao
  # ser bloqueados da mesma maneira, por isso nao conta como feito.
  if ($r.ExitCode -eq 0 -and $o.Json -and -not $o.Erro -and ($o.Hook -or $o.Turnos -eq 0)) {
    if ($o.Hook) { Set-WsFail 'E-SMOKE-05' (Protect-WsText ('{0}: {1}' -f $o.Hook, $o.HookMotivo) $script:Literals) }
    else { Set-WsFail 'E-SMOKE-01' 'no reply from the model (0 turns)' }
    return $false
  }
  if ($r.ExitCode -eq 0 -and $o.Json -and -not $o.Erro) {
    if ($o.Resposta.Trim() -ne $o.Curta) { Write-WsLog ('final test: full reply: ' + (Protect-WsText $o.Resposta $script:Literals)) }
    Set-WsDetail (M 's12_ok' @{ RESPOSTA = $o.Curta; SEG = $secs; USD = $o.Custo.Texto })
    if ($null -eq $o.Custo.Usd) { Add-WsNote (M 's12_custo_desconhecido') }
    return $true
  }
  if ($r.ExitCode -eq -2) {
    # Um hook da pessoa (ex.: um SessionStart que atualiza um repositorio que so se ve na VPN) prende o Claude antes
    # do pedido: tenta-se uma vez sem os hooks dela. Se assim responder, o login e a rede estao bem e a causa e o hook.
    $hk = Get-WsUserHooks
    if (-not $gw -and $hk) {
      Write-WsLog ('final test: no answer in {0} s with the hooks of the settings ({1}): once more without them' -f $script:TmoSmoke, $hk)
      Write-WsActivity (M 's12_sem_hooks' @{ HOOKS = $hk }) -Keep
      $r = Invoke-WsProcess $script:ClaudeExe @('-p', (M 's12_prompt'), '--model', (Get-WsSmokeModel), '--output-format', 'json', '--tools', '', '--strict-mcp-config', '--settings', $script:NoHooks) -WorkingDirectory $script:Tmp -TimeoutSec $script:TmoSmoke
      $o = Read-WsResult $r.StdOut
      Write-WsLog ('final test without the hooks: exit {0} error {1} cost {2}' -f $r.ExitCode, $o.Erro, $o.Custo.Texto)
      if ($r.ExitCode -eq 0 -and $o.Json -and -not $o.Erro) {
        Set-WsFail 'E-SMOKE-06' ('{0} {1} {2}' -f $hk, [char]0x00B7, (Join-Path $script:ClaudeDir 'settings.json')); return $false
      }
    }
    if ($gw) { Set-WsFail 'E-AUTH-05' $gw } else { Set-WsFail 'E-SMOKE-01' ('no answer in {0} s' -f $script:TmoSmoke) }
    return $false
  }
  $all = $r.StdErr + ' ' + $o.Resposta
  if ($all -match 'credit balance|billing') { Set-WsFail 'E-SMOKE-02' '' }
  elseif ($all -match '429|rate_limit|[Rr]ate limit') { Set-WsFail 'E-SMOKE-03' '' }
  elseif ($all -match 'not_found_error|[Ii]nvalid model|model:') { Set-WsFail 'E-SMOKE-04' (Get-WsSmokeModel) }
  elseif ($all -match 'certificate|CERT_|SELF_SIGNED') { Set-WsFail 'E-NET-04' '' }
  elseif ($all -match 'ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|fetch failed|[Uu]nable to connect') {
    # Com ANTHROPIC_BASE_URL o Claude nem fala com o api.anthropic.com: o que falha e o gateway.
    if ($gw) { Set-WsFail 'E-AUTH-05' $gw } else { Set-WsFail 'E-NET-05' '' }
  }
  elseif ($all -match '[Nn]ot logged in|/login|authentication_error|[Ii]nvalid API key|[Ii]nvalid auth token|[Ii]nvalid bearer|[Ff]ailed to authenticate') {
    # Uma chave nas variaveis (ou um apiKeyHelper) passa a frente do login: voltar a fazer login nao resolve.
    # O Claude herda o ambiente deste processo: so esse e o "env" das definicoes contam. So os nomes, nunca os valores.
    $keys = Get-WsEnvKeys
    $src = [string]$script:Auth.Source
    if (-not $keys -and $src -and @('none', '/login managed key') -notcontains $src) { $keys = $src }
    if ($keys) { Set-WsFail 'E-AUTH-04' $keys } else { Set-WsFail 'E-AUTH-01' '' }
  }
  else { Set-WsFail 'E-SMOKE-01' ('exit ' + $r.ExitCode) }
  return $false
}

# =============================================================== ajudante Claude

function Get-WsVersionsLine {
  $nv = '?'
  if ($script:NodeExe) { $nv = (Invoke-WsProcess $script:NodeExe @('-v')).StdOut.Trim() }
  return ('SO: {0}; git {1}; Claude Code {2}; Node {3}; uv {4}; gh {5}; kit {6}' -f $script:OsText, $script:GitVer, $script:ClaudeVer, $nv, $script:UvVer, $script:GhVer, $script:C.WORKSHOP_VERSION)
}

function Invoke-WsClaudeHelper {
  # Com limite de tempo e sem servidores MCP (--strict-mcp-config), como o teste final, e sem os hooks da pessoa
  # (um SessionStart preso ou um UserPromptSubmit que bloqueia nao o deixavam responder). Com o gateway da empresa
  # em baixo (passo 0) nem tenta: esperaria minutos.
  param([string]$Prompt, [string]$Schema, [int]$TimeoutSec = $script:TmoHelper)
  if ($script:GwDown) { return $null }
  if ($TimeoutSec -le 0) { $TimeoutSec = 90 }
  $a = @('-p', '--model', (Get-WsSmokeModel), '--tools', '', '--strict-mcp-config', '--settings', $script:NoHooks, '--disallowedTools', 'mcp__*', '--output-format', 'json')
  if ($Schema) { $a += @('--json-schema', $Schema) }
  $r = Invoke-WsProcess $script:ClaudeExe $a -StdinText $Prompt -WorkingDirectory $script:Tmp -TimeoutSec $TimeoutSec
  if ($r.ExitCode -ne 0) { return $null }
  return (Read-WsResult $r.StdOut)
}

function Invoke-WsHelper {
  # Depois de um passo falhar: oferece a analise do Claude. Devolve $true se valer a pena repetir o passo.
  param([string]$N)
  if (-not $script:AuthOk) { return $false }
  if ($script:GwDown) { return $false }
  $code = $script:T[$N].Falha[0]
  if ($script:AuthCloud -and $N -eq '12') { return $false }
  # Rede, login, Group Policy e antivirus: o Claude nao resolve nada disso a partir daqui. O GitHub sem resposta
  # (E-GH-03) ja tem a causa certa e, sem login no GitHub (E-GH-02), o setup ja mostra o comando: a analise so custaria dinheiro.
  # Um hook da pessoa (E-SMOKE-05/06) ja tem a causa e o ficheiro no ecra.
  if ($code -like 'E-NET-*' -or $code -like 'E-AUTH-*' -or $code -eq 'E-SO-07' -or $code -eq 'E-PERM-02' -or $code -eq 'E-GH-02' -or $code -eq 'E-GH-03' -or $code -eq 'E-SMOKE-05' -or $code -eq 'E-SMOKE-06') { return $false }
  Write-WsSay ''
  if (-not (Read-WsYesNo (M 'helper_pergunta') $true)) { return $false }
  Write-WsSay ('  ' + (M 'helper_a_pedir'))
  # As linhas "[claude-code:...]" sao do proprio Claude Code (stderr) e levavam o diagnostico a inventar problemas.
  $excerpt = Protect-WsText ((@($script:StepLog.ToString() -split "`n" | Where-Object { $_ -notmatch '^\[claude-code:' }) | Select-Object -Last 80) -join "`n") $script:Literals
  $prompt = "You are a technical support assistant for the setup of a Claude Code workshop.`n" +
    "Answer in plain English, with short sentences, for someone with no experience.`n" +
    "Give the likely cause in 1 to 3 sentences and up to 4 PowerShell commands (Windows) the person can run to fix it.`n" +
    "Never suggest commands as administrator or destructive commands, and never ask for or show API keys. If you are not sure, do not suggest commands.`n`n" +
    ('Failed step: {0} ({1})' -f $N, $script:Titles[$N]) + "`nCode: $code`n" + (Get-WsVersionsLine) + "`n`nLog excerpt (no secrets):`n" + $excerpt
  $o = Invoke-WsClaudeHelper $prompt $script:HelperSchema
  if (-not $o -or -not $o.Causa) { Write-WsSay ('  ' + (M 'helper_falhou')); return $false }
  Write-WsLog ('helper: cost ' + $o.Custo.Texto)
  Write-WsSay ('  ' + (M 'helper_causa') + ' ' + $o.Causa) 'White'
  Write-WsSay ('  ' + (M 'helper_custo' @{ USD = $o.Custo.Texto })) 'DarkGray'
  if ($o.Comandos.Count -eq 0) { Write-WsSay ('  ' + (M 'helper_sem_comandos')); return $false }
  Write-WsSay ('  ' + (M 'helper_comandos'))
  if ($script:Sim) { Write-WsSay ('  ' + (M 'helper_sim')) }
  $ran = $false
  foreach ($cmd in $o.Comandos) {
    if (-not $cmd) { continue }
    Write-WsSay ('    PS> ' + $cmd) 'Cyan'
    if (Read-WsYesNo (M 'helper_correr') $false -NeverSim) {
      Write-WsLog ('helper: runs ' + $cmd)
      Clear-WsTypeAhead
      try { $out = Invoke-Expression $cmd 2>&1 | Out-String; Write-Host $out; Add-WsStepLog $out } catch { Write-WsSay $_.Exception.Message 'Red' }
      $ran = $true
    }
  }
  return $ran
}

function Invoke-WsDoctor {
  Write-WsSay ''
  Write-WsSay (M 'doctor_titulo') 'White'
  $any = $false
  foreach ($n in $script:T.Keys) { if (@('falta', 'falhou', 'naoexec', 'aviso') -contains $script:T[$n].Estado) { $any = $true } }
  if (-not $any) { Write-WsSay ('  ' + (M 'doctor_sem_falhas')); return }
  if (-not $script:AuthOk -or -not $script:NetApiOk -or $script:GwDown) { Write-WsSay ('  ' + (M 'doctor_sem_claude')); return }
  $lines = @()
  foreach ($n in $script:T.Keys) {
    $s = $script:T[$n]
    $f = ''; if ($s.Falha) { $f = $s.Falha -join ' ' }
    $w = ($s.Avisos | ForEach-Object { $_ -join ' ' }) -join '; '
    $lines += ('Step {0} ({1}): {2} {3} {4}' -f $n, $script:Titles[$n], $s.Estado, $f, $w)
  }
  # A causa de uma falha esta na saida da instalacao que falhou, que pode ser de uma execucao anterior (o -Doctor nao
  # instala) e ficar muito antes das ultimas 120 linhas. As linhas "[claude-code:...]" (stderr do proprio Claude
  # Code) ficam de fora: levavam o diagnostico a inventar um problema.
  $all = @()
  try { $all = @(Get-Content -LiteralPath $script:LogFile -Encoding UTF8 -ErrorAction Stop) } catch { $all = @() }
  $blocks = @()
  foreach ($n in $script:T.Keys) {
    if (@('falta', 'falhou', 'naoexec', 'aviso') -notcontains $script:T[$n].Estado) { continue }
    $b = @(Get-WsLastStepOutput $n $all | Where-Object { $_ -notmatch '^\[claude-code:' } | Select-Object -Last 30)
    if ($b.Count -gt 0) { $blocks += ('--- step {0} ({1}) ---' -f $n, $script:Titles[$n]); $blocks += $b }
  }
  $prev = Protect-WsText ($blocks -join "`n") $script:Literals
  $tail = Protect-WsText ((@($all | Select-Object -Last 120) | Where-Object { $_ -notmatch '^\[claude-code:' }) -join "`n") $script:Literals
  $prompt = "You are a support assistant for the setup of a Claude Code workshop (Windows). Answer in plain English, short sentences, for someone with no experience.`n" +
    "Make a full diagnosis: what is wrong, why, and the exact steps (with PowerShell commands) in order. Never suggest commands as administrator or showing API keys.`n" +
    "You cannot use tools, run commands or read files: answer now, only from the information below.`n`n" +
    (Get-WsVersionsLine) + "`n`n" + ($lines -join "`n") +
    "`n`nLast recorded install output of each step with a problem (it may come from an earlier run):`n" + $prev +
    "`n`nLog excerpt:`n" + $tail
  $o = Invoke-WsClaudeHelper $prompt '' -TimeoutSec $script:TmoDoctor
  if ($o -and $o.Resposta) { Write-WsSay $o.Resposta; Write-WsSay ('  ' + (M 'doctor_custo' @{ USD = $o.Custo.Texto })) 'DarkGray'; Write-WsLog ('doctor: cost ' + $o.Custo.Texto) }
  else { Write-WsSay ('  ' + (M 'helper_falhou')) }
}

# =============================================================== resumo

function Write-WsSummary {
  $sum = Get-WsSummary $script:T $script:Titles
  $lines = @()
  $lines += ('{0} - {1} - {2}' -f (M 'resumo'), (Get-Date -Format 'yyyy-MM-dd HH:mm'), $script:OsText)
  $lines += ('{0} {1} {2} {3}' -f (M 'resumo_cab_passo').PadRight(5), ''.PadRight(36), (M 'resumo_cab_estado').PadRight(22), (M 'resumo_cab_detalhe'))
  foreach ($n in $script:T.Keys) {
    $s = $script:T[$n]
    $lines += ('{0} {1} {2} {3} {4}' -f $n.PadRight(5), ([string]$script:Titles[$n]).PadRight(36), (Get-WsSymbol $s.Estado $script:Emoji).PadRight(7), (Get-WsStateLabel $s.Estado).PadRight(16), $s.Detalhe)
  }
  $lines += ''
  if ($sum.Faltam -eq 0) {
    if ($script:Mode -eq 'install') { $lines += (M 'final_pronto') } else { $lines += (M 'final_check_ok') }
  } else {
    if ($sum.Faltam -eq 1) { $lines += (M 'final_falta1' @{ LISTA = $sum.Lista }) } else { $lines += (M 'final_faltam' @{ N = $sum.Faltam; LISTA = $sum.Lista }) }
    $lines += (M 'final_voltar')
  }
  # Os avisos contam-se sempre, tambem quando falta algum passo.
  if ($sum.Avisos -eq 1) { $lines += (M 'final_aviso1') }
  elseif ($sum.Avisos -gt 1) { $lines += (M 'final_avisos' @{ N = $sum.Avisos }) }
  if ($script:Ui -eq 'plain') {
    Write-WsSay ''
    Write-WsSay ('-' * 64)
    foreach ($l in $lines) { Write-WsSay $l }
    if ($script:Mode -eq 'install') { Write-WsSay (M 'final_reiniciar') }
    if ($script:TodoMcp) { Write-WsSay (M 's7_oauth') }
    Write-WsSay (M 'final_ficheiros' @{ RESUMO = $script:Resumo; LOG = $script:LogFile }) 'DarkGray'
  } else { Write-WsSummaryCard $sum }
  try {
    [IO.File]::WriteAllText($script:Resumo, (($lines -join "`r`n") + "`r`n"), $script:Utf8NoBom)
    Remove-Item -LiteralPath (Join-Path $script:WsHome 'resumo.txt') -Force -ErrorAction SilentlyContinue   # the summary's old name
  } catch { }
  return $sum.Faltam
}

function Write-WsSummaryCard {
  # O resumo no fancy e no ascii: um cartao ("Summary - data - sistema" e as contagens), a mesma tabela (passo, estado,
  # detalhe) e as frases do fim, cada uma com o seu simbolo. O summary.txt e o mesmo do plain.
  param($Sum)
  $u = ($script:Ui -eq 'fancy')
  $ok = Get-WsSymbol 'feito' $u; $warn = Get-WsSymbol 'aviso' $u; $fail = Get-WsSymbol 'falhou' $u
  $arrow = '->'
  if ($u) { $arrow = $script:G.Arrow }
  $dot = ' - '
  if ($u) { $dot = ' ' + $script:G.Dot + ' ' }
  $prontos = 0
  foreach ($n in $script:T.Keys) { if (@('feito', 'ok', 'ja') -contains $script:T[$n].Estado) { $prontos++ } }
  $count = $ok + ' ' + (M 'resumo_prontos' @{ N = $prontos })
  if ($Sum.Avisos -gt 0) { $count += '   ' + $warn + ' ' + (M 'resumo_com_avisos' @{ N = $Sum.Avisos }) }
  if ($Sum.Faltam -gt 0) { $count += '   ' + $fail + ' ' + (M 'resumo_por_fazer' @{ N = $Sum.Faltam }) }
  Write-WsSay ''
  Write-WsCard @(@(((M 'resumo') + $dot + (Get-Date -Format 'yyyy-MM-dd HH:mm') + $dot + $script:OsText), 'White'), @($count, $null))
  Write-WsSay ('  ' + (M 'resumo_cab_passo').PadRight(24) + (M 'resumo_cab_estado').PadRight(21) + (M 'resumo_cab_detalhe')) 'DarkGray'
  foreach ($n in $script:T.Keys) {
    $s = $script:T[$n]
    $g = Get-WsSymbol $s.Estado $u
    Write-WsParts @(@(('  ' + $n.PadRight(4)), 'DarkGray'), @((Get-WsStepName $n).PadRight(20), $null), @($g, (Get-WsStateColor $s.Estado)), @((' ' + (Get-WsStateLabel $s.Estado).PadRight(20 - $g.Length) + $s.Detalhe), $null))
  }
  Write-WsSay ''
  if ($Sum.Faltam -eq 0) {
    $t = (M 'final_pronto')
    if ($script:Mode -ne 'install') { $t = (M 'final_check_ok') }
    Write-WsParts @(@('  ', $null), @($ok, 'Green'), @((' ' + $t), 'Green'))
  } else {
    $t = (M 'final_faltam' @{ N = $Sum.Faltam; LISTA = $Sum.Lista })
    if ($Sum.Faltam -eq 1) { $t = (M 'final_falta1' @{ LISTA = $Sum.Lista }) }
    Write-WsParts @(@('  ', $null), @($fail, 'Red'), @((' ' + $t), 'White'))
    Write-WsParts @(@('  ', $null), @($arrow, 'DarkCyan'), @((' ' + (M 'final_voltar')), $null))
  }
  if ($Sum.Avisos -eq 1) { Write-WsParts @(@('  ', $null), @($warn, 'Yellow'), @((' ' + (M 'final_aviso1')), $null)) }
  elseif ($Sum.Avisos -gt 1) { Write-WsParts @(@('  ', $null), @($warn, 'Yellow'), @((' ' + (M 'final_avisos' @{ N = $Sum.Avisos })), $null)) }
  if ($script:Mode -eq 'install') { Write-WsParts @(@('  ', $null), @($arrow, 'DarkCyan'), @((' ' + (M 'final_reiniciar')), $null)) }
  if ($script:TodoMcp) { Write-WsParts @(@('  ', $null), @($arrow, 'DarkCyan'), @((' ' + (M 's7_oauth')), $null)) }
  Write-WsSay ('  ' + (M 'final_ficheiros' @{ RESUMO = $script:Resumo; LOG = $script:LogFile })) 'DarkGray'
}

# =============================================================== desinstalar

function Invoke-WsUninstall {
  $man = Join-Path $script:WsHome 'manifest.json'
  if (-not (Test-Path -LiteralPath $man)) { Write-WsSay (M 'desinst_sem_manifest' @{ MANIFEST = $man }); return 0 }
  $script:Cur = '4'
  [void](Test-WsStep4)
  if (-not $script:NodeExe) {
    try { $script:NodeExe = ([IO.File]::ReadAllText($man, [Text.Encoding]::UTF8) | ConvertFrom-Json).node } catch { }
  }
  if (-not $script:NodeExe -or -not (Test-Path -LiteralPath $script:NodeExe)) { Write-WsCode 'E-NODE-01' '' '  '; return 1 }
  [void](Initialize-WsKit)
  $iu = ''
  if ($script:KitSrc) { $iu = Join-Path $script:KitSrc 'installer\install-user.mjs' }
  if (-not $iu -or -not (Test-Path -LiteralPath $iu)) { Write-WsCode 'E-KIT-01' '' '  '; return 1 }
  $script:ClaudeExe = Get-WsClaude
  # O uv do workshop (Test-WsStep5), mesmo com um antigo primeiro no PATH; sem nenhum bom, o melhor que houver.
  $script:Cur = '5'
  [void](Test-WsStep5)
  if (-not $script:UvExe) { $script:UvExe = Get-WsUv }
  $ex = Invoke-WsProcess $script:NodeExe @($iu, 'extras')
  foreach ($l in ($ex.StdOut -split "`r?`n")) {
    if (-not $l) { continue }
    $f = $l.Split("`t")
    while ($f.Count -lt 5) { $f += '' }
    switch ($f[0]) {
      'mcp' { if ($script:ClaudeExe -and (Invoke-WsProcess $script:ClaudeExe @('mcp', 'remove', '--scope', 'user', $f[1])).ExitCode -eq 0) { Write-WsSay ('  ' + (M 'desinst_mcp' @{ NOME = $f[1] })) } }
      'app' {
        $app = $f[1]
        if (-not $app) { $app = 'memoria' }
        if ($script:UvExe -and (Invoke-WsProcess $script:UvExe @('tool', 'uninstall', $app)).ExitCode -eq 0) { Write-WsSay ('  ' + (M 'desinst_app')); Write-WsSay ('  ' + (M 'desinst_memorias' @{ CAMINHO = (Get-WsMemoryHome) })) }
      }
      'atalho' { if ($f[2] -and (Test-Path -LiteralPath $f[2])) { Remove-Item -LiteralPath $f[2] -Force; Write-WsSay ('  ' + (M 'desinst_atalho' @{ CAMINHO = $f[2] })) } }
      'env_utilizador' {
        if ((Get-WsUserEnvRaw $f[1]) -eq $f[3]) {
          if ($f[4]) { [Environment]::SetEnvironmentVariable($f[1], $f[4], 'User') } else { [Environment]::SetEnvironmentVariable($f[1], $null, 'User') }
        }
      }
      'path_utilizador' {
        $cur = Get-WsUserEnvRaw 'Path'
        $new = Remove-WsPathEntry $cur $f[1]
        if ($new -ne $cur) { New-ItemProperty -Path 'HKCU:\Environment' -Name 'Path' -Value $new -PropertyType ExpandString -Force | Out-Null; Write-WsSay ('  ' + (M 'desinst_perfil' @{ FICHEIRO = ('PATH: ' + $f[1]) })) }
      }
      'gitconfig' {
        $g = Get-WsGit
        if ($g) { if ($f[4]) { [void](Invoke-WsProcess $g @('config', '--global', $f[1], $f[4])) } else { [void](Invoke-WsProcess $g @('config', '--global', '--unset', $f[1])) } }
      }
    }
  }
  Send-WsEnvChanged
  $r = Invoke-WsProcess $script:NodeExe @($iu, 'desinstalar')
  foreach ($kv in (ConvertFrom-WsTsv $r.StdOut)) {
    switch ($kv[0]) {
      'settings' { if ($kv[1] -eq 'reposto') { Write-WsSay ('  ' + (M 'desinst_settings_reposto')) } elseif ($kv[1] -eq 'limpo') { Write-WsSay ('  ' + (M 'desinst_settings_limpo')) } }
      'projeto_removido' { Write-WsSay ('  ' + (M 'desinst_projeto_removido' @{ CAMINHO = $kv[1] })) }
      'projeto_mantido' { Write-WsSay ('  ' + (M 'desinst_projeto_mantido' @{ CAMINHO = $kv[1] })) }
      'editado' { Write-WsSay ('  ' + (M 'desinst_editado' @{ NOME = (Split-Path ($kv[1] -replace '/', '\') -Leaf); PASTA = (Format-WsShowPath $kv[1]) })) }
      'anteriores' { Write-WsSay ('  ' + (M 's8_anteriores' @{ PASTA = (Format-WsShowPath $kv[1]) })) }
      'erro' { Write-WsSay ('  ' + $kv[1]) 'Red' }
    }
  }
  # O codigo de saida do desinstalar conta: com o settings.json por repor, o resto fica (kit-src incluido, para repetir).
  if ($r.ExitCode -ne 0) {
    Write-WsLog ('install-user desinstalar: saida ' + $r.ExitCode)
    Write-WsSay ''
    Write-WsSay (M 'desinst_incompleto' @{ LOG = $script:LogFile }) 'Red'
    return 1
  }
  Remove-Item -LiteralPath (Join-Path $script:WsHome 'kit-src') -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath (Join-Path $script:WsHome 'extras-pendentes.tsv') -Force -ErrorAction SilentlyContinue
  Write-WsSay ''
  Write-WsSay (M 'desinst_fim' @{ BACKUP = (Join-Path $script:WsHome 'backup') })
  return 0
}

# =============================================================== limpar (-Cleanup, D-34)

function Write-WsCleanupLines {
  # As linhas do install-user limpar: removido <caminho> <tipo> - backup <caminho> <destino> <tipo> - mantido
  # <caminho> - nada 1 - erro <texto> (tipo: projeto, telemetria ou memoria). -Done: depois de limpar (o que foi
  # feito); sem ele, a lista do --dry-run (o que vai fazer). Ver ws_limpar_show no setup-mac.sh.
  param([string]$Text, [switch]$Done)
  foreach ($l in ([string]$Text -split "`r?`n")) {
    if (-not $l) { continue }
    $f = $l.Split("`t")
    while ($f.Count -lt 4) { $f += '' }
    $c = Format-WsShowPath ($f[1] -replace '/', '\')
    switch ($f[0]) {
      'removido' {
        if ($Done) { Write-WsSay ('  ' + (M 'limpar_removido' @{ CAMINHO = $c })) }
        else { $k = 'limpar_apagar'; if ($f[2] -eq 'telemetria') { $k = 'limpar_apagar_tel' }; Write-WsSay ('  - ' + (M $k @{ CAMINHO = $c })) }
      }
      'backup' {
        if ($Done) { Write-WsSay ('  ' + (M 'limpar_backup' @{ CAMINHO = $c; DESTINO = (Format-WsShowPath ($f[2] -replace '/', '\')) })) }
        else { $k = 'limpar_mover'; if ($f[3] -eq 'memoria') { $k = 'limpar_mover_mem' }; Write-WsSay ('  - ' + (M $k @{ CAMINHO = $c })) }
      }
      'mantido' { if (-not $Done) { Write-WsSay ('  - ' + (M 'limpar_mantido' @{ CAMINHO = $c })) } }
      'erro' { Write-WsSay ('  ' + $f[1]) 'Red' }
    }
  }
}

function Invoke-WsCleanup {
  # Tira os dados do workshop e deixa o projeto do Projeto 2 e as ferramentas: a logica e a do install-user limpar
  # (igual no Mac). Primeiro a lista (--dry-run), depois a confirmacao (y/N; -Yes responde sim), depois a serio.
  $man = Join-Path $script:WsHome 'manifest.json'
  $script:Cur = '4'
  [void](Test-WsStep4)
  if (-not $script:NodeExe -and (Test-Path -LiteralPath $man)) {
    try { $script:NodeExe = ([IO.File]::ReadAllText($man, [Text.Encoding]::UTF8) | ConvertFrom-Json).node } catch { }
  }
  if (-not $script:NodeExe -or -not (Test-Path -LiteralPath $script:NodeExe)) { Write-WsCode 'E-NODE-01' '' '  '; return 1 }
  [void](Initialize-WsKit)
  $iu = ''
  if ($script:KitSrc) { $iu = Join-Path $script:KitSrc 'installer\install-user.mjs' }
  if (-not $iu -or -not (Test-Path -LiteralPath $iu)) { Write-WsCode 'E-KIT-01' '' '  '; return 1 }
  $r = Invoke-WsProcess $script:NodeExe @($iu, 'limpar', '--dry-run', '--projects-dir', $script:Proj)
  Write-WsLog ([string]$r.StdOut)
  if ($r.ExitCode -ne 0) { Write-WsSay ''; Write-WsSay (M 'limpar_incompleto' @{ LOG = $script:LogFile }) 'Red'; return 1 }
  if ([string]$r.StdOut -match "(?m)^nada`t") {
    Write-WsCleanupLines $r.StdOut
    Write-WsSay ''; Write-WsSay (M 'limpar_nada'); return 0
  }
  Write-WsSay ''
  Write-WsSay (M 'limpar_lista')
  Write-WsCleanupLines $r.StdOut
  Write-WsSay ''
  if (-not (Read-WsYesNo (M 'limpar_pergunta') $false)) { Write-WsSay ''; Write-WsSay (M 'limpar_cancelado'); return 0 }
  $r = Invoke-WsProcess $script:NodeExe @($iu, 'limpar', '--projects-dir', $script:Proj)
  Write-WsLog ([string]$r.StdOut)
  Write-WsSay ''
  Write-WsCleanupLines $r.StdOut -Done
  Write-WsSay ''
  if ($r.ExitCode -ne 0) { Write-WsSay (M 'limpar_incompleto' @{ LOG = $script:LogFile }) 'Red'; return 1 }
  $cmd = 'powershell -NoProfile -ExecutionPolicy Bypass -File "' + (Format-WsShowPath (Join-Path $script:WsHome 'setup-windows.ps1')) + '"'
  Write-WsSay (M 'limpar_fim' @{ BACKUP = (Format-WsShowPath (Join-Path $script:WsHome 'backup')); CMD = $cmd })
  return 0
}

# =============================================================== arranque

function Get-WsB64Text { param([string]$B64) return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($B64)) }

function Initialize-WsConfig {
  # Modo release (valores injetados) ou modo dev (a correr de um clone do repositorio).
  $script:Dev = $false
  $envMap = @{}
  foreach ($e in (Get-ChildItem Env:)) { $envMap[$e.Name] = $e.Value }
  $injConf = Get-Variable -Name WsInjConfB64 -Scope Script -ErrorAction SilentlyContinue
  if ($injConf -and $injConf.Value) {
    $script:C = ConvertFrom-WsConf (Get-WsB64Text $script:WsInjConfB64) $envMap
    $script:Pricing = (Get-WsB64Text $script:WsInjPricingB64) | ConvertFrom-Json
    $script:Msgs = (Get-WsB64Text $script:WsInjMessagesB64) | ConvertFrom-Json
    $script:InjKitSha = $script:WsInjKitSha256
    return $true
  }
  $root = Split-Path -Parent $PSScriptRoot
  if ($PSScriptRoot -and (Test-Path -LiteralPath (Join-Path $root 'repos.conf')) -and (Test-Path -LiteralPath (Join-Path $root 'installer\install-user.mjs'))) {
    $script:Dev = $true
    $script:DevRoot = $root
    $script:KitSrc = $root
    $script:C = ConvertFrom-WsConf ([IO.File]::ReadAllText((Join-Path $root 'repos.conf'), [Text.Encoding]::UTF8)) $envMap
    $script:Pricing = [IO.File]::ReadAllText((Join-Path $root 'pricing.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
    $script:Msgs = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'messages.en.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
    $script:InjKitSha = ''
    return $true
  }
  return $false
}

function Initialize-WsFill {
  $w = Get-WsRepoParts $script:C.WORKSHOP_REPO_URL
  $m = Get-WsRepoParts $script:C.MEMORY_APP_REPO_URL
  $f = @{}
  foreach ($k in $script:C.Keys) { $f[$k] = $script:C[$k] }
  $f['REPO_HOST'] = $w.host
  $f['MEMORY_HOST'] = $m.host
  $f['SETUP_MAC_URL'] = Get-WsReleaseUrl 'workshop' 'setup-mac.sh'
  $f['KIT_URL_MAC'] = Get-WsReleaseUrl 'workshop' ('workshop-kit-' + $script:C.WORKSHOP_VERSION + '.tar.gz')
  $f['KIT_URL_WINDOWS'] = Get-WsReleaseUrl 'workshop' ('workshop-kit-' + $script:C.WORKSHOP_VERSION + '.zip')
  $f['ONE_LINER_MAC'] = 'curl -fsSL ' + $f['SETUP_MAC_URL'] + ' | bash'
  $f['ONE_LINER_WINDOWS'] = 'irm ' + (Get-WsReleaseUrl 'workshop' 'bootstrap-windows.ps1') + ' | iex'
  # O mesmo, para um proxy que pede o login do Windows (407 logo no primeiro irm): igual ao installer/lib/conf.mjs.
  $f['ONE_LINER_WINDOWS_PROXY'] = '[Net.WebRequest]::DefaultWebProxy.Credentials = [Net.CredentialCache]::DefaultNetworkCredentials; ' + $f['ONE_LINER_WINDOWS']
  $f['UV_INSTALL_SH_URL_V'] = Expand-WsPattern $script:C.UV_INSTALL_SH_URL @{ version = $script:C.UV_VERSION }
  $f['UV_INSTALL_PS1_URL_V'] = Expand-WsPattern $script:C.UV_INSTALL_PS1_URL @{ version = $script:C.UV_VERSION }
  $f['PROJETOS'] = $script:ProjShow
  $f['MANIFEST'] = Join-Path $script:WsHome 'manifest.json'
  $f['LOG'] = $script:LogFile
  $f['RESUMO'] = $script:Resumo
  $f['BACKUP'] = Join-Path $script:WsHome 'backup'
  $f['FLAG_SEM_DESKTOP'] = '-NoDesktop'
  $f['FLAG_STATUSLINE'] = '-ReplaceStatusline'
  $script:Fill = $f
}

function Get-WsLangSaved {
  # Etiqueta guardada na instalacao (kit\language.json "machine"; kit\lingua.json "maquina" nas instalacoes
  # antigas). So conta se for uma lingua do workshop: um valor guardado pelo erro antigo (ex.: "br") e ignorado.
  # ReadAllText em UTF-8 e nao Get-Content: no 5.1 o Get-Content sem -Encoding le o ficheiro como ANSI.
  param([string]$KitDir)
  foreach ($pair in @(@('language.json', 'machine'), @('lingua.json', 'maquina'))) {
    $f = Join-Path $KitDir $pair[0]
    if (-not (Test-Path -LiteralPath $f)) { continue }
    $v = ''
    try {
      $raw = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
      if ($raw.Trim()) { $v = [string](($raw | ConvertFrom-Json).($pair[1])) }
    } catch { $v = '' }
    if (Test-WsLangOk $v) { return (ConvertTo-WsLangTag $v) }
  }
  return ''
}

function Initialize-WsLang {
  # Lingua da maquina: so configura a "language" do Claude Code e a lingua do kit; o setup fala sempre ingles.
  # Ordem: WORKSHOP_LANG (se for pt, en, hi ou he), a lingua guardada na instalacao, a lingua do sistema.
  # A lingua guardada vem antes da do sistema para uma janela nova ou o -Check nao trocarem a lingua escolhida na
  # instalacao pela do sistema; so o WORKSHOP_LANG a muda.
  # LangIgnored: WORKSHOP_LANG nao reconhecido (nota do passo 0); LangMachine: a lingua do sistema.
  $ui = ''; $cu = ''
  try { $ui = [string](Get-UICulture).Name } catch { $ui = '' }
  try { $cu = [string](Get-Culture).Name } catch { $cu = '' }
  $w = [string]$env:WORKSHOP_LANG
  $script:LangIgnored = ''; $script:LangSaved = ''
  if (-not (Test-WsLangOk $w)) {
    # So espacos: como sem WORKSHOP_LANG (sem nota). Outro texto: a nota do passo 0 mostra-o (curto e sem controlos).
    if ($w.Trim()) {
      $v = $w
      if ($v.Length -gt 40) { $v = $v.Substring(0, 40) }
      $script:LangIgnored = ($v -replace '[\x00-\x1F\x7F]', '')
    }
    $w = ''
  }
  $script:LangMachine = Select-WsLang '' $ui $cu
  $saved = ''
  if (-not $w) { $saved = Get-WsLangSaved (Join-Path $script:WsHome 'kit') }
  if ($w) { $script:Lang = ConvertTo-WsLangTag $w }
  elseif ($saved) { $script:Lang = $saved; $script:LangSaved = $saved }
  else { $script:Lang = $script:LangMachine }
  $script:LangKit = Get-WsLangKit $script:Lang
  Write-WsLog ('language: {0} (kit {1}) saved={2} machine={3} UICulture={4} Culture={5} ignored={6}' -f $script:Lang, $script:LangKit, $script:LangSaved, $script:LangMachine, $ui, $cu, $script:LangIgnored)
}

function Save-WsSelf {
  # Copia local do script, para "powershell ... -File $env:USERPROFILE\.workshop-claude\setup-windows.ps1 -Check".
  $dst = Join-Path $script:WsHome 'setup-windows.ps1'
  if ($script:Dev) {
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Join-Path $PSScriptRoot 'setup-windows.ps1')))
    $w = "# Development copy: runs the script in the repository.`r`n" +
      "`$p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('$b64'))`r`n" +
      "& powershell -NoProfile -ExecutionPolicy Bypass -File `$p @args`r`n"
    [IO.File]::WriteAllText($dst, $w, [Text.Encoding]::ASCII)
    return
  }
  if ($PSCommandPath -and ((Resolve-Path -LiteralPath $PSCommandPath).Path -ne $dst)) {
    # Um ficheiro novo, escrito pelo setup: o Copy-Item copiava tambem o Zone.Identifier ("veio da Internet") de um
    # setup-windows.ps1 descarregado no browser, e com RemoteSigned imposto por Group Policy o -Check deixava de correr.
    try {
      $bytes = [IO.File]::ReadAllBytes($PSCommandPath)
      Remove-Item -LiteralPath $dst -Force -ErrorAction SilentlyContinue
      [IO.File]::WriteAllBytes($dst, $bytes)
    } catch { Write-WsLog ('saved copy: ' + $_.Exception.Message) }
  }
}

function Update-WsSelf {
  # A correr da copia guardada (%USERPROFILE%\.workshop-claude\setup-windows.ps1): se a release (a mesma tag) tem
  # outro setup-windows.ps1, confirmado pelo SHA256SUMS e com os valores injetados, a copia e substituida e o
  # Invoke-WsMain corre a nova (Invoke-WsUpdatedSelf). Sem rede, ou com qualquer duvida, fica a copia local. Sem
  # isto, uma correcao publicada com a mesma tag nunca chegava a quem corre a copia guardada.
  param([string]$Self = $PSCommandPath)
  $dst = Join-Path $script:WsHome 'setup-windows.ps1'
  if ($script:Dev -or $script:ReExec -or -not $Self -or -not (Test-Path -LiteralPath $dst)) { return $false }
  try { if ((Resolve-Path -LiteralPath $Self -ErrorAction Stop).Path -ne (Resolve-Path -LiteralPath $dst -ErrorAction Stop).Path) { return $false } } catch { return $false }
  $sums = Join-Path $script:Tmp 'SHA256SUMS.self'
  if (-not (Invoke-WsDownload (Get-WsReleaseUrl 'workshop' 'SHA256SUMS') $sums -Auth -TimeoutSec 30)) { Write-WsLog 'saved copy: no SHA256SUMS from the release, keeping it'; return $false }
  $want = Get-WsSumFor $sums 'setup-windows.ps1'
  if (-not $want -or $want -eq (Get-WsSha256 $dst)) { return $false }
  $new = Join-Path $script:Tmp 'setup-windows.new.ps1'
  if (-not (Invoke-WsDownload (Get-WsReleaseUrl 'workshop' 'setup-windows.ps1') $new -Auth -TimeoutSec 120)) { return $false }
  if ((Get-WsSha256 $new) -ne $want) { return $false }
  # So uma copia da release (com os valores injetados) substitui a guardada.
  $text = ''
  try { $text = [IO.File]::ReadAllText($new) } catch { return $false }
  if ($text -notmatch "(?m)^\`$script:WsInjKitSha256 = '[0-9a-f]{64}'") { Write-WsLog 'saved copy: the release file has no injected values, keeping the copy'; return $false }
  # Um ficheiro novo, com os bytes da release (sem o Zone.Identifier, como no Save-WsSelf).
  try { [IO.File]::WriteAllBytes($dst, [IO.File]::ReadAllBytes($new)) } catch { Write-WsLog ('saved copy not updated: ' + $_.Exception.Message); return $false }
  Write-WsLog ('saved setup-windows.ps1 updated from the release (' + $want + '): running the new copy')
  return $true
}

function Invoke-WsUpdatedSelf {
  # Corre a copia nova com as mesmas opcoes e devolve o codigo de saida dela. E outro processo, com outro PID: o
  # .lock sai antes (senao a copia nova via um PowerShell vivo com o lock e recusava), e WS_REEXEC=1 impede-a de
  # se atualizar outra vez.
  param([string]$Lock)
  Remove-Item -LiteralPath $Lock -Force -ErrorAction SilentlyContinue
  $self = Get-WsSelfArgs $script:Params
  $env:WS_REEXEC = '1'
  $code = 1
  try { & (Get-WsWinPowerShell) -NoProfile -ExecutionPolicy Bypass -File (Join-Path $script:WsHome 'setup-windows.ps1') @self | Out-Default; $code = $LASTEXITCODE }
  finally { Remove-Item Env:WS_REEXEC -ErrorAction SilentlyContinue }
  return $code
}

function Get-WsLockProc {
  # O processo com o PID do .lock, para o Test-WsLockHeld: @{ Name; StartTicks } (0 se a hora nao se le), ou $null.
  param([string]$Id)
  $n = ([string]$Id).Trim() -as [int]
  if (-not $n) { return $null }
  $gp = Get-Process -Id $n -ErrorAction SilentlyContinue
  if (-not $gp) { return $null }
  $ticks = 0
  try { $ticks = $gp.StartTime.ToUniversalTime().Ticks } catch { $ticks = 0 }
  return @{ Name = $gp.ProcessName; StartTicks = $ticks }
}

function New-WsLockFile {
  # Cria o .lock so se ainda nao existe (CreateNew: de duas janelas ao mesmo tempo so uma fica com ele), com o PID
  # e a hora de arranque deste processo. Devolve $false se ja existe (ou nao se consegue criar).
  param([string]$Lock)
  $fs = $null
  try { $fs = [IO.File]::Open($Lock, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read) } catch { return $false }
  try {
    $t = 0
    try { $t = (Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks } catch { $t = 0 }
    $txt = [string]$PID
    if ($t -gt 0) { $txt += "`r`n" + $t }
    $b = [Text.Encoding]::ASCII.GetBytes($txt + "`r`n")
    $fs.Write($b, 0, $b.Length)
  } finally { $fs.Dispose() }
  return $true
}

function Enter-WsLock {
  # Fica com o .lock deste setup. Um .lock velho (janela fechada, reinicio, PID reutilizado: Test-WsLockHeld) sai e
  # passa para este. Ocupado: diz quem o tem (mensagem lock_ativo do catalogo) e devolve $false.
  param([string]$Lock)
  for ($i = 0; $i -lt 3; $i++) {
    if (New-WsLockFile $Lock) { return $true }
    if (-not (Test-Path -LiteralPath $Lock)) { continue }
    $txt = ''
    try { $txt = [IO.File]::ReadAllText($Lock) } catch { $txt = '' }
    $since = '?'; $age = 0
    try { $li = Get-Item -LiteralPath $Lock -Force -ErrorAction Stop; $since = $li.LastWriteTime.ToString('HH:mm'); $age = ((Get-Date) - $li.LastWriteTime).TotalSeconds } catch { }
    $first = ([string](($txt -split "`r?`n") | Select-Object -First 1)).Trim()
    if (Test-WsLockHeld $txt (Get-WsLockProc $first) $PID) {
      Write-WsLog ('lock held by PID ' + $first)
      Write-WsSay (M 'lock_ativo' @{ PID = $first; HORA = $since }) 'Yellow'
      return $false
    }
    # Sem PID ha menos de 10 s: outro setup acabou de criar o .lock e ainda esta a escrever o PID.
    if (-not $txt.Trim() -and $age -lt 10) { Write-WsSay (M 'lock_ativo' @{ PID = '?'; HORA = $since }) 'Yellow'; return $false }
    Write-WsLog ('stale lock removed (that setup is no longer running): ' + $txt.Trim().Replace("`r`n", ' '))
    Remove-Item -LiteralPath $Lock -Force -ErrorAction SilentlyContinue
  }
  Write-WsSay (M 'lock_ativo' @{ PID = '?'; HORA = '?' }) 'Yellow'
  return $false
}

function Exit-WsLock {
  # So apaga o .lock se for deste setup: uma segunda janela que foi recusada (ou a copia nova do Update-WsSelf) nao
  # tira o lock a quem o tem.
  param([string]$Lock)
  try {
    $first = ([string](Get-Content -LiteralPath $Lock -TotalCount 1 -ErrorAction Stop)).Trim()
    if (($first -as [int]) -eq $PID) { Remove-Item -LiteralPath $Lock -Force -ErrorAction Stop }
  } catch { }
}

function Invoke-WsRelaunch {
  # O setup so corre bem no Windows PowerShell 5.1 de 64 bits, numa consola:
  # - PowerShell ISE: sem consola, os logins (claude, gh, acli) ficavam a espera para sempre -> nova janela;
  # - PowerShell 7 (sem powershell.exe no $PSHOME, outras excecoes de rede) ou de 32 bits (o install.ps1 do Claude
  #   Code recusa 32 bits; System32 e Program Files redirecionados) -> recomeca no de 64 bits, com as mesmas opcoes.
  # Nunca contorna a Group Policy: com AllSigned ou Restricted nao recomeca (o -File falhava) e o passo 0 explica.
  # Devolve o codigo de saida, ou $null para continuar neste processo.
  param([hashtable]$Params)
  $self = Get-WsSelfArgs $Params
  $ps = Get-WsWinPowerShell
  if (Test-WsIse $Host.Name ([bool](Get-Variable -Name psISE -ValueOnly -ErrorAction SilentlyContinue))) {
    if ($PSCommandPath) {
      try {
        Start-Process -FilePath $ps -ArgumentList (ConvertTo-WsArgLine (@('-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-File', $PSCommandPath) + $self)) -ErrorAction Stop
        Write-WsSay (M 'ise_nova_janela') 'White'
        return 0
      } catch { Write-WsLog ('ISE: new window failed: ' + $_.Exception.Message) }
    }
    Write-WsCode 'E-SO-08' '' '  '
    return 2
  }
  $why = Get-WsRelaunchReason ([string]$PSVersionTable.PSEdition) ([Environment]::Is64BitOperatingSystem) ([Environment]::Is64BitProcess) $env:WS_RELAUNCHED
  Remove-Item Env:WS_RELAUNCHED -ErrorAction SilentlyContinue
  if (-not $why -or -not $PSCommandPath -or $ps -eq 'powershell.exe') { return $null }
  $gpo = Get-WsGpoPolicy (Read-WsGpoKey 'LocalMachine') (Read-WsGpoKey 'CurrentUser')
  if ($gpo -and $gpo.Blocks) { return $null }
  if ($why -eq 'core') { Write-WsSay (M 'relancar_core') 'DarkGray' } else { Write-WsSay (M 'relancar_x86') 'DarkGray' }
  $env:WS_RELAUNCHED = '1'
  # "| Out-Default": o outro PowerShell escreve direto na consola (e le o teclado); sem isso a saida dele ficava
  # capturada como resultado desta funcao, e as perguntas nunca apareciam.
  try { & $ps -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath @self | Out-Default; $code = $LASTEXITCODE }
  finally { Remove-Item Env:WS_RELAUNCHED -ErrorAction SilentlyContinue }
  return $code
}

function Test-WsAbsolutePath {
  # C:\... ou \\servidor\...: um caminho relativo, "~" ou "C:pasta" depende da pasta atual.
  param([string]$P)
  return ($P -match '^[A-Za-z]:[\\/]' -or $P -match '^[\\/]{2}[^\\/]')
}

function New-WsTmpDir {
  # Pasta temporaria do setup: a do sistema (TMP/TEMP), senao %LOCALAPPDATA%\Temp, senao a pasta do workshop. Um
  # TEMP que aponta para uma pasta sem escrita fica em $script:TmpBad (aviso E-SO-09, como o TMPDIR no Mac) e os
  # programas que o setup corre recebem a pasta que serve.
  $first = ''
  try { $first = [IO.Path]::GetTempPath() } catch { $first = '' }
  $bases = @($first)
  if ($env:LOCALAPPDATA) { $bases += (Join-Path $env:LOCALAPPDATA 'Temp') }
  $bases += (Join-Path $script:WsHome 'tmp')
  $name = 'ws-setup-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
  foreach ($b in $bases) {
    if (-not $b) { continue }
    $t = Join-Path $b $name
    try {
      New-Item -ItemType Directory -Path $t -Force -ErrorAction Stop | Out-Null
      [IO.File]::WriteAllText((Join-Path $t '.ws-tmp'), '')
      if ($b -ne $first) { $script:TmpBad = ('TEMP=' + $first); $env:TEMP = $b; $env:TMP = $b }
      return $t
    } catch { Remove-Item -LiteralPath $t -Recurse -Force -ErrorAction SilentlyContinue }
  }
  return ''
}

function Invoke-WsMain {
  $o = $script:Params
  $script:Mode = 'install'
  if ($o.Check) { $script:Mode = 'check' }
  if ($o.Doctor) { $script:Mode = 'doctor' }
  if ($o.Desinstalar) { $script:Mode = 'uninstall' }
  if ($o.Limpar) { $script:Mode = 'cleanup' }
  $script:Sim = $o.Sim
  $script:SemDesktop = $o.SemDesktop
  $script:SubstSl = $o.SubstituirStatusline
  if ($o.Ajuda) { Get-Help $PSCommandPath -Detailed; return 0 }
  if ($ExecutionContext.SessionState.LanguageMode -ne 'FullLanguage') { Write-Host 'PowerShell is in ConstrainedLanguage mode: the setup cannot run (E-SO-05).'; return 2 }
  try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  try { [Net.WebRequest]::DefaultWebProxy.Credentials = [Net.CredentialCache]::DefaultNetworkCredentials } catch { }
  $script:Emoji = [bool]($env:WT_SESSION -or $PSVersionTable.PSVersion.Major -ge 7)

  # A pasta do perfil (USERPROFILE), e nao o $HOME do PowerShell 5.1: com uma pasta pessoal do AD, o $HOME e H:\.
  $script:UserHome = Get-WsUserHome ([Environment]::GetFolderPath('UserProfile')) $env:USERPROFILE $HOME
  $script:WsHome = Join-Path $script:UserHome '.workshop-claude'
  $script:LogFile = Join-Path $script:WsHome 'setup.log'
  $script:Resumo = Join-Path $script:WsHome 'summary.txt'
  $script:ClaudeDir = $env:CLAUDE_CONFIG_DIR
  if (-not $script:ClaudeDir) { $script:ClaudeDir = Join-Path $script:UserHome '.claude' }
  $script:Proj = Join-Path $script:UserHome 'workshop-claude'
  $script:ProjShow = '%USERPROFILE%\workshop-claude'
  $script:UA = 'workshop-claude-setup (PowerShell; Windows)'
  $script:Literals = Get-WsSecretLiterals
  $script:StepLog = New-Object System.Text.StringBuilder
  $script:AuthOk = $false; $script:NetApiOk = $true; $script:CaPem = ''; $script:Proxy = ''; $script:NoProxy = ''; $script:OsBuild = 99999; $script:Arch = 'x64'
  $script:Blocked = ''; $script:GpoBlocks = $false; $script:ProxyAuth = $false; $script:GitBashMissing = $false; $script:GitBashTried = $false
  $script:ProxyShow = ''; $script:ProxyDead = $false; $script:EnvProxyDead = $false; $script:ProxyProbe = @{}; $script:DlHost = ''; $script:DlPartial = $false
  $script:PermBad = @()
  # WS_REEXEC=1: esta e a copia nova que o Update-WsSelf acabou de descarregar (nao se atualiza outra vez).
  $script:ReExec = ($env:WS_REEXEC -eq '1')
  Remove-Item Env:WS_REEXEC -ErrorAction SilentlyContinue

  if (-not (Initialize-WsConfig)) { Write-Host 'This script must come from the release (with the injected values) or run inside the repository.'; return 2 }
  Initialize-WsFill
  # ISE, PowerShell 7 ou 32 bits: antes de escrever o que quer que seja.
  $again = Invoke-WsRelaunch $o
  if ($null -ne $again) { return $again }

  try { New-Item -ItemType Directory -Path $script:WsHome -Force -ErrorAction Stop | Out-Null } catch { }
  # %USERPROFILE%\.workshop-claude sem escrita (de outro utilizador, de uma execucao como administrador, ou um
  # ficheiro): sem ela nao ha lock, log nem copia guardada. Mostra-se o comando que resolve, e para aqui.
  if (-not (Test-Path -LiteralPath $script:WsHome -PathType Container) -or -not (Test-WsDirWritable $script:WsHome)) {
    Write-WsCode 'E-PERM-01' (Format-WsHomePath $script:WsHome $script:UserHome) '  '
    $fix = Get-WsPermFix $script:WsHome
    if ($fix) { Write-Host ('  ' + (M 'perm_corrigir' @{ CMD = $fix })) }
    return 1
  }
  # setup.log de outro utilizador ou so de leitura: fica de lado, com outro nome, e comeca-se um novo.
  if (Test-Path -LiteralPath $script:LogFile) {
    try { [IO.File]::AppendAllText($script:LogFile, '') } catch {
      try { Rename-Item -LiteralPath $script:LogFile -NewName ('setup.log.unwritable-' + (Get-Date -Format 'yyyyMMddHHmmss')) -ErrorAction Stop } catch { }
    }
  }
  # CLAUDE_CONFIG_DIR relativo ou com um "~" (o Claude Code nao o expande): para aqui, antes de mudar o que quer que
  # seja (E-CFG-08, como no Mac).
  if ($env:CLAUDE_CONFIG_DIR) {
    if (-not (Test-WsAbsolutePath $env:CLAUDE_CONFIG_DIR)) { Write-WsCode 'E-CFG-08' ('CLAUDE_CONFIG_DIR=' + $env:CLAUDE_CONFIG_DIR) '  '; return 1 }
    $script:ClaudeDir = $env:CLAUDE_CONFIG_DIR.TrimEnd('\', '/')
    if ($script:ClaudeDir -match '^[A-Za-z]:$') { $script:ClaudeDir += '\' }
  }
  $script:TmpBad = ''
  $script:Tmp = New-WsTmpDir
  if (-not $script:Tmp) {
    Write-Host ('No usable temporary folder: TEMP ({0}), %LOCALAPPDATA%\Temp and {1}\tmp cannot be written or the disk is full.' -f $env:TEMP, $script:WsHome)
    Write-Host 'Fix the TEMP and TMP user variables (or free some disk space), open a new PowerShell window and run the setup again.'
    return 1
  }
  Initialize-WsLang
  $script:Titles = @{}
  foreach ($p in $script:Msgs.passos.PSObject.Properties) { $script:Titles[$p.Name] = $p.Value }
  $script:T = New-WsStateTable
  Update-WsSessionPath

  # O .lock tem o PID e a hora de arranque: um setup fechado a forca (ou um PID reutilizado) nao bloqueia o seguinte.
  $lock = Join-Path $script:WsHome '.lock'
  if (-not (Enter-WsLock $lock)) {
    Remove-Item -LiteralPath $script:Tmp -Recurse -Force -ErrorAction SilentlyContinue
    return 1
  }
  try {
    # A copia guardada desatualizada (a mesma tag republicada): corre a da release, com as mesmas opcoes.
    if ($script:Mode -ne 'uninstall' -and (Update-WsSelf)) { return (Invoke-WsUpdatedSelf $lock) }
    [IO.File]::AppendAllText($script:LogFile,("`r`n==================== {0} - mode {1} - {2}`r`n" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $script:Mode, $script:C.WORKSHOP_VERSION), $script:Utf8NoBom)
    Initialize-WsUi
    [void](Set-WsOsInfo)
    Write-WsHeader
    # No fancy e no ascii o texto do inicio fica alinhado com o cartao, e a lista em cinzento.
    $ind = ''
    if ($script:Ui -ne 'plain') { $ind = '  ' }
    switch ($script:Mode) {
      'uninstall' { Write-WsSay ($ind + (M 'modo_desinstalar' @{ MANIFEST = (Join-Path $script:WsHome 'manifest.json') })); return (Invoke-WsUninstall) }
      'cleanup' { Write-WsSay ($ind + (M 'modo_limpar' @{ PROJETO = ($script:ProjShow + '\' + $script:PracticeDir) })); return (Invoke-WsCleanup) }
      'check' { Write-WsSay ($ind + (M 'tempo_check')) }
      'doctor' { Write-WsSay ($ind + (M 'modo_doctor')); Write-WsSay ($ind + (M 'tempo_check')) }
      default {
        Write-WsSay ($ind + (M 'instala'))
        foreach ($i in $script:Msgs.ui.instala_lista) { if ($ind) { Write-WsSay ($ind + '  - ' + (Format-WsFill $i)) 'DarkGray' } else { Write-WsSay ('  - ' + (Format-WsFill $i)) } }
        Write-WsSay ($ind + (M 'tempo'))
        if ($script:Sim) { Write-WsSay ($ind + (M 'modo_sim')) }
      }
    }
    Write-WsSay ($ind + (M 'log_em' @{ LOG = $script:LogFile })) 'DarkGray'
    if ($ind) { Write-WsSay '' }
    Save-WsSelf

    Invoke-WsStep 0
    Invoke-WsStep 1
    Invoke-WsStep 2
    Invoke-WsStep 3 @(2)
    Invoke-WsStep 4
    Invoke-WsStep 5
    Invoke-WsStep 6
    Invoke-WsStep 7 @(2)
    Invoke-WsStep 8 @(4)
    Invoke-WsStep 9 @(1, 4)
    Invoke-WsStep 10 @(5)
    Invoke-WsStep 11
    Invoke-WsStep 12 @(2, 3)
    if ($script:Mode -eq 'install') { Update-WsUserPathFront }
    Sync-WsExtras
    $faltam = Write-WsSummary
    Send-WsCheckOk $faltam
    if ($script:Mode -eq 'doctor') { Invoke-WsDoctor }
    if ($faltam -gt 0) { return 1 }
    return 0
  } finally {
    # Ctrl-C (ou um erro) a meio de um passo: a zona viva sai da consola.
    Stop-WsLive
    Exit-WsLock $lock
    Remove-Item -LiteralPath $script:Tmp -Recurse -Force -ErrorAction SilentlyContinue
  }
}

if ($env:WS_NO_MAIN -ne '1' -and $MyInvocation.InvocationName -ne '.') {
  $code = Invoke-WsMain
  exit $code
}
