#Requires -Version 5.1
<#
.SYNOPSIS
  Setup do workshop "Orquestracao de Agentes com Claude" para Windows 10/11 (x64 e ARM64). Sem admin.

.DESCRIPTION
  Normalmente corre-se pelo bootstrap:   irm <url>/bootstrap-windows.ps1 | iex
  Ou diretamente:                        powershell -NoProfile -ExecutionPolicy Bypass -File setup-windows.ps1
  Depois da primeira vez:                powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\.workshop-claude\setup-windows.ps1" -Check

  Este ficheiro e so ASCII (o PowerShell 5.1 le UTF-8 sem BOM como ANSI). Todos os textos em pt-PT
  vem de setup/messages.pt.json (o mesmo catalogo de docs/TROUBLESHOOTING.md), lido como UTF-8.

.PARAMETER Check
  So verifica e mostra o estado (2 a 3 minutos). Nao instala nada.
.PARAMETER Doctor
  Verifica tudo e, se algo falhar, pede ao Claude um diagnostico completo.
.PARAMETER Desinstalar
  Desfaz o que o setup instalou (manifest.json): settings, MCP, agentes, skills, kit, app e atalho.
.PARAMETER SemDesktop
  Nao instala o Claude Desktop (opcional).
.PARAMETER Sim
  Responde "sim" as perguntas simples (para testes). Logins e comandos sugeridos nunca correm sozinhos.
.PARAMETER SubstituirStatusline
  Substitui uma statusline existente pela do workshop (a tua fica no backup).
#>
[CmdletBinding()]
param(
  [switch]$Check,
  [switch]$Doctor,
  [switch]$Desinstalar,
  [switch]$SemDesktop,
  [switch]$Sim,
  [switch]$SubstituirStatusline,
  [switch]$Ajuda
)

$script:Params = @{ Check = [bool]$Check; Doctor = [bool]$Doctor; Desinstalar = [bool]$Desinstalar; SemDesktop = [bool]$SemDesktop; Sim = [bool]$Sim; SubstituirStatusline = [bool]$SubstituirStatusline; Ajuda = [bool]$Ajuda }

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

function Resolve-WsModel {
  param([string]$Id, $Pricing)
  if (-not $Id -or -not $Pricing) { return $null }
  $m = ($Id.ToLowerInvariant() -replace '\[.*\]$', '')
  if ($Pricing.aliases -and ($Pricing.aliases.PSObject.Properties.Name -contains $m)) { return $Pricing.aliases.$m }
  $keys = @($Pricing.modelos.PSObject.Properties.Name | Sort-Object { $_.Length } -Descending)
  foreach ($k in $keys) { if ($m -eq $k -or $m.StartsWith($k + '-') -or $m.StartsWith($k + '@')) { return $k } }
  return $null
}

function Format-WsUsd {
  param($Value)
  if ($null -eq $Value) { return 'US$ ?' }
  $v = [double]$Value
  $casas = 2
  if ($v -lt 0.01) { $casas = 4 }
  return 'US$ ' + $v.ToString('F' + $casas, [Globalization.CultureInfo]::InvariantCulture).Replace('.', ',')
}

function Get-WsCusto {
  # Custo de um resultado "claude -p --output-format json" pelos tokens de modelUsage e o pricing.json
  # (mesmas contas que installer/lib/custo.mjs; casos em tools/test/custo-cases.json).
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
      $p = $Pricing.modelos.$k
      $it = 0; $cr = 0; $cw = 0; $ot = 0
      if ($u.inputTokens) { $it = [double]$u.inputTokens }
      if ($u.cacheReadInputTokens) { $cr = [double]$u.cacheReadInputTokens }
      if ($u.cacheCreationInputTokens) { $cw = [double]$u.cacheCreationInputTokens }
      if ($u.outputTokens) { $ot = [double]$u.outputTokens }
      if (($p.PSObject.Properties.Name -contains 'prompt_longo') -and (($it + $cr + $cw) -gt [double]$p.prompt_longo.acima_de_tokens)) { $p = $p.prompt_longo }
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
  param([string]$Status, [int]$Http)
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

function Get-WsInstallUserArgs {
  # Argumentos para "node install-user.mjs <sub>": caminhos completos, um argumento cada (espacos e acentos).
  param([string]$Sub, [string]$NodePath, [string]$KitSrc, [string]$CaPem, [string]$Proxy, [switch]$SubstituirStatusline)
  $a = @([IO.Path]::Combine($KitSrc, 'installer', 'install-user.mjs'), $Sub, '--node', $NodePath, '--kit-src', $KitSrc)
  if ($CaPem) { $a += @('--ca-pem', $CaPem) }
  if ($Proxy) { $a += @('--https-proxy', $Proxy) }
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
    'aviso' { return '[AVISO]' }
    'falhou' { return '[FALHA]' }
    'falta' { return '[FALHA]' }
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
  # Variaveis que impedem o uv de usar o Python gerido (a app Memoria precisa dele). Devolve os nomes.
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
  # Primeira linha do "memoria selftest": "Memoria 0.1.0 . Python 3.12.13 . Windows AMD64". Devolve @{ Python; Fts5; Falhas }.
  param([string]$Text)
  $py = ''
  $m = [regex]::Match([string]$Text, 'Python ([0-9]+\.[0-9]+(\.[0-9]+)?)')
  if ($m.Success) { $py = $m.Groups[1].Value }
  $fts = [bool]([regex]::IsMatch([string]$Text, '(?m)^\s*\[OK\].*FTS5'))
  $falhas = @([regex]::Matches([string]$Text, '(?m)^\s*\[FALHOU\]\s*(.+)$') | ForEach-Object { $_.Groups[1].Value.Trim() })
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
  if ($script:Sim -and -not $NeverSim) { Write-WsSay ('  ? {0} {1} s (-Sim)' -f $Question, $hint); return $true }
  if ($script:Sim) { Write-WsSay ('  ? {0} {1} n (-Sim)' -f $Question, $hint); return $false }
  if (-not (Test-WsInteractive)) { Write-WsSay ('  ? {0} {1} n - {2}' -f $Question, $hint, (M 'sem_tty')); return $false }
  $ans = Read-Host ('  ? {0} {1}' -f $Question, $hint)
  Write-WsLog ('pergunta: {0} -> {1}' -f $Question, $ans)
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
    Write-WsLog ('  -> nao arrancou: {0}' -f $_.Exception.Message)
    return @{ ExitCode = -1; StdOut = ''; StdErr = $_.Exception.Message }
  }
  $outTask = $p.StandardOutput.ReadToEndAsync()
  $errTask = $p.StandardError.ReadToEndAsync()
  if ($StdinText) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($StdinText)
    $p.StandardInput.BaseStream.Write($bytes, 0, $bytes.Length)
  }
  $p.StandardInput.Close()
  if (-not $p.WaitForExit($TimeoutSec * 1000)) {
    try { $p.Kill() } catch { }
    Write-WsLog '  -> excedeu o tempo'
    return @{ ExitCode = -2; StdOut = ''; StdErr = 'timeout' }
  }
  $p.WaitForExit()
  $r = @{ ExitCode = $p.ExitCode; StdOut = $outTask.Result; StdErr = $errTask.Result }
  Add-WsStepLog ($r.StdOut + "`n" + $r.StdErr)
  Write-WsLog ('  -> codigo {0}' -f $r.ExitCode)
  return $r
}

