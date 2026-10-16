<#
.SYNOPSIS
  Muda os repositorios do kit editando so o repos.conf e volta a gerar os ficheiros com URLs
  (node tools/render.mjs). Igual ao tools/switch-repos.sh. Ficheiro so ASCII.

.EXAMPLE
  tools/switch-repos.ps1 -WorkshopUrl https://github.com/dono/workshop-claude.git `
    -MemoryUrl https://github.com/dono/claude-memory-app.git `
    -RawPattern 'https://raw.githubusercontent.com/{owner}/{name}/{version}/{path}' -Provider github
  Ver docs/PUBLICAR.md (checklist de 5 passos).
#>
[CmdletBinding()]
param(
  [string]$WorkshopUrl,
  [string]$MemoryUrl,
  [string]$RawPattern,
  [string]$ReleasePattern,
  [ValidateSet('', 'gitea', 'github')][string]$Provider = '',
  [switch]$SemRender
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$conf = Join-Path $root 'repos.conf'

function Set-WsConfKey {
  param([string[]]$Lines, [string]$Key, [string]$Value)
  if (-not $Value) { return , $Lines }
  $found = $false
  $out = foreach ($l in $Lines) {
    if ($l.StartsWith($Key + '=')) { $found = $true; $Key + '=' + $Value } else { $l }
  }
  if (-not $found) { throw ('a chave {0} nao existe no repos.conf' -f $Key) }
  Write-Host ('repos.conf: {0}={1}' -f $Key, $Value)
  return , @($out)
}

if (-not ($WorkshopUrl -or $MemoryUrl -or $RawPattern -or $ReleasePattern -or $Provider)) { Write-Host 'Nada para mudar (ver Get-Help).'; exit 2 }
foreach ($u in @($WorkshopUrl, $MemoryUrl)) {
  if ($u -and $u -notmatch '^https://[^/]+/[^/]+/[^/]+') { Write-Host ('ERRO: URL invalido: {0}' -f $u); exit 2 }
}
foreach ($p in @($RawPattern, $ReleasePattern)) {
  if ($p -and $p -notmatch '\{version\}') { Write-Host ('ERRO: o padrao tem de conter {{version}}: {0}' -f $p); exit 2 }
}

$lines = [IO.File]::ReadAllLines($conf, [Text.Encoding]::UTF8)
$lines = Set-WsConfKey $lines 'WORKSHOP_REPO_URL' $WorkshopUrl
$lines = Set-WsConfKey $lines 'MEMORY_APP_REPO_URL' $MemoryUrl
$lines = Set-WsConfKey $lines 'RAW_BASE_URL' $RawPattern
$lines = Set-WsConfKey $lines 'RELEASE_DOWNLOAD_URL' $ReleasePattern
$lines = Set-WsConfKey $lines 'RELEASE_PROVIDER' $Provider
[IO.File]::WriteAllText($conf, (($lines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))

if (-not $SemRender) {
  & node (Join-Path $root 'tools/render.mjs')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
Write-Host 'Feito. Proximos passos: docs/PUBLICAR.md (releases, -Check e node tools/check-repo.mjs).'
