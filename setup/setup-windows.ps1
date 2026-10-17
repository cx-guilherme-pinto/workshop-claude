#Requires -Version 5.1
<#
.SYNOPSIS
  Setup for the workshop "Agent Orchestration with Claude" on Windows 10/11 (x64 and ARM64). No admin needed.

.DESCRIPTION
  Usually run through the bootstrap:   irm <url>/bootstrap-windows.ps1 | iex
  Or directly:                         powershell -NoProfile -ExecutionPolicy Bypass -File setup-windows.ps1
  After the first time:                powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Check

  The setup speaks English (D-20). The machine language (WORKSHOP_LANG, Get-UICulture, Get-Culture) only
  configures Claude's answers (Claude Code "language" setting) and the language of the workshop texts (pt or en).
  This file is ASCII only (PowerShell 5.1 reads UTF-8 without BOM as ANSI). All texts come from
  setup/messages.en.json (the same catalog as docs/TROUBLESHOOTING.md), read as UTF-8.

.PARAMETER Check
  Check only and show the state (2 to 3 minutes). Installs nothing.
.PARAMETER Doctor
  Check everything and, if something fails, ask Claude for a full diagnosis.
.PARAMETER Uninstall
  Undo what the setup installed (manifest.json): settings, MCP, agents, skills, kit, app and shortcut. Alias: -Desinstalar.
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
  [Alias('SemDesktop')][switch]$NoDesktop,
  [Alias('Sim')][switch]$Yes,
  [Alias('SubstituirStatusline')][switch]$ReplaceStatusline,
  [Alias('Ajuda')][switch]$Help
)

$script:Params = @{ Check = [bool]$Check; Doctor = [bool]$Doctor; Desinstalar = [bool]$Uninstall; SemDesktop = [bool]$NoDesktop; Sim = [bool]$Yes; SubstituirStatusline = [bool]$ReplaceStatusline; Ajuda = [bool]$Help }

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
  param([string]$Status, [int]$Http)
  if ($Status -eq 'Blocked') { return 'E-PERM-02' }
  if ($Http -eq 407) { return 'E-NET-03' }
  switch ($Status) {
    'NameResolutionFailure' { return 'E-NET-02' }
    'ProxyNameResolutionFailure' { return 'E-NET-03' }
    'TrustFailure' { return 'E-NET-04' }
    'SecureChannelFailure' { return 'E-NET-04' }
    'ConnectFailure' { return 'E-NET-01' }
    'Timeout' { return 'E-NET-01' }
    'ConnectionClosed' { return 'E-NET-01' }
    'ReceiveFailure' { return 'E-NET-01' }
  }
  return 'E-NET-07'
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
    } elseif ($e -is [System.Security.Authentication.AuthenticationException]) { $st = 'TrustFailure' }
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