function Add-WsStepLog {
  param([string]$Text)
  if ($null -ne $script:StepLog -and $Text) { [void]$script:StepLog.Append($Text); [void]$script:StepLog.Append("`n") }
}

function Get-WsSha256 {
  param([string]$Path)
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
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
  # Define $script:DlHttp e $script:DlStatus.
  param([string]$Url, [string]$OutFile, [switch]$Auth)
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
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $part -Headers $headers -UserAgent $script:UA -TimeoutSec 600 -ErrorAction Stop
    Move-Item -LiteralPath $part -Destination $OutFile -Force
    $script:DlHttp = 200
    return $true
  } catch {
    $ex = $_.Exception
    if ($ex -is [System.Net.WebException]) {
      $script:DlStatus = [string]$ex.Status
      if ($ex.Response) { try { $script:DlHttp = [int]$ex.Response.StatusCode } catch { } }
    }
    Write-WsLog ('  -> falhou: {0} (HTTP {1}, {2})' -f $ex.Message, $script:DlHttp, $script:DlStatus)
    Add-WsStepLog ('download falhou: ' + $Url + ' ' + $ex.Message)
    Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
    return $false
  }
}

function Get-WsDlCode { return (Get-WsNetCode $script:DlStatus $script:DlHttp) }

function Test-WsSignature {
  # Assinatura Authenticode valida e do editor esperado.
  param([string]$Path, [string]$Publisher)
  try {
    $s = Get-AuthenticodeSignature -LiteralPath $Path
    Write-WsLog ('assinatura de {0}: {1} {2}' -f $Path, $s.Status, $s.SignerCertificate.Subject)
    return ($s.Status -eq 'Valid' -and $s.SignerCertificate.Subject -match $Publisher)
  } catch { return $false }
}

