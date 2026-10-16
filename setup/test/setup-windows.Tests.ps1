# Testes Pester (v5) das funcoes puras do setup-windows.ps1. Ficheiro so ASCII.
#   Invoke-Pester -Path setup/test/setup-windows.Tests.ps1
# Usa os mesmos casos que os testes em Node e bash (tools/test/*-cases.json).

BeforeAll {
  $env:WS_NO_MAIN = '1'
  $root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
  . (Join-Path $root 'setup/setup-windows.ps1')
  $script:Root = $root
  $script:LogFile = Join-Path ([IO.Path]::GetTempPath()) ('ws-pester-' + [guid]::NewGuid().ToString('N') + '.log')
  $script:Literals = @()
  $script:Msgs = [IO.File]::ReadAllText((Join-Path $root 'setup/messages.pt.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
  $script:Pricing = [IO.File]::ReadAllText((Join-Path $root 'pricing.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
  $script:Fill = @{ FLAG_STATUSLINE = '-SubstituirStatusline'; CLAUDE_CODE_VERSION = '2.1.292' }
  function Read-Fixture([string]$Name) { return ([IO.File]::ReadAllText((Join-Path $script:Root ('tools/test/' + $Name)), [Text.Encoding]::UTF8) | ConvertFrom-Json) }
  $script:Acento = [string][char]0x00E3   # a com til
}

Describe 'repos.conf' {
  It 'le CHAVE=valor, ignora comentarios e linhas invalidas' {
    $c = ConvertFrom-WsConf "# x`nA=1`n B = dois `nmau`nx=y`nURL=https://h/a?b=c`r`n" @{}
    $c.Keys -join ',' | Should -Be 'A,B,URL'
    $c.B | Should -Be 'dois'
    $c.URL | Should -Be 'https://h/a?b=c'
  }
  It 'o ambiente sobrepoe as chaves conhecidas' {
    $c = ConvertFrom-WsConf "WORKSHOP_VERSION=v1`nOUTRA=2" @{ WORKSHOP_VERSION = 'v9'; NADA = 'x' }
    $c.WORKSHOP_VERSION | Should -Be 'v9'
    $c.Contains('NADA') | Should -BeFalse
  }
  It 'le o repos.conf real' {
    $c = ConvertFrom-WsConf ([IO.File]::ReadAllText((Join-Path $script:Root 'repos.conf'))) @{}
    $c.CLAUDE_CODE_VERSION | Should -Match '^[0-9]+\.[0-9]+\.[0-9]+$'
    $c.RELEASE_DOWNLOAD_URL | Should -Match '\{file\}'
  }
  It 'parte o URL do repositorio e expande os padroes' {
    $p = Get-WsRepoParts 'https://gitea.exemplo.pt/guilherme/workshop-claude.git'
    $p.repo | Should -Be 'https://gitea.exemplo.pt/guilherme/workshop-claude'
    $p.host | Should -Be 'gitea.exemplo.pt'
    $p.owner | Should -Be 'guilherme'
    $p.name | Should -Be 'workshop-claude'
    $p['version'] = 'v1'; $p['file'] = 'x.ps1'
    Expand-WsPattern '{repo}/releases/download/{version}/{file}' $p | Should -Be 'https://gitea.exemplo.pt/guilherme/workshop-claude/releases/download/v1/x.ps1'
  }
}

Describe 'versoes' {
  It 'compara <A> com <B>' -ForEach @(
    @{ A = '2.1.292'; B = '2.1.285'; R = 1 }, @{ A = '2.1.285'; B = '2.1.292'; R = -1 }, @{ A = '24.22.0'; B = '24'; R = 1 },
    @{ A = '22.1.0'; B = '24'; R = -1 }, @{ A = '1.10'; B = '1.9'; R = 1 }, @{ A = '2.1.285 (Claude Code)'; B = '2.1.285'; R = 0 },
    @{ A = 'v24.3.0'; B = '22'; R = 1 }, @{ A = '0.4.9'; B = '0.5'; R = -1 }
  ) {
    Compare-WsVersion $A $B | Should -Be $R
  }
  It 'extrai a versao do texto' {
    Get-WsVersionOf 'gh version 2.102.0 (2026-09-30)' | Should -Be '2.102.0'
    Get-WsVersionOf 'git version 2.56.0.windows.2' | Should -Be '2.56.0'
  }
}

Describe 'redacao (casos partilhados)' {
  It 'redige todos os casos de tools/test/redact-cases.json' {
    $f = Read-Fixture 'redact-cases.json'
    foreach ($c in $f.casos) { Protect-WsText $c.in @($f.literais) | Should -BeExactly $c.out -Because $c.in }
  }
}

Describe 'custo (casos partilhados)' {
  It 'calcula o custo de todos os casos de tools/test/custo-cases.json' {
    foreach ($c in (Read-Fixture 'custo-cases.json').casos) {
      $r = Get-WsCusto $c.resultado $script:Pricing
      if ($null -eq $c.usd) { $r.Usd | Should -BeNullOrEmpty -Because $c.nome }
      else { [math]::Abs($r.Usd - [double]$c.usd) | Should -BeLessThan 1e-9 -Because $c.nome }
      $r.Texto | Should -BeExactly $c.texto -Because $c.nome
    }
  }
  It 'resolve aliases e sufixos' {
    Resolve-WsModel 'haiku' $script:Pricing | Should -Be 'claude-haiku-5-5'
    Resolve-WsModel 'claude-sonnet-5-5[1m]' $script:Pricing | Should -Be 'claude-sonnet-5-5'
    Resolve-WsModel 'claude-misterio-9' $script:Pricing | Should -BeNullOrEmpty
  }
}

Describe 'argumentos de processos' {
  It 'cita como o CommandLineToArgvW espera (vazios, espacos, aspas, barras finais)' {
    ConvertTo-WsArgLine @('a', 'b c', '', 'x"y', 'C:\dir com espaco\', '--tools', '') | Should -BeExactly 'a "b c" "" "x\"y" "C:\dir com espaco\\" --tools ""'
  }
  It 'monta a chamada ao install-user.mjs com caminhos com espaco e acentos, um argumento cada' {
    $kit = 'C:\Users\Jo' + $script:Acento + 'o Silva\.workshop-claude\kit-src\v1'
    $node = 'C:\Program Files\nodejs\node.exe'
    $a = Get-WsInstallUserArgs -Sub 'instalar' -NodePath $node -KitSrc $kit -CaPem 'C:\ca.pem' -Proxy 'http://p:8080' -SubstituirStatusline
    $a[0] | Should -Match 'install-user\.mjs$'
    $a[1..($a.Count - 1)] -join '|' | Should -BeExactly ('instalar|--node|' + $node + '|--kit-src|' + $kit + '|--ca-pem|C:\ca.pem|--https-proxy|http://p:8080|--substituir-statusline')
    (Get-WsInstallUserArgs -Sub 'verificar' -NodePath $node -KitSrc $kit).Count | Should -Be 6
    ConvertTo-WsArgLine @($node) | Should -BeExactly '"C:\Program Files\nodejs\node.exe"'
  }
  It 'le a saida TSV do install-user e regista avisos e detalhe' {
    $script:T = New-WsStateTable
    $script:Cur = '8'
    Read-WsInstallUserOutput "estado`tinstalado`nskills`t7`nagentes`t6`naviso`tE-CFG-06`n"
    $script:T['8'].Detalhe | Should -BeExactly '7 skills, 6 agentes, hooks e statusline'
    $script:T['8'].Avisos[0][0] | Should -Be 'E-CFG-06'
    $script:T['8'].Notas[0] | Should -Match '-SubstituirStatusline'
  }
}

Describe 'rede, PATH e certificados' {
  It 'mapeia erros de rede para codigos do catalogo' {
    Get-WsNetCode 'NameResolutionFailure' 0 | Should -Be 'E-NET-02'
    Get-WsNetCode 'TrustFailure' 0 | Should -Be 'E-NET-04'
    Get-WsNetCode 'ProtocolError' 407 | Should -Be 'E-NET-03'
    Get-WsNetCode 'ConnectFailure' 0 | Should -Be 'E-NET-01'
    Get-WsNetCode 'ProtocolError' 404 | Should -Be 'E-NET-07'
  }
  It 'reconhece autoridades publicas' {
    Test-WsPublicCa 'CN=WE1, O=Google Trust Services, C=US' | Should -BeTrue
    Test-WsPublicCa 'CN=Zscaler Intermediate Root CA, O=Zscaler Inc.' | Should -BeFalse
  }
  It 'acrescenta e remove pastas do PATH sem duplicar' {
    $p = Add-WsPathEntry 'C:\a;C:\b' 'C:\novo'
    $p | Should -Be 'C:\novo;C:\a;C:\b'
    Add-WsPathEntry $p 'C:\NOVO\' | Should -Be $p
    Remove-WsPathEntry $p 'C:\novo\' | Should -Be 'C:\a;C:\b'
    Add-WsPathEntry '' 'C:\x' | Should -Be 'C:\x'
  }
  It 'converte certificados para PEM com linhas de 64' {
    $pem = ConvertTo-WsPem @(, ([byte[]](1..100)))
    $pem | Should -Match '^-----BEGIN CERTIFICATE-----\n'
    ($pem -split "`n")[1].Length | Should -Be 64
    $pem.TrimEnd() | Should -Match '-----END CERTIFICATE-----$'
  }
}

Describe 'Python gerido pelo uv' {
  It 'deteta as variaveis que impedem o Python gerido' {
    (Get-WsUvPythonBlockers @{}).Count | Should -Be 0
    (Get-WsUvPythonBlockers @{ UV_PYTHON_DOWNLOADS = 'automatic'; UV_NO_MANAGED_PYTHON = '0' }).Count | Should -Be 0
    (Get-WsUvPythonBlockers @{ UV_PYTHON_DOWNLOADS = 'Never' }) | Should -Be @('UV_PYTHON_DOWNLOADS')
    (Get-WsUvPythonBlockers @{ UV_NO_MANAGED_PYTHON = '1'; UV_PYTHON_PREFERENCE = 'only-system' }) -join ',' | Should -Be 'UV_NO_MANAGED_PYTHON,UV_PYTHON_PREFERENCE'
  }
  It 'le a versao do Python e o FTS5 da saida do memoria selftest' {
    $ok = "Mem" + [char]0x00F3 + "ria 0.1.0 " + [char]0x00B7 + " Python 3.12.13 " + [char]0x00B7 + " Windows AMD64`n  [OK] SQLite 3.50.4 com FTS5`n  [OK] Pesquisa FTS5`nselftest: OK"
    $r = Read-WsSelftest $ok
    $r.Python | Should -Be '3.12.13'
    $r.Fts5 | Should -BeTrue
    $r.Falhas.Count | Should -Be 0
    $bad = Read-WsSelftest "Memoria 0.1.0 - Python 3.12.1`n  [FALHOU] SQLite sem FTS5`n  [OK] Interface"
    $bad.Fts5 | Should -BeFalse
    $bad.Falhas | Should -Be @('SQLite sem FTS5')
  }
  It 'nao chama python, python3 nem py' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Not -Match '(?m)^\s*(&\s*)?(python3?|py)(\.exe)?\s'
    $text | Should -Not -Match '[''"](python3?|py)(\.exe)?[''"]'
  }
}

Describe 'tabela de estados' {
  BeforeEach { $script:T = New-WsStateTable }
  It 'tem os passos 0 a 12' { $script:T.Keys -join ',' | Should -Be '0,1,2,3,4,5,6,7,8,9,10,11,12' }
  It 'deteta dependencias que falharam' {
    $script:T['3'].Estado = 'falhou'
    Test-WsDependencies $script:T @(2, 3) | Should -Be 3
    Test-WsDependencies $script:T @(1, 2) | Should -BeNullOrEmpty
    $script:T['12'].Estado = 'naoexec'
    Test-WsDependencies $script:T @(12) | Should -Be 12
  }
  It 'conta o que falta para a frase final' {
    $titles = @{}; foreach ($p in $script:Msgs.passos.PSObject.Properties) { $titles[$p.Name] = $p.Value }
    foreach ($n in $script:T.Keys) { $script:T[$n].Estado = 'feito' }
    $script:T['3'].Estado = 'falhou'; $script:T['12'].Estado = 'naoexec'; $script:T['6'].Estado = 'aviso'
    $s = Get-WsSummary $script:T $titles
    $s.Faltam | Should -Be 2
    $s.Avisos | Should -Be 1
    $s.Lista | Should -BeExactly ('3 (' + $titles['3'] + '); 12 (' + $titles['12'] + ')')
  }
  It 'usa simbolos ASCII fora do Windows Terminal' {
    Get-WsSymbol 'feito' $false | Should -Be '[OK]'
    Get-WsSymbol 'ja' $false | Should -Be '[SKIP]'
    Get-WsSymbol 'aviso' $false | Should -Be '[AVISO]'
    Get-WsSymbol 'falhou' $false | Should -Be '[FALHA]'
    (Get-WsSymbol 'feito' $true) | Should -Be ([char]::ConvertFromUtf32(0x2705))
  }
  It 'converte "nao instalado" em E-SETUP-01 no -Check' {
    Test-WsMissingCode 'E-NODE-01' | Should -BeTrue
    Test-WsMissingCode 'E-AUTH-01' | Should -BeFalse
  }
}

Describe 'mensagens' {
  It 'preenche marcadores e deixa os desconhecidos' {
    Format-WsMsg 'Passo {N}/12 {X}' @{ N = 3 } | Should -BeExactly 'Passo 3/12 {X}'
    M 'passo' @{ N = 4; TITULO = 'Node.js' } | Should -BeExactly ('Passo 4/12 ' + [char]0x00B7 + ' Node.js')
    M 's8_statusline_mantida' | Should -Match '-SubstituirStatusline'
  }
  It 'todos os codigos e chaves usados no script existem no catalogo' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    foreach ($m in [regex]::Matches($text, '\bE-[A-Z]+-\d{2}\b')) { $script:Msgs.erros.PSObject.Properties.Name | Should -Contain $m.Value }
    foreach ($m in [regex]::Matches($text, "\bM '([a-z0-9_]+)'")) { $script:Msgs.ui.PSObject.Properties.Name | Should -Contain $m.Groups[1].Value }
  }
}

Describe 'script da release (injetado)' {
  It 'descodifica o repos.conf, o pricing e as mensagens injetados em base64' {
    $dist = Get-ChildItem -Path (Join-Path $script:Root 'dist') -Filter 'setup-windows.ps1' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $dist) { Set-ItResult -Skipped -Because 'sem dist/ (corre tools/build-release.sh)'; return }
    $r = & {
      $env:WS_NO_MAIN = '1'
      . $dist.FullName
      [void](Initialize-WsConfig)
      @{ V = $script:C.WORKSHOP_VERSION; P = $script:Msgs.ui.final_pronto; H = ($script:Pricing.modelos.PSObject.Properties.Name -contains 'claude-haiku-5-5'); S = $script:InjKitSha }
    }
    $r.V | Should -Match '^v'
    $r.P | Should -BeExactly ('Est' + [char]0x00E1 + ' tudo pronto para o workshop.')
    $r.H | Should -BeTrue
    $r.S | Should -Match '^[0-9a-f]{64}$'
  }
}
