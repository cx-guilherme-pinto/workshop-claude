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
  $script:Msgs = [IO.File]::ReadAllText((Join-Path $root 'setup/messages.en.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
  $script:Pricing = [IO.File]::ReadAllText((Join-Path $root 'pricing.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
  $script:Fill = @{ FLAG_STATUSLINE = '-ReplaceStatusline'; CLAUDE_CODE_VERSION = '2.1.292' }
  function Read-Fixture([string]$Name) { return ([IO.File]::ReadAllText((Join-Path $script:Root ('tools/test/' + $Name)), [Text.Encoding]::UTF8) | ConvertFrom-Json) }
  $script:Acento = [string][char]0x00E3   # a com til
}

# A sessao fica como estava: com WS_NO_MAIN=1 o one-liner corrido a seguir nesta janela nao fazia nada.
AfterAll { Remove-Item Env:WS_NO_MAIN -ErrorAction SilentlyContinue }

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
  It 'calcula o custo de todos os casos de tools/test/cost-cases.json' {
    foreach ($c in (Read-Fixture 'cost-cases.json').casos) {
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
  It 'le o pricing.json antigo (chaves em portugues) com os mesmos precos' {
    $old = '{"modelos":{"claude-haiku-5-5":{"nome":"Haiku 5.5","input":0.1,"output":0.5,"cache_write_5m":0.125,"cache_write_1h":0.2,"cache_read":0.01,"prompt_longo":{"acima_de_tokens":100000,"input":0.5,"output":2.5,"cache_write_5m":0.625,"cache_write_1h":1,"cache_read":0.05}}},"aliases":{"haiku":"claude-haiku-5-5"}}' | ConvertFrom-Json
    $res = '{"modelUsage":{"claude-haiku-5-5":{"inputTokens":150000,"outputTokens":1000,"cacheReadInputTokens":0,"cacheCreationInputTokens":0}}}' | ConvertFrom-Json
    (Get-WsCusto $res $old).Usd | Should -Be (Get-WsCusto $res $script:Pricing).Usd
    [math]::Abs((Get-WsCusto $res $script:Pricing).Usd - 0.0775) | Should -BeLessThan 1e-9
  }
}

Describe 'argumentos de processos' {
  It 'cita como o CommandLineToArgvW espera (vazios, espacos, aspas, barras finais)' {
    ConvertTo-WsArgLine @('a', 'b c', '', 'x"y', 'C:\dir com espaco\', '--tools', '') | Should -BeExactly 'a "b c" "" "x\"y" "C:\dir com espaco\\" --tools ""'
  }
  It 'monta a chamada ao install-user.mjs com caminhos com espaco e acentos, um argumento cada' {
    $kit = 'C:\Users\Jo' + $script:Acento + 'o Silva\.workshop-claude\kit-src\v1'
    $node = 'C:\Program Files\nodejs\node.exe'
    $a = Get-WsInstallUserArgs -Sub 'instalar' -NodePath $node -KitSrc $kit -CaPem 'C:\ca.pem' -Proxy 'http://p:8080' -SubstituirStatusline -Lang 'he-IL'
    $a[0] | Should -Match 'install-user\.mjs$'
    $a[1..($a.Count - 1)] -join '|' | Should -BeExactly ('instalar|--node|' + $node + '|--kit-src|' + $kit + '|--lingua-maquina|he-IL|--ca-pem|C:\ca.pem|--https-proxy|http://p:8080|--substituir-statusline')
    (Get-WsInstallUserArgs -Sub 'verificar' -NodePath $node -KitSrc $kit).Count | Should -Be 6
    ConvertTo-WsArgLine @($node) | Should -BeExactly '"C:\Program Files\nodejs\node.exe"'
  }
  It 'le a saida TSV do install-user e regista avisos e detalhe' {
    $script:T = New-WsStateTable
    $script:Cur = '8'
    Read-WsInstallUserOutput "estado`tinstalado`nskills`t7`nagentes`t6`naviso`tE-CFG-06`n"
    $script:T['8'].Detalhe | Should -BeExactly '7 skills, 6 agents, hooks and statusline'
    $script:T['8'].Avisos[0][0] | Should -Be 'E-CFG-06'
    $script:T['8'].Notas[0] | Should -Match '-ReplaceStatusline'
  }
  It 'le a lingua da saida do install-user e escreve a nota da definicao language' {
    $script:T = New-WsStateTable
    $script:Cur = '8'; $script:Lang = 'pt-PT'; $script:LangKit = 'pt'
    Read-WsInstallUserOutput "skills`t7`nagentes`t6`nlingua`tpt-PT`nlingua_kit`tpt`nlanguage`tEuropean Portuguese`nlanguage_nossa`t1`n"
    ($script:T['8'].Notas -join ' ') | Should -Match 'Claude answers in European Portuguese'
    ($script:T['8'].Notas -join ' ') | Should -Match 'Workshop texts: Portuguese'
    $script:T = New-WsStateTable
    $script:Lang = 'es-ES'; $script:LangKit = 'en'
    Read-WsInstallUserOutput "lingua`tes-ES`nlingua_kit`ten`nlanguage`t`nlanguage_nossa`t0`n"
    ($script:T['8'].Notas -join ' ') | Should -Match 'No "language" setting for es-ES'
    $script:T = New-WsStateTable
    Read-WsInstallUserOutput "lingua`the-IL`nlingua_kit`ten`nlanguage`tjapanese`nlanguage_nossa`t0`n"
    ($script:T['8'].Notas -join ' ') | Should -Match 'You already had a "language" setting \(japanese\)'
  }
}

Describe 'lingua da maquina (casos partilhados)' {
  It 'normaliza as etiquetas e escolhe a lingua do kit (tools/test/language-cases.json)' {
    foreach ($c in (Read-Fixture 'language-cases.json').etiquetas) {
      $t = ConvertTo-WsLangTag $c.in
      if (-not $t) { $t = 'en' }
      $t | Should -BeExactly $c.tag -Because $c.in
      Get-WsLangKit $t | Should -BeExactly $c.kit -Because $c.in
    }
  }
  It 'escolhe WORKSHOP_LANG, depois Get-UICulture, depois Get-Culture' {
    foreach ($c in (Read-Fixture 'language-cases.json').windows) {
      Select-WsLang $c.override $c.ui $c.cultura | Should -BeExactly $c.tag -Because $c.nome
    }
  }
  It 'passa a lingua do kit a montagem dos projetos' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match '''assemble-demo\.mjs''.*''--language'', \$script:LangKit'
    $text | Should -Match '''assemble-sandbox\.mjs''.*''--language'', \$script:LangKit'
  }
}

Describe 'app Agent Memory (contrato da app)' {
  It 'pasta dos dados: AGENT_MEMORY_HOME, MEMORIA_HOME, ~/.memoria antiga, ~/.agent-memory' {
    $h = Join-Path ([IO.Path]::GetTempPath()) ('ws-mh-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $h -Force | Out-Null
    Get-WsMemoryHome @{ AGENT_MEMORY_HOME = '/x/a'; MEMORIA_HOME = '/x/m' } $h | Should -Be '/x/a'
    Get-WsMemoryHome @{ MEMORIA_HOME = '/x/m' } $h | Should -Be '/x/m'
    Get-WsMemoryHome @{} $h | Should -Be (Join-Path $h '.agent-memory')
    New-Item -ItemType Directory -Path (Join-Path $h '.memoria') -Force | Out-Null
    Get-WsMemoryHome @{} $h | Should -Be (Join-Path $h '.memoria')
    New-Item -ItemType Directory -Path (Join-Path $h '.agent-memory') -Force | Out-Null
    Get-WsMemoryHome @{} $h | Should -Be (Join-Path $h '.agent-memory')
    Remove-Item -LiteralPath $h -Recurse -Force
  }
  It 'nome do wheel pelo SHA256SUMS (o antigo quando nao esta la)' {
    $f = Join-Path ([IO.Path]::GetTempPath()) ('ws-sums-' + [guid]::NewGuid().ToString('N'))
    [IO.File]::WriteAllText($f, (('a' * 64) + '  agent_memory-0.5.0-py3-none-any.whl' + "`n" + ('b' * 64) + '  constraints.txt' + "`n"))
    Get-WsMemoryWheel $f '0.5.0' | Should -BeExactly 'agent_memory-0.5.0-py3-none-any.whl'
    Get-WsMemoryWheel $f '0.4.1' | Should -BeExactly 'memoria-0.4.1-py3-none-any.whl'
    Remove-Item -LiteralPath $f -Force
  }
  It 'regista o MCP como agent-memory e tira o registo antigo memoria' {
    $script:ClaudeExe = 'claude-falso'
    $script:Calls = @()
    $script:Registered = @{ memoria = $true }
    Mock Invoke-WsProcess {
      $a = @($Arguments)
      $script:Calls += ($a -join ' ')
      if ($a[1] -eq 'get') { if ($script:Registered[$a[2]]) { return @{ ExitCode = 0; StdOut = 'x' } } else { return @{ ExitCode = 1; StdOut = '' } } }
      if ($a[1] -eq 'remove') { $script:Registered.Remove($a[4]); return @{ ExitCode = 0; StdOut = '' } }
      if ($a[1] -eq 'add') { $script:Registered[$a[4]] = $true; return @{ ExitCode = 0; StdOut = '' } }
      return @{ ExitCode = 0; StdOut = '' }
    }
    Mock Register-WsExtra { }
    Register-WsMemoryMcp 'C:\u\agent-memory.exe' | Should -BeTrue
    $script:Registered.ContainsKey('memoria') | Should -BeFalse
    $script:Registered.ContainsKey('agent-memory') | Should -BeTrue
    ($script:Calls -join ';') | Should -Match 'mcp add --scope user agent-memory -- C:\\u\\agent-memory\.exe mcp'
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
  It 'le a versao do Python e o FTS5 da saida do agent-memory selftest' {
    $ok = "Mem" + [char]0x00F3 + "ria 0.1.0 " + [char]0x00B7 + " Python 3.12.13 " + [char]0x00B7 + " Windows AMD64`n  [OK] SQLite 3.50.4 com FTS5`n  [OK] Pesquisa FTS5`nselftest: OK"
    $r = Read-WsSelftest $ok
    $r.Python | Should -Be '3.12.13'
    $r.Fts5 | Should -BeTrue
    $r.Falhas.Count | Should -Be 0
    $bad = Read-WsSelftest "Memoria 0.1.0 - Python 3.12.1`n  [FALHOU] SQLite sem FTS5`n  [OK] Interface"
    $bad.Fts5 | Should -BeFalse
    $bad.Falhas | Should -Be @('SQLite sem FTS5')
    $he = Read-WsSelftest ("Memoria 0.4.0 - Python 3.12.13`r`n  [" + [char]0x05E0 + [char]0x05DB + [char]0x05E9 + [char]0x05DC + "] SQLite FTS5`r`n  [OK] UI`r`n")
    $he.Python | Should -Be '3.12.13'
    $he.Falhas | Should -Be @('SQLite FTS5')
    (Read-WsSelftest "  [FAIL] Python 3.12 missing").Falhas | Should -Be @('Python 3.12 missing')
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
    Get-WsSymbol 'aviso' $false | Should -Be '[WARN]'
    Get-WsSymbol 'falhou' $false | Should -Be '[FAIL]'
    (Get-WsSymbol 'feito' $true) | Should -Be ([char]::ConvertFromUtf32(0x2705))
  }
  It 'converte "nao instalado" em E-SETUP-01 no -Check' {
    Test-WsMissingCode 'E-NODE-01' | Should -BeTrue
    Test-WsMissingCode 'E-AUTH-01' | Should -BeFalse
  }
}

Describe 'mensagens' {
  It 'preenche marcadores e deixa os desconhecidos' {
    Format-WsMsg 'Step {N}/12 {X}' @{ N = 3 } | Should -BeExactly 'Step 3/12 {X}'
    M 'passo' @{ N = 4; TITULO = 'Node.js' } | Should -BeExactly ('Step 4/12 ' + [char]0x00B7 + ' Node.js')
    M 's8_statusline_mantida' | Should -Match '-ReplaceStatusline'
  }
  It 'todos os codigos e chaves usados no script existem no catalogo' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    foreach ($m in [regex]::Matches($text, '\bE-[A-Z]+-\d{2}\b')) { $script:Msgs.erros.PSObject.Properties.Name | Should -Contain $m.Value }
    foreach ($m in [regex]::Matches($text, "\bM '([a-z0-9_]+)'")) { $script:Msgs.ui.PSObject.Properties.Name | Should -Contain $m.Groups[1].Value }
  }
}

Describe 'passo 7 (Jira: MCP e Atlassian CLI de reserva)' {
  BeforeEach {
    $script:T = @{ '7' = @{ Estado = ''; Detalhe = ''; Avisos = @(); Falha = $null; Notas = @() } }
    $script:Cur = '7'; $script:Mode = 'check'; $script:Sim = $true; $script:AcliErr = $null; $script:AcliAsked = $false
    $script:ClaudeExe = 'claude.exe'; $script:McpOk = $true; $script:AcliExe = 'acli.exe'; $script:AcliLogin = 1
    $script:WsHome = Join-Path $TestDrive 'ws'; $script:Tmp = Join-Path $TestDrive 'tmp'; $script:Arch = 'x64'
    $script:C = @{ ACLI_VERSION = '9.9.9-stable'; ACLI_WINDOWS_URL = 'https://acli.exemplo/{version}/{file}'; ATLASSIAN_MCP_URL = 'https://mcp.exemplo'
      ACLI_WINDOWS_FILE_X64 = 'acli_9.9.9-stable_windows_amd64.zip'; ACLI_WINDOWS_SHA256_X64 = '00'; ACLI_WINDOWS_FILE_ARM64 = 'b.zip'; ACLI_WINDOWS_SHA256_ARM64 = '00' }
    New-Item -ItemType Directory -Path $script:WsHome -Force | Out-Null
    Mock Register-WsExtra { }
    Mock Write-WsSay { }
    Mock Add-WsUserPath { $script:PathAdded = $Dir }
    Mock Get-WsAcli { if ($script:AcliExe) { return $script:AcliExe }; $p = Join-Path $script:WsHome 'bin/acli.exe'; if (Test-Path -LiteralPath $p) { return $p }; return $null }
    Mock Invoke-WsProcess {
      $a = $Arguments -join ' '
      if ($a -eq 'mcp get atlassian') { if ($script:McpOk) { return @{ ExitCode = 0; StdOut = '' } }; return @{ ExitCode = 1; StdOut = '' } }
      if ($a -like 'mcp add *') { $script:McpOk = $true; return @{ ExitCode = 0; StdOut = '' } }
      if ($a -eq 'mcp list') { return @{ ExitCode = 0; StdOut = 'atlassian: https://mcp.exemplo (HTTP)' } }
      if ($a -eq '--version') { return @{ ExitCode = 0; StdOut = 'acli version 9.9.9-stable' } }
      return @{ ExitCode = $script:AcliLogin; StdOut = '' }
    }
  }
  It 'check: acli sem login = nota, sem aviso' {
    Test-WsStep7 | Should -BeTrue
    $script:T['7'].Detalhe | Should -Match 'Atlassian CLI 9\.9\.9 \(backup\)'
    $script:T['7'].Avisos.Count | Should -Be 0
    ($script:T['7'].Notas -join "`n") | Should -Match 'acli auth login'
  }
  It 'check: acli com login = sem nota do acli' {
    $script:AcliLogin = 0
    Test-WsStep7 | Should -BeTrue
    ($script:T['7'].Notas -join "`n") | Should -Not -Match 'acli auth login'
  }
  It 'check: sem acli = aviso E-ACLI-01, o passo nao falha' {
    $script:AcliExe = $null
    Test-WsStep7 | Should -BeTrue
    $script:T['7'].Avisos[0][0] | Should -Be 'E-ACLI-01'
  }
  It 'check: sem MCP = E-MCP-01' {
    $script:McpOk = $false
    Test-WsStep7 | Should -BeFalse
    $script:T['7'].Falha[0] | Should -Be 'E-MCP-01'
  }
  It 'install: sem acli e sem ter tentado, o Test pede a instalacao' {
    $script:Mode = 'install'; $script:AcliExe = $null
    Test-WsStep7 | Should -BeFalse
  }
  It 'install: SHA errado = aviso com o motivo e nada copiado' {
    $script:Mode = 'install'; $script:AcliExe = $null
    Mock Invoke-WsDownload { Set-Content -LiteralPath $OutFile -Value 'x'; return $true }
    Install-WsStep7 | Should -BeTrue
    $script:T['7'].Avisos[0][0] | Should -Be 'E-ACLI-01'
    $script:T['7'].Avisos[0][1] | Should -Be 'SHA-256 acli_9.9.9-stable_windows_amd64.zip'
    Test-Path -LiteralPath (Join-Path $script:WsHome 'bin/acli.exe') | Should -BeFalse
  }
  It 'install: MCP e acli de raiz, o acli.exe vai para a pasta bin do workshop e para o PATH' {
    $script:Mode = 'install'; $script:AcliExe = $null; $script:McpOk = $false
    $src = Join-Path $TestDrive 'zip/acli_9.9.9-stable_windows_amd64'
    New-Item -ItemType Directory -Path $src -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $src 'acli.exe') -Value 'exe'
    $script:Zip = Join-Path $TestDrive 'acli.zip'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory((Join-Path $TestDrive 'zip'), $script:Zip)
    $script:C.ACLI_WINDOWS_SHA256_X64 = Get-WsSha256 $script:Zip
    Mock Invoke-WsDownload { Copy-Item -LiteralPath $script:Zip -Destination $OutFile; return $true }
    Install-WsStep7 | Should -BeTrue
    $script:T['7'].Avisos.Count | Should -Be 0
    $script:T['7'].Detalhe | Should -Match 'Atlassian CLI 9\.9\.9'
    Test-Path -LiteralPath (Join-Path $script:WsHome 'bin/acli.exe') | Should -BeTrue
    $script:PathAdded | Should -Be (Join-Path $script:WsHome 'bin')
    @($script:T['7'].Notas | Where-Object { $_ -match 'acli auth login' }).Count | Should -Be 1
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
      @{ V = $script:C.WORKSHOP_VERSION; P = $script:Msgs.ui.final_pronto; H = ((Get-WsPricingModelMap $script:Pricing).PSObject.Properties.Name -contains 'claude-haiku-5-5'); S = $script:InjKitSha }
    }
    $r.V | Should -Match '^v'
    $r.P | Should -BeExactly 'Everything is ready for the workshop.'
    $r.H | Should -BeTrue
    $r.S | Should -Match '^[0-9a-f]{64}$'
  }
}
# --- chaos G9-windows: perfil, PowerShell certo, ISE, Group Policy, proxy, Git Bash, OneDrive, antivirus, atalho, Ctrl-C, lock
Describe 'chaos G9-windows: pasta do perfil e caminhos (F1, F8)' {
  It 'usa a pasta do perfil (GetFolderPath/USERPROFILE) e so no fim o $HOME do PowerShell' {
    Get-WsUserHome 'C:\Users\ana' 'C:\Users\ana' 'H:\' | Should -BeExactly 'C:\Users\ana'
    Get-WsUserHome '' 'C:\Users\ana' 'H:\' | Should -BeExactly 'C:\Users\ana'
    Get-WsUserHome '' '' 'H:\' | Should -BeExactly 'H:\'
  }
  It 'o script nao usa o $HOME para caminhos (so o Get-WsUserHome)' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $code = ($text -split "`r?`n" | Where-Object { $_ -notmatch '^\s*#' }) -join "`n"
    $code | Should -Not -Match 'Join-Path \$HOME\b'
    $code | Should -Not -Match '\$HOME\.Substring'
    $code | Should -Not -Match '@\(\$HOME\b'
    $code | Should -Not -Match 'WorkingDirectory = \$HOME'
    $code | Should -Match '\$script:UserHome = Get-WsUserHome \(\[Environment\]::GetFolderPath\(''UserProfile''\)\) \$env:USERPROFILE \$HOME'
  }
  It 'os comandos -Check, -Doctor e -Uninstall publicados usam $env:USERPROFILE' {
    $conf = [IO.File]::ReadAllText((Join-Path $script:Root 'installer/lib/conf.mjs'))
    $conf | Should -Not -Match '"\$HOME\\\\\.workshop-claude'
    ([regex]::Matches($conf, '\$env:USERPROFILE\\\\\.workshop-claude\\\\setup-windows\.ps1')).Count | Should -Be 3
    foreach ($f in @('docs/INSTALL.md', 'docs/pt/INSTALL.md', 'docs/TROUBLESHOOTING.md', 'setup/messages.en.json')) {
      [IO.File]::ReadAllText((Join-Path $script:Root $f)) | Should -Not -Match '\$HOME\\+\.workshop-claude' -Because $f
    }
  }
  It 'reconhece pastas numa partilha de rede (AppData redirecionado, H: do AD)' {
    Test-WsNetworkPath '\\srv\perfis\ana\AppData\Roaming' '' | Should -BeTrue
    Test-WsNetworkPath '\\?\UNC\srv\perfis' '' | Should -BeTrue
    Test-WsNetworkPath 'H:\' 'Network' | Should -BeTrue
    Test-WsNetworkPath 'C:\Users\ana\AppData\Roaming' 'Fixed' | Should -BeFalse
    Test-WsNetworkPath '\\?\C:\Users\ana' '' | Should -BeFalse
    Test-WsNetworkPath '\\.\pipe\x' '' | Should -BeFalse
    Test-WsNetworkPath '' 'Network' | Should -BeFalse
  }
  It 'OneDrive: so as pastas do kit contam, nao os Documentos nem o Ambiente de Trabalho' {
    $od = 'C:\Users\ana\OneDrive - Empresa'
    Find-WsInFolder $od @('C:\Users\ana', 'C:\Users\ana\workshop-claude', 'C:\Users\ana\.claude') | Should -BeExactly ''
    Find-WsInFolder $od @('C:\Users\ana', ($od + '\claude-config')) | Should -BeExactly ($od + '\claude-config')
    Find-WsInFolder $od @(($od + ' 2\x')) | Should -BeExactly ''
    Find-WsInFolder '' @('C:\x') | Should -BeExactly ''
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match 'Find-WsInFolder \$env:OneDrive @\(\$script:UserHome, \$script:Proj, \$script:ClaudeDir\)'
    $text | Should -Not -Match "GetFolderPath\('MyDocuments'\)"
  }
}

Describe 'chaos G9-windows: o Windows PowerShell de 64 bits (F2)' {
  It 'escolhe o Sysnative num PowerShell de 32 bits e o System32 nos outros casos' {
    Get-WsWinPowerShellPath '/win' $true $false | Should -Match 'Sysnative[\\/]WindowsPowerShell[\\/]v1\.0[\\/]powershell\.exe$'
    Get-WsWinPowerShellPath '/win' $true $true | Should -Match 'System32[\\/]WindowsPowerShell'
    Get-WsWinPowerShellPath '/win' $false $false | Should -Match 'System32[\\/]WindowsPowerShell'
  }
  It 'recomeca do PowerShell 7 e do de 32 bits, uma vez so' {
    Get-WsRelaunchReason 'Core' $true $true '' | Should -BeExactly 'core'
    Get-WsRelaunchReason 'Desktop' $true $false '' | Should -BeExactly 'x86'
    Get-WsRelaunchReason 'Desktop' $true $true '' | Should -BeExactly ''
    Get-WsRelaunchReason 'Desktop' $false $false '' | Should -BeExactly ''
    Get-WsRelaunchReason 'Core' $true $false '1' | Should -BeExactly ''
  }
  It 'passa as mesmas opcoes, com os nomes ingleses' {
    (Get-WsSelfArgs @{ Check = $true; Sim = $true; SemDesktop = $false }) -join ' ' | Should -BeExactly '-Check -Yes'
    (Get-WsSelfArgs @{ Desinstalar = $true; SubstituirStatusline = $true }) -join ' ' | Should -BeExactly '-Uninstall -ReplaceStatusline'
    (Get-WsSelfArgs @{}).Count | Should -Be 0
  }
  It 'os instaladores oficiais correm no powershell.exe certo, nunca no $PSHOME' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Not -Match "Join-Path \`$PSHOME 'powershell\.exe'"
    ([regex]::Matches($text, 'Invoke-WsProcess \(Get-WsWinPowerShell\)')).Count | Should -Be 2
    $text | Should -Match '\$ps = Get-WsWinPowerShell'
  }
  It 'o outro PowerShell escreve na consola (nao fica capturado) e os logins tambem' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match '-File \$PSCommandPath @self \| Out-Default'
    $text | Should -Match '& \$script:ClaudeExe auth login --console \| Out-Default'
    $text | Should -Match '& \$exe auth login --hostname github\.com --git-protocol https --web \| Out-Default'
    $text | Should -Match '& \$exe auth login \| Out-Default'
  }
  It 'erros de download do PowerShell 5.1 e 7 dao o codigo certo' {
    $w = [System.Net.WebException]::new('dns', [System.Net.WebExceptionStatus]::NameResolutionFailure)
    $i = Get-WsWebErrorInfo $w
    Get-WsNetCode $i.Status $i.Http | Should -Be 'E-NET-02'
    $sock = [System.Net.Sockets.SocketException]::new(11001)
    $i = Get-WsWebErrorInfo ([System.Exception]::new('No such host is known.', $sock))
    $i.Status | Should -Be 'NameResolutionFailure'
    $i = Get-WsWebErrorInfo ([System.Exception]::new("The proxy tunnel request to proxy 'http://p:8080/' failed with status code '407'."))
    Get-WsNetCode $i.Status $i.Http | Should -Be 'E-NET-03'
    $i = Get-WsWebErrorInfo ([System.Exception]::new('ssl', [System.Security.Authentication.AuthenticationException]::new('untrusted root')))
    Get-WsNetCode $i.Status $i.Http | Should -Be 'E-NET-04'
    $i = Get-WsWebErrorInfo ([System.Exception]::new('t', [TimeoutException]::new('slow')))
    Get-WsNetCode $i.Status $i.Http | Should -Be 'E-NET-01'
    if ('Microsoft.PowerShell.Commands.HttpResponseException' -as [type]) {
      $h = [Microsoft.PowerShell.Commands.HttpResponseException]::new('407', [System.Net.Http.HttpResponseMessage]::new(407))
      $i = Get-WsWebErrorInfo $h
      Get-WsNetCode $i.Status $i.Http | Should -Be 'E-NET-03'
      $h = [Microsoft.PowerShell.Commands.HttpResponseException]::new('404', [System.Net.Http.HttpResponseMessage]::new(404))
      $i = Get-WsWebErrorInfo $h
      $i.Http | Should -Be 404
      Get-WsNetCode $i.Status $i.Http | Should -Be 'E-NET-07'
    }
    (Get-WsWebErrorInfo $null).Status | Should -BeExactly ''
  }
  It 'Invoke-WsDownload classifica a falha pelo Get-WsWebErrorInfo' {
    $script:UA = 'test'
    Mock Invoke-WebRequest { throw [System.Net.WebException]::new('dns', [System.Net.WebExceptionStatus]::NameResolutionFailure) }
    Invoke-WsDownload 'https://exemplo.invalid/x.zip' (Join-Path $TestDrive 'x.zip') | Should -BeFalse
    Get-WsDlCode | Should -Be 'E-NET-02'
  }
}

