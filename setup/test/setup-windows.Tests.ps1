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
    Mock New-WsMemoryShortcut { Set-WsWarn 'E-MEM-06' 'Programs'; return $false }
    Test-WsStep10 | Should -BeTrue
    $script:T['10'].Falha | Should -BeNullOrEmpty
    $script:T['10'].Avisos[0] -join ' ' | Should -BeExactly 'E-MEM-06 Programs'
    # G6: no -Check, com a pasta do atalho com escrita, falta correr o setup (sem escrita: E-MEM-06, no bloco G6).
    $script:Mode = 'check'; $script:T = New-WsStateTable
    Test-WsStep10 | Should -BeTrue
    $script:T['10'].Avisos[0] -join ' ' | Should -BeExactly 'E-SETUP-01 shortcut'
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
    # G6: uma hora de arranque que nao se le (outro utilizador, SYSTEM, elevado) nao e este setup.
    Test-WsLockHeld "1234`r`n638600000000000000" @{ Name = 'pwsh'; StartTicks = 0 } | Should -BeFalse
    Test-WsLockHeld '1234' $null | Should -BeFalse
    Test-WsLockHeld 'lixo' @{ Name = 'powershell'; StartTicks = 1 } | Should -BeFalse
    Test-WsLockHeld '' @{ Name = 'powershell'; StartTicks = 1 } | Should -BeFalse
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match "M 'lock_ativo' @\{ PID = \`$first; HORA = \`$since \}"
    $script:Msgs.ui.lock_ativo | Should -Match '\{HORA\}'
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