function Update-WsSessionPath {
  # Recarrega o PATH desta sessao a partir do registo (Maquina + Utilizador) e acrescenta as pastas do kit.
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $p = ($machine, $user | Where-Object { $_ }) -join ';'
  foreach ($d in @((Join-Path $script:WsHome 'bin'), (Join-Path $script:WsHome 'node'), (Join-Path $HOME '.local\bin'))) {
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

function Set-WsWarn { param([string]$Code, [string]$Detail) $script:T[$script:Cur].Avisos += , @($Code, $Detail); Write-WsLog ('aviso {0} {1}' -f $Code, $Detail) }
function Set-WsFail { param([string]$Code, [string]$Detail) $script:T[$script:Cur].Falha = @($Code, $Detail); Write-WsLog ('falha {0} {1}' -f $Code, $Detail) }
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

function Invoke-WsStep {
  param([int]$N, [int[]]$Deps = @(), [switch]$Retry)
  $key = "$N"
  $script:Cur = $key
  $script:StepLog = New-Object System.Text.StringBuilder
  $script:T[$key] = @{ Estado = ''; Detalhe = ''; Avisos = @(); Falha = $null; Notas = @() }
  $title = $script:Titles[$key]
  Write-WsSay ''
  Write-WsSay (M 'passo' @{ N = $key; TITULO = $title }) 'White'
  Write-WsLog ('=== passo {0}: {1} (modo {2})' -f $key, $title, $script:Mode)
  $dep = Test-WsDependencies $script:T $Deps
  if ($null -ne $dep) {
    $script:T[$key].Estado = 'naoexec'; Set-WsDetail (M 'dep_falhou' @{ N = $dep }); Write-WsResult $key; return
  }
  if ($N -eq 11 -and $script:SemDesktop) { $script:T[$key].Estado = 'saltado'; Set-WsDetail '-SemDesktop'; Write-WsResult $key; return }
  $nonBlocking = ($N -eq 10 -or $N -eq 11)
  $detected = $false
  try { $detected = [bool](& ('Test-WsStep' + $N)) } catch { Write-WsLog ('erro na detecao: ' + $_.Exception.Message); $detected = $false }
  $s = $script:T[$key]
  if ($detected) {
    if ($s.Avisos.Count -gt 0) { $s.Estado = 'aviso' }
    elseif ($script:Mode -eq 'install' -and $N -ne 0) { $s.Estado = 'ja' }
    elseif ($script:Mode -eq 'install') { $s.Estado = 'feito' }
    else { $s.Estado = 'ok' }
  } elseif ($script:Mode -ne 'install') {
    if (-not $s.Falha) { Set-WsFail (Get-WsDefaultCode $key) '' }
    if (Test-WsMissingCode $script:T[$key].Falha[0]) { Set-WsFail 'E-SETUP-01' $script:T[$key].Falha[0] }
    $s = $script:T[$key]
    if ($nonBlocking) { $s.Estado = 'aviso'; $s.Avisos += , $s.Falha; $s.Falha = $null } else { $s.Estado = 'falta' }
  } else {
    $s.Avisos = @(); $s.Falha = $null
    $ok = $false
    try { $ok = [bool](& ('Install-WsStep' + $N)) } catch { Write-WsLog ('erro: ' + $_.Exception.Message); Add-WsStepLog $_.Exception.ToString(); $ok = $false }
    $s = $script:T[$key]
    if ($ok) { if ($s.Avisos.Count -gt 0) { $s.Estado = 'aviso' } else { $s.Estado = 'feito' } }
    else {
      if (-not $s.Falha) { Set-WsFail (Get-WsDefaultCode $key) '' }
      if ($nonBlocking) { $s.Estado = 'aviso'; $s.Avisos += , $s.Falha; $s.Falha = $null } else { $s.Estado = 'falhou' }
    }
  }
  if ($script:StepLog.Length -gt 0) { Write-WsLog ("--- saida dos comandos (passo $key) ---`r`n" + $script:StepLog.ToString() + "`r`n--- fim ---") }
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
  if (Test-Path -LiteralPath (Join-Path $dest '.ws-kit-ok')) { $script:KitSrc = $dest; return $true }
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
          Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue
          New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
          Move-Item -LiteralPath $inner -Destination $dest
          [IO.File]::WriteAllText((Join-Path $dest '.ws-kit-ok'), (Get-Date -Format o))
          $script:KitSrc = $dest
          return $true
        }
      } catch { Add-WsStepLog $_.Exception.Message }
    }
  }
  # Recurso: git clone da tag. O REPO_TOKEN, se existir, vai por variaveis de configuracao do git.
  $git = Get-WsGit
  if (-not $git) { return $false }
  $clone = Join-Path $tmpd 'clone'
  $envs = @{ GIT_TERMINAL_PROMPT = '0' }
  if ($env:REPO_TOKEN) { $envs['GIT_CONFIG_COUNT'] = '1'; $envs['GIT_CONFIG_KEY_0'] = 'http.extraHeader'; $envs['GIT_CONFIG_VALUE_0'] = 'Authorization: token ' + $env:REPO_TOKEN }
  $r = Invoke-WsProcess $git @('clone', '-q', '--depth', '1', '--branch', $script:C.WORKSHOP_VERSION, $script:C.WORKSHOP_REPO_URL, $clone) -Environment $envs
  if ($r.ExitCode -ne 0) { return $false }
  Remove-Item -LiteralPath (Join-Path $clone '.git') -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
  Move-Item -LiteralPath $clone -Destination $dest
  [IO.File]::WriteAllText((Join-Path $dest '.ws-kit-ok'), (Get-Date -Format o))
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

function Get-WsUv { $c = Get-Command uv -ErrorAction SilentlyContinue; if ($c) { return $c.Source }; $p = Join-Path $HOME '.local\bin\uv.exe'; if (Test-Path -LiteralPath $p) { return $p }; return $null }
function Get-WsClaude { $p = Join-Path $HOME '.local\bin\claude.exe'; $c = Get-Command claude -ErrorAction SilentlyContinue; if ($c -and $c.CommandType -eq 'Application') { return $c.Source }; if (Test-Path -LiteralPath $p) { return $p }; return $null }

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
  $r = Invoke-WsProcess $w.Source @('--version') -TimeoutSec 60
  return ($r.ExitCode -eq 0)
}