Describe 'chaos G9-windows: PowerShell ISE e Group Policy (F3, F4)' {
  It 'reconhece o PowerShell ISE' {
    Test-WsIse 'Windows PowerShell ISE Host' $false | Should -BeTrue
    Test-WsIse 'ConsoleHost' $true | Should -BeTrue
    Test-WsIse 'ConsoleHost' $false | Should -BeFalse
    Test-WsIse 'Visual Studio Code Host' $false | Should -BeFalse
    Test-WsIse 'Enterprise Host' $false | Should -BeFalse
  }
  It 'le a politica de execucao da Group Policy (a da maquina ganha)' {
    $g = Get-WsGpoPolicy @{ EnableScripts = 1; ExecutionPolicy = 'AllSigned' } @{ EnableScripts = 1; ExecutionPolicy = 'Unrestricted' }
    $g.Policy | Should -Be 'AllSigned'; $g.Scope | Should -Be 'MachinePolicy'; $g.Blocks | Should -BeTrue
    $g = Get-WsGpoPolicy @{ EnableScripts = 0 } $null
    $g.Policy | Should -Be 'Restricted'; $g.Blocks | Should -BeTrue
    $g = Get-WsGpoPolicy $null @{ EnableScripts = 1; ExecutionPolicy = 'RemoteSigned' }
    $g.Policy | Should -Be 'RemoteSigned'; $g.Scope | Should -Be 'UserPolicy'; $g.Blocks | Should -BeFalse
    $g = Get-WsGpoPolicy @{ EnableScripts = 1; ExecutionPolicy = $null } @{ EnableScripts = 1; ExecutionPolicy = 'AllSigned' }
    $g.Scope | Should -Be 'UserPolicy'
    Get-WsGpoPolicy @{ EnableScripts = $null; ExecutionPolicy = 'AllSigned' } $null | Should -BeNullOrEmpty
    Get-WsGpoPolicy $null $null | Should -BeNullOrEmpty
  }
  It 'com AllSigned imposto, os instaladores oficiais falham com E-SO-07 (e nunca se contorna)' {
    $rc = Resolve-WsFailCode 'E-CC-01' 'install.ps1' '2' 'install' '' $true $false
    $rc[0] | Should -Be 'E-SO-07'
    (Resolve-WsFailCode 'E-UV-01' '' '5' 'install' '' $true $false)[0] | Should -Be 'E-SO-07'
    (Resolve-WsFailCode 'E-CC-01' '' '2' 'check' '' $true $false)[0] | Should -Be 'E-CC-01'
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Not -Match 'ScriptBlock\]::Create\(\(\[IO\.File\]::ReadAllText'
    $text | Should -Match "Set-WsWarn 'E-SO-07'"
  }
  It 'a copia guardada e um ficheiro novo (sem o Zone.Identifier do original)' {
    $script:Dev = $false
    $script:WsHome = Join-Path $TestDrive 'wsself'
    New-Item -ItemType Directory -Path $script:WsHome -Force | Out-Null
    Save-WsSelf
    $dst = Join-Path $script:WsHome 'setup-windows.ps1'
    Test-Path -LiteralPath $dst | Should -BeTrue
    (Get-FileHash -LiteralPath $dst).Hash | Should -Be (Get-FileHash -LiteralPath (Join-Path $script:Root 'setup/setup-windows.ps1')).Hash
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Not -Match 'Copy-Item -LiteralPath \$PSCommandPath'
  }
}