# --- chaos G6-lifecycle: lock, -Check/-Doctor com a ultima instalacao, copia guardada, kit-src, permissoes, atalho,
# pasta das memorias, settings.json e resumo (port de setup-mac.sh)
Describe 'chaos G6-lifecycle' {
  BeforeAll {
    function Start-WsTestProc([string]$Exe, [string[]]$ArgList) {
      if ($env:OS -eq 'Windows_NT') { return (Start-Process -FilePath $Exe -ArgumentList $ArgList -WindowStyle Hidden -PassThru) }
      return (Start-Process -FilePath $Exe -ArgumentList $ArgList -PassThru)
    }
    # Pastas sem escrita com chmod: so em macOS/Linux, e nunca como root (no Windows seriam ACL).
    $script:Unix = (Test-Path -LiteralPath '/bin/sh') -and ([Environment]::UserName -ne 'root')
    $script:Titles = @{}
    foreach ($p in $script:Msgs.passos.PSObject.Properties) { $script:Titles[$p.Name] = $p.Value }
    $script:KeepLog = $script:LogFile
    $script:G6Log = @(
      '10:00:01 === step 10: Agent Memory app (mode install)',
      '10:00:01 --- command output (step 10) ---',
      'error: invalid peer certificate: UnknownIssuer',
      '--- end ---',
      '10:00:02 result step 10: aviso E-MEM-03|uv tool install',
      '10:00:03 result step 1: ja',
      '10:05:00 === step 10: Agent Memory app (mode doctor)',
      '10:05:00 --- command output (step 10) ---',
      '[claude-code:x] y',
      '--- end ---'
    )
  }
  AfterAll { $script:LogFile = $script:KeepLog }
  BeforeEach {
    $script:Said = @()
    Mock Write-WsSay { $script:Said += $Text }
    $script:T = New-WsStateTable
    $script:StepLog = New-Object System.Text.StringBuilder
    $script:Blocked = ''; $script:GpoBlocks = $false; $script:ProxyAuth = $false; $script:Emoji = $false
    $script:LogFile = $script:KeepLog
  }

  It 'lock: o PID de outro programa, o proprio PID e um .lock vazio velho nao bloqueiam; um setup vivo bloqueia com a mensagem do catalogo' {
    $d = Join-Path $TestDrive 'lk'
    New-Item -ItemType Directory -Path $d -Force | Out-Null
    $lock = Join-Path $d '.lock'
    if ($env:OS -eq 'Windows_NT') { $other = Start-WsTestProc 'cmd.exe' @('/c', 'ping -n 30 127.0.0.1 >nul') } else { $other = Start-WsTestProc '/bin/sleep' @('30') }
    $ps = Start-WsTestProc (Get-Process -Id $PID).Path @('-NoProfile', '-NonInteractive', '-Command', 'Start-Sleep 30')
    try {
      Start-Sleep -Milliseconds 500
      [IO.File]::WriteAllText($lock, [string]$other.Id)
      Enter-WsLock $lock | Should -BeTrue
      ([IO.File]::ReadAllLines($lock))[0] | Should -BeExactly ([string]$PID)
      [IO.File]::WriteAllText($lock, [string]$PID)
      Enter-WsLock $lock | Should -BeTrue
      $ticks = (Get-Process -Id $ps.Id).StartTime.ToUniversalTime().Ticks
      [IO.File]::WriteAllText($lock, ([string]$ps.Id + "`r`n" + $ticks))
      Enter-WsLock $lock | Should -BeFalse
      ($script:Said -join "`n") | Should -Match ('already running in another window \(PID ' + $ps.Id + ', since \d\d:\d\d\)')
      ([IO.File]::ReadAllLines($lock))[0] | Should -BeExactly ([string]$ps.Id)
      # O mesmo PowerShell com outra hora de arranque: o PID foi reutilizado.
      [IO.File]::WriteAllText($lock, ([string]$ps.Id + "`r`n" + ($ticks - 10000000)))
      Enter-WsLock $lock | Should -BeTrue
      # .lock acabado de criar (ainda sem PID): bloqueia; com mais de 10 s e velho.
      [IO.File]::WriteAllText($lock, '')
      Enter-WsLock $lock | Should -BeFalse
      (Get-Item -LiteralPath $lock -Force).LastWriteTime = (Get-Date).AddMinutes(-1)
      Enter-WsLock $lock | Should -BeTrue
      ([IO.File]::ReadAllLines($lock))[0] | Should -BeExactly ([string]$PID)
    } finally {
      Stop-Process -Id $other.Id -Force -ErrorAction SilentlyContinue
      Stop-Process -Id $ps.Id -Force -ErrorAction SilentlyContinue
    }
    Test-WsLockHeld ([string]$PID) @{ Name = 'pwsh'; StartTicks = 0 } $PID | Should -BeFalse
    Test-WsLockHeld '99999999999999999999999' @{ Name = 'pwsh'; StartTicks = 0 } | Should -BeFalse
  }

  It 'lock: o finally so apaga o .lock deste setup; o lock vem antes do titulo e o WsHome sem escrita antes do lock' {
    $lock = Join-Path $TestDrive 'ex.lock'
    [IO.File]::WriteAllText($lock, "99999999`r`n1")
    Exit-WsLock $lock
    Test-Path -LiteralPath $lock | Should -BeTrue
    [IO.File]::WriteAllText($lock, ([string]$PID + "`r`n1"))
    Exit-WsLock $lock
    Test-Path -LiteralPath $lock | Should -BeFalse
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $main = $text.Substring($text.IndexOf('function Invoke-WsMain'))
    $main.IndexOf('Test-WsDirWritable $script:WsHome') | Should -BeLessThan $main.IndexOf('Enter-WsLock $lock')
    $main.IndexOf('setup.log.unwritable-') | Should -BeLessThan $main.IndexOf('Enter-WsLock $lock')
    $main.IndexOf('Enter-WsLock $lock') | Should -BeLessThan $main.IndexOf('(Update-WsSelf)')
    $main.IndexOf('(Update-WsSelf)') | Should -BeLessThan $main.IndexOf("M 'titulo'")
    $main | Should -Match "\`$script:Mode -ne 'uninstall' -and \(Update-WsSelf\)"
    $main | Should -Match 'Exit-WsLock \$lock'
    $text | Should -Not -Match 'The setup is already running \(PID'
  }

  It 'resultado de cada instalacao no setup.log: o -Check mostra a falha da ultima, e uma instalacao boa depois apaga-a' {
    $log = Join-Path $TestDrive 'g6-setup.log'
    [IO.File]::WriteAllText($log, (($script:G6Log -join "`r`n") + "`r`n"))
    $r = Get-WsLastInstallResult '10' $log
    $r[0] | Should -BeExactly 'E-MEM-03'
    $r[1] | Should -BeExactly 'uv tool install'
    Get-WsLastInstallResult '1' $log | Should -BeNullOrEmpty
    Get-WsLastInstallResult '9' $log | Should -BeNullOrEmpty
    Get-WsLastInstallResult '10' (Join-Path $TestDrive 'nao-ha.log') | Should -BeNullOrEmpty
    $script:LogFile = $log; $script:Mode = 'check'; $script:UserHome = $TestDrive
    Mock Test-WsStep10 { Set-WsFail 'E-MEM-01' ''; return $false }
    Invoke-WsStep 10
    $script:T['10'].Estado | Should -Be 'aviso'
    (@($script:T['10'].Avisos | ForEach-Object { $_ -join '|' }) -join ';') | Should -BeExactly 'E-SETUP-01|E-MEM-01;E-MEM-03|uv tool install'
    $script:T['10'].Detalhe | Should -BeExactly 'This step is not done yet (E-SETUP-01)'
    [IO.File]::AppendAllText($log, "10:06:00 result step 10: ja`r`n")
    Get-WsLastInstallResult '10' $log | Should -BeNullOrEmpty
  }

  It 'instalacao: a falha fica no setup.log antes de virar aviso; um erro de permissao na saida ganha ao codigo do passo' {
    $log = Join-Path $TestDrive 'g6-install.log'
    $script:LogFile = $log; $script:Mode = 'install'; $script:UserHome = 'C:\Users\x'
    Mock Test-WsDirWritable { return $false }
    Mock Invoke-WsHelper { return $false }
    Mock Test-WsStep10 { return $false }
    Mock Install-WsStep10 { Set-WsFail 'E-MEM-03' 'uv tool install'; return $false }
    Invoke-WsStep 10
    $script:T['10'].Estado | Should -Be 'aviso'
    @(Get-Content -LiteralPath $log | Where-Object { $_ -match ' result step 10: ' })[0] | Should -Match ' result step 10: aviso E-MEM-03\|uv tool install$'
    (Get-WsLastInstallResult '10' $log) -join '|' | Should -BeExactly 'E-MEM-03|uv tool install'
    Mock Test-WsStep8 { return $false }
    Mock Install-WsStep8 { Add-WsStepLog "Copying...`nEACCES: permission denied, mkdir 'C:\Users\x\.claude\skills'"; return $false }
    Invoke-WsStep 8
    $script:T['8'].Estado | Should -Be 'falhou'
    $script:T['8'].Falha -join '|' | Should -BeExactly "E-PERM-01|EACCES: permission denied, mkdir '~\.claude\skills'"
    @(Get-Content -LiteralPath $log | Where-Object { $_ -match ' result step 8: ' })[0] | Should -Match " result step 8: falhou E-PERM-01\|EACCES: permission denied, mkdir '~\\\.claude\\skills'$"
  }

  It 'reclassificacao: so os erros de permissao contam (rede, publickey, E-CFG-05 e o antivirus ficam)' {
    Get-WsPermLine ("Downloading...`nEACCES: permission denied, mkdir 'C:\Users\x\.claude\skills'`n") 'C:\Users\x' | Should -BeExactly "EACCES: permission denied, mkdir '~\.claude\skills'"
    Get-WsPermLine "Access to the path 'C:\USERS\X\.local\bin\uv.exe' is denied." 'C:\Users\x' | Should -BeExactly "Access to the path '~\.local\bin\uv.exe' is denied."
    Get-WsPermLine "EPERM: operation not permitted, open 'C:\Users\xavier\a'" 'C:\Users\x' | Should -BeExactly "EPERM: operation not permitted, open 'C:\Users\xavier\a'"
    Get-WsPermLine "git@host: Permission denied (publickey).`ncurl: (6) Could not resolve host" 'C:\Users\x' | Should -BeExactly ''
    (Get-WsPermLine ('EACCES ' + ('x' * 300)) '').Length | Should -Be 160
    $script:Cur = '2'; $script:UserHome = 'C:\Users\x'
    Add-WsStepLog 'curl: (6) Could not resolve host'
    Set-WsFail 'E-NET-02' 'x'; Invoke-WsPermReclass
    $script:T['2'].Falha[0] | Should -Be 'E-NET-02'
    Add-WsStepLog "mkdir: C:\Users\x\.claude\downloads: Permission denied"
    Set-WsFail 'E-CC-01' 'install.ps1'; Invoke-WsPermReclass
    $script:T['2'].Falha -join '|' | Should -BeExactly 'E-PERM-01|mkdir: ~\.claude\downloads: Permission denied'
    foreach ($c in @('E-CFG-05', 'E-PERM-02', 'E-SO-07', 'E-AUTH-01', 'E-SMOKE-02')) { Set-WsFail $c 'x'; Invoke-WsPermReclass; $script:T['2'].Falha[0] | Should -Be $c }
    # O FullyQualifiedErrorId de um script bloqueado pela execution policy nao e um erro de permissao.
    Get-WsPermLine "+ FullyQualifiedErrorId : UnauthorizedAccess`n+ CategoryInfo : SecurityError: (:) [], PSSecurityException" 'C:\Users\x' | Should -BeExactly ''
    Get-WsPermLine "+ CategoryInfo : PermissionDenied: (C:\Users\x\.claude:String) [New-Item], UnauthorizedAccessException" 'C:\Users\x' | Should -Match 'UnauthorizedAccessException$'
  }

  It 'reclassificacao: um ficheiro em uso (pasta de cima com escrita) fica com o codigo do passo; sem escrita e E-PERM-01' {
    $script:Cur = '10'; $script:UserHome = Join-Path $TestDrive 'perfil-uso'; $script:T = New-WsStateTable
    $tools = Join-Path $script:UserHome 'AppData/Roaming/uv/tools'
    New-Item -ItemType Directory -Path (Join-Path $tools 'agent-memory') -Force | Out-Null
    $script:StepLog = New-Object System.Text.StringBuilder
    Add-WsStepLog ('error: failed to remove directory `' + (Join-Path $tools 'agent-memory') + '`: Access is denied. (os error 5)')
    Set-WsFail 'E-MEM-03' 'uv tool install'; Invoke-WsPermReclass
    $script:T['10'].Falha -join '|' | Should -BeExactly 'E-MEM-03|uv tool install'
    Mock Test-WsDirWritable { return $false } -ParameterFilter { $Dir -like '*uv*tools' }
    Invoke-WsPermReclass
    $script:T['10'].Falha[0] | Should -Be 'E-PERM-01'
    $script:T['10'].Falha[1] | Should -Match '^error: failed to remove directory `~.AppData.Roaming.uv.tools.agent-memory`: Access is denied'
  }

  It 'comandos que devolvem um caminho a pessoa e caminhos com ~' {
    Get-WsPermFixCmd 'C:\Users\x\.claude' 'dir' 'EMP\x' | Should -BeExactly 'icacls "C:\Users\x\.claude" /grant "EMP\x:(OI)(CI)F" /T'
    Get-WsPermFixCmd 'C:\Users\x\.claude.json' 'file' 'EMP\x' | Should -BeExactly 'icacls "C:\Users\x\.claude.json" /grant "EMP\x:F"'
    Get-WsPermFixCmd 'C:\Users\x\.claude.json' 'readonly' 'EMP\x' | Should -BeExactly 'attrib -R "C:\Users\x\.claude.json"'
    Get-WsPermFixCmd 'C:\Users\x\.local\bin' 'notdir' 'EMP\x' | Should -BeExactly 'Rename-Item -LiteralPath "C:\Users\x\.local\bin" -NewName "bin.old"'
    Format-WsHomePath 'C:\Users\x\.local\bin' 'C:\Users\x' | Should -BeExactly '~\.local\bin'
    Format-WsHomePath 'C:\USERS\X' 'C:\Users\x\' | Should -BeExactly '~'
    Format-WsHomePath 'C:\Users\xavier\a' 'C:\Users\x' | Should -BeExactly 'C:\Users\xavier\a'
    Format-WsHomePath 'D:\dados' 'C:\Users\x' | Should -BeExactly 'D:\dados'
    $f = Join-Path $TestDrive 'pf-file'
    Set-Content -LiteralPath $f -Value 'x'
    Get-WsPermFix $f | Should -Match '^Rename-Item -LiteralPath ".*pf-file" -NewName "pf-file\.old"$'
    $script:UserHome = Split-Path -Parent $TestDrive
    Get-WsPermFix (Join-Path $TestDrive 'nao/existe') | Should -Match ('^icacls "' + [regex]::Escape($TestDrive) + '" /grant ".+:\(OI\)\(CI\)F" /T$')
    # Nunca um icacls /T na pasta do perfil, nem numa pasta de cima fora do perfil; um caminho que existe fora dele conta.
    $script:UserHome = $TestDrive
    Get-WsPermFix (Join-Path $TestDrive 'nao/existe') | Should -BeExactly ''
    Get-WsPermFix $TestDrive | Should -BeExactly ''
    $script:UserHome = Join-Path $TestDrive 'perfil'
    Get-WsPermFix (Join-Path $TestDrive 'fora/nao/existe') | Should -BeExactly ''
    Get-WsPermFix $f | Should -Match '^Rename-Item -LiteralPath ".*pf-file"'
    Test-WsDirWritable $TestDrive | Should -BeTrue
    Test-WsDirWritable (Join-Path $TestDrive 'nao/existe') | Should -BeTrue
    Test-WsDirWritable $f | Should -BeFalse
    @(Get-ChildItem -LiteralPath $TestDrive -Force -Filter '.ws-write-*').Count | Should -Be 0
  }

  It 'restos de outro utilizador: aviso E-PERM-01 com os caminhos, um comando por caminho, e os passos 2 e 5 nao descarregam' {
    $h = Join-Path $TestDrive 'home com espaco'
    foreach ($s in @('.claude', '.local', '.workshop-claude')) { New-Item -ItemType Directory -Path (Join-Path $h $s) -Force | Out-Null }
    Set-Content -LiteralPath (Join-Path $h '.local/bin') -Value 'x'
    $cj = Join-Path $h '.claude.json'
    Set-Content -LiteralPath $cj -Value '{}'
    (Get-Item -LiteralPath $cj -Force).IsReadOnly = $true
    if ($script:Unix) { chmod 555 (Join-Path $h '.claude') }
    $script:UserHome = $h; $script:WsHome = Join-Path $h '.workshop-claude'; $script:ClaudeDir = Join-Path $h '.claude'; $script:Cur = '0'
    $keep = @{ APPDATA = $env:APPDATA; LOCALAPPDATA = $env:LOCALAPPDATA; CLAUDE_CONFIG_DIR = $env:CLAUDE_CONFIG_DIR }
    try {
      foreach ($k in $keep.Keys) { Remove-Item ('Env:' + $k) -ErrorAction SilentlyContinue }
      Test-WsPermScan
    } finally {
      foreach ($k in $keep.Keys) { if ($keep[$k]) { Set-Item ('Env:' + $k) $keep[$k] } }
      if ($script:Unix) { chmod 755 (Join-Path $h '.claude') }
      (Get-Item -LiteralPath $cj -Force).IsReadOnly = $false
    }
    $w = $script:T['0'].Avisos[0]
    $w[0] | Should -Be 'E-PERM-01'
    $exp = '~\.local\bin (not a folder) ~\.claude.json'
    if ($script:Unix) { $exp = '~\.claude ' + $exp }
    ($w[1] -replace '/', '\') | Should -BeExactly $exp
    $notes = $script:T['0'].Notas -join "`n"
    $notes | Should -Match 'run the setup again: Rename-Item -LiteralPath ".*[\\/]\.local[\\/]bin" -NewName "bin\.old"'
    $notes | Should -Match 'run the setup again: attrib -R ".*[\\/]\.claude\.json"'
    if ($script:Unix) { $notes | Should -Match 'run the setup again: icacls ".*[\\/]\.claude" /grant ".+:\(OI\)\(CI\)F" /T' }
    $script:Cur = '5'
    Test-WsPermBlocked @((Join-Path $h '.local\bin\uv.exe')) | Should -BeTrue
    ($script:T['5'].Falha -join '|') -replace '/', '\' | Should -BeExactly 'E-PERM-01|~\.local\bin'
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    foreach ($f in @('Install-WsStep2', 'Install-WsStep5')) {
      $body = $text.Substring($text.IndexOf('function ' + $f + ' {'))
      $body.IndexOf('Test-WsPermBlocked') | Should -BeLessThan $body.IndexOf('Invoke-WsDownload')
    }
    # Uma pasta pessoal normal nao avisa.
    Remove-Item -LiteralPath (Join-Path $h '.local/bin') -Force
    $script:T = New-WsStateTable; $script:Cur = '0'
    try { foreach ($k in $keep.Keys) { Remove-Item ('Env:' + $k) -ErrorAction SilentlyContinue }; Test-WsPermScan }
    finally { foreach ($k in $keep.Keys) { if ($keep[$k]) { Set-Item ('Env:' + $k) $keep[$k] } } }
    $script:T['0'].Avisos.Count | Should -Be 0
    $script:T['0'].Notas.Count | Should -Be 0
    @($script:PermBad).Count | Should -Be 0
  }

  It '-Doctor: manda a saida da ultima instalacao de cada passo com problema, sem as linhas [claude-code:...], e diz que nao ha ferramentas' {
    $log = Join-Path $TestDrive 'g6-doctor.log'
    [IO.File]::WriteAllText($log, (($script:G6Log -join "`r`n") + "`r`n"))
    @(Get-WsLastStepOutput '10' $script:G6Log) -join '|' | Should -BeExactly 'error: invalid peer certificate: UnknownIssuer'
    @(Get-WsLastStepOutput '1' $script:G6Log).Count | Should -Be 0
    $script:LogFile = $log
    foreach ($k in @($script:T.Keys)) { $script:T[$k].Estado = 'ok' }
    $script:T['10'].Estado = 'aviso'; $script:T['10'].Avisos = @(, @('E-SETUP-01', 'E-MEM-01'))
    $script:AuthOk = $true; $script:NetApiOk = $true
    Mock Get-WsVersionsLine { return 'versions' }
    Mock Invoke-WsClaudeHelper { $script:Prompt = $Prompt; return $null }
    Invoke-WsDoctor
    $script:Prompt | Should -Match 'You cannot use tools, run commands or read files: answer now'
    $script:Prompt | Should -Match 'Last recorded install output of each step with a problem'
    $script:Prompt | Should -Match '--- step 10 \(.+\) ---\nerror: invalid peer certificate: UnknownIssuer'
    $script:Prompt | Should -Not -Match '\[claude-code:'
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $helper = $text.Substring($text.IndexOf('function Invoke-WsHelper'))
    $helper.Substring(0, $helper.IndexOf('function Invoke-WsDoctor')) | Should -Match "Where-Object \{ \`$_ -notmatch '\^\\\[claude-code:' \}"
  }

  It 'copia guardada desatualizada: substitui-se pela da release (SHA256SUMS), so com os valores injetados; sem rede fica a local' {
    $script:WsHome = Join-Path $TestDrive 'sws'; $script:Tmp = Join-Path $TestDrive 'stmp'; $script:Rel = Join-Path $TestDrive 'srel'
    foreach ($p in @($script:WsHome, $script:Tmp, $script:Rel)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
    $dst = Join-Path $script:WsHome 'setup-windows.ps1'
    $other = Join-Path $TestDrive 'outra-copia.ps1'
    Set-Content -LiteralPath $other -Value '# other'
    [IO.File]::WriteAllText($dst, "# old copy`r`n")
    $rel = Join-Path $script:Rel 'setup-windows.ps1'
    [IO.File]::WriteAllText($rel, ("# release`r`n`$script:WsInjKitSha256 = '" + ('a' * 64) + "'`r`n"))
    $sum = Get-WsSha256 $rel
    [IO.File]::WriteAllText((Join-Path $script:Rel 'SHA256SUMS'), ($sum + '  setup-windows.ps1' + "`n"))
    $script:Dev = $false; $script:ReExec = $false; $script:Net = $false
    Mock Get-WsReleaseUrl { return ('https://rel.invalid/' + $File) }
    Mock Invoke-WsDownload { if (-not $script:Net) { return $false }; Copy-Item -LiteralPath (Join-Path $script:Rel ($Url.Split('/')[-1])) -Destination $OutFile -Force; return $true }
    Update-WsSelf -Self $dst | Should -BeFalse
    [IO.File]::ReadAllText($dst) | Should -BeExactly "# old copy`r`n"
    $script:Net = $true
    Update-WsSelf -Self $other | Should -BeFalse
    $script:ReExec = $true
    Update-WsSelf -Self $dst | Should -BeFalse
    $script:ReExec = $false
    Update-WsSelf -Self $dst | Should -BeTrue
    Get-WsSha256 $dst | Should -Be $sum
    Update-WsSelf -Self $dst | Should -BeFalse
    [IO.File]::WriteAllText($rel, "# source copy, no injected values`r`n")
    [IO.File]::WriteAllText((Join-Path $script:Rel 'SHA256SUMS'), ((Get-WsSha256 $rel) + '  setup-windows.ps1' + "`n"))
    [IO.File]::WriteAllText($dst, "# old copy`r`n")
    Update-WsSelf -Self $dst | Should -BeFalse
    [IO.File]::ReadAllText($dst) | Should -BeExactly "# old copy`r`n"
  }

  It 'a copia nova corre noutro processo, com as mesmas opcoes, WS_REEXEC=1 e sem o .lock deste' {
    $script:WsHome = Join-Path $TestDrive 'rws'
    New-Item -ItemType Directory -Path $script:WsHome -Force | Out-Null
    $lock = Join-Path $script:WsHome '.lock'
    $out = Join-Path $TestDrive 'reexec.txt'
    $child = "param([switch]`$Check, [switch]`$NoDesktop, [switch]`$Yes)`r`n" +
      "[IO.File]::WriteAllText('" + $out + "', ('reexec=' + `$env:WS_REEXEC + ' check=' + [bool]`$Check + ' nodesktop=' + [bool]`$NoDesktop + ' yes=' + [bool]`$Yes + ' lock=' + (Test-Path -LiteralPath '" + $lock + "')))`r`n" +
      "exit 7`r`n"
    [IO.File]::WriteAllText((Join-Path $script:WsHome 'setup-windows.ps1'), $child)
    [IO.File]::WriteAllText($lock, [string]$PID)
    $script:Params = @{ Check = $true; Doctor = $false; Desinstalar = $false; SemDesktop = $true; Sim = $false; SubstituirStatusline = $false; Ajuda = $false }
    Mock Get-WsWinPowerShell { return (Get-Process -Id $PID).Path }
    Invoke-WsUpdatedSelf $lock | Should -Be 7
    [IO.File]::ReadAllText($out) | Should -BeExactly 'reexec=1 check=True nodesktop=True yes=False lock=False'
    $env:WS_REEXEC | Should -BeNullOrEmpty
  }

  It 'kit-src: uma release republicada (outro SHA-256) volta a ser descarregada; sem rede fica o antigo; o -Check usa o que houver' {
    $script:WsHome = Join-Path $TestDrive 'kws'; $script:Tmp = Join-Path $TestDrive 'ktmp'
    New-Item -ItemType Directory -Path $script:Tmp -Force | Out-Null
    $script:C = @{ WORKSHOP_VERSION = 'v9' }
    $src = Join-Path $TestDrive 'krel/workshop-kit-v9'
    New-Item -ItemType Directory -Path (Join-Path $src 'installer') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $src 'installer/install-user.mjs') -Value ''
    Set-Content -LiteralPath (Join-Path $src 'marca') -Value 'novo'
    $script:KitZip = Join-Path $TestDrive 'workshop-kit-v9.zip'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory($src, $script:KitZip, [IO.Compression.CompressionLevel]::Fastest, $true)
    $old = Join-Path $script:WsHome 'kit-src/v9'
    New-Item -ItemType Directory -Path (Join-Path $old 'installer') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $old 'installer/install-user.mjs') -Value ''
    Set-Content -LiteralPath (Join-Path $old '.ws-kit-ok') -Value (Get-Date -Format o)
    $script:InjKitSha = Get-WsSha256 $script:KitZip
    $script:Net = $false
    Mock Get-WsReleaseUrl { return ('https://rel.invalid/' + $File) }
    Mock Get-WsGit { return $null }
    Mock Invoke-WsDownload { if (-not $script:Net) { return $false }; Copy-Item -LiteralPath $script:KitZip -Destination $OutFile -Force; return $true }
    $script:Mode = 'check'; $script:KitSrc = ''
    Initialize-WsKit | Should -BeTrue
    Test-Path -LiteralPath (Join-Path $script:KitSrc 'marca') | Should -BeFalse
    $script:Mode = 'install'; $script:KitSrc = ''
    Initialize-WsKit | Should -BeTrue
    Test-Path -LiteralPath (Join-Path $script:KitSrc 'marca') | Should -BeFalse
    $script:Net = $true; $script:KitSrc = ''
    Initialize-WsKit | Should -BeTrue
    (Get-Content -LiteralPath (Join-Path $script:KitSrc 'marca')) | Should -BeExactly 'novo'
    ([IO.File]::ReadAllText((Join-Path $old '.ws-kit-ok'))).Trim() | Should -BeExactly $script:InjKitSha
    $script:Net = $false; $script:KitSrc = ''
    Initialize-WsKit | Should -BeTrue
    Should -Invoke Invoke-WsDownload -Times 2 -Exactly
    $script:InjKitSha = ''
  }

  It 'kit-src: um kit antigo que nao sai todo (ficheiro aberto) deixa de contar, e o clone nao vai para dentro dele' {
    $script:WsHome = Join-Path $TestDrive 'kws2'; $script:Tmp = Join-Path $TestDrive 'ktmp2'; $script:Mode = 'install'; $script:KitSrc = ''
    New-Item -ItemType Directory -Path $script:Tmp -Force | Out-Null
    $script:C = @{ WORKSHOP_VERSION = 'v9'; WORKSHOP_REPO_URL = 'https://git.invalid/kit.git' }
    $src = Join-Path $TestDrive 'krel2/workshop-kit-v9'
    New-Item -ItemType Directory -Path (Join-Path $src 'installer') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $src 'installer/install-user.mjs') -Value ''
    $script:KitZip2 = Join-Path $TestDrive 'krel2.zip'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory($src, $script:KitZip2, [IO.Compression.CompressionLevel]::Fastest, $true)
    $script:InjKitSha = Get-WsSha256 $script:KitZip2
    $script:KitOld2 = Join-Path $script:WsHome 'kit-src/v9'
    $old = $script:KitOld2
    New-Item -ItemType Directory -Path (Join-Path $old 'installer') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $old '.ws-kit-ok') -Value 'outro'
    $script:StepLog = New-Object System.Text.StringBuilder
    Mock Get-WsReleaseUrl { return ('https://rel.invalid/' + $File) }
    Mock Invoke-WsDownload { Copy-Item -LiteralPath $script:KitZip2 -Destination $OutFile -Force; return $true }
    # O Remove-Item -Recurse do kit antigo nao apaga nada (um ficheiro aberto la dentro).
    Mock Remove-Item { } -ParameterFilter { $Recurse -and (($LiteralPath -join '') -replace '[\\/]+$', '') -eq $script:KitOld2 }
    Mock Get-WsGit { return 'git' }
    Mock Invoke-WsProcess { New-Item -ItemType Directory -Path $Arguments[-1] -Force | Out-Null; return @{ ExitCode = 0; StdOut = ''; StdErr = '' } }
    Initialize-WsKit | Should -BeFalse
    Test-Path -LiteralPath (Join-Path $old '.ws-kit-ok') | Should -BeFalse
    Test-Path -LiteralPath (Join-Path $old 'clone') | Should -BeFalse
    $script:KitSrc | Should -BeNullOrEmpty
    $script:StepLog.ToString() | Should -Match 'kit-src not replaced'
    Should -Invoke Invoke-WsProcess -Times 1 -Exactly
    $script:InjKitSha = ''
  }

  It 'passo 8: settings.json com comentarios mostra o caminho e a linha, sem o "0 skills" nem as notas da lingua' {
    $script:Cur = '8'; $script:ClaudeDir = Join-Path $TestDrive '.claude'; $script:Lang = 'en'; $script:LangKit = 'en'
    $p = Join-Path $script:ClaudeDir 'settings.json'
    Read-WsInstallUserOutput ("erro`tE-CFG-05`nerro_detalhe`tnot valid JSON at line 2, column 3: a comment`nskills`t0`n")
    $script:T['8'].Falha -join '|' | Should -BeExactly ('E-CFG-05|' + $p + ' - not valid JSON at line 2, column 3: a comment')
    $script:T['8'].Detalhe | Should -BeNullOrEmpty
    Mock Initialize-WsKit { return $true }
    $script:T = New-WsStateTable
    $script:T['8'].Notas = @('note from the check'); $script:T['8'].Detalhe = '0 skills, 0 agents'
    $script:IuOut = @{ ExitCode = 3; StdOut = "lingua`t1`nerro`tE-CFG-05`nerro_detalhe`tline 2, column 3`n"; StdErr = '' }
    Mock Invoke-WsInstallUser { return $script:IuOut }
    Install-WsStep8 | Should -BeFalse
    $script:T['8'].Falha -join '|' | Should -BeExactly ('E-CFG-05|' + $p + ' - line 2, column 3')
    $script:T['8'].Detalhe | Should -BeNullOrEmpty
    $script:T['8'].Notas.Count | Should -Be 0
    $script:T = New-WsStateTable
    $script:IuOut = @{ ExitCode = 3; StdOut = "skills`t0`n"; StdErr = '' }
    Install-WsStep8 | Should -BeFalse
    $script:T['8'].Falha -join '|' | Should -BeExactly ('E-CFG-05|' + $p)
    $script:T['8'].Detalhe | Should -BeNullOrEmpty
  }

  It 'passo 10: selftest sem escrita na pasta das memorias = E-MEM-07 com o comando; outra falha = E-MEM-05' {
    $script:Cur = '10'
    $mh = Join-Path $TestDrive 'mem7'
    New-Item -ItemType Directory -Path $mh -Force | Out-Null
    Mock Get-WsMemoryHome { return (Join-Path $TestDrive 'mem7') }
    $script:SelfOut = "Agent Memory 0.5.0 . Python 3.12.13`n  [OK] x`n  [FAIL] Cannot write to C:\x: [WinError 5] Access is denied"
    Mock Invoke-WsProcess { return @{ ExitCode = 1; StdOut = $script:SelfOut; StdErr = '' } }
    Invoke-WsMemorySelftest 'agent-memory.exe' '0.5.0' | Should -BeFalse
    $script:T['10'].Avisos[0][0] | Should -Be 'E-MEM-07'
    ($script:T['10'].Notas -join "`n") | Should -Match ('run the setup again: icacls "' + [regex]::Escape($mh) + '" /grant ".+:\(OI\)\(CI\)F" /T')
    $script:T = New-WsStateTable
    $script:SelfOut = "  [OK] x`n  [FAIL] FTS5 is not available"
    Invoke-WsMemorySelftest 'agent-memory.exe' '0.5.0' | Should -BeFalse
    $script:T['10'].Avisos[0] -join '|' | Should -BeExactly 'E-MEM-05|FTS5 is not available'
    $script:T['10'].Notas.Count | Should -Be 0
  }

  It 'passo 10: o atalho que nao se cria e E-MEM-06 (erro no log do passo); config.json numa pasta sem escrita devolve $false' {
    $script:Cur = '10'; $script:UserHome = $TestDrive
    Mock Get-WsOldShortcutPath { return (Join-Path $TestDrive 'old.lnk') }
    Mock Get-WsShortcutPath { return (Join-Path $TestDrive 'Programs/Agent Memory.lnk') }
    # No Windows o WScript.Shell existe: bloqueado como por uma politica do IT. Fora do Windows o -ComObject nem existe.
    Mock New-Object { throw 'COM blocked by policy' } -ParameterFilter { $ComObject -eq 'WScript.Shell' }
    New-WsMemoryShortcut 'gui.exe' | Should -BeFalse
    $script:T['10'].Avisos[0][0] | Should -Be 'E-MEM-06'
    ($script:T['10'].Avisos[0][1] -replace '/', '\') | Should -BeExactly '~\Programs'
    $script:StepLog.ToString() | Should -Match '^shortcut: '
    $script:StepLog = [Text.StringBuilder]::new()
    $script:C = @{ MEMORY_APP_REPO_URL = 'https://h/o/app'; RELEASE_DOWNLOAD_URL = 'https://h/{file}'; PYTHON_VERSION = '3.12.13' }; $script:UvExe = $null
    Set-Content -LiteralPath (Join-Path $TestDrive 'mhfile') -Value 'x'
    Mock Get-WsMemoryHome { return (Join-Path $TestDrive 'mhfile') }
    Write-WsMemoryConfig | Should -BeFalse
    $script:StepLog.ToString() | Should -Match '^config\.json: '
    Mock Get-WsMemoryHome { return (Join-Path $TestDrive 'mhok') }
    Write-WsMemoryConfig | Should -BeTrue
    ([IO.File]::ReadAllText((Join-Path $TestDrive 'mhok/config.json')) | ConvertFrom-Json).PYTHON_VERSION | Should -Be '3.12.13'
  }

  It 'passo 10: sem config.json nem atalho, a instalacao refaz os dois sem reinstalar a app; no -Check, a pasta do atalho sem escrita e E-MEM-06' {
    $script:Cur = '10'; $script:UserHome = $TestDrive
    $script:C = @{ MEMORY_APP_VERSION = 'v0.5.0' }
    $script:ClaudeExe = 'claude.exe'; $script:UvExe = 'uv.exe'
    Mock Get-WsUvBin { return 'C:\u\.local\bin' }
    Mock Get-WsMemoryExe { return 'C:\u\.local\bin\agent-memory.exe' }
    Mock Get-WsMemoryGui { return 'C:\u\.local\bin\agent-memory-gui.exe' }
    Mock Get-WsWebView2Version { return '1.0' }
    Mock Invoke-WsMemorySelftest { return $true }
    Mock Get-WsMemoryHome { return (Join-Path $TestDrive 'mh10') }
    Mock Get-WsShortcutPath { return (Join-Path $TestDrive 'pr10/Agent Memory.lnk') }
    Mock Invoke-WsProcess {
      if ((@($Arguments) -join ' ') -eq 'tool list') { return @{ ExitCode = 0; StdOut = 'agent-memory v0.5.0' } }
      return @{ ExitCode = 0; StdOut = '' }
    }
    $script:Fixed = @()
    Mock Write-WsMemoryConfig { $script:Fixed += 'config'; return $true }
    Mock New-WsMemoryShortcut { $script:Fixed += 'shortcut'; return $true }
    $script:Mode = 'install'
    Test-WsStep10 | Should -BeTrue
    $script:Fixed -join ',' | Should -BeExactly 'config,shortcut'
    $script:T['10'].Falha | Should -BeNullOrEmpty
    $script:Mode = 'check'; $script:T = New-WsStateTable
    Test-WsStep10 | Should -BeFalse
    $script:T['10'].Falha -join ' ' | Should -BeExactly 'E-MEM-03 config.json'
    if (-not $script:Unix) { return }
    New-Item -ItemType Directory -Path (Join-Path $TestDrive 'mh10'), (Join-Path $TestDrive 'pr10') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $TestDrive 'mh10/config.json') -Value '{}'
    chmod 555 (Join-Path $TestDrive 'pr10')
    try {
      $script:T = New-WsStateTable
      Test-WsStep10 | Should -BeTrue
      ($script:T['10'].Avisos[0] -join '|') -replace '/', '\' | Should -BeExactly 'E-MEM-06|~\pr10'
    } finally { chmod 755 (Join-Path $TestDrive 'pr10') }
  }

  It 'passo 10: uv com erro de certificado repete uma vez com UV_SYSTEM_CERTS=true; ja com ele, ou a falhar outra vez, e E-NET-04' {
    $script:Cur = '10'
    $script:C = @{ MEMORY_APP_VERSION = 'v0.5.0'; PYTHON_VERSION = '3.12.13'; MEMORY_APP_REPO_URL = 'https://h/o/app'; RELEASE_DOWNLOAD_URL = 'https://h/{file}' }
    $script:Tmp = Join-Path $TestDrive 'uvtmp'
    New-Item -ItemType Directory -Path $script:Tmp -Force | Out-Null
    $script:UvExe = 'uv.exe'; $script:ClaudeExe = $null
    Mock Get-WsReleaseUrl { return ('https://rel.invalid/' + $File) }
    Mock Invoke-WsDownload { Set-Content -LiteralPath $OutFile -Value 'x'; return $true }
    Mock Get-WsMemoryWheel { return 'agent_memory-0.5.0-py3-none-any.whl' }
    Mock Get-WsSumFor { return 'abc' }
    Mock Get-WsSha256 { return 'abc' }
    Mock Install-WsWebView2 { return $true }
    Mock Register-WsExtra { }
    Mock Get-WsUvBin { return 'C:\u\bin' }
    Mock Get-WsMemoryExe { return 'C:\u\bin\agent-memory.exe' }
    Mock Get-WsMemoryGui { return 'C:\u\bin\agent-memory-gui.exe' }
    Mock Add-WsUserPath { }
    Mock Register-WsMemoryMcp { return $true }
    Mock Write-WsMemoryConfig { return $true }
    Mock New-WsMemoryShortcut { return $true }
    Mock Invoke-WsMemorySelftest { return $false }
    Mock Invoke-WsProcess {
      if ((@($Arguments) -join ' ') -like 'tool install*') {
        $c = ''
        if ($Environment) { $c = [string]$Environment['UV_SYSTEM_CERTS'] }
        $script:UvCalls += ('certs=' + $c)
        if ($c -eq 'true') { return @{ ExitCode = $script:RetryCode; StdOut = ''; StdErr = 'x' } }
        return @{ ExitCode = 1; StdOut = ''; StdErr = $script:UvErr }
      }
      return @{ ExitCode = 0; StdOut = 'agent-memory v0.5.0'; StdErr = '' }
    }
    $keep = $env:UV_SYSTEM_CERTS
    Remove-Item Env:UV_SYSTEM_CERTS -ErrorAction SilentlyContinue
    try {
      $script:UvErr = 'error: invalid peer certificate: UnknownIssuer'; $script:RetryCode = 0; $script:UvCalls = @()
      Install-WsStep10 | Should -BeTrue
      $script:UvCalls -join ',' | Should -BeExactly 'certs=,certs=true'
      $script:T = New-WsStateTable; $script:RetryCode = 1; $script:UvCalls = @()
      Install-WsStep10 | Should -BeFalse
      $script:T['10'].Falha -join '|' | Should -BeExactly 'E-NET-04|uv: github.com / pypi.org'
      $env:UV_SYSTEM_CERTS = 'true'
      $script:T = New-WsStateTable; $script:UvCalls = @()
      Install-WsStep10 | Should -BeFalse
      $script:UvCalls -join ',' | Should -BeExactly 'certs='
      $script:T['10'].Falha[0] | Should -Be 'E-NET-04'
      Remove-Item Env:UV_SYSTEM_CERTS -ErrorAction SilentlyContinue
      $script:T = New-WsStateTable; $script:UvErr = 'No solution found when resolving dependencies'; $script:UvCalls = @()
      Install-WsStep10 | Should -BeFalse
      $script:UvCalls -join ',' | Should -BeExactly 'certs='
      $script:T['10'].Falha -join '|' | Should -BeExactly 'E-MEM-03|uv tool install'
    } finally { if ($keep) { $env:UV_SYSTEM_CERTS = $keep } else { Remove-Item Env:UV_SYSTEM_CERTS -ErrorAction SilentlyContinue } }
  }

  It 'resumo: sem detalhe, a linha mostra o titulo da falha ou do primeiro aviso; os avisos contam tambem quando falta um passo' {
    foreach ($k in @($script:T.Keys)) { $script:T[$k].Estado = 'ok' }
    $script:T['10'].Estado = 'aviso'; $script:T['10'].Avisos = @(, @('E-MEM-06', '~\Programs'))
    $script:T['2'].Estado = 'falta'; $script:T['2'].Falha = @('E-SETUP-01', 'E-CC-01')
    $script:Mode = 'check'; $script:OsText = 'Windows'; $script:WsHome = $TestDrive; $script:Resumo = Join-Path $TestDrive 'summary.txt'; $script:TodoMcp = $false
    Write-WsResult '10'
    $script:T['10'].Detalhe | Should -BeExactly "Couldn't create the Agent Memory shortcut (E-MEM-06)"
    Write-WsResult '2'
    $script:T['2'].Detalhe | Should -BeExactly 'This step is not done yet (E-SETUP-01)'
    $script:Said = @()
    Write-WsSummary | Should -Be 1
    ($script:Said -join "`n") | Should -Match 'There are 1 warnings above'
    ($script:Said -join "`n") | Should -Match "Couldn't create the Agent Memory shortcut \(E-MEM-06\)"
  }
}