function Invoke-WsWinget {
  param([string]$Id)
  $w = (Get-Command winget -ErrorAction SilentlyContinue).Source
  $r = Invoke-WsProcess $w @('install', '--id', $Id, '-e', '--scope', 'user', '--source', 'winget', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity') -TimeoutSec 1800
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
  if ($v.Major -lt 10 -or $v.Build -lt 18362) { Set-WsWarn 'E-SO-01' ('{0}.{1}.{2}' -f $v.Major, $v.Minor, $v.Build) }
  if ($arch -eq 'arm64') { Set-WsWarn 'E-SO-02' 'ARM64' }

  foreach ($f in @((Join-Path $env:ProgramFiles 'ClaudeCode\managed-settings.json'), (Join-Path $env:ProgramData 'ClaudeCode\managed-settings.json'))) {
    if ($f -and (Test-Path -LiteralPath $f)) { Set-WsWarn 'E-CFG-01' $f }
  }
  if (Test-Path 'HKLM:\SOFTWARE\Policies\ClaudeCode') { Set-WsWarn 'E-CFG-01' 'HKLM:\SOFTWARE\Policies\ClaudeCode' }
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
    $drive = Get-PSDrive -Name ($HOME.Substring(0, 1)) -ErrorAction Stop
    $gb = [math]::Floor($drive.Free / 1GB)
    Add-WsNote (M 's0_disco' @{ GB = $gb })
    if ($drive.Free -lt 3GB) { Set-WsWarn 'E-SO-06' ('{0} GB' -f $gb) }
  } catch { }
  $od = $env:OneDrive
  if ($od) {
    foreach ($pth in @($HOME, [Environment]::GetFolderPath('MyDocuments'), [Environment]::GetFolderPath('Desktop'), $script:Proj)) {
      if ($pth -and $pth.StartsWith($od, [StringComparison]::OrdinalIgnoreCase)) { Set-WsWarn 'E-SO-03' $pth; break }
    }
  }

  Test-WsProxy
  Test-WsTls
  Test-WsNetwork
  Set-WsDetail ($script:OsText + ' - ' + (M 's0_rede_ok' @{ OK = $script:NetOk; TOTAL = $script:NetTotal }))
  return $true
}
function Install-WsStep0 { return (Test-WsStep0) }

function Test-WsProxy {
  $script:Proxy = ''
  if ($env:HTTPS_PROXY) { $script:Proxy = $env:HTTPS_PROXY; Add-WsNote (M 's0_proxy_sistema' @{ PROXY = $env:HTTPS_PROXY + ' (HTTPS_PROXY)' }); return }
  try {
    $sys = [System.Net.WebRequest]::GetSystemWebProxy()
    $target = [Uri]'https://api.anthropic.com/'
    if (-not $sys.IsBypassed($target)) {
      $px = $sys.GetProxy($target)
      if ($px -and $px.AbsoluteUri -ne $target.AbsoluteUri) {
        $script:Proxy = ('http://{0}:{1}' -f $px.Host, $px.Port)
        $env:HTTPS_PROXY = $script:Proxy
        $env:NO_PROXY = 'localhost,127.0.0.1'
        Add-WsNote (M 's0_proxy_sistema' @{ PROXY = $script:Proxy })
        return
      }
    }
  } catch { Write-WsLog ('proxy: ' + $_.Exception.Message) }
  Add-WsNote (M 's0_sem_proxy')
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
    Write-WsLog ('rede: {0} -> {1} HTTP {2}' -f $h, $st, $http)
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
}

# =============================================================== PASSO 1 - git