Describe 'chaos G9-windows: bootstrap' {
  BeforeAll {
    $env:WS_NO_MAIN = '1'
    . (Join-Path $script:Root 'setup/bootstrap-windows.ps1')
    $script:Boot = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/bootstrap-windows.ps1'))
  }
  It 'o bootstrap tambem escolhe o Windows PowerShell de 64 bits' {
    Get-WsBootPowerShellPath '/win' $true $false | Should -Match 'Sysnative[\\/]WindowsPowerShell'
    Get-WsBootPowerShellPath '/win' $true $true | Should -Match 'System32[\\/]WindowsPowerShell'
    Get-WsBootPowerShellPath '' $true $false | Should -BeExactly 'powershell.exe'
    $script:Boot | Should -Not -Match "Join-Path \`$env:SystemRoot 'System32\\WindowsPowerShell"
  }
  It 'WORKSHOP_SETUP_ARGS vale so para essa vez (sai da sessao)' {
    Mock Write-Host { }
    $old = @($env:WORKSHOP_REPO_URL, $env:WORKSHOP_VERSION, $env:RELEASE_DOWNLOAD_URL)
    Remove-Item Env:WORKSHOP_REPO_URL, Env:WORKSHOP_VERSION, Env:RELEASE_DOWNLOAD_URL -ErrorAction SilentlyContinue
    $env:WORKSHOP_SETUP_ARGS = '-Check'
    try { Invoke-WsBootstrap -PassArgs @() } finally {
      if ($old[0]) { $env:WORKSHOP_REPO_URL = $old[0] }; if ($old[1]) { $env:WORKSHOP_VERSION = $old[1] }; if ($old[2]) { $env:RELEASE_DOWNLOAD_URL = $old[2] }
    }
    $env:WORKSHOP_SETUP_ARGS | Should -BeNullOrEmpty
  }
  It 'explica a Group Policy antes de descarregar, abre uma janela nova no ISE e mostra a saida do setup' {
    $iGpo = $script:Boot.IndexOf('$gp = Get-WsBootPolicy')
    $iDl = $script:Boot.IndexOf('Invoke-WebRequest')
    $iGpo | Should -BeGreaterThan 0
    $iGpo | Should -BeLessThan $iDl
    $script:Boot | Should -Match "@\('Restricted', 'AllSigned'\) -contains \`$gp\[0\]"
    $script:Boot | Should -Match 'E-SO-07'
    $script:Boot | Should -Match "-match '\\bISE\\b'"
    $script:Boot | Should -Match '-NoExit -File'
    $script:Boot | Should -Match '-File \$dest @all \| Out-Default'
    $script:Boot | Should -Match "if \(\`$env:WS_NO_MAIN -ne '1'\) \{ Invoke-WsBootstrap"
    Get-WsBootPolicy | Should -BeNullOrEmpty -Because 'sem registo do Windows (macOS/Linux) nao ha politica'
  }
}