function Add-WsPathEntry {
  # Acrescenta uma pasta a uma lista PATH (no inicio), sem duplicados. Devolve a lista nova.
  param([string]$PathValue, [string]$Entry)
  $items = @()
  if ($PathValue) { $items = @($PathValue.Split(';') | Where-Object { $_ -ne '' }) }
  $norm = $Entry.TrimEnd('\')
  foreach ($i in $items) { if ($i.TrimEnd('\') -ieq $norm) { return ($items -join ';') } }
  return ((@($Entry) + $items) -join ';')
}

function Remove-WsPathEntry {
  param([string]$PathValue, [string]$Entry)
  if (-not $PathValue) { return '' }
  $norm = $Entry.TrimEnd('\')
  return ((@($PathValue.Split(';') | Where-Object { $_ -ne '' -and $_.TrimEnd('\') -ine $norm })) -join ';')
}

function ConvertTo-WsLangTag {
  # Lingua da maquina (D-20): texto -> etiqueta como "pt-PT", "he" ou "en". Mesmas regras que
  # installer/lib/linguas.mjs (casos partilhados em tools/test/lingua-cases.json). Vazio sem informacao.
  param([string]$Text)
  $t = (([string]$Text).Trim() -split '[.@]')[0].Replace('_', '-')
  if ($t -eq '' -or $t -match '^(?i:c|posix)$') { return '' }
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
  param([string]$Override, [string]$UiCulture, [string]$Culture)
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

function Get-WsInstallUserArgs {
  # Argumentos para "node install-user.mjs <sub>": caminhos completos, um argumento cada (espacos e acentos).
  # -NoProxy: o NO_PROXY completo (Merge-WsNoProxy); sem ele o install-user grava so localhost,127.0.0.1.
  param([string]$Sub, [string]$NodePath, [string]$KitSrc, [string]$CaPem, [string]$Proxy, [switch]$SubstituirStatusline, [string]$Lang, [string]$NoProxy)
  $a = @([IO.Path]::Combine($KitSrc, 'installer', 'install-user.mjs'), $Sub, '--node', $NodePath, '--kit-src', $KitSrc)
  if ($Lang) { $a += @('--lingua-maquina', $Lang) }
  if ($CaPem) { $a += @('--ca-pem', $CaPem) }
  if ($Proxy) { $a += @('--https-proxy', $Proxy) }
  if ($NoProxy) { $a += @('--no-proxy', $NoProxy) }
  if ($SubstituirStatusline) { $a += '--substituir-statusline' }
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
  param([string]$State, [bool]$Emoji)
  if ($Emoji) {
    switch ($State) {
      'feito' { return [char]::ConvertFromUtf32(0x2705) }
      'ok' { return [char]::ConvertFromUtf32(0x2705) }
      'ja' { return ([char]::ConvertFromUtf32(0x23ED) + [char]0xFE0F) }
      'aviso' { return ([char]::ConvertFromUtf32(0x26A0) + [char]0xFE0F) }
      'falhou' { return [char]::ConvertFromUtf32(0x274C) }
      'falta' { return [char]::ConvertFromUtf32(0x274C) }
      'naoexec' { return [char]::ConvertFromUtf32(0x26D4) }
      'saltado' { return [char]::ConvertFromUtf32(0x2796) }
    }
    return '-'
  }
  switch ($State) {
    'feito' { return '[OK]' }
    'ok' { return '[OK]' }
    'ja' { return '[SKIP]' }
    'aviso' { return '[WARN]' }
    'falhou' { return '[FAIL]' }
    'falta' { return '[FAIL]' }
    'naoexec' { return '[--]' }
    'saltado' { return '[--]' }
  }
  return '[ ]'
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
  $falhas = @([regex]::Matches([string]$Text, '(?m)^\s*\[(?!OK\])[^\]\r\n]+\]\s*(.+?)\s*$') | ForEach-Object { $_.Groups[1].Value.Trim() })
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
  $map = [ordered]@{ Check = '-Check'; Doctor = '-Doctor'; Desinstalar = '-Uninstall'; SemDesktop = '-NoDesktop'; Sim = '-Yes'; SubstituirStatusline = '-ReplaceStatusline'; Ajuda = '-Help' }
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
    return $t.Substring(0, [Math]::Min(160, $t.Length))
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
  if ($Color) { Write-Host $Text -ForegroundColor $Color } else { Write-Host $Text }
  Write-WsLog $Text
}

function Test-WsInteractive {
  try { return (-not [Console]::IsInputRedirected) -and [Environment]::UserInteractive } catch { return $false }
}

function Read-WsYesNo {
  # Pergunta sim/nao. -NeverSim: o -Sim nao responde por ti.
  param([string]$Question, [bool]$DefaultYes, [switch]$NeverSim)
  $hint = (M 'ns')
  if ($DefaultYes) { $hint = (M 'sn') }
  if ($script:Sim -and -not $NeverSim) { Write-WsSay ('  ? {0} {1} y (-Yes)' -f $Question, $hint); return $true }
  if ($script:Sim) { Write-WsSay ('  ? {0} {1} n (-Yes)' -f $Question, $hint); return $false }
  if (-not (Test-WsInteractive)) { Write-WsSay ('  ? {0} {1} n - {2}' -f $Question, $hint, (M 'sem_tty')); return $false }
  $ans = Read-Host ('  ? {0} {1}' -f $Question, $hint)
  Write-WsLog ('question: {0} -> {1}' -f $Question, $ans)
  if ($ans -match '^[SsYy]') { return $true }
  if ($ans -match '^[Nn]') { return $false }
  if ($ans -eq '') { return $DefaultYes }
  return $false
}

# =============================================================== processos, rede, ficheiros

function Invoke-WsProcess {
  # Corre um executavel com argumentos exatos (incluindo vazios), sem janela, com stdout/stderr em UTF-8.
  param([string]$FilePath, [string[]]$Arguments, [string]$StdinText, [int]$TimeoutSec = 900, [hashtable]$Environment, [string]$WorkingDirectory, [string[]]$RemoveEnv)
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
  if ($Environment) { foreach ($k in $Environment.Keys) { $psi.EnvironmentVariables[$k] = [string]$Environment[$k] } }
  if ($RemoveEnv) { foreach ($k in $RemoveEnv) { if ($psi.EnvironmentVariables.ContainsKey($k)) { $psi.EnvironmentVariables.Remove($k) } } }
  Write-WsLog ('$ {0} {1}' -f $FilePath, $psi.Arguments)
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
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
    while (-not $p.WaitForExit(500)) {
      if ((Get-Date) -gt $deadline) {
        $done = $true
        Stop-WsProcessTree $p
        Write-WsLog '  -> timed out'
        return @{ ExitCode = -2; StdOut = ''; StdErr = 'timeout' }
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

function Invoke-WsDownload {
  # Download via .part. -Auth envia o REPO_TOKEN so ao servidor dos repositorios (nunca vai para o log).
  # Define $script:DlHttp e $script:DlStatus. -TimeoutSec: curto para o que nao pode atrasar o arranque (Update-WsSelf).
  param([string]$Url, [string]$OutFile, [switch]$Auth, [int]$TimeoutSec = 600)
  $part = $OutFile + '.part'
  Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
  $script:DlHttp = 0; $script:DlStatus = ''
  Write-WsLog ('download: {0}' -f $Url)
  $headers = @{}
  $hostName = ''
  try { $hostName = ([Uri]$Url).Authority } catch { }
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
    Write-WsLog ('  -> failed: {0} (HTTP {1}, {2})' -f $ex.Message, $script:DlHttp, $script:DlStatus)
    Add-WsStepLog ('download failed: ' + $Url + ' ' + $ex.Message)
    Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
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
  # Recarrega o PATH desta sessao a partir do registo (Maquina + Utilizador) e acrescenta as pastas do kit.
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
  param([string]$Dir)
  $cur = Get-WsUserEnvRaw 'Path'
  $new = Add-WsPathEntry $cur $Dir
  if ($new -ne $cur) {
    New-ItemProperty -Path 'HKCU:\Environment' -Name 'Path' -Value $new -PropertyType ExpandString -Force | Out-Null
    Register-WsExtra 'path_utilizador' $Dir '' '' ''
    Send-WsEnvChanged
  }
  Update-WsSessionPath
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

function Write-WsCode {
  param([string]$Code, [string]$Detail, [string]$Indent)
  $e = Get-WsErr $Code
  if (-not $e) { Write-WsSay ($Indent + $Code); return }
  Write-WsSay ($Indent + (Format-WsFill $e.titulo)) 'White'
  $d = ''
  if ($Detail) { $d = ' (' + $Detail + ')' }
  Write-WsSay ($Indent + (M 'porque') + ': ' + (Format-WsFill $e.causa) + $d)
  Write-WsSay ($Indent + (M 'fazer') + ':')
  foreach ($f in $e.fazer) { Write-WsSay ($Indent + '  - ' + (Format-WsFill $f)) }
  foreach ($c in $e.windows) { Write-WsSay ($Indent + '    PS> ' + (Format-WsFill $c)) 'Cyan' }
  Write-WsSay ($Indent + (M 'codigo' @{ CODIGO = $Code })) 'DarkGray'
}

function Write-WsResult {
  param([string]$N)
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
  if ($c -like 'E-PERM-*' -or $c -like 'E-AUTH-*' -or @('E-SO-07', 'E-CFG-05', 'E-GH-02', 'E-SMOKE-02', 'E-SMOKE-03') -contains $c) { return }
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
  Write-WsSay ''
  Write-WsSay (M 'passo' @{ N = $key; TITULO = $title }) 'White'
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
    if (Test-WsMissingCode $script:T[$key].Falha[0]) { $prev = Get-WsLastInstallResult $key $script:LogFile; Set-WsFail 'E-SETUP-01' $script:T[$key].Falha[0] }
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
  Write-WsSay ('  ' + (M 'a_descarregar' @{ O_QUE = $name }))
  $zip = Join-Path $tmpd $name
  if (Invoke-WsDownload (Get-WsReleaseUrl 'workshop' $name) $zip -Auth) {
    $sum = Get-WsSha256 $zip
    if ($script:InjKitSha -and $sum -ne $script:InjKitSha) {
      Set-WsWarn 'E-KIT-02' $name
    } else {
      try {
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

function Get-WsUv { $c = Get-Command uv -ErrorAction SilentlyContinue; if ($c) { return $c.Source }; $p = Join-Path $script:UserHome '.local\bin\uv.exe'; if (Test-Path -LiteralPath $p) { return $p }; return $null }
function Get-WsClaude { $p = Join-Path $script:UserHome '.local\bin\claude.exe'; $c = Get-Command claude -ErrorAction SilentlyContinue; if ($c -and $c.CommandType -eq 'Application') { return $c.Source }; if (Test-Path -LiteralPath $p) { return $p }; return $null }

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

function Test-WsStep0 {
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
  Add-WsNote (M 's0_so' @{ SO = $script:OsText })
  Add-WsNote (M 's0_lingua' @{ LINGUA = $script:Lang })
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
  foreach ($pair in @(@('ANTHROPIC_API_KEY', 'E-CFG-02'), @('ANTHROPIC_BASE_URL', 'E-CFG-03'), @('CLAUDE_CODE_USE_BEDROCK', 'E-CFG-04'), @('CLAUDE_CODE_USE_VERTEX', 'E-CFG-04'))) {
    if ([Environment]::GetEnvironmentVariable($pair[0]) -or (Get-WsUserEnvRaw $pair[0])) { Set-WsWarn $pair[1] $pair[0] }
  }

  try {
    $drive = Get-PSDrive -Name ($script:UserHome.Substring(0, 1)) -ErrorAction Stop
    $gb = [math]::Floor($drive.Free / 1GB)
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
  Set-WsDetail ($script:OsText + ' - ' + $script:Lang + ' - ' + (M 's0_rede_ok' @{ OK = $script:NetOk; TOTAL = $script:NetTotal }))
  return $true
}
function Install-WsStep0 { return (Test-WsStep0) }

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
  $cj = Join-Path $h '.claude.json'
  if ($env:CLAUDE_CONFIG_DIR) { $cj = Join-Path $env:CLAUDE_CONFIG_DIR '.claude.json' }
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
  $script:Proxy = ''
  $script:NoProxy = ''
  $override = ''
  $direct = @()
  if ($env:HTTPS_PROXY) {
    $script:Proxy = $env:HTTPS_PROXY
    Add-WsNote (M 's0_proxy_sistema' @{ PROXY = (Protect-WsText $env:HTTPS_PROXY @()) + ' (HTTPS_PROXY)' })
  } else {
    try {
      $sys = [System.Net.WebRequest]::GetSystemWebProxy()
      $target = [Uri]'https://api.anthropic.com/'
      if (-not $sys.IsBypassed($target)) {
        $px = $sys.GetProxy($target)
        if ($px -and $px.AbsoluteUri -ne $target.AbsoluteUri) {
          $script:Proxy = ('http://{0}:{1}' -f $px.Host, $px.Port)
          $env:HTTPS_PROXY = $script:Proxy
          Add-WsNote (M 's0_proxy_sistema' @{ PROXY = $script:Proxy })
          # As excecoes do proxy do Windows e os servidores do kit que o PAC manda direto (GitHub Enterprise,
          # por exemplo) ficam no NO_PROXY: sem isso o git, o gh e o uv iam pelo proxy para servidores internos.
          try { $override = [string](Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyOverride -ErrorAction Stop).ProxyOverride } catch { $override = '' }
          foreach ($h in @($script:Fill.REPO_HOST, $script:Fill.MEMORY_HOST)) {
            if ($h) { try { if ($sys.IsBypassed([Uri]('https://' + $h + '/'))) { $direct += $h } } catch { } }
          }
        }
      }
    } catch { Write-WsLog ('proxy: ' + $_.Exception.Message) }
  }
  if (-not $script:Proxy) { Add-WsNote (M 's0_sem_proxy'); return }
  # O NO_PROXY que ja existia fica (como no Mac); acrescenta-se, nunca se substitui.
  $script:NoProxy = Merge-WsNoProxy $env:NO_PROXY $override $direct
  $env:NO_PROXY = $script:NoProxy
  Write-WsLog ('NO_PROXY: ' + $script:NoProxy)
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
  $pem = Join-Path $script:WsHome 'ca.pem'
  if ($raws.Count -gt 0) {
    [IO.File]::WriteAllText($pem, (ConvertTo-WsPem $raws), $script:Utf8NoBom)
    $script:CaPem = $pem
    $env:NODE_EXTRA_CA_CERTS = $pem
    $env:UV_SYSTEM_CERTS = 'true'
  }
  Add-WsNote (M 's0_tls_corp' @{ EMISSOR = $issuer; CA = $pem })
  Set-WsWarn 'E-NET-04' $issuer
}

function Test-WsNetwork {
  $hosts = @()
  foreach ($h in ($script:C.NET_CHECK_HOSTS -split '\s+')) { if ($h) { $hosts += ('https://' + $h + '/') } }
  foreach ($h in @($script:Fill.REPO_HOST, $script:Fill.MEMORY_HOST)) { if ($h -and ($hosts -notcontains ('https://' + $h + '/'))) { $hosts += ('https://' + $h + '/') } }
  try { $u = [Uri]$script:Fill.KIT_URL_WINDOWS; $b = $u.Scheme + '://' + $u.Authority + '/'; if ($hosts -notcontains $b) { $hosts += $b } } catch { }
  $script:NetTotal = $hosts.Count
  Write-WsSay ('  ' + (M 'a_verificar_rede' @{ N = $hosts.Count }))
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
      try { $r = $req.EndGetResponse($ar); $http = [int]$r.StatusCode; $r.Close(); $okH = $true }
      catch [System.Net.WebException] {
        $st = [string]$_.Exception.Status
        if ($_.Exception.Response) { try { $http = [int]$_.Exception.Response.StatusCode } catch { }; $_.Exception.Response.Close(); if ($http -ne 407) { $okH = $true } }
      } catch { $st = 'Unknown' }
    } else { try { $req.Abort() } catch { }; $st = 'Timeout' }
    Write-WsLog ('network: {0} -> {1} HTTP {2}' -f $h, $st, $http)
    if ($okH) { $script:NetOk++; continue }
    $fails += $h.Replace('https://', '').TrimEnd('/')
    if ($h -match 'api\.anthropic\.com') { $script:NetApiOk = $false }
    $codes += (Get-WsNetCode $st $http)
  }
  if ($fails.Count -gt 0) {
    Add-WsNote (M 's0_rede_falha' @{ LISTA = ($fails -join ', ') })
    if (-not $script:NetApiOk) { Set-WsWarn 'E-NET-05' 'api.anthropic.com' }
    foreach ($c in ($codes | Sort-Object -Unique)) { Set-WsWarn $c ($fails -join ', ') }
  }
  # Os pedidos acima levam o login do Windows ao proxy; o Claude Code, o Node e o uv nao. Se o proxy so aceita esse
  # login, diz-se ja aqui (E-NET-03), e nao com E-CC-01, E-UV-01 ou E-MEM-03 nos passos seguintes.
  $script:ProxyAuth = $false
  if ($script:Proxy -and $script:NetApiOk -and (Test-WsProxyAuth) -eq 407) {
    $script:ProxyAuth = $true
    Add-WsNote (M 's0_proxy_ntlm')
    if ($codes -notcontains 'E-NET-03') { Set-WsWarn 'E-NET-03' ((Protect-WsText $script:Proxy @()) + ': 407') }
  }
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
  Write-WsSay ('  ' + (M 'a_instalar'))
  if ((Test-WsWinget) -and (Invoke-WsWinget 'Git.Git')) { if ((Test-WsStep1) -and -not $script:GitBashMissing) { return $true } }
  $file = $script:C.GIT_WINDOWS_FILE_X64; $want = $script:C.GIT_WINDOWS_SHA256_X64
  if ($script:Arch -eq 'arm64') { $file = $script:C.GIT_WINDOWS_FILE_ARM64; $want = $script:C.GIT_WINDOWS_SHA256_ARM64 }
  $url = Expand-WsPattern $script:C.GIT_WINDOWS_URL @{ version = $script:C.GIT_WINDOWS_VERSION; file = $file }
  $exe = Join-Path $script:Tmp $file
  Write-WsSay ('  ' + (M 'a_descarregar' @{ O_QUE = $file }))
  if (-not (Invoke-WsDownload $url $exe)) { Set-WsFail (Get-WsDlCode) $url; return $false }
  if ((Get-WsSha256 $exe) -ne $want.ToLowerInvariant()) { Set-WsFail 'E-GIT-02' ('SHA-256 ' + $file); return $false }
  $r = Invoke-WsProcess $exe @('/VERYSILENT', '/CURRENTUSER', '/NORESTART', '/SUPPRESSMSGBOXES', '/SP-', '/NOCANCEL') -TimeoutSec 1800
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-GIT-02' ('installer ' + $r.ExitCode); return $false }
  Update-WsSessionPath
  return (Test-WsStep1)
}

# =============================================================== PASSO 2 - Claude Code

function Test-WsStep2 {
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
  if (Test-WsPermBlocked @((Join-Path $script:UserHome '.claude\downloads'), (Join-Path $script:UserHome '.local\bin\claude.exe'), (Join-Path $script:UserHome '.local\share\claude'))) { return $false }
  Write-WsSay ('  ' + (M 'a_instalar'))
  $f = Join-Path $script:Tmp 'claude-install.ps1'
  if (-not (Invoke-WsDownload $script:C.CLAUDE_INSTALL_PS1_URL $f)) { Set-WsFail (Get-WsDlCode) $script:C.CLAUDE_INSTALL_PS1_URL; return $false }
  $r = Invoke-WsProcess (Get-WsWinPowerShell) @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $f, $script:C.CLAUDE_CODE_VERSION) -TimeoutSec 1800
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-CC-01' 'install.ps1'; return $false }
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

function Read-WsAuth {
  $r = Invoke-WsProcess $script:ClaudeExe @('auth', 'status') -TimeoutSec 120
  $j = $null
  try { $j = $r.StdOut | ConvertFrom-Json } catch { }
  $a = @{ Logged = $false; Method = ''; Source = ''; Sub = ''; Org = '' }
  if ($j) {
    $a.Logged = [bool]$j.loggedIn; $a.Method = [string]$j.authMethod
    if ($j.PSObject.Properties.Name -contains 'apiKeySource') { $a.Source = [string]$j.apiKeySource }
    if ($j.PSObject.Properties.Name -contains 'subscriptionType') { $a.Sub = [string]$j.subscriptionType }
    if ($j.PSObject.Properties.Name -contains 'orgName') { $a.Org = [string]$j.orgName }
  }
  Write-WsLog ('auth: loggedIn={0} authMethod={1} apiKeySource={2} subscriptionType={3}' -f $a.Logged, $a.Method, $a.Source, $a.Sub)
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
  switch (Get-WsAuthKind $script:Auth) {
    'console' { $o = $script:Auth.Org; if (-not $o) { $o = 'Console' }; Set-WsDetail (M 's3_console' @{ EMAIL = $o }); $script:AuthOk = $true; return $true }
    'assinatura' {
      if ($script:Mode -eq 'install' -and -not $script:AuthAsked) { return $false }
      Set-WsDetail (M 's3_outro' @{ METODO = ('claude.ai ({0})' -f $script:Auth.Sub) }); Set-WsWarn 'E-AUTH-02' $script:Auth.Sub; $script:AuthOk = $true; return $true
    }
    'outro' { Set-WsDetail (M 's3_outro' @{ METODO = $script:Auth.Method }); Set-WsWarn 'E-AUTH-03' $script:Auth.Method; $script:AuthOk = $true; return $true }
  }
  Set-WsFail 'E-AUTH-01' ''
  return $false
}

function Install-WsStep3 {
  $kind = Get-WsAuthKind $script:Auth
  $script:AuthAsked = $true
  if ($kind -eq 'assinatura') {
    if ($script:Sim -or -not (Read-WsYesNo (M 's3_pergunta_trocar') $false -NeverSim)) { Add-WsNote (M 's3_manter'); return (Test-WsStep3) }
  } elseif ($script:Sim) {
    Add-WsNote (M 's3_login_sim'); Set-WsFail 'E-AUTH-01' ''; return $false
  } elseif (-not (Read-WsYesNo (M 's3_pergunta_login') $true)) {
    Set-WsFail 'E-AUTH-01' ''; return $false
  }
  if (-not (Test-WsInteractive)) { Set-WsFail 'E-AUTH-01' ''; return $false }
  Write-WsLog '$ claude auth login --console (interactive)'
  # "| Out-Default" nos logins: o programa fica com a consola (ve o teclado e mostra o URL e o codigo). Sem isso a
  # saida era capturada pelo [bool](& Install-WsStep3) do Invoke-WsStep e a pessoa nao via nada.
  & $script:ClaudeExe auth login --console | Out-Default
  return (Test-WsStep3)
}

# =============================================================== PASSO 4 - Node

function Get-WsNodeMajor {
  param([string]$Exe)
  $r = Invoke-WsProcess $Exe @('-v') -TimeoutSec 60
  $m = [regex]::Match($r.StdOut, '^v([0-9]+)')
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
  $m = [regex]::Match($r.StdOut, 'v([0-9]+)')
  if ($m.Success) { return [int]$m.Groups[1].Value }
  return 0
}

function Test-WsStep4 {
  $cands = @()
  if ($script:NodeExe) { $cands += $script:NodeExe }
  $c = Get-Command node -ErrorAction SilentlyContinue
  if ($c -and $c.CommandType -eq 'Application') { $cands += $c.Source }
  $cands += (Join-Path $script:WsHome 'node\node.exe')
  $found = $null
  foreach ($x in $cands) {
    if (-not (Test-Path -LiteralPath $x)) { continue }
    # Os hooks e a statusline correm este node a cada passo do Claude: numa partilha (o H:\ de uma versao antiga
    # do setup, por exemplo) ficavam lentos e parados sem rede. Instala-se um local.
    if (Test-WsNetworkPath $x (Get-WsDriveType $x)) { Write-WsLog ('node on a network share, not used: ' + $x); continue }
    if ((Get-WsNodeMajor $x) -ge [int]$script:C.NODE_MIN_MAJOR) { $found = $x; break }
  }
  $script:NodeExe = $found
  if (-not $found) { Set-WsFail 'E-NODE-01' ('node >= ' + $script:C.NODE_MIN_MAJOR); return $false }
  $v = (Invoke-WsProcess $found @('-v')).StdOut.Trim()
  Set-WsDetail (M 's4_ja' @{ VERSAO = $v; CAMINHO = $found })
  Sync-WsExtras
  $fresh = Get-WsFreshNodeMajor
  Write-WsLog ('node in a new terminal: {0}' -f $fresh)
  if ($fresh -lt [int]$script:C.NODE_MIN_MAJOR -and $script:Mode -eq 'install') {
    Add-WsUserPath (Split-Path $found)
    $fresh = Get-WsFreshNodeMajor
  }
  if ($fresh -lt [int]$script:C.NODE_MIN_MAJOR) { $d = ''; if ($fresh -gt 0) { $d = 'v' + $fresh }; Set-WsWarn 'E-NODE-02' $d }
  return $true
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
  Write-WsSay ('  ' + (M 'a_descarregar' @{ O_QUE = $file }))
  if (-not (Invoke-WsDownload $sumsUrl (Join-Path $d 'SHASUMS256.txt')) -or -not (Invoke-WsDownload $url (Join-Path $d $file))) { Set-WsFail (Get-WsDlCode) $url; return $false }
  $want = Get-WsSumFor (Join-Path $d 'SHASUMS256.txt') $file
  if (-not $want -or $want -ne (Get-WsSha256 (Join-Path $d $file))) { Set-WsFail 'E-NODE-01' ('SHA-256 ' + $file); return $false }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $d $file), (Join-Path $d 'x'))
  $inner = Join-Path $d ('x\node-v{0}-win-{1}' -f $script:C.NODE_VERSION, $a)
  $dest = Join-Path $script:WsHome 'node'
  Remove-Item -LiteralPath ($dest + '.old') -Recurse -Force -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $dest) { Move-Item -LiteralPath $dest -Destination ($dest + '.old') }
  Move-Item -LiteralPath $inner -Destination $dest
  Remove-Item -LiteralPath ($dest + '.old') -Recurse -Force -ErrorAction SilentlyContinue
  $script:NodeExe = Join-Path $dest 'node.exe'
  if ((Get-WsNodeMajor $script:NodeExe) -lt 1) { Set-WsFail 'E-PERM-02' $script:NodeExe; return $false }
  Add-WsUserPath $dest
  return (Test-WsStep4)
}

# =============================================================== PASSO 5 - uv

function Test-WsStep5 {
  $uv = Get-WsUv
  if (-not $uv) { return $false }
  $r = Invoke-WsProcess $uv @('--version') -TimeoutSec 60
  if ($r.ExitCode -ne 0) { return $false }
  $script:UvExe = $uv
  $script:UvVer = Get-WsVersionOf $r.StdOut
  if ((Compare-WsVersion $script:UvVer '0.5') -lt 0) { return $false }
  Set-WsDetail (M 's5_ja' @{ VERSAO = $script:UvVer })
  return $true
}

function Install-WsStep5 {
  if (Test-WsPermBlocked @((Join-Path $script:UserHome '.local\bin\uv.exe'))) { return $false }
  $f = Join-Path $script:Tmp 'uv-install.ps1'
  $url = Expand-WsPattern $script:C.UV_INSTALL_PS1_URL @{ version = $script:C.UV_VERSION }
  if (-not (Invoke-WsDownload $url $f)) { Set-WsFail (Get-WsDlCode) $url; return $false }
  $r = Invoke-WsProcess (Get-WsWinPowerShell) @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $f) -Environment @{ UV_NO_MODIFY_PATH = '1'; UV_INSTALL_DIR = (Join-Path $script:UserHome '.local\bin') } -TimeoutSec 900
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-UV-01' 'install.ps1'; return $false }
  Add-WsUserPath (Join-Path $script:UserHome '.local\bin')
  if (-not (Test-WsStep5)) { Set-WsFail 'E-UV-01' 'uv --version'; return $false }
  return $true
}

# =============================================================== PASSO 6 - gh

function Test-WsStep6 {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  $exe = $null
  if ($gh -and $gh.CommandType -eq 'Application') { $exe = $gh.Source }
  elseif (Test-Path -LiteralPath (Join-Path $script:WsHome 'bin\gh.exe')) { $exe = Join-Path $script:WsHome 'bin\gh.exe' }
  if (-not $exe) { return $false }
  $r = Invoke-WsProcess $exe @('--version') -TimeoutSec 60
  if ($r.ExitCode -ne 0) { return $false }
  $script:GhExe = $exe
  $script:GhVer = Get-WsVersionOf $r.StdOut
  Set-WsDetail (M 's6_ja' @{ VERSAO = $script:GhVer })
  # O login no GitHub e obrigatorio (o Projeto 2 le issues e abre PRs com o gh).
  $st = Invoke-WsProcess $exe @('auth', 'status') -TimeoutSec 60
  if ($st.ExitCode -ne 0) {
    if ($script:Mode -eq 'install' -and -not $script:Sim -and -not $script:GhAsked -and (Test-WsInteractive)) {
      $script:GhAsked = $true
      if (Read-WsYesNo (M 's6_pergunta_login') $true) {
        Write-WsLog '$ gh auth login --hostname github.com --git-protocol https --web (interactive)'
        & $exe auth login --hostname github.com --git-protocol https --web | Out-Default
      }
    }
    if ((Invoke-WsProcess $exe @('auth', 'status') -TimeoutSec 60).ExitCode -ne 0) {
      $script:GhSemLogin = $true
      Set-WsDetail ''
      Set-WsFail 'E-GH-02' ''
      return $false
    }
  }
  $script:GhSemLogin = $false
  # O git passa a usar as credenciais do gh (push e PR no /task-report sem pedir password).
  if ($script:Mode -eq 'install') { $null = Invoke-WsProcess $exe @('auth', 'setup-git') -TimeoutSec 60 }
  return $true
}

function Install-WsStep6 {
  # Ja instalado, so falta o login: nao voltar a descarregar.
  if ($script:GhSemLogin -and $script:GhExe) { Set-WsFail 'E-GH-02' ''; return $false }
  if ((Test-WsWinget) -and (Invoke-WsWinget 'GitHub.cli')) { if (Test-WsStep6) { return $true }; if ($script:GhSemLogin) { return $false } }
  $a = 'amd64'
  if ($script:Arch -eq 'arm64') { $a = 'arm64' }
  $file = 'gh_{0}_windows_{1}.zip' -f $script:C.GH_VERSION, $a
  $d = Join-Path $script:Tmp 'gh'
  Remove-Item -LiteralPath $d -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path (Join-Path $d 'x') -Force | Out-Null
  $sums = Expand-WsPattern $script:C.GH_RELEASE_URL @{ version = $script:C.GH_VERSION; file = ('gh_{0}_checksums.txt' -f $script:C.GH_VERSION) }
  $url = Expand-WsPattern $script:C.GH_RELEASE_URL @{ version = $script:C.GH_VERSION; file = $file }
  Write-WsSay ('  ' + (M 'a_descarregar' @{ O_QUE = $file }))
  if (-not (Invoke-WsDownload $sums (Join-Path $d 'sums')) -or -not (Invoke-WsDownload $url (Join-Path $d $file))) { Set-WsFail (Get-WsDlCode) $url; return $false }
  $want = Get-WsSumFor (Join-Path $d 'sums') $file
  if (-not $want -or $want -ne (Get-WsSha256 (Join-Path $d $file))) { Set-WsFail 'E-GH-01' ('SHA-256 ' + $file); return $false }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $d $file), (Join-Path $d 'x'))
  $src = Get-ChildItem -Path (Join-Path $d 'x') -Recurse -Filter 'gh.exe' | Select-Object -First 1
  if (-not $src) { Set-WsFail 'E-GH-01' 'gh.exe'; return $false }
  New-Item -ItemType Directory -Path (Join-Path $script:WsHome 'bin') -Force | Out-Null
  Copy-Item -LiteralPath $src.FullName -Destination (Join-Path $script:WsHome 'bin\gh.exe') -Force
  Add-WsUserPath (Join-Path $script:WsHome 'bin')
  if (Test-WsStep6) { return $true }
  if ($script:GhSemLogin) { return $false }
  Set-WsFail 'E-GH-01' 'gh --version'; return $false
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
  param([string]$Exe)
  if ((Invoke-WsProcess $Exe @('auth', 'status') -TimeoutSec 60).ExitCode -eq 0) { return $true }
  return ((Invoke-WsProcess $Exe @('jira', 'auth', 'status') -TimeoutSec 60).ExitCode -eq 0)
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
      & $exe auth login | Out-Default
    }
  }
  if (-not (Test-WsAcliLogin $exe)) { Add-WsNote (M 's7_acli_login') }
  return $true
}

function Test-WsStep7 {
  param([switch]$AcliTried)
  if (-not $script:ClaudeExe) { $script:ClaudeExe = Get-WsClaude }
  $r = Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'atlassian') -TimeoutSec 120
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-MCP-01' ''; return $false }
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
  Write-WsSay ('  ' + (M 'a_descarregar' @{ O_QUE = $file }))
  if (-not (Invoke-WsDownload $url (Join-Path $d $file))) { $script:AcliErr = (Get-WsDlCode) + ' ' + $url; return $false }
  if ((Get-WsSha256 (Join-Path $d $file)) -ne $want) { $script:AcliErr = 'SHA-256 ' + $file; return $false }
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
  $g = Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'atlassian') -TimeoutSec 120
  if ($g.ExitCode -ne 0) {
    $r = Invoke-WsProcess $script:ClaudeExe @('mcp', 'add', '--transport', 'http', '--scope', 'user', 'atlassian', $script:C.ATLASSIAN_MCP_URL) -TimeoutSec 120
    if ($r.ExitCode -ne 0) { Set-WsFail 'E-MCP-01' ''; return $false }
    Register-WsExtra 'mcp' 'atlassian' '' '' ''
    $l = Invoke-WsProcess $script:ClaudeExe @('mcp', 'list') -TimeoutSec 180
    if ($l.StdOut -notmatch '(?m)^atlassian') { Set-WsFail 'E-MCP-01' 'claude mcp list'; return $false }
  }
  if (-not (Get-WsAcli)) { $null = Install-WsAcli }
  return (Test-WsStep7 -AcliTried)
}

# =============================================================== PASSO 8 - nivel do utilizador

function Invoke-WsInstallUser {
  param([string]$Sub)
  $a = Get-WsInstallUserArgs -Sub $Sub -NodePath $script:NodeExe -KitSrc $script:KitSrc -CaPem $script:CaPem -Proxy $script:Proxy -SubstituirStatusline:($Sub -eq 'instalar' -and $script:SubstSl) -Lang $script:Lang -NoProxy $script:NoProxy
  return (Invoke-WsProcess $script:NodeExe $a -TimeoutSec 600)
}

function Read-WsInstallUserOutput {
  param([string]$Text)
  $skills = 0; $agentes = 0; $lang = ''; $nossa = '0'; $kit = ''; $temLingua = $false; $err = ''; $det = ''
  foreach ($kv in (ConvertFrom-WsTsv $Text)) {
    switch ($kv[0]) {
      'skills' { $skills = $kv[1] }
      'agentes' { $agentes = $kv[1] }
      'lingua' { $temLingua = $true }
      'language' { $lang = $kv[1] }
      'language_nossa' { $nossa = $kv[1] }
      'lingua_kit' { $kit = $kv[1] }
      'aviso' { if ($kv[1] -eq 'E-CFG-06') { Add-WsNote (M 's8_statusline_mantida') }; Set-WsWarn $kv[1] 'statusLine' }
      'erro' { $err = $kv[1] }
      'erro_detalhe' { $det = $kv[1] }
      'falta' { Write-WsLog ('missing: ' + $kv[1]) }
    }
  }
  # settings.json com erro: o caminho e onde esta o erro (linha e coluna, ou o campo) ficam no ecra, sem o
  # "0 skills, 0 agents".
  if ($err) {
    $p = $det
    if ($err -eq 'E-CFG-05') { $p = Join-Path $script:ClaudeDir 'settings.json'; if ($det) { $p += ' - ' + $det } }
    Set-WsFail $err $p
    return
  }
  Set-WsDetail (M 's8_ja' @{ SKILLS = $skills; AGENTES = $agentes })
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
  return ($r.ExitCode -eq 0)
}

function Install-WsStep8 {
  if (-not (Initialize-WsKit)) { Set-WsFail 'E-KIT-01' ''; return $false }
  # O detalhe e as notas sao os desta instalacao (o Test do passo ja os tinha escrito uma vez).
  $script:T['8'].Detalhe = ''; $script:T['8'].Notas = @()
  $r = Invoke-WsInstallUser 'instalar'
  Read-WsInstallUserOutput $r.StdOut
  # Numa falha o detalhe ("0 skills, 0 agents") e as notas da lingua nao valem: fica o titulo do codigo.
  if ($r.ExitCode -ne 0) { $script:T['8'].Detalhe = ''; $script:T['8'].Notas = @() }
  if ($r.ExitCode -eq 3) { if (-not $script:T['8'].Falha) { Set-WsFail 'E-CFG-05' (Join-Path $script:ClaudeDir 'settings.json') }; return $false }
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-KIT-03' ('install-user ({0})' -f $r.ExitCode); return $false }
  Sync-WsExtras
  return $true
}

# =============================================================== PASSO 9 - projetos

function Test-WsGitTag {
  param([string]$Dir, [string]$Ref)
  if (-not $script:GitExe) { $script:GitExe = Get-WsGit }
  $r = Invoke-WsProcess $script:GitExe @('-C', $Dir, 'rev-parse', '-q', '--verify', $Ref) -TimeoutSec 60
  return ($r.ExitCode -eq 0)
}

# Nomes desde a v1.0.0-rc.2: o projeto de treino e %USERPROFILE%\workshop-claude\practice-project (era
# exemplo-projeto-real) e a tag do estado inicial da Arena e arena-start (era arena-inicial). Instalacoes antigas
# sao migradas sem perder trabalho: a pasta antiga so e movida se a nova nao existir; a tag nova aponta para o
# mesmo commit.
$script:PracticeDir = 'practice-project'
$script:PracticeDirOld = 'exemplo-projeto-real'

function Invoke-WsStep9Migrate {
  $demo = Join-Path $script:Proj 'demo-project'
  if ((Test-Path -LiteralPath (Join-Path $demo '.arena-kit.json')) -and -not (Test-WsGitTag $demo 'refs/tags/arena-start') -and (Test-WsGitTag $demo 'refs/tags/arena-inicial')) {
    $r = Invoke-WsProcess $script:GitExe @('-C', $demo, 'tag', 'arena-start', 'arena-inicial') -TimeoutSec 60
    if ($r.ExitCode -eq 0) { Write-WsLog 'demo-project: tag arena-start added (from arena-inicial)' }
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
  if (-not (Test-Path -LiteralPath (Join-Path $demo '.arena-kit.json')) -or -not (Test-WsGitTag $demo 'refs/tags/arena-start')) { Set-WsFail 'E-DEMO-01' $demo; return $false }
  if (Test-Path -LiteralPath (Join-Path $script:KitSrc 'installer\assemble-sandbox.mjs')) {
    if (-not (Test-Path -LiteralPath (Join-Path $sb '.sandbox-kit.json')) -or -not (Test-WsGitTag $sb 'HEAD')) { Set-WsFail 'E-DEMO-01' $sb; return $false }
  }
  Set-WsDetail (M 's9_ja' @{ PROJETOS = $script:ProjShow })
  if ($script:Mode -ne 'install') { return (Test-WsAppTests) }
  return $true
}

function Test-WsAppTests {
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

function Invoke-WsAssemble {
  param([string]$Script, [string]$Dest, [string]$Mark, [string[]]$Extra)
  $force = @()
  if ((Test-Path -LiteralPath $Dest) -and @(Get-ChildItem -LiteralPath $Dest -Force).Count -gt 0) {
    if (Test-Path -LiteralPath (Join-Path $Dest $Mark)) {
      $ref = 'HEAD'
      if ($Mark -eq '.arena-kit.json') { $ref = 'refs/tags/arena-start' }
      if (-not (Test-WsGitTag $Dest $ref)) { $force = @('--force') }
    } else { Set-WsFail 'E-DEMO-03' $Dest; return $false }
  }
  $a = @((Join-Path $script:KitSrc ('installer\' + $Script)), '--dest', $Dest) + $Extra + $force
  $r = Invoke-WsProcess $script:NodeExe $a -TimeoutSec 600
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-DEMO-01' $Script; return $false }
  Register-WsExtra 'projeto' (Split-Path $Dest -Leaf) $Dest '' ''
  return $true
}

function Install-WsStep9 {
  if (-not (Initialize-WsKit)) { Set-WsFail 'E-KIT-01' ''; return $false }
  New-Item -ItemType Directory -Path $script:Proj -Force | Out-Null
  if (-not $script:GitExe) { $script:GitExe = Get-WsGit }
  Invoke-WsStep9Migrate
  if (-not (Invoke-WsAssemble 'assemble-demo.mjs' (Join-Path $script:Proj 'demo-project') '.arena-kit.json' @('--node', $script:NodeExe, '--language', $script:LangKit))) { return $false }
  if (Test-Path -LiteralPath (Join-Path $script:KitSrc 'installer\assemble-sandbox.mjs')) {
    if (-not (Invoke-WsAssemble 'assemble-sandbox.mjs' (Join-Path $script:Proj $script:PracticeDir) '.sandbox-kit.json' @('--language', $script:LangKit))) { return $false }
  }
  Set-WsDetail (M 's9_ja' @{ PROJETOS = $script:ProjShow })
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
  # The app's data folder (the app's own rule): AGENT_MEMORY_HOME; MEMORIA_HOME; ~\.memoria if it exists and
  # ~\.agent-memory does not; otherwise ~\.agent-memory. Nothing is ever moved or deleted.
  # ~ e a pasta do perfil ($script:UserHome), como na app (Path.home() = USERPROFILE), nunca o H:\ do $HOME.
  param([hashtable]$EnvValues = $null, [string]$UserHome = '')
  if (-not $UserHome) { $UserHome = $script:UserHome }
  if (-not $UserHome) { $UserHome = Get-WsUserHome ([Environment]::GetFolderPath('UserProfile')) $env:USERPROFILE $HOME }
  if ($null -eq $EnvValues) { $EnvValues = @{ AGENT_MEMORY_HOME = $env:AGENT_MEMORY_HOME; MEMORIA_HOME = $env:MEMORIA_HOME } }
  if ($EnvValues['AGENT_MEMORY_HOME']) { return [string]$EnvValues['AGENT_MEMORY_HOME'] }
  if ($EnvValues['MEMORIA_HOME']) { return [string]$EnvValues['MEMORIA_HOME'] }
  $new = Join-Path $UserHome '.agent-memory'
  $old = Join-Path $UserHome '.memoria'
  if (-not (Test-Path -LiteralPath $new) -and (Test-Path -LiteralPath $old)) { return $old }
  return $new
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
  if ($r.ExitCode -eq 0) {
    Set-WsDetail (M 's10_ok' @{ VERSAO = $Ver; PY = $st.Python })
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
    if ((Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', $script:McpName) -TimeoutSec 120).ExitCode -ne 0) { Set-WsFail 'E-MEM-03' 'mcp'; return $false }
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
  $ver = $script:C.MEMORY_APP_VERSION.TrimStart('v')
  $d = Join-Path $script:Tmp 'agent-memory'
  Remove-Item -LiteralPath $d -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $d -Force | Out-Null
  if (-not (Invoke-WsDownload (Get-WsReleaseUrl 'memory' 'SHA256SUMS') (Join-Path $d 'SHA256SUMS') -Auth)) {
    if (@(403, 404, 410) -contains $script:DlHttp) { Set-WsFail 'E-MEM-01' $script:C.MEMORY_APP_VERSION } else { Set-WsFail (Get-WsDlCode) 'SHA256SUMS' }
    return $false
  }
  $whl = Get-WsMemoryWheel (Join-Path $d 'SHA256SUMS') $ver
  $dist = $whl.Split('-')[0]
  Write-WsSay ('  ' + (M 'a_descarregar' @{ O_QUE = $whl }))
  foreach ($f in @($whl, 'constraints.txt')) {
    if (-not (Invoke-WsDownload (Get-WsReleaseUrl 'memory' $f) (Join-Path $d $f) -Auth)) {
      if (@(403, 404, 410) -contains $script:DlHttp) { Set-WsFail 'E-MEM-01' $f } else { Set-WsFail 'E-NET-07' $f }
      return $false
    }
    $want = Get-WsSumFor (Join-Path $d 'SHA256SUMS') $f
    if (-not $want -or $want -ne (Get-WsSha256 (Join-Path $d $f))) { Set-WsFail 'E-MEM-02' $f; return $false }
  }
  if (-not (Install-WsWebView2)) { Set-WsWarn 'E-MEM-04' '' }
  Write-WsSay ('  ' + (M 'a_instalar'))
  # O uv traz o seu proprio Python (--managed-python): nao depende de nenhum Python do sistema.
  # As variaveis que o proibiriam sao retiradas so deste processo, nunca globalmente.
  $uvArgs = @('tool', 'install', '--managed-python', '--python', $script:C.PYTHON_VERSION, (Join-Path $d $whl), '--constraints', (Join-Path $d 'constraints.txt'), '--force')
  $uvEnv = @{}
  $r = Invoke-WsProcess $script:UvExe $uvArgs -TimeoutSec 1800 -RemoveEnv $script:UvBlockEnv
  if ($r.ExitCode -ne 0) {
    # Certificado da empresa: o passo 0 so testa a api.anthropic.com, e um proxy pode inspecionar so o github.com (o
    # Python do uv) ou o pypi.org. Repete uma vez com os certificados do Windows (o uv usa os seus por defeito).
    if (($r.StdOut + ' ' + $r.StdErr) -notmatch 'certificate|UnknownIssuer|CERTIFICATE_VERIFY_FAILED|local issuer|self.signed') { Set-WsFail 'E-MEM-03' 'uv tool install'; return $false }
    if (@('true', '1') -contains [string]$env:UV_SYSTEM_CERTS) { Set-WsFail 'E-NET-04' 'uv: github.com / pypi.org'; return $false }
    Write-WsLog 'uv: certificate error, retrying with UV_SYSTEM_CERTS=true'
    $uvEnv['UV_SYSTEM_CERTS'] = 'true'
    $r = Invoke-WsProcess $script:UvExe $uvArgs -TimeoutSec 1800 -RemoveEnv $script:UvBlockEnv -Environment $uvEnv
    if ($r.ExitCode -ne 0) { Set-WsFail 'E-NET-04' 'uv: github.com / pypi.org'; return $false }
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

function Register-WsMemoryMcp {
  # Registers the app's MCP server as "agent-memory" (command "<exe> mcp"). An old "memoria" registration goes,
  # and an "agent-memory" one that points to another program (e.g. an older memoria.exe) is redone.
  param([string]$Exe)
  if (-not $script:ClaudeExe) { return $true }
  if ((Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'memoria') -TimeoutSec 120).ExitCode -eq 0) {
    [void](Invoke-WsProcess $script:ClaudeExe @('mcp', 'remove', '--scope', 'user', 'memoria') -TimeoutSec 120)
  }
  $cur = Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', $script:McpName) -TimeoutSec 120
  if ($cur.ExitCode -eq 0) {
    if (([string]$cur.StdOut).Replace('\\', '\').Contains($Exe)) { return $true }
    [void](Invoke-WsProcess $script:ClaudeExe @('mcp', 'remove', '--scope', 'user', $script:McpName) -TimeoutSec 120)
  }
  $m = Invoke-WsProcess $script:ClaudeExe @('mcp', 'add', '--scope', 'user', $script:McpName, '--', $Exe, 'mcp') -TimeoutSec 120
  if ($m.ExitCode -ne 0) { return $false }
  Register-WsExtra 'mcp' $script:McpName '' '' ''
  return $true
}

function Write-WsMemoryConfig {
  # <pasta dos dados>\config.json com as chaves que a app usa para se atualizar. Sem escrita na pasta (de outro
  # utilizador, um ficheiro, so de leitura) devolve $false: o erro vai para o log do passo, nunca para o ecra.
  try {
    $dir = Get-WsMemoryHome
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
  if (-not (Invoke-WsDownload $url $f)) { Set-WsFail 'E-DESK-02' ('HTTP ' + $script:DlHttp); Set-WsWarn 'E-DESK-01' ''; return $false }
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
  $o = @{ Json = $false; Erro = $true; Resposta = ''; Custo = (Get-WsCusto $null $script:Pricing); Causa = ''; Comandos = @(); Raw = $null }
  $j = $null
  try { $j = $Json | ConvertFrom-Json } catch { return $o }
  if (-not $j) { return $o }
  $o.Json = $true; $o.Raw = $j
  $o.Erro = [bool]$j.is_error
  if ($j.PSObject.Properties.Name -contains 'result') { $o.Resposta = [string]$j.result }
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

function Install-WsStep12 {
  if (-not $script:ClaudeExe) { $script:ClaudeExe = Get-WsClaude }
  $t0 = Get-Date
  $r = Invoke-WsProcess $script:ClaudeExe @('-p', (M 's12_prompt'), '--model', 'claude-haiku-5-5', '--output-format', 'json', '--tools', '') -WorkingDirectory $script:Tmp -TimeoutSec 300
  $secs = [int]((Get-Date) - $t0).TotalSeconds
  $o = Read-WsResult $r.StdOut
  Write-WsLog ('final test: exit {0} error {1} cost {2}' -f $r.ExitCode, $o.Erro, $o.Custo.Texto)
  if ($r.ExitCode -eq 0 -and $o.Json -and -not $o.Erro) {
    Set-WsDetail (M 's12_ok' @{ RESPOSTA = $o.Resposta.Trim(); SEG = $secs; USD = $o.Custo.Texto })
    if ($null -eq $o.Custo.Usd) { Add-WsNote (M 's12_custo_desconhecido') }
    return $true
  }
  $all = $r.StdErr + ' ' + $o.Resposta
  if ($all -match 'credit balance|billing') { Set-WsFail 'E-SMOKE-02' '' }
  elseif ($all -match '429|rate_limit|[Rr]ate limit') { Set-WsFail 'E-SMOKE-03' '' }
  elseif ($all -match 'not_found_error|[Ii]nvalid model|model:') { Set-WsFail 'E-SMOKE-04' 'claude-haiku-5-5' }
  elseif ($all -match 'certificate|CERT_|SELF_SIGNED') { Set-WsFail 'E-NET-04' '' }
  elseif ($all -match 'ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|fetch failed|[Uu]nable to connect') { Set-WsFail 'E-NET-05' '' }
  elseif ($all -match '[Nn]ot logged in|/login|authentication_error|[Ii]nvalid API key') { Set-WsFail 'E-AUTH-01' '' }
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
  param([string]$Prompt, [string]$Schema)
  $a = @('-p', '--model', 'claude-haiku-5-5', '--tools', '', '--disallowedTools', 'mcp__*', '--output-format', 'json')
  if ($Schema) { $a += @('--json-schema', $Schema) }
  $r = Invoke-WsProcess $script:ClaudeExe $a -StdinText $Prompt -WorkingDirectory $script:Tmp -TimeoutSec 300
  if ($r.ExitCode -ne 0) { return $null }
  return (Read-WsResult $r.StdOut)
}

function Invoke-WsHelper {
  # Depois de um passo falhar: oferece a analise do Claude. Devolve $true se valer a pena repetir o passo.
  param([string]$N)
  if (-not $script:AuthOk) { return $false }
  $code = $script:T[$N].Falha[0]
  # Rede, login, Group Policy e antivirus: o Claude nao resolve nada disso a partir daqui.
  if ($code -like 'E-NET-*' -or $code -like 'E-AUTH-*' -or $code -eq 'E-SO-07' -or $code -eq 'E-PERM-02') { return $false }
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
  if (-not $script:AuthOk -or -not $script:NetApiOk) { Write-WsSay ('  ' + (M 'doctor_sem_claude')); return }
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
  $o = Invoke-WsClaudeHelper $prompt ''
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
  if ($sum.Avisos -gt 0) { $lines += (M 'final_avisos' @{ N = $sum.Avisos }) }
  Write-WsSay ''
  Write-WsSay ('-' * 64)
  foreach ($l in $lines) { Write-WsSay $l }
  if ($script:Mode -eq 'install') { Write-WsSay (M 'final_reiniciar') }
  if ($script:TodoMcp) { Write-WsSay (M 's7_oauth') }
  Write-WsSay (M 'final_ficheiros' @{ RESUMO = $script:Resumo; LOG = $script:LogFile }) 'DarkGray'
  try {
    [IO.File]::WriteAllText($script:Resumo, (($lines -join "`r`n") + "`r`n"), $script:Utf8NoBom)
    Remove-Item -LiteralPath (Join-Path $script:WsHome 'resumo.txt') -Force -ErrorAction SilentlyContinue   # the summary's old name
  } catch { }
  return $sum.Faltam
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
  $script:UvExe = Get-WsUv
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
      'erro' { Write-WsSay ('  ' + $kv[1]) 'Red' }
    }
  }
  Remove-Item -LiteralPath (Join-Path $script:WsHome 'kit-src') -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath (Join-Path $script:WsHome 'extras-pendentes.tsv') -Force -ErrorAction SilentlyContinue
  Write-WsSay ''
  Write-WsSay (M 'desinst_fim' @{ BACKUP = (Join-Path $script:WsHome 'backup') })
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

function Initialize-WsLang {
  # Lingua da maquina: so configura a "language" do Claude Code e a lingua do kit; o setup fala sempre ingles.
  $ui = ''; $cu = ''
  try { $ui = [string](Get-UICulture).Name } catch { $ui = '' }
  try { $cu = [string](Get-Culture).Name } catch { $cu = '' }
  $script:Lang = Select-WsLang $env:WORKSHOP_LANG $ui $cu
  $script:LangKit = Get-WsLangKit $script:Lang
  Write-WsLog ('language: WORKSHOP_LANG={0} UICulture={1} Culture={2} -> {3} (kit {4})' -f $env:WORKSHOP_LANG, $ui, $cu, $script:Lang, $script:LangKit)
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

function Invoke-WsMain {
  $o = $script:Params
  $script:Mode = 'install'
  if ($o.Check) { $script:Mode = 'check' }
  if ($o.Doctor) { $script:Mode = 'doctor' }
  if ($o.Desinstalar) { $script:Mode = 'uninstall' }
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
  $script:Tmp = Join-Path ([IO.Path]::GetTempPath()) ('ws-setup-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
  New-Item -ItemType Directory -Path $script:Tmp -Force | Out-Null
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
    Write-WsSay (M 'titulo') 'White'
    switch ($script:Mode) {
      'uninstall' { Write-WsSay (M 'modo_desinstalar' @{ MANIFEST = (Join-Path $script:WsHome 'manifest.json') }); return (Invoke-WsUninstall) }
      'check' { Write-WsSay (M 'tempo_check') }
      'doctor' { Write-WsSay (M 'modo_doctor'); Write-WsSay (M 'tempo_check') }
      default {
        Write-WsSay (M 'instala')
        foreach ($i in $script:Msgs.ui.instala_lista) { Write-WsSay ('  - ' + (Format-WsFill $i)) }
        Write-WsSay (M 'tempo')
        if ($script:Sim) { Write-WsSay (M 'modo_sim') }
      }
    }
    Write-WsSay (M 'log_em' @{ LOG = $script:LogFile }) 'DarkGray'
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
    Sync-WsExtras
    $faltam = Write-WsSummary
    if ($script:Mode -eq 'doctor') { Invoke-WsDoctor }
    if ($faltam -gt 0) { return 1 }
    return 0
  } finally {
    Exit-WsLock $lock
    Remove-Item -LiteralPath $script:Tmp -Recurse -Force -ErrorAction SilentlyContinue
  }
}

if ($env:WS_NO_MAIN -ne '1' -and $MyInvocation.InvocationName -ne '.') {
  $code = Invoke-WsMain
  exit $code
}