function Set-WsGitBash {
  param([string]$Git)
  $root = Split-Path (Split-Path $Git)
  $bash = Join-Path $root 'bin\bash.exe'
  if (-not (Test-Path -LiteralPath $bash)) { $bash = Join-Path $root 'usr\bin\bash.exe' }
  if (-not (Test-Path -LiteralPath $bash)) { Set-WsWarn 'E-GIT-03' $root; return }
  if ($script:Mode -eq 'install') { Set-WsUserEnv 'CLAUDE_CODE_GIT_BASH_PATH' $bash }
  elseif ((Get-WsUserEnvRaw 'CLAUDE_CODE_GIT_BASH_PATH') -ne $bash -and $env:CLAUDE_CODE_GIT_BASH_PATH -ne $bash) { Set-WsWarn 'E-GIT-03' 'CLAUDE_CODE_GIT_BASH_PATH' }
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
  Write-WsSay ('  ' + (M 'a_instalar'))
  if ((Test-WsWinget) -and (Invoke-WsWinget 'Git.Git')) { if (Test-WsStep1) { return $true } }
  $file = $script:C.GIT_WINDOWS_FILE_X64; $want = $script:C.GIT_WINDOWS_SHA256_X64
  if ($script:Arch -eq 'arm64') { $file = $script:C.GIT_WINDOWS_FILE_ARM64; $want = $script:C.GIT_WINDOWS_SHA256_ARM64 }
  $url = Expand-WsPattern $script:C.GIT_WINDOWS_URL @{ version = $script:C.GIT_WINDOWS_VERSION; file = $file }
  $exe = Join-Path $script:Tmp $file
  Write-WsSay ('  ' + (M 'a_descarregar' @{ O_QUE = $file }))
  if (-not (Invoke-WsDownload $url $exe)) { Set-WsFail (Get-WsDlCode) $url; return $false }
  if ((Get-WsSha256 $exe) -ne $want.ToLowerInvariant()) { Set-WsFail 'E-GIT-02' ('SHA-256 ' + $file); return $false }
  $r = Invoke-WsProcess $exe @('/VERYSILENT', '/CURRENTUSER', '/NORESTART', '/SUPPRESSMSGBOXES', '/SP-', '/NOCANCEL') -TimeoutSec 1800
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-GIT-02' ('instalador ' + $r.ExitCode); return $false }
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
  Write-WsSay ('  ' + (M 'a_instalar'))
  $f = Join-Path $script:Tmp 'claude-install.ps1'
  if (-not (Invoke-WsDownload $script:C.CLAUDE_INSTALL_PS1_URL $f)) { Set-WsFail (Get-WsDlCode) $script:C.CLAUDE_INSTALL_PS1_URL; return $false }
  $r = Invoke-WsProcess (Join-Path $PSHOME 'powershell.exe') @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $f, $script:C.CLAUDE_CODE_VERSION) -TimeoutSec 1800
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-CC-01' 'install.ps1'; return $false }
  Add-WsUserPath (Join-Path $HOME '.local\bin')
  $c = Join-Path $HOME '.local\bin\claude.exe'
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
  Write-WsLog '$ claude auth login --console (interativo)'
  & $script:ClaudeExe auth login --console
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
  $ps = Join-Path $PSHOME 'powershell.exe'
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
    if ((Get-WsNodeMajor $x) -ge [int]$script:C.NODE_MIN_MAJOR) { $found = $x; break }
  }
  $script:NodeExe = $found
  if (-not $found) { Set-WsFail 'E-NODE-01' ('node >= ' + $script:C.NODE_MIN_MAJOR); return $false }
  $v = (Invoke-WsProcess $found @('-v')).StdOut.Trim()
  Set-WsDetail (M 's4_ja' @{ VERSAO = $v; CAMINHO = $found })
  Sync-WsExtras
  $fresh = Get-WsFreshNodeMajor
  Write-WsLog ('node num terminal novo: {0}' -f $fresh)
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
  $f = Join-Path $script:Tmp 'uv-install.ps1'
  $url = Expand-WsPattern $script:C.UV_INSTALL_PS1_URL @{ version = $script:C.UV_VERSION }
  if (-not (Invoke-WsDownload $url $f)) { Set-WsFail (Get-WsDlCode) $url; return $false }
  $r = Invoke-WsProcess (Join-Path $PSHOME 'powershell.exe') @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $f) -Environment @{ UV_NO_MODIFY_PATH = '1'; UV_INSTALL_DIR = (Join-Path $HOME '.local\bin') } -TimeoutSec 900
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-UV-01' 'install.ps1'; return $false }
  Add-WsUserPath (Join-Path $HOME '.local\bin')
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
        Write-WsLog '$ gh auth login --hostname github.com --git-protocol https --web (interativo)'
        & $exe auth login --hostname github.com --git-protocol https --web
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
    Set-WsWarn 'E-ACLI-01' $script:AcliErr
    return $true
  }
  Set-WsDetail (M 's7_ja_acli' @{ VERSAO = (Get-WsVersionOf $r.StdOut) })
  if (Test-WsAcliLogin $exe) { return $true }
  if ($script:Mode -eq 'install' -and -not $script:Sim -and -not $script:AcliAsked -and (Test-WsInteractive)) {
    $script:AcliAsked = $true
    if (Read-WsYesNo (M 's7_pergunta_acli') $true) {
      Write-WsLog '$ acli auth login (interativo)'
      & $exe auth login
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
  $a = Get-WsInstallUserArgs -Sub $Sub -NodePath $script:NodeExe -KitSrc $script:KitSrc -CaPem $script:CaPem -Proxy $script:Proxy -SubstituirStatusline:($Sub -eq 'instalar' -and $script:SubstSl)
  return (Invoke-WsProcess $script:NodeExe $a -TimeoutSec 600)
}

function Read-WsInstallUserOutput {
  param([string]$Text)
  $skills = 0; $agentes = 0
  foreach ($kv in (ConvertFrom-WsTsv $Text)) {
    switch ($kv[0]) {
      'skills' { $skills = $kv[1] }
      'agentes' { $agentes = $kv[1] }
      'aviso' { if ($kv[1] -eq 'E-CFG-06') { Add-WsNote (M 's8_statusline_mantida') }; Set-WsWarn $kv[1] 'statusLine' }
      'erro' { Set-WsFail $kv[1] '' }
      'falta' { Write-WsLog ('em falta: ' + $kv[1]) }
    }
  }
  Set-WsDetail (M 's8_ja' @{ SKILLS = $skills; AGENTES = $agentes })
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
  $r = Invoke-WsInstallUser 'instalar'
  Read-WsInstallUserOutput $r.StdOut
  if ($r.ExitCode -eq 3) { Set-WsFail 'E-CFG-05' (Join-Path $script:ClaudeDir 'settings.json'); return $false }
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

function Test-WsStep9 {
  if (-not (Initialize-WsKit)) { Set-WsFail 'E-KIT-01' ''; return $false }
  $demo = Join-Path $script:Proj 'demo-project'
  $sb = Join-Path $script:Proj 'exemplo-projeto-real'
  if (-not (Test-Path -LiteralPath (Join-Path $demo '.arena-kit.json')) -or -not (Test-WsGitTag $demo 'refs/tags/arena-inicial')) { Set-WsFail 'E-DEMO-01' $demo; return $false }
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
      if ($Mark -eq '.arena-kit.json') { $ref = 'refs/tags/arena-inicial' }
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
  if (-not (Invoke-WsAssemble 'assemble-demo.mjs' (Join-Path $script:Proj 'demo-project') '.arena-kit.json' @('--node', $script:NodeExe))) { return $false }
  if (Test-Path -LiteralPath (Join-Path $script:KitSrc 'installer\assemble-sandbox.mjs')) {
    if (-not (Invoke-WsAssemble 'assemble-sandbox.mjs' (Join-Path $script:Proj 'exemplo-projeto-real') '.sandbox-kit.json' @())) { return $false }
  }
  Set-WsDetail (M 's9_ja' @{ PROJETOS = $script:ProjShow })
  return (Test-WsAppTests)
}

# =============================================================== PASSO 10 - app Memoria (nao bloqueante)

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
  if (-not $script:UvExe) { return (Join-Path $HOME '.local\bin') }
  $r = Invoke-WsProcess $script:UvExe @('tool', 'dir', '--bin') -TimeoutSec 60
  $d = $r.StdOut.Trim()
  if ($r.ExitCode -eq 0 -and $d) { return $d }
  return (Join-Path $HOME '.local\bin')
}

function Get-WsShortcutPath {
  $name = 'Mem' + [char]0x00F3 + 'ria.lnk'
  return (Join-Path ([Environment]::GetFolderPath('Programs')) $name)
}

$script:UvBlockEnv = @('UV_PYTHON_DOWNLOADS', 'UV_NO_MANAGED_PYTHON', 'UV_PYTHON_PREFERENCE', 'UV_PYTHON')

function Invoke-WsMemoriaSelftest {
  # Corre "memoria selftest" e mostra o Python gerido pelo uv. Falha -> aviso E-MEM-05.
  param([string]$Exe, [string]$Ver)
  $r = Invoke-WsProcess $Exe @('selftest') -TimeoutSec 300 -Environment @{ PYTHONUTF8 = '1' }
  $st = Read-WsSelftest $r.StdOut
  if ($r.ExitCode -eq 0 -and $st.Fts5) {
    Set-WsDetail (M 's10_ok' @{ VERSAO = $Ver; PY = $st.Python })
    return $true
  }
  Set-WsDetail (M 's10_ja' @{ VERSAO = $Ver })
  $d = ($st.Falhas -join '; ')
  if (-not $d) { $d = 'memoria selftest (' + $r.ExitCode + ')' }
  Set-WsWarn 'E-MEM-05' $d
  return $false
}

function Test-WsStep10 {
  $ver = $script:C.MEMORY_APP_VERSION.TrimStart('v')
  $bin = Get-WsUvBin
  $exe = Join-Path $bin 'memoria.exe'
  if (-not (Test-Path -LiteralPath $exe)) { Set-WsFail 'E-MEM-01' ''; return $false }
  $l = Invoke-WsProcess $script:UvExe @('tool', 'list') -TimeoutSec 60
  if ($l.StdOut -notmatch ('(?m)^memoria v?' + [regex]::Escape($ver) + '(\s|$)')) { Set-WsFail 'E-MEM-03' ('versao ' + $ver); return $false }
  if (-not (Test-Path -LiteralPath (Get-WsShortcutPath))) { Set-WsFail 'E-MEM-03' 'atalho'; return $false }
  if (-not (Test-Path -LiteralPath (Join-Path $HOME '.memoria\config.json'))) { Set-WsFail 'E-MEM-03' 'config.json'; return $false }
  if ($script:ClaudeExe) {
    if ((Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'memoria') -TimeoutSec 120).ExitCode -ne 0) { Set-WsFail 'E-MEM-03' 'mcp'; return $false }
  }
  if (-not (Get-WsWebView2Version)) { Set-WsWarn 'E-MEM-04' '' }
  [void](Invoke-WsMemoriaSelftest $exe $ver)
  return $true
}