Describe 'chaos G9-windows: proxy (F5, F6)' {
  It 'NO_PROXY acrescenta o que ja havia e as excecoes do Windows, sem substituir' {
    Merge-WsNoProxy '' '' @() | Should -BeExactly 'localhost,127.0.0.1'
    Merge-WsNoProxy 'corp.local, 10.0.0.1' '*.intra.pt;<local>;10.*;https://git.corp;intranet' @('ghe.corp') | Should -BeExactly 'localhost,127.0.0.1,corp.local,10.0.0.1,.intra.pt,git.corp,intranet,ghe.corp'
    Merge-WsNoProxy 'LOCALHOST,x.pt' 'X.PT' @('x.pt') | Should -BeExactly 'localhost,127.0.0.1,x.pt'
  }
  It 'passa o NO_PROXY ao install-user (instalar e verificar)' {
    $a = Get-WsInstallUserArgs -Sub 'verificar' -NodePath 'n' -KitSrc 'k' -Proxy 'http://p:8080' -NoProxy 'localhost,127.0.0.1,.corp'
    $a -join '|' | Should -Match '\|--https-proxy\|http://p:8080\|--no-proxy\|localhost,127\.0\.0\.1,\.corp$'
    (Get-WsInstallUserArgs -Sub 'verificar' -NodePath 'n' -KitSrc 'k') -join '|' | Should -Not -Match 'no-proxy'
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match '-Lang \$script:Lang -NoProxy \$script:NoProxy'
    $text | Should -Not -Match "\`$env:NO_PROXY = 'localhost,127\.0\.0\.1'"
  }
  It 'um proxy que so aceita o login do Windows da E-NET-03 nos passos que usam o Claude Code, o Node ou o uv' {
    (Resolve-WsFailCode 'E-CC-01' 'install.ps1' '2' 'install' '' $false $true) -join '|' | Should -BeExactly 'E-NET-03|E-CC-01'
    (Resolve-WsFailCode 'E-UV-01' '' '5' 'install' '' $false $true)[0] | Should -Be 'E-NET-03'
    (Resolve-WsFailCode 'E-MEM-03' '' '10' 'install' '' $false $true)[0] | Should -Be 'E-NET-03'
    (Resolve-WsFailCode 'E-SMOKE-01' '' '12' 'install' '' $false $true)[0] | Should -Be 'E-NET-03'
    (Resolve-WsFailCode 'E-KIT-03' '' '8' 'install' '' $false $true)[0] | Should -Be 'E-KIT-03'
    (Resolve-WsFailCode 'E-AUTH-01' '' '12' 'install' '' $false $true)[0] | Should -Be 'E-AUTH-01'
    (Resolve-WsFailCode 'E-CC-01' '' '2' 'check' '' $false $true)[0] | Should -Be 'E-CC-01'
  }
  It 'o one-liner com o login do Windows existe no catalogo e no setup' {
    $script:Msgs.erros.'E-NET-03'.windows -contains '{ONE_LINER_WINDOWS_PROXY}' | Should -BeTrue
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match "\`$f\['ONE_LINER_WINDOWS_PROXY'\] = '\[Net\.WebRequest\]::DefaultWebProxy\.Credentials = \[Net\.CredentialCache\]::DefaultNetworkCredentials; '"
    [IO.File]::ReadAllText((Join-Path $script:Root 'docs/TROUBLESHOOTING.md')) | Should -Match 'DefaultNetworkCredentials; irm '
  }
}

