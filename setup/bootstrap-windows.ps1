# bootstrap-windows.ps1 - arranque minimo do setup do workshop no Windows (so ASCII).
#
#   irm <url>/bootstrap-windows.ps1 | iex
#   $env:WORKSHOP_SETUP_ARGS='-Check'; irm <url>/bootstrap-windows.ps1 | iex
#   & ([scriptblock]::Create((irm <url>/bootstrap-windows.ps1))) -Check
#
# Descarrega o setup-windows.ps1 da mesma release para %TEMP%, confirma o SHA-256 (injetado no build)
# e corre-o com: powershell -NoProfile -ExecutionPolicy Bypass -File <ficheiro> <opcoes>
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

function Invoke-WsBootstrap {
  param([string[]]$PassArgs)
  if ($ExecutionContext.SessionState.LanguageMode -ne 'FullLanguage') {
    Write-Host 'ERROR: PowerShell is in restricted mode (ConstrainedLanguage). See E-SO-05 in docs/en/TROUBLESHOOTING.md.'
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
    Write-Host 'Check the network or the proxy (see E-NET-01 and E-NET-03 in docs/en/TROUBLESHOOTING.md).'
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
  $all = @()
  if ($PassArgs) { $all += $PassArgs }
  if ($env:WORKSHOP_SETUP_ARGS) { $all += @($env:WORKSHOP_SETUP_ARGS -split '\s+' | Where-Object { $_ }) }
  $ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  if (-not (Test-Path -LiteralPath $ps)) { $ps = 'powershell.exe' }
  & $ps -NoProfile -ExecutionPolicy Bypass -File $dest @all
  Write-Host ('(setup finished with exit code ' + $LASTEXITCODE + ')')
}

Invoke-WsBootstrap -PassArgs $args