function Install-WsWebView2 {
  if (Get-WsWebView2Version) { return $true }
  $f = Join-Path $script:Tmp 'MicrosoftEdgeWebview2Setup.exe'
  if (-not (Invoke-WsDownload $script:C.WEBVIEW2_URL $f)) { return $false }
  if (-not (Test-WsSignature $f 'Microsoft')) { Write-WsLog 'WebView2: assinatura invalida'; return $false }
  [void](Invoke-WsProcess $f @('/silent', '/install') -TimeoutSec 900)
  return [bool](Get-WsWebView2Version)
}

function Install-WsStep10 {
  $ver = $script:C.MEMORY_APP_VERSION.TrimStart('v')
  $whl = 'memoria-{0}-py3-none-any.whl' -f $ver
  $d = Join-Path $script:Tmp 'memoria'
  Remove-Item -LiteralPath $d -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $d -Force | Out-Null
  Write-WsSay ('  ' + (M 'a_descarregar' @{ O_QUE = $whl }))
  if (-not (Invoke-WsDownload (Get-WsReleaseUrl 'memory' 'SHA256SUMS') (Join-Path $d 'SHA256SUMS') -Auth)) {
    if (@(403, 404, 410) -contains $script:DlHttp) { Set-WsFail 'E-MEM-01' $script:C.MEMORY_APP_VERSION } else { Set-WsFail (Get-WsDlCode) 'SHA256SUMS' }
    return $false
  }
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
  $r = Invoke-WsProcess $script:UvExe @('tool', 'install', '--managed-python', '--python', $script:C.PYTHON_VERSION, (Join-Path $d $whl), '--constraints', (Join-Path $d 'constraints.txt'), '--force') -TimeoutSec 1800 -RemoveEnv $script:UvBlockEnv
  if ($r.ExitCode -ne 0) { Set-WsFail 'E-MEM-03' 'uv tool install'; return $false }
  Register-WsExtra 'app' 'memoria' '' '' ''
  $bin = Get-WsUvBin
  $exe = Join-Path $bin 'memoria.exe'
  $gui = Join-Path $bin 'memoria-gui.exe'
  if (-not (Test-Path -LiteralPath $exe)) { Set-WsFail 'E-MEM-03' $exe; return $false }
  if (-not (Test-Path -LiteralPath $gui)) { $gui = $exe }
  Add-WsUserPath $bin
  Write-WsMemoriaConfig
  try {
    $lnk = Get-WsShortcutPath
    $sh = New-Object -ComObject WScript.Shell
    $s = $sh.CreateShortcut($lnk)
    $s.TargetPath = $gui
    $s.WorkingDirectory = $HOME
    $s.Description = 'Mem' + [char]0x00F3 + 'ria (workshop Claude)'
    $s.Save()
    Register-WsExtra 'atalho' 'memoria' $lnk '' ''
  } catch { Set-WsFail 'E-MEM-03' ('atalho: ' + $_.Exception.Message); return $false }
  if ($script:ClaudeExe -and (Invoke-WsProcess $script:ClaudeExe @('mcp', 'get', 'memoria') -TimeoutSec 120).ExitCode -ne 0) {
    $m = Invoke-WsProcess $script:ClaudeExe @('mcp', 'add', '--scope', 'user', 'memoria', '--', $exe, 'mcp') -TimeoutSec 120
    if ($m.ExitCode -ne 0) { Set-WsFail 'E-MEM-03' 'claude mcp add memoria'; return $false }
    Register-WsExtra 'mcp' 'memoria' '' '' ''
  }
  if (Invoke-WsMemoriaSelftest $exe $ver) {
    $g = Invoke-WsProcess $exe @('selftest', '--gui', '--timeout', '30') -TimeoutSec 120 -Environment @{ PYTHONUTF8 = '1' }
    if ($g.ExitCode -eq 3) { Set-WsWarn 'E-MEM-04' 'selftest --gui' } elseif ($g.ExitCode -ne 0) { Set-WsWarn 'E-MEM-05' 'selftest --gui' }
  }
  Add-WsNote (M 's10_update')
  return $true
}