Describe 'chaos G9-windows: Git Bash (F7)' {
  It 'encontra o bash.exe ao lado do git, em Git\cmd, em mingw64 e pelos shims do scoop' {
    function Find-Bash($git, $exec) { foreach ($c in (Get-WsGitBashCandidates $git $exec @())) { if (Test-Path -LiteralPath $c -PathType Leaf) { return $c } }; return $null }
    $g = Join-Path $TestDrive 'Git'
    foreach ($d in @('bin', 'cmd', 'mingw64/bin', 'usr/bin')) { New-Item -ItemType Directory -Path (Join-Path $g $d) -Force | Out-Null }
    $bash = Join-Path $g 'bin/bash.exe'
    foreach ($f in @('bin/git.exe', 'cmd/git.exe', 'mingw64/bin/git.exe', 'bin/bash.exe')) { Set-Content -LiteralPath (Join-Path $g $f) -Value 'x' }
    Find-Bash (Join-Path $g 'bin/git.exe') '' | Should -Be $bash
    Find-Bash (Join-Path $g 'cmd/git.exe') '' | Should -Be $bash
    Find-Bash (Join-Path $g 'mingw64/bin/git.exe') '' | Should -Be $bash
    $sc = Join-Path $TestDrive 'scoop'
    New-Item -ItemType Directory -Path (Join-Path $sc 'shims'), (Join-Path $sc 'apps/git/current/bin'), (Join-Path $sc 'apps/git/current/mingw64/libexec/git-core') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $sc 'shims/git.exe') -Value 'x'
    Set-Content -LiteralPath (Join-Path $sc 'apps/git/current/bin/bash.exe') -Value 'x'
    $exec = (Join-Path $sc 'apps/git/current/mingw64/libexec/git-core').Replace('\', '/')
    Find-Bash (Join-Path $sc 'shims/git.exe') $exec | Should -Be (Join-Path $sc 'apps/git/current/bin/bash.exe')
    Find-Bash (Join-Path $sc 'shims/git.exe') '' | Should -BeNullOrEmpty
    (Get-WsGitBashCandidates '' '' @((Join-Path $TestDrive 'Programs/Git'))) | Should -Contain (Join-Path $TestDrive 'Programs/Git/bin/bash.exe')
  }
  It 'grava CLAUDE_CODE_GIT_BASH_PATH e, sem bash, pede a instalacao do Git for Windows' {
    $script:T = New-WsStateTable; $script:Cur = '1'; $script:Mode = 'install'
    $keepEnv = $env:CLAUDE_CODE_GIT_BASH_PATH; Remove-Item Env:CLAUDE_CODE_GIT_BASH_PATH -ErrorAction SilentlyContinue
    $g = Join-Path $TestDrive 'G2'
    New-Item -ItemType Directory -Path (Join-Path $g 'mingw64/bin'), (Join-Path $g 'bin') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $g 'mingw64/bin/git.exe') -Value 'x'
    Mock Get-WsUserEnvRaw { return $null }
    Mock Invoke-WsProcess { return @{ ExitCode = 1; StdOut = ''; StdErr = '' } }
    Mock Set-WsUserEnv { $script:SetEnv = $Name + '=' + $Value }
    try {
      $script:SetEnv = ''
      Set-WsGitBash (Join-Path $g 'mingw64/bin/git.exe')
      $script:GitBashMissing | Should -BeTrue
      $script:T['1'].Avisos[0][0] | Should -Be 'E-GIT-03'
      Set-Content -LiteralPath (Join-Path $g 'bin/bash.exe') -Value 'x'
      Set-WsGitBash (Join-Path $g 'mingw64/bin/git.exe')
      $script:GitBashMissing | Should -BeFalse
      $script:SetEnv | Should -Be ('CLAUDE_CODE_GIT_BASH_PATH=' + (Join-Path $g 'bin/bash.exe'))
      @($script:T['1'].Avisos | Where-Object { $_[0] -eq 'E-GIT-03' }).Count | Should -Be 0 -Because 'o aviso da tentativa anterior sai'
    } finally { if ($keepEnv) { $env:CLAUDE_CODE_GIT_BASH_PATH = $keepEnv } }
  }
  It 'sem rede para o Git for Windows, um git que ja funciona fica com aviso (o passo 9 corre)' {
    $script:T = New-WsStateTable; $script:Cur = '1'; $script:Mode = 'install'; $script:GitBashMissing = $true
    Mock Install-WsGitForWindows { Set-WsFail 'E-NET-01' 'https://github.com/git-for-windows/x.exe'; return $false }
    Mock Test-WsStep1 { Set-WsWarn 'E-GIT-03' 'C:\MinGit\cmd'; return $true }
    Install-WsStep1 | Should -BeTrue
    $script:T['1'].Falha | Should -BeNullOrEmpty
    ($script:T['1'].Avisos | ForEach-Object { $_[0] }) -join ',' | Should -Be 'E-NET-01,E-GIT-03'
    $script:GitBashTried | Should -BeTrue
    $script:GitBashMissing = $false
    Install-WsStep1 | Should -BeFalse -Because 'sem git nenhum o passo continua a falhar'
  }
}

Describe 'chaos G9-windows: antivirus, AppLocker e WDAC (F9)' {
  It 'reconhece os codigos Win32 de bloqueio, tambem dentro de outras excecoes' {
    Get-WsBlockedCode ([ComponentModel.Win32Exception]::new(225)) | Should -Be 225
    Get-WsBlockedCode ([System.Management.Automation.MethodInvocationException]::new('start', [ComponentModel.Win32Exception]::new(1260))) | Should -Be 1260
    Get-WsBlockedCode ([ComponentModel.Win32Exception]::new(4551)) | Should -Be 4551
    Get-WsBlockedCode ([ComponentModel.Win32Exception]::new(5)) | Should -Be 0
    Get-WsBlockedCode ([ComponentModel.Win32Exception]::new(5)) -AccessDenied | Should -Be 5
    Get-WsBlockedCode ([IO.IOException]::new('virus', -2147024671)) | Should -Be 225
    Get-WsBlockedCode ([ComponentModel.Win32Exception]::new(2)) -AccessDenied | Should -Be 0
    Get-WsBlockedCode ([Exception]::new('x')) | Should -Be 0
    $i = Get-WsWebErrorInfo ([IO.IOException]::new('virus', -2147024671))
    Get-WsNetCode $i.Status $i.Http | Should -Be 'E-PERM-02'
  }
  It 'um programa bloqueado vira E-PERM-02 (e nao o codigo de rede do passo), tambem no -Check' {
    (Resolve-WsFailCode 'E-GIT-02' 'installer -1' '1' 'install' 'C:\t\Git.exe' $false $false) -join '|' | Should -BeExactly 'E-PERM-02|C:\t\Git.exe'
    (Resolve-WsFailCode 'E-UV-01' '' '5' 'install' 'C:\t\uv.exe' $false $false)[0] | Should -Be 'E-PERM-02'
    (Resolve-WsFailCode 'E-CC-01' '' '2' 'check' 'C:\u\claude.exe' $false $false)[0] | Should -Be 'E-PERM-02'
    (Resolve-WsFailCode 'E-NET-01' 'url' '4' 'install' 'C:\old\node.exe' $false $false)[0] | Should -Be 'E-NET-01'
    (Resolve-WsFailCode 'E-GH-01' '' '6' 'install' '' $false $false)[0] | Should -Be 'E-GH-01'
  }
  It 'o Invoke-WsStep usa E-PERM-02 quando um programa do passo foi bloqueado' {
    $script:T = New-WsStateTable; $script:Mode = 'install'; $script:Titles = @{ '6' = 'GitHub CLI' }; $script:Emoji = $false
    $script:GpoBlocks = $false; $script:ProxyAuth = $false
    Mock Write-WsSay { }
    Mock Invoke-WsHelper { return $false }
    Mock Test-WsStep6 { return $false }
    Mock Install-WsStep6 { $script:Blocked = 'C:\u\.workshop-claude\bin\gh.exe'; Set-WsFail 'E-GH-01' 'gh --version'; return $false }
    Invoke-WsStep 6
    $script:T['6'].Estado | Should -Be 'falhou'
    $script:T['6'].Falha[0] | Should -Be 'E-PERM-02'
    $script:T['6'].Falha[1] | Should -Be 'C:\u\.workshop-claude\bin\gh.exe'
  }
  It 'um winget bloqueado e so "sem winget"' {
    $script:OsBuild = 99999; $script:Blocked = ''
    Mock Get-Command { return [pscustomobject]@{ Source = 'C:\w\winget.exe' } } -ParameterFilter { $Name -eq 'winget' }
    Mock Invoke-WsProcess { $script:Blocked = $FilePath; return @{ ExitCode = -1; StdOut = ''; StdErr = 'blocked' } }
    Test-WsWinget | Should -BeFalse
    $script:Blocked | Should -BeExactly ''
  }
  It 'um ficheiro apagado logo a seguir ao download da E-PERM-02, e o SHA-256 tambem' {
    $script:UA = 'test'; $script:Blocked = ''
    Mock Invoke-WebRequest { }
    $out = Join-Path $TestDrive 'apagado.zip'
    Invoke-WsDownload 'https://exemplo.invalid/apagado.zip' $out | Should -BeFalse
    Get-WsDlCode | Should -Be 'E-PERM-02'
    $script:Blocked | Should -Be $out
    $script:Blocked = ''
    Get-WsSha256 (Join-Path $TestDrive 'nao-existe.exe') | Should -BeExactly ''
    $script:Blocked | Should -Be (Join-Path $TestDrive 'nao-existe.exe')
    Mock Invoke-WebRequest { Set-Content -LiteralPath $OutFile -Value 'ok' }
    Invoke-WsDownload 'https://exemplo.invalid/bom.zip' (Join-Path $TestDrive 'bom.zip') | Should -BeTrue
    Test-Path -LiteralPath (Join-Path $TestDrive 'bom.zip') | Should -BeTrue
    Test-Path -LiteralPath (Join-Path $TestDrive 'bom.zip.part') | Should -BeFalse
  }
}

Describe 'chaos G9-windows: app Agent Memory sem atalho (F10)' {
  BeforeEach {
    $script:T = New-WsStateTable; $script:Cur = '10'
    $script:C = @{ MEMORY_APP_VERSION = 'v0.5.0' }
    $script:ClaudeExe = 'claude.exe'; $script:UvExe = 'uv.exe'; $script:McpOk = $false
    $mh = Join-Path $TestDrive 'mh'
    New-Item -ItemType Directory -Path $mh -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $mh 'config.json') -Value '{}'
    Mock Get-WsUvBin { return 'C:\u\.local\bin' }
    Mock Get-WsMemoryExe { return 'C:\u\.local\bin\agent-memory.exe' }
    Mock Get-WsMemoryGui { return 'C:\u\.local\bin\agent-memory-gui.exe' }
    Mock Get-WsMemoryHome { return (Join-Path $TestDrive 'mh') }
    Mock Get-WsShortcutPath { return (Join-Path $TestDrive 'nao-ha/Agent Memory.lnk') }
    Mock Get-WsWebView2Version { return '1.0' }
    Mock Invoke-WsMemorySelftest { return $true }
    Mock Invoke-WsProcess {
      $a = @($Arguments) -join ' '
      if ($a -eq 'tool list') { return @{ ExitCode = 0; StdOut = "agent-memory v0.5.0`n- agent-memory.exe" } }
      if ($a -like 'mcp get*') { if ($script:McpOk) { return @{ ExitCode = 0; StdOut = '' } } else { return @{ ExitCode = 1; StdOut = '' } } }
      return @{ ExitCode = 0; StdOut = '' }
    }
  }
  It 'sem MCP e sem atalho, a falha que aparece e a do MCP' {
    $script:Mode = 'check'
    Test-WsStep10 | Should -BeFalse
    $script:T['10'].Falha -join ' ' | Should -BeExactly 'E-MEM-03 mcp'
  }
  It 'com o MCP, um atalho que nao se consegue criar e so um aviso' {
    $script:Mode = 'install'; $script:McpOk = $true
    Mock New-WsMemoryShortcut { Set-WsWarn 'E-MEM-03' 'shortcut: blocked by policy'; return $false }
    Test-WsStep10 | Should -BeTrue
    $script:T['10'].Falha | Should -BeNullOrEmpty
    $script:T['10'].Avisos[0] -join ' ' | Should -BeExactly 'E-MEM-03 shortcut: blocked by policy'
    $script:Mode = 'check'; $script:T = New-WsStateTable
    Test-WsStep10 | Should -BeTrue
    $script:T['10'].Avisos[0] -join ' ' | Should -BeExactly 'E-MEM-03 shortcut'
  }
  It 'na instalacao, o MCP regista-se antes do atalho' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $body = $text.Substring($text.IndexOf('function Install-WsStep10'))
    $body = $body.Substring(0, $body.IndexOf('function Register-WsMemoryMcp'))
    $body.IndexOf('Register-WsMemoryMcp $exe') | Should -BeLessThan $body.IndexOf('New-WsMemoryShortcut')
    $body | Should -Not -Match "Set-WsFail 'E-MEM-03' \('shortcut"
  }
}