function Write-WsMemoriaConfig {
  $dir = Join-Path $HOME '.memoria'
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
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
  Write-WsLog ('teste final: codigo {0} erro {1} custo {2}' -f $r.ExitCode, $o.Erro, $o.Custo.Texto)
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
  else { Set-WsFail 'E-SMOKE-01' ('codigo ' + $r.ExitCode) }
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
  if ($code -like 'E-NET-*' -or $code -like 'E-AUTH-*') { return $false }
  Write-WsSay ''
  if (-not (Read-WsYesNo (M 'helper_pergunta') $true)) { return $false }
  Write-WsSay ('  ' + (M 'helper_a_pedir'))
  $excerpt = Protect-WsText (($script:StepLog.ToString() -split "`n" | Select-Object -Last 80) -join "`n") $script:Literals
  $prompt = "Es um assistente de suporte tecnico do setup de um workshop de Claude Code.`n" +
    "Responde em portugues de Portugal, com frases curtas, para alguem sem experiencia.`n" +
    "Diz a causa provavel em 1 a 3 frases e ate 4 comandos de PowerShell (Windows) que a pessoa pode correr para corrigir.`n" +
    "Nunca sugiras comandos como administrador, comandos destrutivos, nem pedir ou mostrar chaves de API. Se nao tiveres a certeza, nao sugiras comandos.`n`n" +
    ('Passo que falhou: {0} ({1})' -f $N, $script:Titles[$N]) + "`nCodigo: $code`n" + (Get-WsVersionsLine) + "`n`nExcerto do log (sem segredos):`n" + $excerpt
  $o = Invoke-WsClaudeHelper $prompt $script:HelperSchema
  if (-not $o -or -not $o.Causa) { Write-WsSay ('  ' + (M 'helper_falhou')); return $false }
  Write-WsLog ('ajudante: custo ' + $o.Custo.Texto)
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
      Write-WsLog ('ajudante: corre ' + $cmd)
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
    $lines += ('Passo {0} ({1}): {2} {3} {4}' -f $n, $script:Titles[$n], $s.Estado, $f, $w)
  }
  $tail = ''
  try { $tail = Protect-WsText ((Get-Content -LiteralPath $script:LogFile -Tail 120 -Encoding UTF8) -join "`n") $script:Literals } catch { }
  $prompt = "Es um assistente de suporte do setup de um workshop de Claude Code (Windows). Responde em portugues de Portugal, frases curtas, para alguem sem experiencia.`n" +
    "Faz um diagnostico completo: o que esta mal, porque, e os passos exatos (com comandos de PowerShell) por ordem. Nunca sugiras comandos como administrador nem mostrar chaves de API.`n`n" +
    (Get-WsVersionsLine) + "`n`n" + ($lines -join "`n") + "`n`nExcerto do log:`n" + $tail
  $o = Invoke-WsClaudeHelper $prompt ''
  if ($o -and $o.Resposta) { Write-WsSay $o.Resposta; Write-WsSay ('  ' + (M 'doctor_custo' @{ USD = $o.Custo.Texto })) 'DarkGray'; Write-WsLog ('doctor: custo ' + $o.Custo.Texto) }
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
    if ($sum.Avisos -gt 0) { $lines += (M 'final_avisos' @{ N = $sum.Avisos }) }
  } else {
    if ($sum.Faltam -eq 1) { $lines += (M 'final_falta1' @{ LISTA = $sum.Lista }) } else { $lines += (M 'final_faltam' @{ N = $sum.Faltam; LISTA = $sum.Lista }) }
    $lines += (M 'final_voltar')
  }
  Write-WsSay ''
  Write-WsSay ('-' * 64)
  foreach ($l in $lines) { Write-WsSay $l }
  if ($script:Mode -eq 'install') { Write-WsSay (M 'final_reiniciar') }
  if ($script:TodoMcp) { Write-WsSay (M 's7_oauth') }
  Write-WsSay (M 'final_ficheiros' @{ RESUMO = $script:Resumo; LOG = $script:LogFile }) 'DarkGray'
  try { [IO.File]::WriteAllText($script:Resumo, (($lines -join "`r`n") + "`r`n"), $script:Utf8NoBom) } catch { }
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
      'app' { if ($script:UvExe -and (Invoke-WsProcess $script:UvExe @('tool', 'uninstall', 'memoria')).ExitCode -eq 0) { Write-WsSay ('  ' + (M 'desinst_app')); Write-WsSay ('  ' + (M 'desinst_memorias')) } }
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
    $script:Msgs = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'messages.pt.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
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
  $f['UV_INSTALL_SH_URL_V'] = Expand-WsPattern $script:C.UV_INSTALL_SH_URL @{ version = $script:C.UV_VERSION }
  $f['UV_INSTALL_PS1_URL_V'] = Expand-WsPattern $script:C.UV_INSTALL_PS1_URL @{ version = $script:C.UV_VERSION }
  $f['PROJETOS'] = $script:ProjShow
  $f['MANIFEST'] = Join-Path $script:WsHome 'manifest.json'
  $f['LOG'] = $script:LogFile
  $f['RESUMO'] = $script:Resumo
  $f['BACKUP'] = Join-Path $script:WsHome 'backup'
  $f['FLAG_SEM_DESKTOP'] = '-SemDesktop'
  $f['FLAG_STATUSLINE'] = '-SubstituirStatusline'
  $script:Fill = $f
}