Describe 'chaos G9-windows: Ctrl-C, programas pendurados e o .lock (F11)' {
  It 'o .lock so bloqueia se esse PID ainda e o setup' {
    Test-WsLockHeld '1234' @{ Name = 'powershell'; StartTicks = 0 } | Should -BeTrue
    Test-WsLockHeld "1234`r`n638600000000000000" @{ Name = 'powershell'; StartTicks = 638600000000000000 } | Should -BeTrue
    Test-WsLockHeld "1234`r`n638600000000000000" @{ Name = 'powershell'; StartTicks = 638611111111111111 } | Should -BeFalse
    Test-WsLockHeld "1234`r`n638600000000000000" @{ Name = 'svchost'; StartTicks = 638600000000000000 } | Should -BeFalse
    Test-WsLockHeld "1234`r`n638600000000000000" @{ Name = 'pwsh'; StartTicks = 0 } | Should -BeTrue
    Test-WsLockHeld '1234' $null | Should -BeFalse
    Test-WsLockHeld 'lixo' @{ Name = 'powershell'; StartTicks = 1 } | Should -BeFalse
    Test-WsLockHeld '' @{ Name = 'powershell'; StartTicks = 1 } | Should -BeFalse
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match "M 'ja_a_correr' @\{ PID = \`$first; LOCK = \`$lock \}"
    $script:Msgs.ui.ja_a_correr | Should -Match '\{LOCK\}'
  }
  It 'um programa que passa do tempo e terminado (a espera e aos bocados, para o Ctrl-C chegar)' {
    if (-not (Test-Path -LiteralPath '/bin/sleep')) { Set-ItResult -Skipped -Because 'so em macOS/Linux'; return }
    $script:StepLog = New-Object System.Text.StringBuilder
    $t0 = Get-Date
    $r = Invoke-WsProcess '/bin/sleep' @('30') -TimeoutSec 1
    ((Get-Date) - $t0).TotalSeconds | Should -BeLessThan 10
    $r.ExitCode | Should -Be -2
    $r = Invoke-WsProcess '/bin/echo' @('ola') -TimeoutSec 30
    $r.ExitCode | Should -Be 0
    $r.StdOut.Trim() | Should -BeExactly 'ola'
    $r = Invoke-WsProcess (Join-Path $TestDrive 'nao-existe') @() -TimeoutSec 5
    $r.ExitCode | Should -Be -1
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match 'while \(-not \$p\.WaitForExit\(500\)\)'
    $text | Should -Not -Match 'WaitForExit\(\$TimeoutSec \* 1000\)'
  }
  It 'um Ctrl-C (paragem do pipeline) chega a meio da espera, e o programa filho nao fica a correr' {
    if (-not (Test-Path -LiteralPath '/bin/sh')) { Set-ItResult -Skipped -Because 'so em macOS/Linux'; return }
    $pidFile = Join-Path $TestDrive 'child.pid'
    $ps = [PowerShell]::Create()
    [void]$ps.AddScript({
        param($Setup, $PidFile, $Log)
        $env:WS_NO_MAIN = '1'
        . $Setup
        $script:LogFile = $Log
        Invoke-WsProcess '/bin/sh' @('-c', ('echo $$ > ' + $PidFile + '; exec sleep 60')) -TimeoutSec 120
      }).AddArgument((Join-Path $script:Root 'setup/setup-windows.ps1')).AddArgument($pidFile).AddArgument((Join-Path $TestDrive 'stop.log'))
    $h = $ps.BeginInvoke()
    for ($i = 0; $i -lt 100 -and -not (Test-Path -LiteralPath $pidFile); $i++) { Start-Sleep -Milliseconds 100 }
    $child = [int]([IO.File]::ReadAllText($pidFile).Trim())
    Start-Sleep -Milliseconds 300
    $t0 = Get-Date
    $ps.Stop()
    ((Get-Date) - $t0).TotalSeconds | Should -BeLessThan 5
    $gone = $false
    for ($i = 0; $i -lt 30 -and -not $gone; $i++) { $gone = -not (Get-Process -Id $child -ErrorAction SilentlyContinue); if (-not $gone) { Start-Sleep -Milliseconds 100 } }
    $gone | Should -BeTrue
    $h.IsCompleted | Should -BeTrue
    $ps.Dispose()
  }
}