function Save-WsSelf {
  # Copia local do script, para "powershell ... -File $HOME\.workshop-claude\setup-windows.ps1 -Check".
  $dst = Join-Path $script:WsHome 'setup-windows.ps1'
  if ($script:Dev) {
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Join-Path $PSScriptRoot 'setup-windows.ps1')))
    $w = "# Copia de desenvolvimento: chama o script do repositorio.`r`n" +
      "`$p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('$b64'))`r`n" +
      "& powershell -NoProfile -ExecutionPolicy Bypass -File `$p @args`r`n"
    [IO.File]::WriteAllText($dst, $w, [Text.Encoding]::ASCII)
    return
  }
  if ($PSCommandPath -and ((Resolve-Path -LiteralPath $PSCommandPath).Path -ne $dst)) {
    try { Copy-Item -LiteralPath $PSCommandPath -Destination $dst -Force } catch { }
  }
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
  if ($ExecutionContext.SessionState.LanguageMode -ne 'FullLanguage') { Write-Host 'PowerShell em ConstrainedLanguage: o setup nao pode correr (E-SO-05).'; return 2 }
  try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  try { [Net.WebRequest]::DefaultWebProxy.Credentials = [Net.CredentialCache]::DefaultNetworkCredentials } catch { }
  $script:Emoji = [bool]($env:WT_SESSION -or $PSVersionTable.PSVersion.Major -ge 7)

  $script:WsHome = Join-Path $HOME '.workshop-claude'
  $script:LogFile = Join-Path $script:WsHome 'setup.log'
  $script:Resumo = Join-Path $script:WsHome 'resumo.txt'
  $script:ClaudeDir = $env:CLAUDE_CONFIG_DIR
  if (-not $script:ClaudeDir) { $script:ClaudeDir = Join-Path $HOME '.claude' }
  $script:Proj = Join-Path $HOME 'workshop-claude'
  $script:ProjShow = '%USERPROFILE%\workshop-claude'
  $script:UA = 'workshop-claude-setup (PowerShell; Windows)'
  New-Item -ItemType Directory -Path $script:WsHome -Force | Out-Null
  $script:Tmp = Join-Path ([IO.Path]::GetTempPath()) ('ws-setup-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
  New-Item -ItemType Directory -Path $script:Tmp -Force | Out-Null
  $script:Literals = Get-WsSecretLiterals
  $script:StepLog = New-Object System.Text.StringBuilder
  $script:AuthOk = $false; $script:NetApiOk = $true; $script:CaPem = ''; $script:Proxy = ''; $script:OsBuild = 99999; $script:Arch = 'x64'

  if (-not (Initialize-WsConfig)) { Write-Host 'Este script tem de vir da release (com os valores injetados) ou correr dentro do repositorio.'; return 2 }
  Initialize-WsFill
  $script:Titles = @{}
  foreach ($p in $script:Msgs.passos.PSObject.Properties) { $script:Titles[$p.Name] = $p.Value }
  $script:T = New-WsStateTable
  Update-WsSessionPath

  $lock = Join-Path $script:WsHome '.lock'
  if (Test-Path -LiteralPath $lock) {
    $old = (Get-Content -LiteralPath $lock -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($old -and (Get-Process -Id ([int]$old) -ErrorAction SilentlyContinue)) { Write-Host ('O setup ja esta a correr (PID {0}).' -f $old); return 1 }
  }
  [IO.File]::WriteAllText($lock, [string]$PID)
  try {
    [IO.File]::AppendAllText($script:LogFile, ("`r`n==================== {0} - modo {1} - {2}`r`n" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $script:Mode, $script:C.WORKSHOP_VERSION), $script:Utf8NoBom)
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
    Remove-Item -LiteralPath $lock -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $script:Tmp -Recurse -Force -ErrorAction SilentlyContinue
  }
}

if ($env:WS_NO_MAIN -ne '1' -and $MyInvocation.InvocationName -ne '.') {
  $code = Invoke-WsMain
  exit $code
}