Describe 'chaos G2-profiles' {
  BeforeAll { $env:WS_PESTER_UP = 'C:\Users\t' }
  AfterAll { Remove-Item Env:WS_PESTER_UP -ErrorAction SilentlyContinue }

  Context 'a pasta do kit passa para a frente do PATH, mesmo que ja la esteja (path-claude-stale)' {
    It 'tira-a de onde estiver e poe uma so copia no inicio, com a grafia que ja tinha' {
      Add-WsPathEntry 'C:\npm;C:\a;C:\novo' 'C:\novo' | Should -Be 'C:\novo;C:\npm;C:\a'
      Add-WsPathEntry 'C:\npm;C:\Novo\;C:\a;C:\novo' 'C:\novo' | Should -Be 'C:\Novo\;C:\npm;C:\a'
      Add-WsPathEntry 'C:\novo;C:\npm' 'C:\NOVO\' | Should -Be 'C:\novo;C:\npm'
      Add-WsPathEntry 'C:\npm;;C:\novo;' 'C:\novo' | Should -Be 'C:\novo;C:\npm'
      Add-WsPathEntry 'C:\a' 'C:\novo' | Should -Be 'C:\novo;C:\a'
      Add-WsPathEntry 'C:\a;;C:\b;' '' | Should -Be 'C:\a;C:\b'
    }
    It 'uma %VARIAVEL% do registo conta como a mesma pasta e fica escrita como estava' {
      Add-WsPathEntry 'C:\npm;%WS_PESTER_UP%\.local\bin' 'C:\Users\t\.local\bin' | Should -Be '%WS_PESTER_UP%\.local\bin;C:\npm'
      Add-WsPathEntry 'C:\npm;"C:\x y\bin\"' 'C:\x y\bin' | Should -Be '"C:\x y\bin\";C:\npm'
    }
    It 'uma copia com outra grafia (a da pessoa) fica onde esta: o --uninstall so tira a do kit' {
      $p = 'C:\Users\t\.local\bin;C:\npm;%WS_PESTER_UP%\.local\bin'
      Add-WsPathEntry $p 'C:\Users\t\.local\bin' | Should -Be $p
      Remove-WsPathEntry $p 'C:\Users\t\.local\bin' | Should -Be 'C:\npm;%WS_PESTER_UP%\.local\bin'
    }
    It 'Test-WsPathHas compara sem caixa, sem barra no fim, sem aspas e com as variaveis expandidas' {
      Test-WsPathHas 'C:\npm;C:\Novo\' 'c:\novo' | Should -BeTrue
      Test-WsPathHas 'C:\npm;%WS_PESTER_UP%\.local\bin' 'C:\Users\T\.local\bin\' | Should -BeTrue
      Test-WsPathHas 'C:\npm;"C:\x y\bin"' 'C:\x y\bin' | Should -BeTrue
      Test-WsPathHas 'C:\npm;C:\novo2' 'C:\novo' | Should -BeFalse
      Test-WsPathHas '' 'C:\novo' | Should -BeFalse
      Test-WsPathHas $null 'C:\novo' | Should -BeFalse
      Test-WsPathHas 'C:\a' '' | Should -BeFalse
    }
    It 'Move-WsPathFront: as que ja estao vao para o inicio pela ordem dada, as outras nao entram, e repetir nao muda nada' {
      $r = Move-WsPathFront 'C:\npm;C:\b;C:\x;C:\a' @('C:\a', 'C:\nao', 'C:\b')
      $r | Should -Be 'C:\a;C:\b;C:\npm;C:\x'
      Move-WsPathFront $r @('C:\a', 'C:\nao', 'C:\b') | Should -BeExactly $r
      Move-WsPathFront 'C:\npm;;C:\x' @('C:\nao') | Should -BeExactly 'C:\npm;;C:\x'
      Move-WsPathFront '' @('C:\a') | Should -Be ''
    }
  }

  Context 'Add-WsUserPath: uma pasta que a pessoa ja tinha muda de lugar e nao fica para o --uninstall tirar' {
    BeforeEach {
      $script:RegPath = $null; $script:Written = $null
      Mock Get-WsUserEnvRaw { return $script:RegPath }
      Mock New-ItemProperty { $script:Written = $Value }
      Mock Register-WsExtra { }
      Mock Send-WsEnvChanged { }
      Mock Update-WsSessionPath { }
    }
    It 'ja estava atras do npm: passa para a frente, sem registo' {
      $script:RegPath = 'C:\Users\t\AppData\Roaming\npm;%WS_PESTER_UP%\.local\bin'
      Add-WsUserPath 'C:\Users\t\.local\bin'
      $script:Written | Should -Be '%WS_PESTER_UP%\.local\bin;C:\Users\t\AppData\Roaming\npm'
      Should -Invoke Register-WsExtra -Times 0 -Exactly
      Should -Invoke Send-WsEnvChanged -Times 1 -Exactly
    }
    It 'nao estava: entra no inicio e fica registada' {
      $script:RegPath = 'C:\Users\t\AppData\Roaming\npm'
      Add-WsUserPath 'C:\Users\t\.local\bin'
      $script:Written | Should -Be 'C:\Users\t\.local\bin;C:\Users\t\AppData\Roaming\npm'
      Should -Invoke Register-WsExtra -Times 1 -Exactly -ParameterFilter { $Tipo -eq 'path_utilizador' -and $Nome -eq 'C:\Users\t\.local\bin' }
    }
    It 'PATH do utilizador vazio: entra e fica registada' {
      Add-WsUserPath 'C:\Users\t\.local\bin'
      $script:Written | Should -Be 'C:\Users\t\.local\bin'
      Should -Invoke Register-WsExtra -Times 1 -Exactly
    }
    It 'ja estava no inicio: nao escreve nada' {
      $script:RegPath = 'C:\Users\t\.local\bin;C:\npm'
      Add-WsUserPath 'C:\Users\t\.local\bin\'
      $script:Written | Should -BeNullOrEmpty
      Should -Invoke New-ItemProperty -Times 0 -Exactly
      Should -Invoke Register-WsExtra -Times 0 -Exactly
      Should -Invoke Update-WsSessionPath -Times 1 -Exactly
    }
  }

  Context 'Update-WsUserPathFront: no fim de cada instalacao, mesmo com os passos ja feitos' {
    BeforeEach {
      $script:UserHome = Join-Path $TestDrive 'u'; $script:WsHome = Join-Path $script:UserHome '.workshop-claude'; $script:NodeExe = $null
      $script:Lb = Join-Path $script:UserHome '.local\bin'; $script:Kb = Join-Path $script:WsHome 'bin'; $script:Kn = Join-Path $script:WsHome 'node'
      Remove-Item -LiteralPath $script:UserHome -Recurse -Force -ErrorAction SilentlyContinue   # cada caso comeca sem as pastas no disco
      $script:RegPath = $null; $script:Written = $null
      Mock Get-WsUserEnvRaw { return $script:RegPath }
      Mock New-ItemProperty { $script:Written = $Value }
      Mock Register-WsExtra { }
      Mock Send-WsEnvChanged { }
      Mock Update-WsSessionPath { }
    }
    It 'um claude antigo do npm a frente: as pastas do kit passam para o inicio numa so escrita, sem registo' {
      $script:RegPath = ('C:\npm;{0};C:\x;{1}' -f $script:Lb, $script:Kb)
      Update-WsUserPathFront
      $script:Written | Should -Be ('{0};{1};C:\npm;C:\x' -f $script:Lb, $script:Kb)
      Should -Invoke New-ItemProperty -Times 1 -Exactly
      Should -Invoke Register-WsExtra -Times 0 -Exactly
      Should -Invoke Send-WsEnvChanged -Times 1 -Exactly
    }
    It 'repetir com a ordem ja certa nao escreve nada' {
      $script:RegPath = ('{0};{1};C:\npm;C:\x' -f $script:Lb, $script:Kb)
      Update-WsUserPathFront
      Should -Invoke New-ItemProperty -Times 0 -Exactly
      Should -Invoke Send-WsEnvChanged -Times 0 -Exactly
    }
    It 'nao acrescenta pastas que nao estavam, nem escreve num PATH vazio' {
      $script:RegPath = 'C:\npm;C:\x'
      Update-WsUserPathFront
      $script:RegPath = $null
      Update-WsUserPathFront
      Should -Invoke New-ItemProperty -Times 0 -Exactly
    }
    It 'uma pasta do kit que existe no disco mas saiu do PATH do utilizador volta a entrar' {
      New-Item -ItemType Directory -Path $script:Kb -Force | Out-Null
      $script:RegPath = ('C:\npm;{0}' -f $script:Lb)
      Mock Add-WsUserPath { }
      Update-WsUserPathFront
      Should -Invoke Add-WsUserPath -Times 1 -Exactly
      Should -Invoke Add-WsUserPath -Times 1 -Exactly -ParameterFilter { $Dir -eq $script:Kb }
    }
    It 'uma GPO apagou o PATH do utilizador: as pastas do kit voltam pela ordem certa e ficam para o --uninstall' {
      New-Item -ItemType Directory -Path $script:Lb, $script:Kb -Force | Out-Null
      Mock New-ItemProperty { $script:Written = $Value; $script:RegPath = $Value }
      Update-WsUserPathFront
      $script:RegPath | Should -Be ('{0};{1}' -f $script:Lb, $script:Kb)
      Should -Invoke Register-WsExtra -Times 2 -Exactly -ParameterFilter { $Tipo -eq 'path_utilizador' }
      Update-WsUserPathFront
      Should -Invoke New-ItemProperty -Times 3 -Exactly
    }
    It 'o node do kit so vai para a frente quando e o que esta em uso' {
      $script:RegPath = ('C:\nvm;{0};{1}' -f $script:Kn, $script:Lb)
      Update-WsUserPathFront
      $script:Written | Should -Be ('{0};C:\nvm;{1}' -f $script:Lb, $script:Kn)
      $script:NodeExe = Join-Path $script:Kn 'node.exe'
      Update-WsUserPathFront
      $script:Written | Should -Be ('{0};{1};C:\nvm' -f $script:Lb, $script:Kn)
    }
    It 'um erro do registo fica no log e nao para o setup' {
      $script:RegPath = ('C:\npm;{0}' -f $script:Lb)
      Mock New-ItemProperty { throw 'acesso negado' }
      { Update-WsUserPathFront } | Should -Not -Throw
      Should -Invoke Send-WsEnvChanged -Times 0 -Exactly
    }
    It 'so corre na instalacao, depois do passo 12' {
      $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
      $text | Should -Match "Invoke-WsStep 12 @\(2, 3\)\r?\n\s+if \(\`$script:Mode -eq 'install'\) \{ Update-WsUserPathFront \}"
    }
  }

  Context 'Get-WsClaude: o claude do kit primeiro' {
    BeforeEach {
      $script:UserHome = Join-Path $TestDrive 'u'
      Mock Get-Command { return [pscustomobject]@{ CommandType = 'Application'; Source = 'C:\npm\claude.cmd' } } -ParameterFilter { $Name -eq 'claude' }
    }
    It 'com ~\.local\bin\claude.exe, usa-o mesmo que o PATH tenha outro antes' {
      $p = Join-Path $script:UserHome '.local\bin\claude.exe'
      New-Item -ItemType File -Path $p -Force | Out-Null
      Get-WsClaude | Should -Be $p
    }
    It 'sem ele, usa o do PATH' {
      $script:UserHome = Join-Path $TestDrive 'sem-claude'
      Get-WsClaude | Should -Be 'C:\npm\claude.cmd'
    }
  }
}
