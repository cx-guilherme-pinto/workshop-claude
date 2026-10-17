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
    ($script:Calls -join ';') | Should -Match 'mcp add --scope user agent-memory -e PYTHONHOME= -e PYTHONPATH= -e PYTHONSTARTUP= -- C:\\u\\agent-memory\.exe mcp'
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
    # O script da release poe os valores dele no script: scope (Msgs, C, Pricing...): os testes seguintes usam os do repo.
    $saved = @{}
    foreach ($n in @('Msgs', 'C', 'Pricing', 'InjKitSha', 'Dev', 'DevRoot', 'KitSrc')) { $saved[$n] = Get-Variable -Name $n -Scope Script -ValueOnly -ErrorAction SilentlyContinue }
    try {
      $r = & {
        $env:WS_NO_MAIN = '1'
        . $dist.FullName
        [void](Initialize-WsConfig)
        @{ V = $script:C.WORKSHOP_VERSION; P = $script:Msgs.ui.final_pronto; H = ((Get-WsPricingModelMap $script:Pricing).PSObject.Properties.Name -contains 'claude-haiku-5-5'); S = $script:InjKitSha }
      }
    } finally {
      foreach ($n in $saved.Keys) { Set-Variable -Name $n -Scope Script -Value $saved[$n] }
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
    # Os logins correm numa janela sua (chaos G4: Invoke-WsLogin), e nunca capturados.
    $text | Should -Match "Invoke-WsLogin \`$script:ClaudeExe @\('auth', 'login', '--console'\)"
    $text | Should -Match "Invoke-WsLogin \`$exe @\('auth', 'login', '--hostname', 'github\.com', '--git-protocol', 'https', '--web'\) -CancelCodes @\(2\)"
    $text | Should -Match "Invoke-WsLogin \`$exe @\('auth', 'login'\)"
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
      # chaos G4: o registo tem de apontar para este programa, e sem o registo antigo "memoria".
      if ($a -eq 'mcp get memoria') { return @{ ExitCode = 1; StdOut = '' } }
      if ($a -like 'mcp get*') { if ($script:McpOk) { return @{ ExitCode = 0; StdOut = "agent-memory:`n  Type: stdio`n  Command: C:\u\.local\bin\agent-memory.exe`n  Args: mcp" } } else { return @{ ExitCode = 1; StdOut = '' } } }
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
Describe 'chaos G1-tty' {
  Context 'perguntas, logins e teclas a mais' {
    BeforeEach {
      $script:Sim = $false
      $script:Said = @()
      Mock Write-WsSay { $script:Said += $Text }
    }
    It 'pergunta outra vez quando a resposta nao e s, n nem Enter' {
      Mock Test-WsInteractive { return $true }
      Mock Clear-WsTypeAhead { }
      $script:Answers = @('maybe', 'y'); $script:AnsI = 0
      Mock Read-Host { $a = $script:Answers[$script:AnsI]; $script:AnsI++; return $a }
      Read-WsYesNo 'Continue?' $false | Should -BeTrue
      Should -Invoke Read-Host -Times 2 -Exactly
      Should -Invoke Clear-WsTypeAhead -Times 1 -Exactly
      @($script:Said | Where-Object { $_ -eq ('  ' + $script:Msgs.ui.sn_repetir) }).Count | Should -Be 1
    }
    It 'tres respostas invalidas contam como "nao", mesmo com o defeito "sim" (como no Mac)' {
      Mock Test-WsInteractive { return $true }
      Mock Clear-WsTypeAhead { }
      Mock Read-Host { return 'irm https://exemplo/setup.ps1 | iex' }
      Read-WsYesNo 'Log in?' $true | Should -BeFalse
      Should -Invoke Read-Host -Times 3 -Exactly
      @($script:Said | Where-Object { $_ -eq ('  ' + $script:Msgs.ui.sn_repetir) }).Count | Should -Be 2
    }
    It 'apara os espacos; Enter e $null dao o defeito' {
      Mock Test-WsInteractive { return $true }
      Mock Clear-WsTypeAhead { }
      Mock Read-Host { return '  N ' }
      Read-WsYesNo 'Q?' $true | Should -BeFalse
      Mock Read-Host { return ' sim' }
      Read-WsYesNo 'Q?' $false | Should -BeTrue
      Mock Read-Host { return '' }
      Read-WsYesNo 'Q?' $true | Should -BeTrue
      Read-WsYesNo 'Q?' $false | Should -BeFalse
      Mock Read-Host { return $null }
      Read-WsYesNo 'Q?' $true | Should -BeTrue
      $script:Said.Count | Should -Be 0
    }
    It 'sem consola nao le nem esvazia o teclado' {
      Mock Test-WsInteractive { return $false }
      Mock Clear-WsTypeAhead { }
      Mock Read-Host { return 'y' }
      Read-WsYesNo 'Q?' $true | Should -BeFalse
      Should -Invoke Read-Host -Times 0 -Exactly
      Should -Invoke Clear-WsTypeAhead -Times 0 -Exactly
    }
    It 'Clear-WsTypeAhead esvazia o buffer da consola e nao rebenta no ISE nem sem RawUI' {
      $script:Flushed = 0
      $ok = [pscustomobject]@{}
      $ok | Add-Member -MemberType ScriptMethod -Name FlushInputBuffer -Value { $script:Flushed++ }
      $ise = [pscustomobject]@{}
      $ise | Add-Member -MemberType ScriptMethod -Name FlushInputBuffer -Value { throw [NotImplementedException]::new('ISE') }
      Mock Test-WsInteractive { return $true }
      Clear-WsTypeAhead -RawUI $ok
      $script:Flushed | Should -Be 1
      { Clear-WsTypeAhead -RawUI $ise } | Should -Not -Throw
      { Clear-WsTypeAhead -RawUI $null } | Should -Not -Throw
      { Clear-WsTypeAhead } | Should -Not -Throw
      Mock Test-WsInteractive { return $false }
      Clear-WsTypeAhead -RawUI $ok
      $script:Flushed | Should -Be 1
    }
    It 'deita fora as teclas a mais antes de cada login interativo e de cada comando do ajudante' {
      $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
      # Os logins correm pelo Invoke-WsLogin (G4); um comentario pode ficar entre as duas linhas.
      foreach ($l in @("Invoke-WsLogin `$script:ClaudeExe @('auth', 'login', '--console')", "Invoke-WsLogin `$exe @('auth', 'login', '--hostname', 'github.com'", "Invoke-WsLogin `$exe @('auth', 'login')", 'try { $out = Invoke-Expression $cmd')) {
        $text | Should -Match ('Clear-WsTypeAhead\r?\n(\s*#[^\r\n]*\r?\n)*\s*' + [regex]::Escape($l)) -Because $l
      }
    }
    It 'sem consola o passo 3 diz onde fazer o login (E-AUTH-01 com a nota s3_sem_tty)' {
      $script:T = New-WsStateTable; $script:Cur = '3'; $script:Auth = @{ Logged = $false }; $script:ClaudeExe = 'claude.exe'
      Mock Test-WsInteractive { return $false }
      Mock Clear-WsTypeAhead { }
      Install-WsStep3 | Should -BeFalse
      $script:T['3'].Falha[0] | Should -Be 'E-AUTH-01'
      $script:T['3'].Notas | Should -Contain (M 's3_sem_tty')
      Should -Invoke Clear-WsTypeAhead -Times 0 -Exactly
    }
    It 'com consola e "n" o passo 3 falha sem a nota s3_sem_tty' {
      $script:T = New-WsStateTable; $script:Cur = '3'; $script:Auth = @{ Logged = $false }
      Mock Test-WsInteractive { return $true }
      Mock Clear-WsTypeAhead { }
      Mock Read-Host { return 'n' }
      Install-WsStep3 | Should -BeFalse
      $script:T['3'].Falha[0] | Should -Be 'E-AUTH-01'
      @($script:T['3'].Notas).Count | Should -Be 0
    }
    It 'nao oferece a analise paga para E-GH-02 (o setup ja mostra o comando do login)' {
      $script:T = New-WsStateTable; $script:AuthOk = $true
      $script:T['6'].Falha = @('E-GH-02', '')
      Mock Read-WsYesNo { return $true }
      Invoke-WsHelper '6' | Should -BeFalse
      Should -Invoke Read-WsYesNo -Times 0 -Exactly
      $script:T['6'].Falha = @('E-GH-01', '')
      Mock Read-WsYesNo { return $false }
      Invoke-WsHelper '6' | Should -BeFalse
      Should -Invoke Read-WsYesNo -Times 1 -Exactly
    }
  }

  Context 'passo 4: o Node de um terminal novo' {
    BeforeEach {
      $script:T = New-WsStateTable; $script:Cur = '4'; $script:Mode = 'install'
      $script:C = @{ NODE_MIN_MAJOR = '22' }
      $script:WsHome = Join-Path $TestDrive 'ws'
      $script:NodeExe = Join-Path $TestDrive 'node.exe'; Set-Content -LiteralPath $script:NodeExe -Value 'x'
      Mock Get-Command { return $null } -ParameterFilter { $Name -eq 'node' }
      Mock Get-WsDriveType { return 3 }
      Mock Test-WsNetworkPath { return $false }
      Mock Get-WsNodeMajor { return 24 }
      Mock Invoke-WsProcess { return @{ ExitCode = 0; StdOut = 'v24.11.1'; StdErr = '' } }
      Mock Sync-WsExtras { }
      Mock Add-WsUserPath { }
    }
    It 'le o major, 0 (nenhum node) ou -1 (o PowerShell nao arrancou ou passou do tempo)' {
      Mock Get-WsWinPowerShell { return 'powershell.exe' }
      Mock Invoke-WsProcess { return @{ ExitCode = 0; StdOut = "v24.11.1`r`n"; StdErr = '' } }
      Get-WsFreshNodeMajor | Should -Be 24
      Mock Invoke-WsProcess { return @{ ExitCode = 1; StdOut = ''; StdErr = 'node : The term node is not recognized' } }
      Get-WsFreshNodeMajor | Should -Be 0
      Mock Invoke-WsProcess { return @{ ExitCode = -2; StdOut = ''; StdErr = 'timeout' } }
      Get-WsFreshNodeMajor | Should -Be -1
      Mock Invoke-WsProcess { return @{ ExitCode = -1; StdOut = ''; StdErr = 'blocked' } }
      Get-WsFreshNodeMajor | Should -Be -1
      Format-WsFreshNode 24 | Should -BeExactly '24'
      Format-WsFreshNode 0 | Should -BeExactly 'none'
      Format-WsFreshNode (-1) | Should -BeExactly 'unknown'
    }
    It 'um terminal novo que nao responde nao e um Node antigo (sem E-NODE-02 e sem mexer no PATH)' {
      Mock Get-WsFreshNodeMajor { return -1 }
      Test-WsStep4 | Should -BeTrue
      @($script:T['4'].Avisos).Count | Should -Be 0
      Should -Invoke Add-WsUserPath -Times 0 -Exactly
      Should -Invoke Get-WsFreshNodeMajor -Times 1 -Exactly
    }
    It 'um Node antigo num terminal novo: corrige o PATH e, se continuar antigo, avisa E-NODE-02' {
      Mock Get-WsFreshNodeMajor { return 18 }
      Test-WsStep4 | Should -BeTrue
      Should -Invoke Add-WsUserPath -Times 1 -Exactly
      $script:T['4'].Avisos[0] -join '|' | Should -BeExactly 'E-NODE-02|v18'
    }
    It 'nenhum node num terminal novo: E-NODE-02 sem versao' {
      Mock Get-WsFreshNodeMajor { return 0 }
      Test-WsStep4 | Should -BeTrue
      $script:T['4'].Avisos[0] -join '|' | Should -BeExactly 'E-NODE-02|'
    }
    It 'no -Uninstall nao abre um terminal novo' {
      $script:Mode = 'uninstall'
      Mock Get-WsFreshNodeMajor { return 18 }
      Test-WsStep4 | Should -BeTrue
      Should -Invoke Get-WsFreshNodeMajor -Times 0 -Exactly
      $script:NodeExe | Should -Be (Join-Path $TestDrive 'node.exe')
    }
  }

  Context 'cores' {
    It 'NO_COLOR (no-color.org) desliga as cores' {
      Mock Write-Host { }
      $old = $env:NO_COLOR
      try {
        Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
        Write-WsSay 'a' 'Red'
        Should -Invoke Write-Host -Times 1 -Exactly -ParameterFilter { $PesterBoundParameters.ContainsKey('ForegroundColor') }
        $env:NO_COLOR = '1'
        Write-WsSay 'b' 'Red'
        Should -Invoke Write-Host -Times 1 -Exactly -ParameterFilter { $PesterBoundParameters.ContainsKey('ForegroundColor') }
        Should -Invoke Write-Host -Times 2 -Exactly
      } finally {
        if ($null -eq $old) { Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue } else { $env:NO_COLOR = $old }
      }
    }
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

# --- chaos G3-network: 403/451 e paginas web, downloads partidos, SHA-256 outra vez, proxy morto, settings.json, NO_PROXY
Describe 'chaos G3-network' {
  BeforeAll {
    function New-G3Listener { $l = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0); $l.Start(); return $l }
    function Get-G3DeadPort { $l = New-G3Listener; $p = $l.LocalEndpoint.Port; $l.Stop(); return $p }
    function Set-G3Bytes([string]$Path, [byte[]]$Bytes) { [IO.File]::WriteAllBytes($Path, $Bytes) }
    function Get-G3Ascii([string]$Text) { return [Text.Encoding]::ASCII.GetBytes($Text) }
  }
  BeforeEach {
    $script:DlPartial = $false; $script:ProxyDead = $false; $script:EnvProxyDead = $false; $script:ProxyShow = ''
    $script:DlHost = ''; $script:DlHttp = 0; $script:DlStatus = ''; $script:ProxyProbe = @{}; $script:Blocked = ''
    $script:UA = 'test'; $script:T = New-WsStateTable; $script:Cur = '0'
  }
  It 'Get-WsNetCode: 403/451 e a pagina web sao bloqueio; parado a meio e E-NET-07; o proxy morto e E-NET-03' {
    Get-WsNetCode 'ProtocolError' 403 | Should -Be 'E-NET-01'
    Get-WsNetCode 'ProtocolError' 451 | Should -Be 'E-NET-01'
    Get-WsNetCode 'HtmlPage' 200 | Should -Be 'E-NET-01'
    $script:DlPartial = $true
    Get-WsNetCode 'Timeout' 0 | Should -Be 'E-NET-07'
    Get-WsNetCode 'ReceiveFailure' 0 | Should -Be 'E-NET-07'
    Get-WsNetCode 'ConnectFailure' 0 | Should -Be 'E-NET-07' -Because 'com bytes ja recebidos, a ligacao existiu: partiu-se a meio'
    Get-WsNetCode 'Blocked' 0 | Should -Be 'E-PERM-02'
    Get-WsNetCode 'ProtocolError' 407 | Should -Be 'E-NET-03'
    $script:DlPartial = $false
    Get-WsNetCode 'Timeout' 0 | Should -Be 'E-NET-01'
    $script:ProxyDead = $true
    Get-WsNetCode 'ConnectFailure' 0 | Should -Be 'E-NET-03'
    Get-WsNetCode 'NameResolutionFailure' 0 | Should -Be 'E-NET-03'
    Get-WsNetCode 'Timeout' 0 | Should -Be 'E-NET-03' -Because 'um proxy do sistema que engole os pedidos so da timeout'
    $script:ProxyDead = $false
    Get-WsNetCode 'ConnectFailure' 0 | Should -Be 'E-NET-01'
    Get-WsNetCode 'NameResolutionFailure' 0 | Should -Be 'E-NET-02'
    Get-WsNetCode 'ProtocolError' 404 | Should -Be 'E-NET-07'
  }

  It 'mostra o proxy sem utilizador nem palavra-passe' {
    Format-WsProxyShow 'http://bea:s3gr3d0@proxy.corp:8080' | Should -BeExactly 'http://proxy.corp:8080'
    Format-WsProxyShow 'http://u:p@ss@proxy.corp:8080/' | Should -BeExactly 'http://proxy.corp:8080/'
    Format-WsProxyShow 'http://u:pa/ss@proxy.corp:8080' | Should -BeExactly 'http://proxy.corp:8080'
    Format-WsProxyShow 'u:pa/ss@proxy.corp:3128' | Should -BeExactly 'proxy.corp:3128'
    Format-WsProxyShow 'u:pw@proxy.corp:3128' | Should -BeExactly 'proxy.corp:3128'
    Format-WsProxyShow 'socks5h://127.0.0.1:1080' | Should -BeExactly 'socks5h://127.0.0.1:1080'
    Format-WsProxyShow '' | Should -BeExactly ''
  }

  It 'reconhece uma pagina web no lugar do ficheiro (so no inicio, nunca num script ou num arquivo)' {
    $bom = [byte[]](0xEF, 0xBB, 0xBF)
    $f = Join-Path $TestDrive 'p1'; Set-G3Bytes $f ($bom + (Get-G3Ascii "  `r`n<!DOCTYPE html><html>"))
    Test-WsHtmlFile $f | Should -BeTrue
    $f = Join-Path $TestDrive 'p2'; Set-G3Bytes $f (Get-G3Ascii "<?xml version=`"1.0`"?>`n<html>")
    Test-WsHtmlFile $f | Should -BeTrue
    $f = Join-Path $TestDrive 'p3'; Set-G3Bytes $f (Get-G3Ascii '<html><body>Blocked</body></html>')
    Test-WsHtmlFile $f | Should -BeTrue
    $f = Join-Path $TestDrive 'p4'; Set-G3Bytes $f (Get-G3Ascii "<!-- filtro --><HEAD><title>x</title>")
    Test-WsHtmlFile $f | Should -BeTrue
    $f = Join-Path $TestDrive 'p5'; Set-G3Bytes $f (Get-G3Ascii "#!/bin/sh`n# <LICENSE-MIT`n<html>`n")
    Test-WsHtmlFile $f | Should -BeFalse
    $f = Join-Path $TestDrive 'p6'; Set-G3Bytes $f ([byte[]](0x1F, 0x8B, 0x08, 0x00) + (Get-G3Ascii '<html>'))
    Test-WsHtmlFile $f | Should -BeFalse
    $f = Join-Path $TestDrive 'p7'; Set-G3Bytes $f (Get-G3Ascii "#Requires -Version 5.1`r`n<#`r`n.SYNOPSIS`r`n#>")
    Test-WsHtmlFile $f | Should -BeFalse
    Test-WsHtmlFile (Join-Path $TestDrive 'nao-existe') | Should -BeFalse
  }

  It 'Invoke-WsDownload nunca usa uma pagina web e o detalhe diz que veio uma pagina' {
    Mock Invoke-WebRequest { [IO.File]::WriteAllText($OutFile, "`n  <!DOCTYPE html><html><body>Blocked by the company filter</body></html>") }
    $out = Join-Path $TestDrive 'install.ps1'
    Invoke-WsDownload 'https://x.test/install.ps1' $out | Should -BeFalse
    Test-Path -LiteralPath $out | Should -BeFalse
    Test-Path -LiteralPath ($out + '.part') | Should -BeFalse
    $script:DlStatus | Should -Be 'HtmlPage'
    Get-WsDlCode | Should -Be 'E-NET-01'
    Get-WsDlDetail 'https://x.test/install.ps1' | Should -BeExactly 'https://x.test/install.ps1 - a web page came instead of the file'
    $script:Blocked | Should -BeExactly ''
  }

  It 'Invoke-WsDownload: parado a meio (ja tinham chegado bytes) e E-NET-07; sem bytes e E-NET-01' {
    Mock Invoke-WebRequest { [IO.File]::WriteAllText($OutFile, 'meio ficheiro'); throw [System.Net.WebException]::new('The operation has timed out.', [System.Net.WebExceptionStatus]::Timeout) }
    $out = Join-Path $TestDrive 'node.zip'
    Invoke-WsDownload 'https://nodejs.test/node.zip' $out | Should -BeFalse
    $script:DlPartial | Should -BeTrue
    Get-WsDlCode | Should -Be 'E-NET-07'
    Test-Path -LiteralPath ($out + '.part') | Should -BeFalse
    Mock Invoke-WebRequest { throw [System.Net.WebException]::new('The operation has timed out.', [System.Net.WebExceptionStatus]::Timeout) }
    Invoke-WsDownload 'https://nodejs.test/node.zip' $out | Should -BeFalse
    $script:DlPartial | Should -BeFalse
    Get-WsDlCode | Should -Be 'E-NET-01'
  }

  It 'o detalhe mostra o servidor final de um redirecionamento (e nunca o URL assinado)' {
    Mock Invoke-WebRequest { throw [System.Net.WebException]::new("The remote name could not be resolved: 'release-assets.example.test'", [System.Net.WebExceptionStatus]::NameResolutionFailure) }
    Invoke-WsDownload 'https://github.test/o/r/releases/download/v1/x.zip' (Join-Path $TestDrive 'x.zip') | Should -BeFalse
    $script:DlHost | Should -BeExactly 'release-assets.example.test'
    Get-WsDlCode | Should -Be 'E-NET-02'
    $script:C = @{ NET_CHECK_HOSTS = 'github.test release-assets.example.test' }
    Get-WsDlDetail 'https://github.test/x.zip' | Should -BeExactly 'release-assets.example.test - https://github.test/x.zip'
    Mock Invoke-WebRequest { throw [System.Net.WebException]::new("The remote name could not be resolved: 'github.test'", [System.Net.WebExceptionStatus]::NameResolutionFailure) }
    Invoke-WsDownload 'https://github.test/x.zip' (Join-Path $TestDrive 'x.zip') | Should -BeFalse
    $script:DlHost | Should -BeExactly '' -Because 'o proprio servidor do URL nao e um redirecionamento'
    Get-WsDlFinalHost ([Exception]::new('No such host is known. (objects.example.test:443)')) 'NameResolutionFailure' 'github.test' | Should -BeExactly 'objects.example.test'
    Get-WsDlFinalHost ([Exception]::new("The proxy name could not be resolved: 'proxy.corp'")) 'ProxyNameResolutionFailure' 'github.test' | Should -BeExactly ''
    Get-WsDlFinalHost $null '' 'x' | Should -BeExactly ''
    $script:DlHost = ''; $script:DlStatus = 'ProtocolError'; $script:DlHttp = 404
    Get-WsDlDetail 'SHA256SUMS' | Should -BeExactly 'github.test - SHA256SUMS - HTTP 404'
    $script:DlHttp = 0; $script:DlStatus = 'ConnectFailure'
    Get-WsDlDetail 'https://x.test/f' | Should -BeExactly 'https://x.test/f'
  }

  It 'SHA-256 errado (ficheiro truncado) descarrega uma segunda vez; errado duas vezes = 2, sem ficheiro' {
    $ref = Join-Path $TestDrive 'ref'; [IO.File]::WriteAllText($ref, 'abc')
    $want = (Get-WsSha256 $ref).ToUpperInvariant()
    $out = Join-Path $TestDrive 'trunc.zip'
    $script:G3Calls = 0
    Mock Invoke-WsDownload { $script:G3Calls++; if ($script:G3Calls -eq 1) { [IO.File]::WriteAllText($OutFile, 'ab') } else { [IO.File]::WriteAllText($OutFile, 'abc') }; return $true }
    Invoke-WsDownloadChecked 'https://x.test/f' $out $want | Should -Be 0
    $script:G3Calls | Should -Be 2
    [IO.File]::ReadAllText($out) | Should -BeExactly 'abc'
    $script:G3Calls = 0
    Mock Invoke-WsDownload { $script:G3Calls++; [IO.File]::WriteAllText($OutFile, 'xyz'); return $true }
    Invoke-WsDownloadChecked 'https://x.test/f' $out $want | Should -Be 2
    $script:G3Calls | Should -Be 2
    Test-Path -LiteralPath $out | Should -BeFalse
    $script:G3Calls = 0
    Invoke-WsDownloadChecked 'https://x.test/f' $out '' | Should -Be 2
    $script:G3Calls | Should -Be 1 -Because 'sem SHA-256 esperado nao vale a pena tentar outra vez'
    Mock Invoke-WsDownload { $script:G3Calls++; return $false }
    $script:G3Calls = 0
    Invoke-WsDownloadChecked 'https://x.test/f' $out $want | Should -Be 1
    $script:G3Calls | Should -Be 1
  }

  It 'os passos usam o download com SHA-256 e o detalhe certo (sem E-NET-07 fixo nem o URL errado)' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    ([regex]::Matches($text, '\$rc = Invoke-WsDownloadChecked ')).Count | Should -Be 6
    $text | Should -Match 'Invoke-WsDownloadChecked \$kitUrl \$zip \$script:InjKitSha -Auth'
    $text | Should -Not -Match "Set-WsFail 'E-NET-07' \`$f"
    $text | Should -Not -Match '-or -not \(Invoke-WsDownload'
    $text | Should -Match "Set-WsFail \(Get-WsDlCode\) \(Get-WsDlDetail \`$sumsUrl\)"
    $text | Should -Match "Set-WsFail \(Get-WsDlCode\) \(Get-WsDlDetail \`$sums\)"
    $text | Should -Match "AcliErr = \(Get-WsDlCode\) \+ ' ' \+ \(Get-WsDlDetail \`$url\)"
    $text | Should -Not -Match "Set-WsFail \(Get-WsDlCode\) \`$url"
  }

  It 'o kit com SHA-256 errado duas vezes da E-KIT-02 e vai para o git clone' {
    $script:KitSrc = ''; $script:Mode = 'install'; $script:InjKitSha = ('0' * 64)
    $script:WsHome = Join-Path $TestDrive 'kitws'; $script:Tmp = Join-Path $TestDrive 'kittmp'
    New-Item -ItemType Directory -Path $script:WsHome, $script:Tmp -Force | Out-Null
    $script:C = @{ WORKSHOP_VERSION = 'v9.9.9'; WORKSHOP_REPO_URL = 'https://git.test/o/workshop-claude'; RELEASE_DOWNLOAD_URL = '{repo}/releases/download/{version}/{file}' }
    $script:G3Calls = 0
    Mock Write-WsSay { }
    Mock Invoke-WsDownload { $script:G3Calls++; [IO.File]::WriteAllText($OutFile, 'zip'); return $true }
    Mock Get-WsGit { return $null }
    Initialize-WsKit | Should -BeFalse
    $script:G3Calls | Should -Be 2
    $script:T['0'].Avisos[0] -join ' ' | Should -BeExactly 'E-KIT-02 workshop-kit-v9.9.9.zip'
    Should -Invoke Get-WsGit -Times 1
    $script:InjKitSha = ''
  }

  It 'o teste de rede usa o instalador do claude.ai no lugar da raiz' {
    $u = Get-WsNetProbeUrls @('api.anthropic.com', 'claude.ai', '', 'nodejs.org', 'claude.ai', $null) 'https://github.com/o/r/releases/download/v1/k.zip' 'https://claude.ai/install.ps1'
    $u -join ' ' | Should -BeExactly 'https://api.anthropic.com/ https://claude.ai/install.ps1 https://nodejs.org/ https://github.com/'
    $c = ConvertFrom-WsConf ([IO.File]::ReadAllText((Join-Path $script:Root 'repos.conf'))) @{}
    $u = Get-WsNetProbeUrls ($c.NET_CHECK_HOSTS -split '\s+') '' $c.CLAUDE_INSTALL_PS1_URL
    $u | Should -Contain $c.CLAUDE_INSTALL_PS1_URL
    $u | Should -Not -Contain 'https://claude.ai/'
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match '\$okH -and \$h -eq \$cprobe -and \(\$http -eq 403 -or \$http -eq 451\)'
    $text | Should -Match '\$fails \+= \(\[Uri\]\$h\)\.Authority'
  }

  It 'avisos do teste de rede: com o proxy como causa, so E-NET-03 com o proxy (sem E-NET-05 nem E-NET-01)' {
    $w = Get-WsNetWarnings @('api.anthropic.com', 'claude.ai') @('E-NET-03', 'E-NET-03') $false 'http://127.0.0.1:18407 (HTTPS_PROXY)' $false
    @($w).Count | Should -Be 1
    $w[0] -join '|' | Should -BeExactly 'E-NET-03|http://127.0.0.1:18407 (HTTPS_PROXY)'
    $w = Get-WsNetWarnings @('api.anthropic.com') @('E-NET-03') $false 'http://p:8080' $true
    @($w).Count | Should -Be 0 -Because 'o Test-WsProxy ja avisou'
    $w = Get-WsNetWarnings @('claude.ai') @('E-NET-01') $true '' $false
    @($w).Count | Should -Be 1
    $w[0] -join '|' | Should -BeExactly 'E-NET-01|claude.ai'
    $w = Get-WsNetWarnings @('api.anthropic.com', 'pypi.org') @('E-NET-01', 'E-NET-02') $false '' $false
    ($w | ForEach-Object { $_ -join '|' }) -join ';' | Should -BeExactly 'E-NET-05|api.anthropic.com;E-NET-01|api.anthropic.com;E-NET-02|pypi.org'
    $w = Get-WsNetWarnings @() @() $true '' $false
    @($w).Count | Should -Be 0
    # Como o Test-WsNetwork os usa: um foreach sobre o resultado (vazio = nenhuma volta; um aviso = uma volta com o par).
    $n = 0; foreach ($x in (Get-WsNetWarnings @() @() $true '' $false)) { $n++ }; $n | Should -Be 0
    $n = 0; foreach ($x in (Get-WsNetWarnings @('a') @('E-NET-01') $true '' $false)) { $n++; ($x -join '|') | Should -BeExactly 'E-NET-01|a' }; $n | Should -Be 1
  }

  It 'proxy que nao responde: porta fechada e nome que nao resolve; um que aceita a ligacao fica (uma vez por proxy)' {
    $l = New-G3Listener
    try {
      $live = 'http://127.0.0.1:' + $l.LocalEndpoint.Port
      Test-WsProxyDead $live | Should -BeFalse
      Test-WsProxyDead ('u:pw@127.0.0.1:' + $l.LocalEndpoint.Port) | Should -BeFalse -Because 'sem esquema e com utilizador'
    } finally { $l.Stop() }
    Test-WsProxyDead $live | Should -BeFalse -Because 'o resultado fica guardado nesta execucao'
    Test-WsProxyDead ('http://127.0.0.1:' + (Get-G3DeadPort)) 1000 | Should -BeTrue
    Test-WsProxyDead 'http://proxy.nao-existe.invalid:8080' 3000 | Should -BeTrue
    Test-WsProxyDead '' | Should -BeFalse
    $script:ProxyProbe = @{}
    Test-WsProxyDead $live 1000 | Should -BeTrue -Because 'sem cache, a porta ja fechou'
  }

  It 'HTTPS_PROXY morto: aviso E-NET-03, nunca vai para o settings.json, e a palavra-passe nunca aparece' {
    $keep = @($env:HTTPS_PROXY, $env:NO_PROXY)
    $port = Get-G3DeadPort
    try {
      $env:HTTPS_PROXY = 'http://bea:pw@127.0.0.1:' + $port
      $env:NO_PROXY = 'intranet.corp'
      Test-WsProxy
      $script:Proxy | Should -BeExactly ''
      $script:EnvProxyDead | Should -BeTrue
      $script:ProxyShow | Should -BeExactly ('http://127.0.0.1:' + $port + ' (HTTPS_PROXY)')
      ($script:T['0'].Notas -join "`n") | Should -Match ('System proxy: http://127\.0\.0\.1:' + $port + ' \(HTTPS_PROXY\)')
      ($script:T['0'].Notas -join "`n") | Should -Not -Match 'pw@'
      @($script:T['0'].Avisos | Where-Object { $_[0] -eq 'E-NET-03' }).Count | Should -Be 1
      @($script:T['0'].Avisos | Where-Object { $_[0] -eq 'E-NET-03' })[0][1] | Should -BeExactly $script:ProxyShow
      $script:NoProxy | Should -BeExactly 'localhost,127.0.0.1,intranet.corp'
      $env:NO_PROXY | Should -BeExactly 'intranet.corp' -Because 'o NO_PROXY da sessao nao muda'
      $a = Get-WsInstallUserArgs -Sub 'instalar' -NodePath 'n' -KitSrc 'k' -Proxy $script:Proxy -NoProxy $script:NoProxy
      ($a -join '|') | Should -Not -Match 'https-proxy|no-proxy'
    } finally { $env:HTTPS_PROXY = $keep[0]; $env:NO_PROXY = $keep[1] }
  }

  It 'HTTPS_PROXY que responde: vai para o settings.json, com o NO_PROXY junto' {
    $keep = @($env:HTTPS_PROXY, $env:NO_PROXY)
    $l = New-G3Listener
    try {
      $env:HTTPS_PROXY = 'http://127.0.0.1:' + $l.LocalEndpoint.Port
      $env:NO_PROXY = '.corp.internal'
      Test-WsProxy
      $script:Proxy | Should -BeExactly $env:HTTPS_PROXY
      $script:EnvProxyDead | Should -BeFalse
      @($script:T['0'].Avisos | Where-Object { $_[0] -eq 'E-NET-03' -and $_[1] -eq $script:ProxyShow }).Count | Should -Be 0
      $script:NoProxy | Should -BeExactly 'localhost,127.0.0.1,.corp.internal'
    } finally { $l.Stop(); $env:HTTPS_PROXY = $keep[0]; $env:NO_PROXY = $keep[1] }
  }

  It 'NO_PROXY so vai com o certificado ou com o proxy, e sem proxy junta o da pessoa' {
    (Get-WsInstallUserArgs -Sub 'instalar' -NodePath 'n' -KitSrc 'k' -NoProxy 'localhost,127.0.0.1,.corp') -join '|' | Should -Not -Match 'no-proxy'
    (Get-WsInstallUserArgs -Sub 'instalar' -NodePath 'n' -KitSrc 'k' -CaPem 'C:\ca.pem' -NoProxy 'localhost,127.0.0.1,.corp') -join '|' | Should -Match '\|--ca-pem\|C:\\ca\.pem\|--no-proxy\|localhost,127\.0\.0\.1,\.corp$'
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match "if \(-not \`$script:Proxy\) \{ \`$script:NoProxy = Merge-WsNoProxy \`$env:NO_PROXY '' @\(\)"
  }

  It 'le o proxy do settings.json do Claude Code' {
    $d = Join-Path $TestDrive 'cs'; New-Item -ItemType Directory -Path $d -Force | Out-Null
    $f = Join-Path $d 'settings.json'
    Get-WsSettingsProxy $f | Should -BeExactly ''
    [IO.File]::WriteAllText($f, '{"env":{"HTTPS_PROXY":"http://p.corp:8080","NO_PROXY":"localhost"}}')
    Get-WsSettingsProxy $f | Should -BeExactly 'http://p.corp:8080'
    [IO.File]::WriteAllText($f, '{"env":{"https_proxy":"http://q.corp:3128"}}')
    Get-WsSettingsProxy $f | Should -BeExactly 'http://q.corp:3128'
    [IO.File]::WriteAllText($f, '{"env":{"MEU":"1"}}')
    Get-WsSettingsProxy $f | Should -BeExactly ''
    [IO.File]::WriteAllText($f, '{ isto nao e json')
    Get-WsSettingsProxy $f | Should -BeExactly ''
  }

  It 'proxy morto no settings.json = E-NET-08 logo, sem os 3 minutos do claude -p' {
    $script:UserHome = $TestDrive; $script:ClaudeDir = Join-Path $TestDrive 'claude'; $script:Cur = '12'
    New-Item -ItemType Directory -Path $script:ClaudeDir -Force | Out-Null
    $port = Get-G3DeadPort
    [IO.File]::WriteAllText((Join-Path $script:ClaudeDir 'settings.json'), ('{"env":{"HTTPS_PROXY":"http://bea:pw@127.0.0.1:' + $port + '","NO_PROXY":"localhost"}}'))
    $script:ClaudeExe = 'claude-falso'
    Mock Invoke-WsProcess { return @{ ExitCode = 0; StdOut = '{"is_error":false,"result":"OK","modelUsage":{}}'; StdErr = '' } }
    Get-WsSettingsProxyDead | Should -Match ('^http://127\.0\.0\.1:' + $port + ' - %USERPROFILE%[\\/]claude[\\/]settings\.json$')
    Install-WsStep12 | Should -BeFalse
    $script:T['12'].Falha[0] | Should -Be 'E-NET-08'
    $script:T['12'].Falha[1] | Should -Not -Match 'pw@'
    Should -Invoke Invoke-WsProcess -Times 0 -Exactly
    [IO.File]::WriteAllText((Join-Path $script:ClaudeDir 'settings.json'), '{"env":{"MEU":"1"}}')
    $script:T = New-WsStateTable
    Get-WsSettingsProxyDead | Should -BeExactly ''
    Install-WsStep12 | Should -BeTrue
    Should -Invoke Invoke-WsProcess -Times 1 -Exactly
  }

  It 'HTTPS_PROXY morto e nenhum proxy no settings.json: o passo 12 falha logo com E-NET-03' {
    $keep = $env:HTTPS_PROXY
    $script:ClaudeDir = Join-Path $TestDrive 'claude3'; $script:Cur = '12'; $script:ClaudeExe = 'claude-falso'
    New-Item -ItemType Directory -Path $script:ClaudeDir -Force | Out-Null
    Mock Invoke-WsProcess { return @{ ExitCode = 0; StdOut = '{"is_error":false,"result":"OK","modelUsage":{}}'; StdErr = '' } }
    try {
      $env:HTTPS_PROXY = 'http://127.0.0.1:1'; $script:EnvProxyDead = $true; $script:ProxyShow = 'http://127.0.0.1:1 (HTTPS_PROXY)'
      Install-WsStep12 | Should -BeFalse
      $script:T['12'].Falha -join '|' | Should -BeExactly 'E-NET-03|http://127.0.0.1:1 (HTTPS_PROXY)'
      Should -Invoke Invoke-WsProcess -Times 0 -Exactly
    } finally { $env:HTTPS_PROXY = $keep }
  }

  It 'o passo 0 avisa do proxy morto no settings.json' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $body = $text.Substring($text.IndexOf('function Test-WsStep0'))
    $body = $body.Substring(0, $body.IndexOf('function Install-WsStep0'))
    $body.IndexOf('Test-WsNetwork') | Should -BeLessThan $body.IndexOf('Get-WsSettingsProxyDead')
    $body | Should -Match "Add-WsNote \(M 's0_proxy_settings' @\{ PROXY = \`$spd \}\)"
    $script:Msgs.erros.'E-NET-08'.windows -join ' ' | Should -Match '\$env:USERPROFILE\\\.claude\\settings\.json'
  }

  It 'passo nao bloqueante falhado tem detalhe no resumo' {
    Mock Write-WsSay { }
    $script:T['10'].Estado = 'aviso'; $script:T['10'].Avisos = @(, @('E-MEM-01', 'v9.9.9'))
    Write-WsResult '10'
    $script:T['10'].Detalhe | Should -BeExactly 'The Agent Memory app release is not published yet (E-MEM-01)'
    $script:T['4'].Estado = 'falhou'; $script:T['4'].Falha = @('E-NET-07', 'https://nodejs.test/x.zip')
    Write-WsResult '4'
    $script:T['4'].Detalhe | Should -BeExactly 'The download failed (E-NET-07)'
    $script:T['6'].Estado = 'aviso'; $script:T['6'].Detalhe = 'gh 2.1'; $script:T['6'].Avisos = @(, @('E-GH-02', ''))
    Write-WsResult '6'
    $script:T['6'].Detalhe | Should -BeExactly 'gh 2.1'
    $script:T['8'].Estado = 'feito'
    Write-WsResult '8'
    $script:T['8'].Detalhe | Should -BeExactly ''
  }

  It 'MB descarregados para mostrar' {
    Format-WsMb (2MB) | Should -BeExactly '2.0'
    Format-WsMb 0 | Should -BeExactly '0.0'
    Format-WsMb (213.7MB) | Should -BeExactly '213'
    Format-WsMb (-5MB) | Should -BeExactly '0.0'
  }

  It 'enquanto o instalador descarrega, o progresso aparece (o que cresceu desde o arranque)' {
    if (-not (Test-Path -LiteralPath '/bin/sh')) { Set-ItResult -Skipped -Because 'so em macOS/Linux'; return }
    $script:StepLog = New-Object System.Text.StringBuilder
    $dl = Join-Path $TestDrive 'downloads'; New-Item -ItemType Directory -Path $dl -Force | Out-Null
    Set-G3Bytes (Join-Path $dl 'antigo') (New-Object byte[] 1048576)
    $script:G3Said = @()
    Mock Write-WsSay { $script:G3Said += $Text }
    $script:HbEvery = 1
    try {
      $r = Invoke-WsProcess '/bin/sh' @('-c', ('dd if=/dev/zero of="' + (Join-Path $dl 'novo') + '" bs=1024 count=2048 2>/dev/null; sleep 2')) -TimeoutSec 30 -WatchPaths @($dl, (Join-Path $TestDrive 'nao-existe'))
    } finally { $script:HbEvery = $null }
    $r.ExitCode | Should -Be 0
    ($script:G3Said -join "`n") | Should -Match 'Still downloading.+ 2\.0 MB so far\.'
    $script:G3Said = @()
    $r = Invoke-WsProcess '/bin/sh' @('-c', 'exit 0') -TimeoutSec 30
    $script:G3Said.Count | Should -Be 0
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match '-TimeoutSec 1800 -WatchPaths \$watch'
  }

  It 'no Windows, o progresso conta um download ainda aberto (o NTFS so atualiza a pasta quando o ficheiro fecha)' {
    if ($env:OS -ne 'Windows_NT') { Set-ItResult -Skipped -Because 'so no Windows (NTFS)'; return }
    $script:StepLog = New-Object System.Text.StringBuilder
    $dl = Join-Path $TestDrive 'downloads-aberto'; New-Item -ItemType Directory -Path $dl -Force | Out-Null
    $script:G3Said = @()
    Mock Write-WsSay { $script:G3Said += $Text }
    # Como o install.ps1 (Invoke-WebRequest -OutFile): o ficheiro fica aberto enquanto chegam os bytes.
    $novo = (Join-Path $dl 'novo').Replace("'", "''")
    $cmd = '$fs = [IO.File]::Create(''' + $novo + '''); $fs.Write((New-Object byte[] 2MB), 0, 2MB); $fs.Flush(); Start-Sleep 3; $fs.Close()'
    $script:HbEvery = 1
    try {
      $r = Invoke-WsProcess (Get-WsWinPowerShell) @('-NoProfile', '-Command', $cmd) -TimeoutSec 60 -WatchPaths @($dl)
    } finally { $script:HbEvery = $null }
    $r.ExitCode | Should -Be 0
    ($script:G3Said -join "`n") | Should -Match 'Still downloading.+ 2\.0 MB so far\.'
  }

  It 'o bootstrap explica uma pagina web no lugar do setup (e nao a corre)' {
    $env:WS_NO_MAIN = '1'
    . (Join-Path $script:Root 'setup/bootstrap-windows.ps1')
    $old = @($env:WORKSHOP_REPO_URL, $env:WORKSHOP_VERSION, $env:RELEASE_DOWNLOAD_URL)
    $env:WORKSHOP_REPO_URL = 'https://git.test/o/workshop-claude'; $env:WORKSHOP_VERSION = 'v9.9.9-g3'; $env:RELEASE_DOWNLOAD_URL = '{repo}/releases/download/{version}/{file}'
    $script:G3Said = @()
    Mock Write-Host { $script:G3Said += [string]$Object }
    Mock Invoke-WebRequest { [IO.File]::WriteAllText($OutFile, '<html><body>Access denied by the web filter</body></html>') }
    try { Invoke-WsBootstrap -PassArgs @() } finally { $env:WORKSHOP_REPO_URL = $old[0]; $env:WORKSHOP_VERSION = $old[1]; $env:RELEASE_DOWNLOAD_URL = $old[2] }
    ($script:G3Said -join "`n") | Should -Match 'a web page came instead of the setup \(https://git\.test/o/workshop-claude/releases/download/v9\.9\.9-g3/setup-windows\.ps1\)'
    ($script:G3Said -join "`n") | Should -Not -Match 'setup finished'
    Test-Path -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) 'workshop-setup-windows-v9.9.9-g3.ps1') | Should -BeFalse
  }
}

Describe 'chaos G4-auth-tools' {
  BeforeEach {
    $script:T = New-WsStateTable; $script:Cur = '0'; $script:Mode = 'install'; $script:Sim = $false
    $script:UA = 'test'; $script:Blocked = ''; $script:AuthOk = $false; $script:NetApiOk = $true
    $script:ClaudeDir = Join-Path $TestDrive 'claude'
    $script:UserHome = Join-Path $TestDrive 'home'
    New-Item -ItemType Directory -Path $script:ClaudeDir, $script:UserHome -Force | Out-Null
    Remove-Item -LiteralPath (Join-Path $script:ClaudeDir 'settings.json') -Force -ErrorAction SilentlyContinue
    $script:GwDown = $false; $script:GwUrl = ''; $script:AuthCloud = ''; $script:Auth = $null
    $script:GhSemRede = $false; $script:GhSemLogin = $false; $script:GhAsked = $false; $script:GhExe = $null; $script:AcliAsked = $false
    $script:KeepEnv = @{}
    foreach ($k in @('ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY',
        'CLAUDE_CONFIG_DIR', 'GH_CONFIG_DIR', 'GH_HOST', 'XDG_CONFIG_HOME', 'APPDATA', 'ProgramFiles', 'ProgramData')) {
      $script:KeepEnv[$k] = [Environment]::GetEnvironmentVariable($k)
      [Environment]::SetEnvironmentVariable($k, $null)
    }
    Mock Get-WsUserEnvRaw { return $null }
    Mock Write-WsSay { }
    function New-FakeProcess([int]$Exit) {
      $p = [pscustomobject]@{ ExitCode = $Exit; Handle = [IntPtr]::Zero; HasExited = $true; Id = 0 }
      $p | Add-Member -MemberType ScriptMethod -Name WaitForExit -Value { param($ms) return $true }
      return $p
    }
  }
  AfterEach {
    foreach ($k in $script:KeepEnv.Keys) { [Environment]::SetEnvironmentVariable($k, $script:KeepEnv[$k]) }
  }

  It 'login numa janela sua: um Ctrl-C la so cancela o login (nota) e nada vai para a saida do passo' {
    $script:Cur = '3'; $script:Said = @()
    Mock Write-WsSay { $script:Said += $Text }
    Mock Start-Process { $script:Sp = @{ File = $FilePath; Args = @($ArgumentList) -join ' '; Wait = [bool]$Wait }; return (New-FakeProcess $script:SpExit) }
    $script:SpExit = -1073741510
    @(Invoke-WsLogin 'C:\u\claude.exe' @('auth', 'login', '--console')).Count | Should -Be 0
    $script:Sp.File | Should -BeExactly 'C:\u\claude.exe'
    $script:Sp.Args | Should -BeExactly 'auth login --console'
    $script:Sp.Wait | Should -BeFalse -Because 'o -Wait do 5.1 esperava tambem pelo browser'
    $script:T['3'].Notas | Should -Contain (M 'login_cancelado')
    $script:Said | Should -Contain ('  ' + (M 'login_janela')) -Because 'a janela do setup diz onde esta o login'
    $script:T = New-WsStateTable; $script:SpExit = 0
    Invoke-WsLogin 'gh.exe' @('auth', 'login', '--hostname', 'github.com')
    $script:T['3'].Notas.Count | Should -Be 0
    # O gh sai com 2 num Ctrl-C nas perguntas dele; para os outros logins o 2 nao e um cancelamento.
    $script:SpExit = 2
    Invoke-WsLogin 'acli.exe' @('auth', 'login')
    $script:T['3'].Notas.Count | Should -Be 0
    Invoke-WsLogin 'gh.exe' @('auth', 'login', '--hostname', 'github.com') -CancelCodes @(2)
    $script:T['3'].Notas | Should -Contain (M 'login_cancelado')
    Mock Start-Process { throw [ComponentModel.Win32Exception]::new(1260) }
    { Invoke-WsLogin 'acli.exe' @('auth', 'login') } | Should -Not -Throw
    $script:Blocked | Should -BeExactly 'acli.exe'
  }

  It 'um Ctrl-C na janela do setup a meio do login: o login termina e o setup para como antes (o finally corre)' {
    if (-not (Test-Path -LiteralPath '/bin/sh')) { Set-ItResult -Skipped -Because 'so em macOS/Linux'; return }
    $pidFile = Join-Path $TestDrive 'login.pid'
    $ps = [PowerShell]::Create()
    [void]$ps.AddScript({
        param($Setup, $PidFile, $Log)
        $env:WS_NO_MAIN = '1'
        . $Setup
        $script:LogFile = $Log
        Invoke-WsLogin '/bin/sh' @('-c', ('echo $$ > ' + $PidFile + '; exec sleep 60'))
        'continuou'
      }).AddArgument((Join-Path $script:Root 'setup/setup-windows.ps1')).AddArgument($pidFile).AddArgument((Join-Path $TestDrive 'login.log'))
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
    $out = @(); try { $out = @($ps.EndInvoke($h)) } catch { }
    $out -contains 'continuou' | Should -BeFalse
    $ps.Dispose()
  }

  It 'os logins do claude, gh e acli usam o Invoke-WsLogin; com uma cloud configurada nao se oferece o login' {
    $script:Cur = '3'; $script:ClaudeExe = 'C:\u\claude.exe'
    $script:Auth = @{ Logged = $false; Method = ''; Source = ''; Sub = ''; Org = ''; Provider = '' }
    Mock Read-WsYesNo { return $true }
    Mock Test-WsInteractive { return $true }
    Mock Invoke-WsLogin { $script:Login = $Exe + ' ' + (@($Arguments) -join ' ') }
    Mock Test-WsStep3 { return $true }
    Install-WsStep3 | Should -BeTrue
    $script:Login | Should -BeExactly 'C:\u\claude.exe auth login --console'
    $script:AuthCloud = 'bedrock: CLAUDE_CODE_USE_BEDROCK (shell)'
    Install-WsStep3 | Should -BeFalse
    $script:T['3'].Falha -join '|' | Should -BeExactly 'E-CFG-04|bedrock: CLAUDE_CODE_USE_BEDROCK (shell)'
    Should -Invoke Invoke-WsLogin -Times 1 -Exactly
    # acli (reserva do MCP)
    $script:Cur = '7'; $script:Login = ''
    Mock Get-WsAcli { return 'acli.exe' }
    Mock Invoke-WsProcess { if ((@($Arguments) -join ' ') -eq '--version') { return @{ ExitCode = 0; StdOut = 'acli version 1.3.0' } }; return @{ ExitCode = 1; StdOut = '' } }
    Test-WsAcli $true | Should -BeTrue
    $script:Login | Should -BeExactly 'acli.exe auth login'
  }

  It 'chaves da API: so os nomes (do ambiente, do registo com -User, ou do "env" das definicoes com o ficheiro)' {
    $env:ANTHROPIC_API_KEY = 'sk-ant-api03-SEGREDO'
    Get-WsEnvKeys | Should -BeExactly 'ANTHROPIC_API_KEY'
    $sf = Join-Path $script:ClaudeDir 'settings.json'
    [IO.File]::WriteAllText($sf, '{"env":{"ANTHROPIC_AUTH_TOKEN":"tok-SEGREDO","CLAUDE_CODE_USE_BEDROCK":true,"AWS_REGION":"eu-west-1"}}')
    $k = Get-WsEnvKeys
    $k | Should -BeExactly ('ANTHROPIC_AUTH_TOKEN ({0}), ANTHROPIC_API_KEY' -f $sf)
    $k | Should -Not -Match 'SEGREDO'
    Mock Get-WsUserEnvRaw { if ($Name -eq 'ANTHROPIC_AUTH_TOKEN') { return 'x' }; return $null }
    Get-WsEnvKeys -User | Should -BeExactly 'ANTHROPIC_AUTH_TOKEN, ANTHROPIC_API_KEY'
    Remove-Item Env:ANTHROPIC_API_KEY
    [IO.File]::WriteAllText($sf, '{"env":{}}')
    Get-WsEnvKeys | Should -BeExactly ''
  }

  It 'cloud (Bedrock, Vertex, Foundry): verdadeiro na shell ou no "env" das definicoes (o JSON true tambem conta)' {
    foreach ($v in @('1', 'true', 'True', 'YES', 'on')) { Test-WsTruthy $v | Should -BeTrue -Because $v }
    foreach ($v in @('0', 'false', '', 'no', 'off')) { Test-WsTruthy $v | Should -BeFalse -Because $v }
    # O E-CFG-04 do Windows tem o comando para limpar cada uma das tres.
    foreach ($n in @('BEDROCK', 'VERTEX', 'FOUNDRY')) {
      ($script:Msgs.erros.'E-CFG-04'.windows -join "`n") | Should -Match ('SetEnvironmentVariable\(''CLAUDE_CODE_USE_{0}'', \$null, ''User''\)' -f $n)
    }
    Get-WsCloudWhere | Should -BeNullOrEmpty
    $sf = Join-Path $script:ClaudeDir 'settings.json'
    [IO.File]::WriteAllText($sf, '{"env":{"CLAUDE_CODE_USE_BEDROCK":true}}')
    (Get-WsSettingsEnv 'CLAUDE_CODE_USE_BEDROCK') -join '|' | Should -BeExactly ('True|' + $sf)
    Get-WsSettingsEnv 'NADA' | Should -BeNullOrEmpty
    Get-WsCloudWhere | Should -BeExactly ('CLAUDE_CODE_USE_BEDROCK ({0})' -f $sf)
    $env:CLAUDE_CODE_USE_VERTEX = '0'
    Get-WsCloudWhere | Should -BeExactly ('CLAUDE_CODE_USE_BEDROCK ({0})' -f $sf)
    $env:CLAUDE_CODE_USE_FOUNDRY = '1'
    Get-WsCloudWhere | Should -BeExactly 'CLAUDE_CODE_USE_FOUNDRY (shell)'
    Remove-Item Env:CLAUDE_CODE_USE_FOUNDRY
    [IO.File]::WriteAllText($sf, '{"env":{"CLAUDE_CODE_USE_BEDROCK":true,}')
    Get-WsSettingsEnv 'CLAUDE_CODE_USE_BEDROCK' | Should -BeNullOrEmpty -Because 'um settings.json que nao se le e ignorado'
    $pf = Join-Path $TestDrive 'pf'
    New-Item -ItemType Directory -Path $pf -Force | Out-Null
    $mf = Join-Path $pf 'ClaudeCode\managed-settings.json'
    New-Item -ItemType Directory -Path (Split-Path $mf) -Force | Out-Null
    [IO.File]::WriteAllText($mf, '{"env":{"CLAUDE_CODE_USE_VERTEX":"1"}}')
    $env:ProgramFiles = $pf
    Get-WsCloudWhere | Should -BeExactly ('CLAUDE_CODE_USE_VERTEX ({0})' -f $mf)
  }

  It 'passo 3: com Bedrock/Vertex/Foundry o passo falha com a origem (E-CFG-04) e o login fica por fazer' {
    $script:Cur = '3'; $script:ClaudeExe = 'claude.exe'
    Mock Invoke-WsProcess { return @{ ExitCode = 0; StdOut = $script:AuthJson } }
    $script:AuthJson = '{"loggedIn":true,"authMethod":"third_party","apiProvider":"bedrock"}'
    (Read-WsAuth).Provider | Should -BeExactly 'bedrock'
    $script:AuthJson = '{"loggedIn":true,"authMethod":"third_party"}'
    (Read-WsAuth).Provider | Should -BeExactly 'third_party'
    $script:AuthJson = '{"loggedIn":true,"authMethod":"claude.ai","apiProvider":"firstParty","apiKeySource":"/login managed key","orgName":"ACME"}'
    (Read-WsAuth).Provider | Should -BeExactly 'firstParty'
    Test-WsStep3 | Should -BeTrue
    $script:AuthCloud | Should -BeExactly ''
    $script:T = New-WsStateTable; $script:AuthOk = $false
    $script:AuthJson = '{"loggedIn":true,"authMethod":"third_party","apiProvider":"bedrock"}'
    $env:CLAUDE_CODE_USE_BEDROCK = '1'
    Test-WsStep3 | Should -BeFalse
    $script:T['3'].Falha -join '|' | Should -BeExactly 'E-CFG-04|bedrock: CLAUDE_CODE_USE_BEDROCK (shell)'
    $script:AuthOk | Should -BeFalse
    Remove-Item Env:CLAUDE_CODE_USE_BEDROCK
    $script:T = New-WsStateTable
    Test-WsStep3 | Should -BeFalse
    $script:AuthCloud | Should -BeExactly 'bedrock: Claude Code settings'
    # outro metodo: o aviso mostra a origem (o nome da variavel), nunca o valor
    $script:T = New-WsStateTable
    $script:AuthJson = '{"loggedIn":true,"authMethod":"api_key","apiKeySource":"ANTHROPIC_API_KEY"}'
    Test-WsStep3 | Should -BeTrue
    $script:T['3'].Avisos[0] -join '|' | Should -BeExactly 'E-AUTH-03|ANTHROPIC_API_KEY'
  }

  It 'gateway (ANTHROPIC_BASE_URL): o que conta como em baixo e o URL que se mostra' {
    foreach ($c in @(@('NameResolutionFailure', 0), @('ProxyNameResolutionFailure', 0), @('ConnectFailure', 0), @('Timeout', 0), @('ProtocolError', 502), @('', 503), @('ProtocolError', 504))) {
      Test-WsGatewayAnswer $c[0] $c[1] | Should -BeFalse -Because ($c -join ' ')
    }
    foreach ($c in @(@('ProtocolError', 401), @('ProtocolError', 404), @('', 407), @('TrustFailure', 0), @('SecureChannelFailure', 0), @('ReceiveFailure', 0), @('', 0))) {
      Test-WsGatewayAnswer $c[0] $c[1] | Should -BeTrue -Because ($c -join ' ')
    }
    Get-WsGatewayShow 'https://ana:SEGREDO@gw.empresa.pt:8443/v1/messages?x=1' | Should -BeExactly 'https://gw.empresa.pt:8443/'
    Get-WsGatewayShow 'http://localhost:4000' | Should -BeExactly 'http://localhost:4000/'
    Get-WsGatewayShow 'ht tp://ana:SEG/REDO@gw/x' | Should -Not -Match 'SEG'
    Get-WsGatewayShow '' | Should -BeExactly ''
    Mock Invoke-WebRequest { throw [System.Net.WebException]::new('dns', [System.Net.WebExceptionStatus]::NameResolutionFailure) }
    Test-WsGatewayUp 'https://gw.invalid/' | Should -BeFalse
    Mock Invoke-WebRequest { throw [System.Net.WebException]::new('tls', [System.Net.WebExceptionStatus]::TrustFailure) }
    Test-WsGatewayUp 'https://gw.invalid/' | Should -BeTrue
    Mock Invoke-WebRequest { return 'ok' }
    Test-WsGatewayUp 'https://gw.invalid/' | Should -BeTrue
  }

  It 'passo 0: gateway que nao responde = E-CFG-03 + E-AUTH-05 (sem a password) e $script:GwDown' {
    $env:ANTHROPIC_BASE_URL = 'https://ana:SEGREDO@gw.empresa.pt/v1'
    Mock Test-WsGatewayUp { return $false }
    Test-WsGateway
    $script:GwDown | Should -BeTrue
    ($script:T['0'].Avisos | ForEach-Object { $_ -join '|' }) -join ';' | Should -BeExactly 'E-CFG-03|ANTHROPIC_BASE_URL;E-AUTH-05|https://gw.empresa.pt/'
    $script:T = New-WsStateTable
    Remove-Item Env:ANTHROPIC_BASE_URL
    $sf = Join-Path $script:ClaudeDir 'settings.json'
    [IO.File]::WriteAllText($sf, '{"env":{"ANTHROPIC_BASE_URL":"http://localhost:4000"}}')
    Mock Test-WsGatewayUp { return $true }
    Test-WsGateway
    $script:GwDown | Should -BeFalse
    $script:GwUrl | Should -BeExactly 'http://localhost:4000'
    ($script:T['0'].Avisos | ForEach-Object { $_ -join '|' }) -join ';' | Should -BeExactly ('E-CFG-03|ANTHROPIC_BASE_URL ({0})' -f $sf)
    Remove-Item -LiteralPath $sf
    $script:T = New-WsStateTable
    Test-WsGateway
    $script:GwUrl | Should -BeExactly ''
    $script:T['0'].Avisos.Count | Should -Be 0
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $body = $text.Substring($text.IndexOf('function Test-WsStep0'))
    $body = $body.Substring(0, $body.IndexOf('function Install-WsStep0'))
    $body | Should -Not -Match "@\('ANTHROPIC_API_KEY', 'E-CFG-02'\)"
    $body | Should -Match 'Get-WsEnvKeys -User'
    $body | Should -Match 'Get-WsCloudWhere'
    $body.LastIndexOf('Test-WsGateway') | Should -BeGreaterThan $body.IndexOf('Test-WsNetwork')
  }

  It 'passo 12: 90 s, sem MCP, e o codigo certo para o gateway, a chave rejeitada e o login' {
    $script:Cur = '12'; $script:ClaudeExe = 'claude.exe'; $script:Tmp = $TestDrive
    $script:Auth = @{ Source = '/login managed key' }
    $script:Said = @()
    Mock Write-WsSay { $script:Said += $Text }
    Mock Invoke-WsProcess { $script:SmokeArgs = @($Arguments); $script:SmokeTmo = $TimeoutSec; return $script:SmokeR }
    function Get-Smoke([int]$Exit, [string]$Err) {
      $script:SmokeR = @{ ExitCode = $Exit; StdOut = ''; StdErr = $Err }; $script:SmokeArgs = $null
      $script:T = New-WsStateTable
      $null = Install-WsStep12
      return ($script:T['12'].Falha -join '|')
    }
    Get-Smoke -2 'timeout' | Should -BeExactly 'E-SMOKE-01|no answer in 90 s'
    $script:SmokeTmo | Should -Be 90
    $script:SmokeArgs | Should -Contain '--strict-mcp-config'
    ($script:Said -join "`n") | Should -Match ([regex]::Escape((M 's12_a_testar' @{ SEG = 90 })))
    Get-Smoke 1 'Error: connect ECONNREFUSED 1.2.3.4:443' | Should -BeExactly 'E-NET-05|'
    $script:GwUrl = 'https://ana:SEGREDO@gw.empresa.pt/v1'
    Get-Smoke -2 'timeout' | Should -BeExactly 'E-AUTH-05|https://gw.empresa.pt/'
    Get-Smoke 1 'Error: getaddrinfo ENOTFOUND gw.empresa.pt' | Should -BeExactly 'E-AUTH-05|https://gw.empresa.pt/'
    $script:GwDown = $true
    Get-Smoke 0 '' | Should -BeExactly 'E-AUTH-05|https://gw.empresa.pt/'
    $script:SmokeArgs | Should -BeNullOrEmpty -Because 'com o gateway em baixo o Claude nao e chamado'
    $script:GwDown = $false; $script:GwUrl = ''
    $env:ANTHROPIC_API_KEY = 'sk-ant-api03-SEGREDO'
    Get-Smoke 1 'API Error: 401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}' | Should -BeExactly 'E-AUTH-04|ANTHROPIC_API_KEY'
    Remove-Item Env:ANTHROPIC_API_KEY
    Get-Smoke 1 'Invalid API key - Please run /login' | Should -BeExactly 'E-AUTH-01|'
    $script:Auth = @{ Source = 'apiKeyHelper' }
    Get-Smoke 1 'Failed to authenticate. API Error: 401' | Should -BeExactly 'E-AUTH-04|apiKeyHelper'
    $script:Auth = @{ Source = 'none' }
    $sf = Join-Path $script:ClaudeDir 'settings.json'
    [IO.File]::WriteAllText($sf, '{"env":{"ANTHROPIC_AUTH_TOKEN":"tok-SEGREDO"}}')
    Get-Smoke 1 'Invalid bearer token' | Should -BeExactly ('E-AUTH-04|ANTHROPIC_AUTH_TOKEN ({0})' -f $sf)
  }

  It 'ajudante e -Doctor: sem MCP, com limite, e nada com o gateway em baixo ou o GitHub sem resposta' {
    $script:ClaudeExe = 'claude.exe'; $script:Tmp = $TestDrive
    Mock Invoke-WsProcess { $script:HArgs = @($Arguments); $script:HTmo = $TimeoutSec; return @{ ExitCode = 1; StdOut = ''; StdErr = '' } }
    Invoke-WsClaudeHelper 'p' '' | Should -BeNullOrEmpty
    $script:HArgs | Should -Contain '--strict-mcp-config'
    $script:HTmo | Should -Be 90
    $null = Invoke-WsClaudeHelper 'p' '' -TimeoutSec 180
    $script:HTmo | Should -Be 180
    $script:GwDown = $true; $script:HArgs = $null
    Invoke-WsClaudeHelper 'p' '' | Should -BeNullOrEmpty
    $script:HArgs | Should -BeNullOrEmpty
    $script:AuthOk = $true
    Mock Read-WsYesNo { return $true }
    $script:T['8'].Falha = @('E-KIT-03', '')
    Invoke-WsHelper '8' | Should -BeFalse
    $script:GwDown = $false
    $script:T['6'].Falha = @('E-GH-03', 'github.com')
    Invoke-WsHelper '6' | Should -BeFalse
    Should -Invoke Read-WsYesNo -Times 0 -Exactly
    $script:T['6'].Estado = 'falhou'; $script:GwDown = $true; $script:Said = @()
    Mock Write-WsSay { $script:Said += $Text }
    Invoke-WsDoctor
    ($script:Said -join "`n") | Should -Match ([regex]::Escape((M 'doctor_sem_claude')))
    Should -Invoke Invoke-WsProcess -Times 2 -Exactly
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match 'Invoke-WsClaudeHelper \$prompt '''' -TimeoutSec \$script:TmoDoctor'
  }

  It 'passo 6: o "gh auth status" sem resposta e a rede (E-GH-03), sem perguntar o login nem descarregar outra vez' {
    $script:Cur = '6'; $script:WsHome = Join-Path $TestDrive 'ws'
    $gh = Join-Path $TestDrive 'gh.exe'; Set-Content -LiteralPath $gh -Value 'x'
    $cfg = Join-Path $TestDrive 'ghcfg'; New-Item -ItemType Directory -Path $cfg -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $cfg 'hosts.yml'), "github.com:`n    user: ana`n    git_protocol: https`nghe.empresa.pt:`n    users:`n        ana:`n")
    Get-WsGhHosts | Should -BeExactly 'github.com' -Because 'sem hosts.yml'
    $env:GH_CONFIG_DIR = $cfg
    Get-WsGhHosts | Should -BeExactly 'github.com ghe.empresa.pt'
    $env:GH_HOST = 'ghe.empresa.pt'
    Get-WsGhHosts | Should -BeExactly 'ghe.empresa.pt github.com'
    Remove-Item Env:GH_HOST
    $script:Status = @(-2); $script:StatusN = 0; $script:Calls = @()
    # Sem um gh verdadeiro no PATH: o -Exe tem de chegar (no Mac do autor havia um /opt/homebrew/bin/gh).
    Mock Get-Command { return $null } -ParameterFilter { $Name -eq 'gh' }
    Mock Test-WsInteractive { return $true }
    Mock Read-WsYesNo { return $true }
    Mock Invoke-WsLogin { $script:Login = @($Arguments) -join ' ' }
    Mock Invoke-WsDownload { return $true }
    Mock Invoke-WsProcess {
      $a = @($Arguments) -join ' '
      $script:Calls += ('{0} ({1})' -f $a, $TimeoutSec)
      if ($a -eq '--version') { return @{ ExitCode = 0; StdOut = 'gh version 2.102.0 (2026-09-30)' } }
      if ($a -eq 'auth status') { $i = [math]::Min($script:StatusN, $script:Status.Count - 1); $script:StatusN++; return @{ ExitCode = $script:Status[$i]; StdOut = '' } }
      return @{ ExitCode = 0; StdOut = '' }
    }
    Test-WsStep6 -Exe $gh | Should -BeFalse
    $script:T['6'].Falha -join '|' | Should -BeExactly 'E-GH-03|github.com ghe.empresa.pt'
    $script:GhSemRede | Should -BeTrue
    $script:Calls | Should -Contain 'auth status (25)'
    Should -Invoke Read-WsYesNo -Times 0 -Exactly
    $script:T = New-WsStateTable
    Install-WsStep6 | Should -BeFalse
    $script:T['6'].Falha[0] | Should -Be 'E-GH-03'
    Should -Invoke Invoke-WsDownload -Times 0 -Exactly
    Test-WsStep6 -Exe (Join-Path $TestDrive 'nao-ha.exe') | Should -BeFalse
  }

  It 'passo 6: sem login, o "auth status" so se repete depois de tentar o login (pelo Invoke-WsLogin)' {
    $script:Cur = '6'; $script:WsHome = Join-Path $TestDrive 'ws'
    $gh = Join-Path $TestDrive 'gh.exe'; Set-Content -LiteralPath $gh -Value 'x'
    Mock Get-Command { return $null } -ParameterFilter { $Name -eq 'gh' }
    Mock Test-WsInteractive { return $true }
    Mock Read-WsYesNo { return $true }
    Mock Invoke-WsLogin { $script:Login = @($Arguments) -join ' ' }
    Mock Invoke-WsProcess {
      $a = @($Arguments) -join ' '
      $script:Calls += ('{0} ({1})' -f $a, $TimeoutSec)
      if ($a -eq '--version') { return @{ ExitCode = 0; StdOut = 'gh version 2.102.0 (2026-09-30)' } }
      if ($a -eq 'auth status') { $i = [math]::Min($script:StatusN, $script:Status.Count - 1); $script:StatusN++; return @{ ExitCode = $script:Status[$i]; StdOut = '' } }
      return @{ ExitCode = 0; StdOut = '' }
    }
    $script:Sim = $true; $script:Status = @(1); $script:StatusN = 0; $script:Calls = @()
    Test-WsStep6 -Exe $gh | Should -BeFalse
    $script:T['6'].Falha[0] | Should -Be 'E-GH-02'
    @($script:Calls | Where-Object { $_ -like 'auth status*' }).Count | Should -Be 1
    $script:Sim = $false; $script:Status = @(1, 0); $script:StatusN = 0; $script:Calls = @(); $script:T = New-WsStateTable
    Test-WsStep6 -Exe $gh | Should -BeTrue
    $script:Login | Should -BeExactly 'auth login --hostname github.com --git-protocol https --web'
    $script:Calls | Should -Contain 'auth setup-git (25)'
    $script:GhSemLogin | Should -BeFalse
    Should -Invoke Get-Command -Times 0 -Exactly -ParameterFilter { $Name -eq 'gh' } -Because 'com -Exe nao se procura o gh no PATH'
  }

  It 'acli: sem resposta no primeiro "auth status", nao tenta o segundo' {
    $script:Calls = @()
    Mock Invoke-WsProcess { $script:Calls += ('{0} ({1})' -f (@($Arguments) -join ' '), $TimeoutSec); return @{ ExitCode = $script:AcliRc; StdOut = '' } }
    $script:AcliRc = -2
    Test-WsAcliLogin 'acli.exe' | Should -BeFalse
    $script:Calls -join ';' | Should -BeExactly 'auth status (25)'
    $script:AcliRc = 1; $script:Calls = @()
    Test-WsAcliLogin 'acli.exe' | Should -BeFalse
    $script:Calls -join ';' | Should -BeExactly 'auth status (25);jira auth status (25)'
  }

  It 'MCP: le os campos do "claude mcp get" e compara o atlassian com o do workshop' {
    $out = "atlassian:`r`n  Scope: User config (available in all your projects)`r`n  Status: Connected`r`n  Type: sse`r`n  URL: https://mcp.atlassian.com/v1/sse`r`n`r`nTo remove this server, run: claude mcp remove ""atlassian"" -s user`r`n"
    Get-WsMcpField $out 'URL' | Should -BeExactly 'https://mcp.atlassian.com/v1/sse'
    Get-WsMcpField $out 'Command' | Should -BeExactly ''
    Get-WsMcpField "x:`n  Command:`n  Args: mcp" 'Command' | Should -BeExactly '' -Because 'um campo vazio nao apanha a linha seguinte'
    $script:C = @{ ATLASSIAN_MCP_URL = 'https://mcp.atlassian.com/v1/mcp' }
    Test-WsAtlassianMcp $out | Should -BeFalse
    Test-WsAtlassianMcp $out.Replace('/v1/sse', '/v1/mcp') | Should -BeTrue
    Test-WsAtlassianMcp "atlassian:`n  Type: stdio`n  Command: npx`n  Args: -y mcp-remote https://mcp.atlassian.com/v1/sse" | Should -BeFalse
    Test-WsAtlassianMcp 'atlassian: (formato novo)' | Should -BeTrue -Because 'sem URL nem Command nao da para comparar'
  }

  It 'passo 7: um registo atlassian antigo e trocado (com nota), e confirma-se com "mcp get" e nao "mcp list"' {
    $script:Cur = '7'; $script:Sim = $true; $script:ClaudeExe = 'claude.exe'
    $script:C = @{ ATLASSIAN_MCP_URL = 'https://mcp.exemplo/v1/mcp' }
    $script:McpUrl = 'https://mcp.exemplo/v1/sse'; $script:RmFail = $false; $script:Calls = @()
    Mock Register-WsExtra { }
    Mock Get-WsAcli { return 'acli.exe' }
    Mock Invoke-WsProcess {
      $a = @($Arguments) -join ' '
      $script:Calls += $a
      if ($a -eq 'mcp get atlassian') { if ($script:McpUrl) { return @{ ExitCode = 0; StdOut = ("atlassian:`r`n  Scope: User config`r`n  Type: http`r`n  URL: " + $script:McpUrl + "`r`n") } }; return @{ ExitCode = 1; StdOut = '' } }
      if ($a -like 'mcp remove*') { if ($script:RmFail) { return @{ ExitCode = 1; StdOut = '' } }; $script:McpUrl = ''; return @{ ExitCode = 0; StdOut = '' } }
      if ($a -like 'mcp add *') { $script:McpUrl = @($Arguments)[-1]; return @{ ExitCode = 0; StdOut = '' } }
      if ($a -eq '--version') { return @{ ExitCode = 0; StdOut = 'acli version 1.3.0' } }
      return @{ ExitCode = 0; StdOut = '' }
    }
    $script:Mode = 'check'
    Test-WsStep7 | Should -BeFalse
    $script:T['7'].Falha -join '|' | Should -BeExactly 'E-MCP-01|atlassian: https://mcp.exemplo/v1/sse'
    $script:Mode = 'install'; $script:T = New-WsStateTable
    Install-WsStep7 | Should -BeTrue
    $script:Calls | Should -Contain 'mcp remove --scope user atlassian'
    $script:Calls | Should -Contain 'mcp add --transport http --scope user atlassian https://mcp.exemplo/v1/mcp'
    $script:Calls | Should -Not -Contain 'mcp list'
    $script:T['7'].Notas | Should -Contain (M 's7_substituido' @{ ANTIGO = 'https://mcp.exemplo/v1/sse' })
    $script:T['7'].Falha | Should -BeNullOrEmpty
    $script:T = New-WsStateTable; $script:McpUrl = 'https://mcp.exemplo/v1/sse'; $script:RmFail = $true; $script:Calls = @()
    Install-WsStep7 | Should -BeFalse
    $script:T['7'].Falha -join '|' | Should -BeExactly 'E-MCP-01|claude mcp remove atlassian'
    $script:Calls | Should -Contain 'mcp remove atlassian'
  }

  It 'passo 10: o registo agent-memory tem de apontar para este programa, e o antigo "memoria" sai' {
    Test-WsMcpCommand "agent-memory:`r`n  Command: C:\\Users\\Ana\\.local\\bin\\agent-memory.exe`r`n  Args: mcp" 'C:\Users\ana\.local\bin\agent-memory.exe' | Should -BeTrue
    Test-WsMcpCommand "agent-memory:`n  Command: C:\Users\bruno\.local\bin\memoria.exe`n  Args: mcp" 'C:\Users\ana\.local\bin\agent-memory.exe' | Should -BeFalse
    Test-WsMcpCommand 'agent-memory: C:\Users\ana\.local\bin\agent-memory.exe mcp - Connected' 'C:\Users\ana\.local\bin\agent-memory.exe' | Should -BeTrue
    Test-WsMcpCommand '' 'C:\x.exe' | Should -BeFalse
    $script:Cur = '10'; $script:ClaudeExe = 'claude.exe'; $script:Calls = @()
    $script:Reg = @{ 'agent-memory' = 'C:\old\memoria.exe'; memoria = 'C:\old\memoria.exe' }
    Mock Register-WsExtra { }
    Mock Invoke-WsProcess {
      $a = @($Arguments); $script:Calls += ($a -join ' ')
      if ($a[1] -eq 'get') { if ($script:Reg.ContainsKey($a[2])) { return @{ ExitCode = 0; StdOut = ($a[2] + ":`n  Type: stdio`n  Command: " + $script:Reg[$a[2]] + "`n  Args: mcp") } }; return @{ ExitCode = 1; StdOut = '' } }
      if ($a[1] -eq 'remove') { $script:Reg.Remove($a[-1]); return @{ ExitCode = 0; StdOut = '' } }
      if ($a[1] -eq 'add') { $script:Reg[$a[4]] = $a[-2]; return @{ ExitCode = 0; StdOut = '' } }
      return @{ ExitCode = 0; StdOut = '' }
    }
    $exe = 'C:\u\.local\bin\agent-memory.exe'
    Test-WsMemoryMcp $exe | Should -BeFalse
    Register-WsMemoryMcp $exe | Should -BeTrue
    $script:Reg.ContainsKey('memoria') | Should -BeFalse
    $script:Reg['agent-memory'] | Should -BeExactly $exe
    $script:T['10'].Notas | Should -Contain (M 's10_mcp_substituido' @{ ANTIGO = 'C:\old\memoria.exe' })
    Test-WsMemoryMcp $exe | Should -BeTrue
    $script:Reg['memoria'] = 'C:\old\memoria.exe'
    Test-WsMemoryMcp $exe | Should -BeFalse -Because 'o registo antigo "memoria" ainda esta la'
  }

  It 'JSON estrito como o do Claude Code: uma virgula a mais falha; o BOM e chaves so com maiusculas diferentes passam' {
    $r = Test-WsStrictJson '{"a":1,}'
    $r | Should -BeOfType [bool] -Because 'sem leitor estrito o setup nao verifica o ~\.claude.json (no 5.1: Windows.Data.Json)'
    $r | Should -BeFalse
    Test-WsStrictJson '{"a":[1,2,],"b":1}' | Should -BeFalse
    Test-WsStrictJson '{"a":1} // nota' | Should -BeFalse
    Test-WsStrictJson (([string][char]0xFEFF) + '{"a":1}') | Should -BeTrue
    Test-WsStrictJson '{"projects":{"C:/Users/ana/p":{"x":1},"c:/Users/ana/p":{"x":2}}}' | Should -BeTrue
  }

  It 'passo 2: um ~\.claude.json invalido para o setup antes de qualquer comando do Claude Code (E-CC-04)' {
    $script:Cur = '2'; $script:Tmp = $TestDrive
    $f = Join-Path $script:UserHome '.claude.json'
    [IO.File]::WriteAllText($f, '{"mcpServers":{"x":{"type":"http"}},}')
    Mock Get-WsClaude { return 'claude.exe' }
    Mock Invoke-WsDownload { return $true }
    Test-WsStep2 | Should -BeFalse
    $script:T['2'].Falha -join '|' | Should -BeExactly ('E-CC-04|' + $f)
    Should -Invoke Get-WsClaude -Times 0 -Exactly
    $script:T = New-WsStateTable
    Install-WsStep2 | Should -BeFalse
    $script:T['2'].Falha[0] | Should -Be 'E-CC-04'
    Should -Invoke Invoke-WsDownload -Times 0 -Exactly
    [IO.File]::WriteAllBytes($f, [byte[]](@(0xEF, 0xBB, 0xBF) + [Text.Encoding]::ASCII.GetBytes('{"a":1}')))
    Test-WsClaudeJson | Should -BeTrue
    [IO.File]::WriteAllText($f, "  `r`n")
    Test-WsClaudeJson | Should -BeTrue
    Remove-Item -LiteralPath $f -Force
    Test-WsClaudeJson | Should -BeTrue
    $cd = Join-Path $TestDrive 'cfgdir'; New-Item -ItemType Directory -Path $cd -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $cd '.claude.json'), '{,}')
    $env:CLAUDE_CONFIG_DIR = $cd
    $script:T = New-WsStateTable
    Test-WsClaudeJson | Should -BeFalse
    $script:T['2'].Falha[1] | Should -BeExactly (Join-Path $cd '.claude.json')
  }

  It 'passo 2: se o instalador oficial ja trocou o ~\.claude.json, mostra a copia (E-CC-04) e nao E-CC-01' {
    $script:Cur = '2'; $script:Tmp = $TestDrive
    $script:C = @{ CLAUDE_INSTALL_PS1_URL = 'https://claude.exemplo/install.ps1'; CLAUDE_CODE_VERSION = '2.1.292' }
    Mock Invoke-WsDownload { return $true }
    Mock Get-WsWinPowerShell { return 'powershell.exe' }
    Mock Invoke-WsProcess { return @{ ExitCode = 1; StdOut = "Installing...`r`nClaude configuration file at C:\u\.claude.json is corrupted. Backed up to: C:\u\.claude\backups\.claude.json.corrupted.1760000000000`r`nDone"; StdErr = '' } }
    Install-WsStep2 | Should -BeFalse
    $script:T['2'].Falha -join '|' | Should -BeExactly 'E-CC-04|C:\u\.claude\backups\.claude.json.corrupted.1760000000000'
    $script:T = New-WsStateTable
    Mock Invoke-WsProcess { return @{ ExitCode = 1; StdOut = 'boom'; StdErr = '' } }
    Install-WsStep2 | Should -BeFalse
    $script:T['2'].Falha -join '|' | Should -BeExactly 'E-CC-01|install.ps1'
  }

  It 'passo 5: o uv do workshop primeiro; um uv antigo primeiro no PATH so da o aviso E-UV-02' {
    $script:Cur = '5'
    $script:C = @{ UV_MIN_VERSION = '0.6.8' }
    $local = Join-Path $script:UserHome '.local\bin\uv.exe'
    New-Item -ItemType Directory -Path (Split-Path $local) -Force | Out-Null
    Set-Content -LiteralPath $local -Value 'x'
    $script:OldUv = Join-Path $TestDrive 'old-uv.exe'; Set-Content -LiteralPath $script:OldUv -Value 'x'
    $script:Versions = @{ $local = 'uv 0.13.1 (abc 2026-09-01)'; $script:OldUv = 'uv 0.4.30' }
    Mock Get-Command { return [pscustomobject]@{ Source = $script:OldUv } } -ParameterFilter { $Name -eq 'uv' }
    Mock Invoke-WsProcess { return @{ ExitCode = 0; StdOut = $script:Versions[$FilePath] } }
    Test-WsStep5 | Should -BeTrue
    $script:UvExe | Should -BeExactly $local
    $script:UvVer | Should -BeExactly '0.13.1'
    $script:T['5'].Avisos[0] -join '|' | Should -BeExactly ('E-UV-02|' + $script:OldUv + ': uv 0.4.30')
    Get-WsUv | Should -BeExactly $local
    # so o antigo: o passo instala o do workshop
    Remove-Item -LiteralPath $local
    $script:T = New-WsStateTable
    Test-WsStep5 | Should -BeFalse
    $script:UvExe | Should -BeNullOrEmpty
    # um uv bom no PATH serve, sem aviso; sem UV_MIN_VERSION o minimo e 0.6.8
    $script:Versions[$script:OldUv] = 'uv 0.7.2'
    $script:T = New-WsStateTable
    Test-WsStep5 | Should -BeTrue
    $script:UvExe | Should -BeExactly $script:OldUv
    $script:T['5'].Avisos.Count | Should -Be 0
    $script:C = @{}; $script:Versions[$script:OldUv] = 'uv 0.6.7'
    Test-WsStep5 | Should -BeFalse
  }
}

Describe 'chaos G5-arena-git' {
  BeforeAll {
    $script:GitExe = Get-WsGit
    # Um repositorio de teste isolado da configuracao global de quem corre os testes (assinaturas, hooks).
    function New-TestRepo([string]$Dir, [string]$Tag) {
      $c = @('-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', '-c', 'core.hooksPath=.git/no-hooks', '-c', 'user.name=t', '-c', 'user.email=t@t.invalid')
      New-Item -ItemType Directory -Path $Dir -Force | Out-Null
      & $script:GitExe -C $Dir init -q '--template=' | Out-Null
      & $script:GitExe -C $Dir @c commit -q --allow-empty -m init | Out-Null
      if ($Tag) { & $script:GitExe -C $Dir @c tag $Tag | Out-Null }
    }
    function New-TestProj([string]$Dir, [string]$Mark, [string]$Json) {
      New-Item -ItemType Directory -Path $Dir -Force | Out-Null
      [IO.File]::WriteAllText((Join-Path $Dir $Mark), $Json)
      [IO.File]::WriteAllText((Join-Path $Dir 'README.md'), 'x')
    }
  }
  BeforeEach {
    $script:T = New-WsStateTable
    $script:StepLog = New-Object System.Text.StringBuilder
  }

  It 'o git so olha para o .git da propria pasta e nunca assina a tag' {
    $a = Get-WsGitOwnArgs (Join-Path $TestDrive 'demo-project')
    $a[0] | Should -BeExactly ('--git-dir=' + (Join-Path (Join-Path $TestDrive 'demo-project') '.git'))
    $a[1..2] -join ' ' | Should -BeExactly '-c tag.gpgsign=false'
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Not -Match "'-C', \`$(Dir|demo)"
    ${function:Test-WsGitTag}.ToString() | Should -Match 'Get-WsGitOwnArgs \$Dir'
    ${function:Invoke-WsStep9Migrate}.ToString() | Should -Match "\(Get-WsGitOwnArgs \`$demo\) \+ @\('tag', 'arena-start', 'arena-inicial'\)"
  }

  It 'estado de um projeto: vazia, alheia, incompleta, ok e propria' {
    if (-not $script:GitExe) { Set-ItResult -Skipped -Because 'sem git'; return }
    $m = '.arena-kit.json'; $ref = 'refs/tags/arena-start'; $real = '{"version":"v1","language":"en"}'
    Get-WsProjState (Join-Path $TestDrive 'nao-existe') $m $ref | Should -BeExactly 'vazia'
    $d = Join-Path $TestDrive 'vazia'; New-Item -ItemType Directory -Path $d | Out-Null
    Get-WsProjState $d $m $ref | Should -BeExactly 'vazia'
    $d = Join-Path $TestDrive 'alheia'; New-Item -ItemType Directory -Path $d | Out-Null; [IO.File]::WriteAllText((Join-Path $d 'notas.txt'), 'x')
    Get-WsProjState $d $m $ref | Should -BeExactly 'alheia'
    $d = Join-Path $TestDrive 'copia'; New-TestProj $d $m '{"status":"incomplete","language":"en"}'
    Get-WsProjState $d $m $ref | Should -BeExactly 'incompleta'
    $d = Join-Path $TestDrive 'semgit'; New-TestProj $d $m $real
    Get-WsProjState $d $m $ref | Should -BeExactly 'incompleta'
    # Um %USERPROFILE% com os dotfiles em git (e ate uma tag arena-start): a Arena sem .git continua incompleta.
    $up = Join-Path $TestDrive 'perfil'; New-TestRepo $up 'arena-start'
    $d = Join-Path $up 'workshop-claude/demo-project'; New-TestProj $d $m $real
    Get-WsProjState $d $m $ref | Should -BeExactly 'incompleta'
    # ... e com um .git vazio (git init interrompido) o git nao vai buscar o HEAD e a tag do repositorio de cima.
    New-Item -ItemType Directory -Path (Join-Path $d '.git') | Out-Null
    Test-WsGitTag $d 'refs/tags/arena-start' | Should -BeFalse
    Get-WsProjState $d $m $ref | Should -BeExactly 'incompleta'
    $d = Join-Path $TestDrive 'ok'; New-TestProj $d $m $real; New-TestRepo $d 'arena-start'
    Get-WsProjState $d $m $ref | Should -BeExactly 'ok'
    $d = Join-Path $TestDrive 'propria'; New-TestProj $d $m $real; New-TestRepo $d ''
    Get-WsProjState $d $m $ref | Should -BeExactly 'propria'
    Get-WsProjState $d '.sandbox-kit.json' 'HEAD' | Should -BeExactly 'alheia'
    $d = Join-Path $TestDrive 'treino'; New-TestProj $d '.sandbox-kit.json' $real; New-TestRepo $d ''
    Get-WsProjState $d '.sandbox-kit.json' 'HEAD' | Should -BeExactly 'ok'
    # Um git que nem arrancou (bloqueado pela seguranca): nao se sabe, e o projeto nao e tocado.
    $keep = $script:GitExe
    try {
      $script:GitExe = Join-Path $TestDrive 'bloqueado/git.exe'
      Get-WsProjState (Join-Path $TestDrive 'ok') $m $ref | Should -BeExactly 'semgit'
      Get-WsProjState (Join-Path $TestDrive 'semgit') $m $ref | Should -BeExactly 'incompleta'
      Get-WsProjState (Join-Path $TestDrive 'copia') $m $ref | Should -BeExactly 'incompleta'
    } finally { $script:GitExe = $keep }
  }

  It 'mostra os caminhos com barras do Windows e a pasta do perfil como %USERPROFILE%' {
    Format-WsShowPath 'C:/Users/ana/.workshop-claude/backup/2026-10-17T10-00-00/demo-project' 'C:\Users\ana' | Should -BeExactly '%USERPROFILE%\.workshop-claude\backup\2026-10-17T10-00-00\demo-project'
    Format-WsShowPath 'c:/users/ANA/x' 'C:\Users\ana\' | Should -BeExactly '%USERPROFILE%\x'
    Format-WsShowPath 'C:\Users\anabela\x' 'C:\Users\ana' | Should -BeExactly 'C:\Users\anabela\x'
    Format-WsShowPath 'D:/backup/x' 'C:\Users\ana' | Should -BeExactly 'D:\backup\x'
    $script:UserHome = 'C:\Users\rui'
    Format-WsShowPath 'C:/Users/rui/.workshop-claude/backup' | Should -BeExactly '%USERPROFILE%\.workshop-claude\backup'
  }

  It 'passo 9: o --force so vai para uma montagem incompleta, nunca para uma Arena sem a tag' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Not -Match "\`$ref = 'refs/tags/arena-start'"
    $text | Should -Match "Invoke-WsAssemble 'assemble-demo\.mjs' \(Join-Path \`$script:Proj 'demo-project'\) '\.arena-kit\.json' 'refs/tags/arena-start' @\("
    $text | Should -Match "Invoke-WsAssemble 'assemble-sandbox\.mjs' \(Join-Path \`$script:Proj \`$script:PracticeDir\) '\.sandbox-kit\.json' 'HEAD' @\("
    $f = ${function:Invoke-WsAssemble}.ToString()
    $f | Should -Match "'incompleta' \{ \`$force = @\('--force'\) \}"
    ([regex]::Matches($f, '--force')).Count | Should -Be 1
  }

  It 'Invoke-WsAssemble decide pelo estado, mostra a causa de uma falha e o backup' {
    if (-not $script:GitExe) { Set-ItResult -Skipped -Because 'sem git'; return }
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { Set-ItResult -Skipped -Because 'sem node'; return }
    $script:NodeExe = $node.Source
    $script:KitSrc = Join-Path $TestDrive 'kit'
    $script:WsHome = Join-Path $TestDrive 'wsg5'
    $script:UserHome = 'C:\Users\x'
    $script:Literals = @()
    New-Item -ItemType Directory -Path (Join-Path $script:KitSrc 'installer'), $script:WsHome -Force | Out-Null
    $argsFile = Join-Path $TestDrive 'args.txt'
    [IO.File]::WriteAllText((Join-Path $script:KitSrc 'installer/fake-ok.mjs'), (
        "import { writeFileSync } from 'node:fs';`n" +
        "writeFileSync(process.env.WS_G5_ARGS, process.argv.slice(2).join('|'));`n" +
        "console.log('copying...');`n" +
        "console.log(JSON.stringify({ status: 'assembled', version: 'v1', backup: 'C:/Users/x/.workshop-claude/backup/2026-10-17T10-00-00/demo-project' }));`n"))
    [IO.File]::WriteAllText((Join-Path $script:KitSrc 'installer/fake-fail.mjs'), (
        "console.error('ERROR: git commit -q -m x failed: error: gpg failed to sign the data (token=sk-ant-abcdef123456)');`n" +
        "process.exit(1);`n"))
    # O git escreve as suas linhas "error:"/"fatal:" a seguir: so a linha "ERROR: " (maiusculas) do assembler conta.
    [IO.File]::WriteAllText((Join-Path $script:KitSrc 'installer/fake-fail3.mjs'), (
        "console.error('ERROR: git add -A failed: error: open(x): Filename too long\nerror: unable to index file x\nfatal: adding files failed');`n" +
        "process.exit(1);`n"))
    $env:WS_G5_ARGS = $argsFile
    try {
      # vazia: monta sem --force e mostra onde ficou o backup
      $script:Cur = '9'
      $d = Join-Path $TestDrive 'p-vazia'
      Invoke-WsAssemble 'fake-ok.mjs' $d '.arena-kit.json' 'refs/tags/arena-start' @('--language', 'en') | Should -BeTrue
      [IO.File]::ReadAllText($argsFile) | Should -Not -Match '--force'
      $script:T['9'].Notas -join ' ' | Should -BeExactly 'Your previous folder is saved in %USERPROFILE%\.workshop-claude\backup\2026-10-17T10-00-00\demo-project.'
      # incompleta: --force (o assembler guarda a pasta no backup antes de montar)
      $script:T = New-WsStateTable
      $d = Join-Path $TestDrive 'p-inc'; New-TestProj $d '.arena-kit.json' '{"version":"v1","language":"en"}'
      Invoke-WsAssemble 'fake-ok.mjs' $d '.arena-kit.json' 'refs/tags/arena-start' @('--language', 'en') | Should -BeTrue
      [IO.File]::ReadAllText($argsFile) | Should -Match '\|--force$'
      # propria: aviso E-DEMO-04, o assembler nem corre
      $script:T = New-WsStateTable
      Remove-Item -LiteralPath $argsFile
      $d = Join-Path $TestDrive 'p-propria'; New-TestProj $d '.arena-kit.json' '{"version":"v1","language":"en"}'; New-TestRepo $d ''
      Invoke-WsAssemble 'fake-fail.mjs' $d '.arena-kit.json' 'refs/tags/arena-start' @() | Should -BeTrue
      $script:T['9'].Falha | Should -BeNullOrEmpty
      $script:T['9'].Avisos[0][0] | Should -BeExactly 'E-DEMO-04'
      Test-Path -LiteralPath $argsFile | Should -BeFalse
      # alheia: E-DEMO-03
      $script:T = New-WsStateTable
      $d = Join-Path $TestDrive 'p-alheia'; New-Item -ItemType Directory -Path $d | Out-Null; [IO.File]::WriteAllText((Join-Path $d 'x.txt'), 'x')
      Invoke-WsAssemble 'fake-ok.mjs' $d '.arena-kit.json' 'refs/tags/arena-start' @() | Should -BeFalse
      $script:T['9'].Falha[0] | Should -BeExactly 'E-DEMO-03'
      # semgit (git bloqueado): falha sem correr o assembler, e a pasta fica onde esta
      $script:T = New-WsStateTable
      $keep = $script:GitExe
      try {
        $script:GitExe = Join-Path $TestDrive 'bloqueado/git.exe'
        Invoke-WsAssemble 'fake-ok.mjs' (Join-Path $TestDrive 'p-propria') '.arena-kit.json' 'refs/tags/arena-start' @() | Should -BeFalse
      } finally { $script:GitExe = $keep }
      $script:T['9'].Falha[0] | Should -BeExactly 'E-DEMO-01'
      $script:T['9'].Falha[1] | Should -Match '^git rev-parse HEAD: '
      Test-Path -LiteralPath $argsFile | Should -BeFalse
      # falha do assembler: a causa no detalhe (sem segredos), e nao so o nome do script
      $script:T = New-WsStateTable
      Invoke-WsAssemble 'fake-fail.mjs' (Join-Path $TestDrive 'p-falha') '.arena-kit.json' 'refs/tags/arena-start' @() | Should -BeFalse
      $script:T['9'].Falha[0] | Should -BeExactly 'E-DEMO-01'
      $script:T['9'].Falha[1] | Should -BeExactly 'fake-fail.mjs: git commit -q -m x failed: error: gpg failed to sign the data (token=***'
      $script:T = New-WsStateTable
      Invoke-WsAssemble 'fake-fail3.mjs' (Join-Path $TestDrive 'p-falha3') '.arena-kit.json' 'refs/tags/arena-start' @() | Should -BeFalse
      $script:T['9'].Falha[1] | Should -BeExactly 'fake-fail3.mjs: git add -A failed: error: open(x): Filename too long'
    } finally { Remove-Item Env:WS_G5_ARGS -ErrorAction SilentlyContinue }
  }

  It 'Test-WsStep9: historico proprio da Arena e um aviso (E-DEMO-04), e nao E-DEMO-01' {
    if (-not $script:GitExe) { Set-ItResult -Skipped -Because 'sem git'; return }
    Mock Initialize-WsKit { return $true }
    $script:Proj = Join-Path $TestDrive 'proj9'
    $script:KitSrc = Join-Path $TestDrive 'kit9'
    $script:ProjShow = '%USERPROFILE%\workshop-claude'
    $script:Mode = 'install'
    $script:Cur = '9'
    New-Item -ItemType Directory -Path $script:KitSrc -Force | Out-Null
    $demo = Join-Path $script:Proj 'demo-project'
    Test-WsStep9 | Should -BeFalse
    $script:T['9'].Falha[0] | Should -BeExactly 'E-DEMO-01'
    $script:T = New-WsStateTable
    New-TestProj $demo '.arena-kit.json' '{"version":"v1","language":"en"}'; New-TestRepo $demo ''
    Test-WsStep9 | Should -BeTrue
    $script:T['9'].Falha | Should -BeNullOrEmpty
    $script:T['9'].Avisos[0][0] | Should -BeExactly 'E-DEMO-04'
    $script:T = New-WsStateTable
    & $script:GitExe -C $demo -c tag.gpgsign=false tag arena-start | Out-Null
    Test-WsStep9 | Should -BeTrue
    $script:T['9'].Avisos.Count | Should -Be 0
  }

  It 'passo 8 e -Uninstall: as skills/agentes alterados pela pessoa e as versoes anteriores' {
    $script:Cur = '8'
    $script:UserHome = 'C:\Users\x'
    Read-WsInstallUserOutput "skills`t7`nagentes`t6`neditado`tC:/Users/x/.workshop-claude/backup/t/edited/skills/task-plan`nanteriores`tC:/Users/x/.workshop-claude/backup/t/previous`n"
    $n = $script:T['8'].Notas
    $n[0] | Should -BeExactly 'You had changed task-plan: your copy is saved in %USERPROFILE%\.workshop-claude\backup\t\edited\skills\task-plan, and the kit''s version is back in its place.'
    $n[1] | Should -Match ([regex]::Escape('%USERPROFILE%\.workshop-claude\backup\t\previous'))
    $f = ${function:Invoke-WsUninstall}.ToString()
    $f | Should -Match "'editado' \{ Write-WsSay \('  ' \+ \(M 'desinst_editado'"
    $f | Should -Match "'anteriores' \{ Write-WsSay \('  ' \+ \(M 's8_anteriores'"
  }

  It 'Write-WsCode: os comandos PS> usam $env:USERPROFILE (o PowerShell nao expande %USERPROFILE%)' {
    $keep = $script:Fill
    $script:Said = New-Object System.Collections.Generic.List[string]
    Mock Write-WsSay { $script:Said.Add($Text) }
    try {
      $script:Fill = @{ PROJETOS = '%USERPROFILE%\workshop-claude' }
      Write-WsCode 'E-DEMO-04' '' ''
      $ps = @($script:Said | Where-Object { $_ -like '    PS> *' })
      $ps.Count | Should -Be 1
      $ps[0] | Should -BeExactly '    PS> Rename-Item $env:USERPROFILE\workshop-claude\demo-project demo-project-old'
      # As frases para ler ficam com %USERPROFILE%.
      $script:Said.Clear()
      Write-WsCode 'E-SO-03' '' ''
      $script:Said -join ' ' | Should -Match ([regex]::Escape('The projects are in %USERPROFILE%\workshop-claude.'))
      # Nenhum comando PS> do catalogo fica com %USERPROFILE% nem com {PROJETOS} por preencher.
      $script:Said.Clear()
      foreach ($k in $script:Msgs.erros.PSObject.Properties.Name) { Write-WsCode $k '' '' }
      $ps = @($script:Said | Where-Object { $_ -like '    PS> *' })
      $ps.Count | Should -BeGreaterThan 4
      foreach ($l in $ps) { $l | Should -Not -Match '%USERPROFILE%|\{PROJETOS\}' }
      @($ps | Where-Object { $_ -like '*$env:USERPROFILE\workshop-claude*' }).Count | Should -BeGreaterOrEqual 4
    } finally { $script:Fill = $keep }
  }

  It 'as mensagens novas existem nos dois catalogos' {
    $pt = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/messages.pt.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
    foreach ($cat in @($script:Msgs, $pt)) {
      foreach ($k in @('s9_backup', 's8_editado', 's8_anteriores', 'desinst_editado')) { $cat.ui.PSObject.Properties.Name | Should -Contain $k }
      $cat.erros.'E-DEMO-04'.windows[0] | Should -Match 'Rename-Item \{PROJETOS\}\\demo-project demo-project-old'
    }
    $script:Msgs.ui.s9_backup | Should -Match '\{PASTA\}'
    $script:Msgs.ui.s8_editado | Should -Match '\{NOME\}.*\{PASTA\}'
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
      $a = @($Arguments) -join ' '
      if ($a -eq 'tool list') { return @{ ExitCode = 0; StdOut = 'agent-memory v0.5.0' } }
      # o "claude mcp get" diz para que programa aponta o registo (Test-WsMemoryMcpOk); o "memoria" antigo ja nao existe
      if ($a -eq 'mcp get memoria') { return @{ ExitCode = 1; StdOut = '' } }
      if ($a -like 'mcp get*') { return @{ ExitCode = 0; StdOut = "agent-memory:`n  Type: stdio`n  Command: C:\u\.local\bin\agent-memory.exe`n  Args: mcp" } }
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

  It 'passo 10: uv com erro de certificado repete uma vez com UV_SYSTEM_CERTS=true; ja com ele, ou a falhar outra vez (sem ca.pem), e E-NET-10' {
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
      $script:T['10'].Falha -join '|' | Should -BeExactly 'E-NET-10|uv: github.com / pypi.org'
      $env:UV_SYSTEM_CERTS = 'true'
      $script:T = New-WsStateTable; $script:UvCalls = @()
      Install-WsStep10 | Should -BeFalse
      $script:UvCalls -join ',' | Should -BeExactly 'certs='
      $script:T['10'].Falha[0] | Should -Be 'E-NET-10'
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
    ($script:Said -join "`n") | Should -Match 'There is 1 warning above'
    ($script:Said -join "`n") | Should -Match "Couldn't create the Agent Memory shortcut \(E-MEM-06\)"
  }
}

# --- chaos G7-language: WORKSHOP_LANG validado, lingua guardada na instalacao, notas dos passos 0, 8 e 9
Describe 'chaos G7-language' {
  BeforeAll {
    $script:LangEnvBefore = $env:WORKSHOP_LANG
    function Set-LangFile([string]$Name, [string]$Text, [switch]$Bom) {
      $d = Join-Path $script:WsHome 'kit'
      New-Item -ItemType Directory -Path $d -Force | Out-Null
      [IO.File]::WriteAllText((Join-Path $d $Name), $Text, (New-Object System.Text.UTF8Encoding($Bom.IsPresent)))
    }
  }
  AfterAll {
    if ($null -eq $script:LangEnvBefore) { Remove-Item Env:WORKSHOP_LANG -ErrorAction SilentlyContinue } else { $env:WORKSHOP_LANG = $script:LangEnvBefore }
  }

  It 'o que nao e uma etiqueta de lingua nao da informacao (language-cases.json invalidas)' {
    foreach ($c in (Read-Fixture 'language-cases.json').invalidas) {
      ConvertTo-WsLangTag $c.in | Should -BeExactly '' -Because $c.in
    }
    ConvertTo-WsLangTag ('Portugu' + [char]0x00EA + 's') | Should -BeExactly ''
    ConvertTo-WsLangTag ('pt-' + [char]0x0661 + [char]0x0662) | Should -BeExactly '' -Because 'algarismos arabes: [0-9] e nao \d'
    ConvertTo-WsLangTag ([string][char]0x0130 + 't') | Should -BeExactly '' -Because 'I com ponto (turco)'
    ConvertTo-WsLangTag ('en-' + [char]0x212A + 'K') | Should -BeExactly '' -Because 'sinal de Kelvin'
    ConvertTo-WsLangTag 'pt-abcdefghi' | Should -BeExactly '' -Because 'subetiqueta de 9 caracteres'
    ConvertTo-WsLangTag 'pt-abcdefgh' | Should -BeExactly 'pt-abcdefgh'
    ConvertTo-WsLangTag 'pt_BR.UTF-8' | Should -BeExactly 'pt-BR'
    ConvertTo-WsLangTag 'iw_IL' | Should -BeExactly 'he-IL'
    ConvertTo-WsLangTag 'br' | Should -BeExactly 'br' -Because 'bretao e uma etiqueta (rejeitada um nivel acima)'
    ConvertTo-WsLangTag "pt`n.UTF-8" | Should -BeExactly '' -Because 'no .NET o $ tambem aceita um \n no fim (como o etiqueta() do Node)'
  }
  It 'a validacao nao depende da cultura (maquina turca)' {
    $old = [Threading.Thread]::CurrentThread.CurrentCulture
    try { [Threading.Thread]::CurrentThread.CurrentCulture = [Globalization.CultureInfo]::GetCultureInfo('tr-TR') } catch { Set-ItResult -Skipped -Because 'sem dados da cultura tr-TR'; return }
    try {
      ConvertTo-WsLangTag ([string][char]0x0130 + 't') | Should -BeExactly ''
      ConvertTo-WsLangTag 'hi_IN' | Should -BeExactly 'hi-IN'
      Test-WsLangOk 'HI' | Should -BeTrue
      Test-WsLangOk 'POSIX' | Should -BeFalse
    } finally { [Threading.Thread]::CurrentThread.CurrentCulture = $old }
  }
  It 'so pt, en, hi e he contam como WORKSHOP_LANG (Test-WsLangOk)' {
    foreach ($v in @('pt', 'pt-BR', 'pt_PT.UTF-8', 'EN', 'en-US', 'hi-IN', 'he', 'iw', ' pt-BR ')) { Test-WsLangOk $v | Should -BeTrue -Because $v }
    foreach ($v in @('', '   ', 'br', 'es', 'brasil', 'pt-*', 'en,pt', 'UTF-8', 'C', 'POSIX', 'pts', 'ptx-BR', ('Portugu' + [char]0x00EA + 's'))) { Test-WsLangOk $v | Should -BeFalse -Because $v }
  }
  It 'um WORKSHOP_LANG desconhecido nao ganha a lingua do sistema' {
    Select-WsLang 'br' 'pt-BR' 'pt-BR' | Should -BeExactly 'pt-BR'
    Select-WsLang 'pt-*' 'pt-BR' 'en-US' | Should -BeExactly 'pt-BR'
    Select-WsLang 'es' 'en-US' 'en-US' | Should -BeExactly 'en-US'
    Select-WsLang 'iw_IL' 'pt-BR' 'pt-BR' | Should -BeExactly 'he-IL'
    Select-WsLang 'en' 'pt-BR' 'pt-BR' | Should -BeExactly 'en'
    Select-WsLang 'brasil' '' '' | Should -BeExactly 'en'
  }
  It 'mantem a lingua guardada na instalacao (kit\language.json) sem WORKSHOP_LANG' {
    Mock Get-UICulture { [pscustomobject]@{ Name = 'en-US' } }
    Mock Get-Culture { [pscustomobject]@{ Name = 'en-US' } }
    $script:WsHome = Join-Path $TestDrive 'ws-lang'
    try {
      Remove-Item Env:WORKSHOP_LANG -ErrorAction SilentlyContinue
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'en-US' -Because 'sem ficheiro'
      $script:LangSaved | Should -BeExactly ''
      $script:LangMachine | Should -BeExactly 'en-US'

      Set-LangFile 'language.json' '{"language":"pt","machine":"pt"}'
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'pt'
      $script:LangKit | Should -BeExactly 'pt'
      $script:LangSaved | Should -BeExactly 'pt'
      $script:LangMachine | Should -BeExactly 'en-US'
      $script:LangIgnored | Should -BeExactly ''

      $env:WORKSHOP_LANG = 'en'
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'en'
      $script:LangKit | Should -BeExactly 'en'
      $script:LangSaved | Should -BeExactly ''

      $env:WORKSHOP_LANG = 'br'
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'pt'
      $script:LangSaved | Should -BeExactly 'pt'
      $script:LangIgnored | Should -BeExactly 'br'

      $env:WORKSHOP_LANG = '   '
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'pt' -Because 'so espacos e como sem WORKSHOP_LANG'
      $script:LangIgnored | Should -BeExactly ''

      $env:WORKSHOP_LANG = ('pt' + [char]27 + '[31m' + ('x' * 60))
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'pt'
      $script:LangIgnored.Length | Should -Be 39 -Because 'cortado a 40 e sem o ESC'
      $script:LangIgnored | Should -Not -Match '[\x00-\x1F\x7F]'
      Remove-Item Env:WORKSHOP_LANG -ErrorAction SilentlyContinue

      Set-LangFile 'language.json' '{"language":"en","machine":"br"}'
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'en-US' -Because 'um "br" guardado pelo erro antigo nao conta'
      $script:LangSaved | Should -BeExactly ''

      Remove-Item -LiteralPath (Join-Path (Join-Path $script:WsHome 'kit') 'language.json')
      Set-LangFile 'lingua.json' '{"kit":"pt","maquina":"pt-BR"}'
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'pt-BR' -Because 'instalacoes antigas: kit\lingua.json "maquina"'
      $script:LangKit | Should -BeExactly 'pt'

      Set-LangFile 'language.json' '{"language":"pt","machine":"pt-PT"}' -Bom
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'pt-PT' -Because 'language.json primeiro, mesmo com BOM'

      Set-LangFile 'language.json' ''
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'pt-BR' -Because 'language.json vazio: passa ao lingua.json'
      Set-LangFile 'language.json' '{nao e json'
      Set-LangFile 'lingua.json' '[]'
      Initialize-WsLang
      $script:Lang | Should -BeExactly 'en-US' -Because 'ficheiros estragados: a lingua do sistema'
    } finally {
      Remove-Item Env:WORKSHOP_LANG -ErrorAction SilentlyContinue
    }
  }
  It 'passo 0: nota do WORKSHOP_LANG ignorado e da lingua guardada' {
    $script:T = New-WsStateTable
    $script:Cur = '0'
    $script:Lang = 'pt'; $script:LangIgnored = 'br'; $script:LangSaved = 'pt'; $script:LangMachine = 'en-US'
    Add-WsStep0LangNotes
    $n = $script:T['0'].Notas
    $n.Count | Should -Be 3
    $n[0] | Should -BeExactly 'Language: pt'
    $n[1] | Should -Match '^WORKSHOP_LANG=br is not one of the workshop languages .* used pt\.$'
    $n[2] | Should -Match '^Kept the language chosen at install \(pt\); this computer is in en-US\.'
    $script:T = New-WsStateTable
    $script:Lang = 'pt-BR'; $script:LangIgnored = ''; $script:LangSaved = 'pt-BR'; $script:LangMachine = 'pt-BR'
    Add-WsStep0LangNotes
    $script:T['0'].Notas.Count | Should -Be 1 -Because 'a lingua guardada e a da maquina: so a primeira nota'
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match '(?s)function Test-WsStep0 \{.*?Add-WsStep0LangNotes'
  }
  It 'passo 8 em -Check: explica a mudanca de lingua (falta lingua do kit / language do Claude)' {
    $script:Lang = 'en'; $script:LangKit = 'en'
    $out = "skills`t7`nagentes`t6`nfalta`tlingua do kit (pt -> en)`nlingua`ten`nlingua_kit`tpt`nlanguage`t`nlanguage_nossa`t0`n"
    $script:T = New-WsStateTable; $script:Cur = '8'; $script:Mode = 'check'
    Read-WsInstallUserOutput $out
    $muda = @($script:T['8'].Notas | Where-Object { $_ -match '^Language installed here' })
    $muda.Count | Should -Be 1
    $muda[0] | Should -Match ([regex]::Escape("Language installed here: Portuguese. This run asks for English (WORKSHOP_LANG): nothing is broken. To switch, run: `$env:WORKSHOP_LANG='en'; "))
    $script:T = New-WsStateTable; $script:Mode = 'install'
    Read-WsInstallUserOutput $out
    @($script:T['8'].Notas | Where-Object { $_ -match '^Language installed here' }).Count | Should -Be 0 -Because 'na instalacao a lingua muda mesmo'
    $script:T = New-WsStateTable; $script:Mode = 'doctor'
    Read-WsInstallUserOutput "falta`tlingua do kit (pt -> pt)`nfalta`tlanguage do Claude (European Portuguese -> Brazilian Portuguese)`nlingua`tpt-BR`nlingua_kit`tpt`nlanguage`tEuropean Portuguese`nlanguage_nossa`t1`n"
    ($script:T['8'].Notas -join ' ') | Should -Match 'Language installed here: European Portuguese\. This run asks for Brazilian Portuguese'
    $script:T = New-WsStateTable; $script:Mode = 'check'
    Read-WsInstallUserOutput "falta`tlingua do kit (- -> en)`nfalta`tskill x`nlingua`ten`nlingua_kit`t`nlanguage`t`nlanguage_nossa`t0`n"
    @($script:T['8'].Notas | Where-Object { $_ -match '^Language installed here' }).Count | Should -Be 0 -Because 'sem lingua do kit instalada nao ha mudanca a explicar'
  }
  It 'passo 8 na instalacao: a nota da lingua do verificar nao fica repetida (pt -> pt-BR)' {
    Mock Initialize-WsKit { $true }
    Mock Sync-WsExtras {}
    Mock Invoke-WsInstallUser { @{ ExitCode = 0; StdOut = "skills`t7`nagentes`t6`nlingua`tpt-BR`nlingua_kit`tpt`nlanguage`tBrazilian Portuguese`nlanguage_nossa`t1`n" } }
    $script:Lang = 'pt-BR'; $script:LangKit = 'pt'
    $script:T = New-WsStateTable; $script:Cur = '8'; $script:Mode = 'install'
    $script:T['8'].Notas = @('Claude answers in European Portuguese (Claude Code "language" setting). Workshop texts: Portuguese.')
    Install-WsStep8 | Should -BeTrue
    $n = @($script:T['8'].Notas | Where-Object { $_ -match '^Claude answers in' })
    $n.Count | Should -Be 1
    $n[0] | Should -Match 'Brazilian Portuguese'
  }
  It 'passo 9: nota quando um projeto ja montado esta noutra lingua' {
    $script:Proj = Join-Path $TestDrive 'proj-lang'
    $script:ProjShow = '%USERPROFILE%\workshop-claude'
    $demo = Join-Path $script:Proj 'demo-project'
    $sb = Join-Path $script:Proj $script:PracticeDir
    New-Item -ItemType Directory -Path $demo -Force | Out-Null
    New-Item -ItemType Directory -Path $sb -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $demo '.arena-kit.json'), '{"version":"1.0.0","language":"pt"}')
    [IO.File]::WriteAllText((Join-Path $sb '.sandbox-kit.json'), '{"lingua":"en"}')
    $script:T = New-WsStateTable; $script:Cur = '9'; $script:LangKit = 'en'
    Add-WsStep9LangNote
    $n = @($script:T['9'].Notas)
    $n.Count | Should -Be 1
    $n[0] | Should -Match '^%USERPROFILE%\\workshop-claude\\demo-project is in Portuguese, and the workshop texts are now in English\.'
    $script:T = New-WsStateTable; $script:LangKit = 'pt'
    Add-WsStep9LangNote
    $n = @($script:T['9'].Notas)
    $n.Count | Should -Be 1
    $n[0] | Should -Match ('^%USERPROFILE%\\workshop-claude\\' + $script:PracticeDir + ' is in English, and the workshop texts are now in Portuguese\.')
    [IO.File]::WriteAllText((Join-Path $demo '.arena-kit.json'), '{"status":"incomplete"}')
    [IO.File]::WriteAllText((Join-Path $sb '.sandbox-kit.json'), '{estragado')
    $script:T = New-WsStateTable
    Add-WsStep9LangNote
    @($script:T['9'].Notas).Count | Should -Be 0 -Because 'sem lingua no marcador (ou marcador estragado) nao ha nota'
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match '(?s)function Test-WsStep9 \{.*?s9_ja.*?Add-WsStep9LangNote.*?Test-WsAppTests'
    $text | Should -Match '(?s)function Install-WsStep9 \{.*?s9_ja.*?Add-WsStep9LangNote\s+return \(Test-WsAppTests\)'
  }
  It 'as mensagens novas existem nos dois catalogos, com os mesmos marcadores' {
    $pt = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/messages.pt.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
    $keys = @{ s0_lingua_ignorada = @('{VALOR}', '{LINGUA}'); s0_lingua_guardada = @('{LINGUA}', '{MAQUINA}'); s8_lingua_muda = @('{DE}', '{PARA}'); s9_lingua_diferente = @('{CAMINHO}', '{LINGUA}', '{KIT}') }
    foreach ($k in $keys.Keys) {
      foreach ($cat in @($script:Msgs, $pt)) {
        $t = [string]$cat.ui.$k
        $t | Should -Not -BeNullOrEmpty -Because $k
        foreach ($m in $keys[$k]) { $t.Contains($m) | Should -BeTrue -Because ($k + ' ' + $m) }
      }
    }
  }
  It 'a ajuda diz que a lingua escolhida fica e como a mudar' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $help = ([regex]::Match($text, '(?s)<#.*?#>')).Value
    $help | Should -Match 'chosen\s+at the first install is kept on later runs'
    $help | Should -Match "\`$env:WORKSHOP_LANG='pt-BR'"
    $help | Should -Match 'pt-BR, pt-PT, en, hi or he'
  }
}

Describe 'chaos round 2 R3-misc' {
  BeforeAll {
    if (-not $script:GitExe) { $script:GitExe = Get-WsGit }
    function New-R3Arena([string]$Dir, [string]$Tag, [switch]$Commit) {
      $c = @('-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', '-c', 'core.hooksPath=.git/no-hooks', '-c', 'user.name=t', '-c', 'user.email=t@t.invalid')
      Remove-Item -LiteralPath $Dir -Recurse -Force -ErrorAction SilentlyContinue
      New-Item -ItemType Directory -Path $Dir -Force | Out-Null
      [IO.File]::WriteAllText((Join-Path $Dir '.arena-kit.json'), '{"version":"v1","language":"en"}')
      [IO.File]::WriteAllText((Join-Path $Dir 'README.md'), 'x')
      & $script:GitExe -C $Dir init -q '--template=' | Out-Null
      & $script:GitExe -C $Dir add -A | Out-Null
      & $script:GitExe -C $Dir @c commit -q -m 'Initial state of the Security Arena' | Out-Null
      if ($Tag) { & $script:GitExe -C $Dir @c tag $Tag | Out-Null }
    }
  }
  BeforeEach {
    $script:T = New-WsStateTable
    $script:StepLog = New-Object System.Text.StringBuilder
  }

  It 'fs-dotfiles-symlinks: desinstalar com erro (settings.json por repor) devolve 1, nao apaga o kit-src nem diz concluida' {
    $script:WsHome = Join-Path $TestDrive 'ws-u'
    $kitSrc = Join-Path $script:WsHome 'kit-src\v1'
    New-Item -ItemType Directory -Path (Join-Path $kitSrc 'installer') -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $kitSrc 'installer\install-user.mjs'), '')
    [IO.File]::WriteAllText((Join-Path $script:WsHome 'manifest.json'), '{}')
    $script:NodeExe = Join-Path $script:WsHome 'manifest.json'   # so tem de existir: o Invoke-WsProcess e um mock
    $script:KitSrc = $kitSrc
    $script:Said = New-Object System.Collections.Generic.List[string]
    Mock Write-WsSay { $script:Said.Add($Text) }
    Mock Test-WsStep4 { }
    Mock Test-WsStep5 { }
    Mock Initialize-WsKit { return $true }
    Mock Get-WsClaude { return '' }
    Mock Get-WsUv { return '' }
    Mock Send-WsEnvChanged { }
    Mock Invoke-WsProcess {
      if (@($Arguments)[1] -eq 'desinstalar') { return @{ ExitCode = 5; StdOut = "erro`tsettings: EACCES`n"; StdErr = '' } }
      return @{ ExitCode = 0; StdOut = ''; StdErr = '' }
    }
    Invoke-WsUninstall | Should -Be 1
    Test-Path -LiteralPath (Join-Path $script:WsHome 'kit-src') | Should -BeTrue
    ($script:Said -join "`n") | Should -Match 'The uninstall stopped before the end'
    ($script:Said -join "`n") | Should -Not -Match 'Uninstall complete'
  }

  It 'fs-sudo-leftovers: .claude.json sem leitura = E-PERM-01 nos passos 7 e 10, sem claude mcp nem downloads' {
    $script:UserHome = Join-Path $TestDrive 'Bea Teste'
    $keep = $env:CLAUDE_CONFIG_DIR
    Remove-Item Env:CLAUDE_CONFIG_DIR -ErrorAction SilentlyContinue
    try {
      $script:PermBad = @(Join-Path $script:UserHome '.claude.json')
      $script:ClaudeExe = 'claude-falso'
      $script:Cur = '7'
      $script:Calls = 0
      Mock Invoke-WsProcess { $script:Calls++; return @{ ExitCode = 1; StdOut = ''; StdErr = '' } }
      Mock Invoke-WsDownload { $script:Calls++; return $false }
      Test-WsStep7 | Should -BeFalse
      $script:T['7'].Falha[0] | Should -BeExactly 'E-PERM-01'
      $script:T = New-WsStateTable
      Install-WsStep7 | Should -BeFalse
      $script:T['7'].Falha[0] | Should -BeExactly 'E-PERM-01'
      $script:Cur = '10'
      Install-WsStep10 | Should -BeFalse
      $script:T['10'].Falha[0] | Should -BeExactly 'E-PERM-01'
      $script:Calls | Should -Be 0
      ${function:Test-WsStep10}.ToString() | Should -Match '(?s)Test-WsPermBlocked @\(Get-WsClaudeJson\).*?Test-WsMemoryMcp'
      $env:CLAUDE_CONFIG_DIR = Join-Path $TestDrive 'cfg'
      Get-WsClaudeJson | Should -BeExactly (Join-Path (Join-Path $TestDrive 'cfg') '.claude.json')
    } finally {
      if ($keep) { $env:CLAUDE_CONFIG_DIR = $keep } else { Remove-Item Env:CLAUDE_CONFIG_DIR -ErrorAction SilentlyContinue }
      $script:PermBad = @()
    }
  }

  It 'fs-sudo-leftovers: a linha do E-PERM-01 corta no fim de uma frase ou palavra, nunca a meio' {
    $l = "Error: EACCES: permission denied, open 'C:\Users\x\.claude.json'. Run takeown /f the file to fix the owner of the file, then open a new window and run the same setup command again."
    Get-WsPermLine $l 'C:\Users\x' | Should -BeExactly "Error: EACCES: permission denied, open '~\.claude.json'."
    $w = Get-WsPermLine ('EACCES ' + ('palavra ' * 40)) ''
    $w | Should -Match ' \.\.\.$'
    $w | Should -Match 'palavra \.\.\.$'
    $w.Length | Should -BeLessOrEqual 164
  }

  It 'lang-pt-on-english-mac: no -Check so a lingua diferente e verificado, com o comando que leva o WORKSHOP_LANG' {
    $script:Lang = 'pt-PT'; $script:LangKit = 'pt'; $script:Cur = '8'
    $keep = $script:Fill
    $script:Fill = @{ ONE_LINER_WINDOWS = 'irm https://r.test/bootstrap-windows.ps1 | iex' }
    try {
      Mock Initialize-WsKit { return $true }
      Mock Sync-WsExtras { }
      $script:R3Out = "skills`t7`nagentes`t6`nlingua_kit`tpt`nlanguage`tBrazilian Portuguese`nlanguage_nossa`t1`nfalta`tlanguage do Claude (Brazilian Portuguese -> European Portuguese)`n"
      Mock Invoke-WsInstallUser { if ($Sub -eq 'verificar') { return @{ ExitCode = 1; StdOut = $script:R3Out } }; return @{ ExitCode = 0; StdOut = "skills`t7`nagentes`t6`n" } }
      $script:Mode = 'check'
      Test-WsStep8 | Should -BeTrue
      ($script:T['8'].Notas -join ' ') | Should -Match ([regex]::Escape("To switch, run: `$env:WORKSHOP_LANG='pt-PT'; irm https://r.test/bootstrap-windows.ps1 | iex"))
      $script:T = New-WsStateTable
      $script:R3Out += "falta`tkit desatualizado`n"
      Test-WsStep8 | Should -BeFalse -Because 'outra falta continua a ser uma instalacao a meio'
      $script:T = New-WsStateTable
      $script:Mode = 'install'
      $script:R3Out = $script:R3Out.Replace("falta`tkit desatualizado`n", '')
      Test-WsStep8 | Should -BeFalse -Because 'ao instalar, a lingua diferente reinstala'
      Install-WsStep8 | Should -BeTrue
      ($script:T['8'].Notas -join ' ') | Should -Match 'Language changed from Brazilian Portuguese to European Portuguese, because WORKSHOP_LANG asked for it\.'
    } finally { $script:Fill = $keep }
  }

  It 'net-host-blocked: os comandos nomeiam o servidor que falhou (e o instalador para o claude.ai)' {
    $script:C = @{ CLAUDE_INSTALL_PS1_URL = 'https://claude.ai/install.ps1'; NET_CHECK_HOSTS = 'claude.ai downloads.claude.ai github.com release-assets.githubusercontent.com' }
    Get-WsHintHost 'release-assets.githubusercontent.com - https://github.com/x' | Should -BeExactly 'release-assets.githubusercontent.com'
    Get-WsHintHost 'https://claude.ai/install.ps1 - HTTP 403' | Should -BeExactly 'claude.ai'
    Get-WsHintHost 'pypi.org, files.pythonhosted.org' | Should -BeExactly 'pypi.org'
    Get-WsHintHost 'SHA256SUMS' | Should -BeExactly 'api.anthropic.com'
    Get-WsHintUrl 'claude.ai' | Should -BeExactly 'https://claude.ai/install.ps1'
    Get-WsHintUrl 'pypi.org' | Should -BeExactly 'https://pypi.org/'
    $script:Said = New-Object System.Collections.Generic.List[string]
    Mock Write-WsSay { $script:Said.Add($Text) }
    Write-WsCode 'E-NET-02' 'release-assets.githubusercontent.com - https://github.com/x' ''
    ($script:Said -join "`n") | Should -Match 'PS> Resolve-DnsName release-assets\.githubusercontent\.com'
    $script:Said.Clear()
    Write-WsCode 'E-NET-01' 'claude.ai' ''
    ($script:Said -join "`n") | Should -Match 'PS> Invoke-WebRequest -UseBasicParsing -Method Head https://claude\.ai/install\.ps1'
    $script:Said.Clear()
    Write-WsCode 'E-DEMO-03' 'C:\Users\Bea Teste\workshop-claude\demo-project' ''
    ($script:Said -join "`n") | Should -Match ([regex]::Escape('PS> Rename-Item $env:USERPROFILE\workshop-claude\demo-project demo-project-old'))
  }

  It 'net-host-blocked: o servidor de uma pagina de bloqueio vai no fim; o detalhe de um ficheiro comeca pelo servidor' {
    $script:C = @{ NET_CHECK_HOSTS = 'claude.ai github.com release-assets.githubusercontent.com' }
    $script:DlHost = 'proxy.corp:15871'; $script:DlUrlHost = 'claude.ai'; $script:DlStatus = 'HtmlPage'; $script:DlHttp = 200
    Get-WsDlDetail 'https://claude.ai/install.ps1' | Should -BeExactly 'https://claude.ai/install.ps1 - redirected to proxy.corp:15871 - a web page came instead of the file'
    $script:DlHost = 'release-assets.githubusercontent.com'; $script:DlUrlHost = 'github.com'; $script:DlStatus = 'NameResolutionFailure'; $script:DlHttp = 0
    Get-WsDlDetail 'https://github.com/x.zip' | Should -BeExactly 'release-assets.githubusercontent.com - https://github.com/x.zip'
    $script:DlHost = ''; $script:DlUrlHost = 'github.com'; $script:DlStatus = 'ProtocolError'; $script:DlHttp = 404
    Get-WsDlDetail 'constraints.txt' | Should -BeExactly 'github.com - constraints.txt - HTTP 404'
    $w = Get-WsNetWarnings @('claude.ai', 'pypi.org', 'files.pythonhosted.org') @('E-NET-01', 'E-NET-02', 'E-NET-02') $true '' $false
    ($w | ForEach-Object { $_ -join '|' }) -join ';' | Should -BeExactly 'E-NET-01|claude.ai;E-NET-02|pypi.org, files.pythonhosted.org'
    $f = ${function:Test-WsNetwork}.ToString()
    $f | Should -Match "Headers\['Location'\]"
    $f | Should -Match 'Test-WsHostKnown \$lh'
    $script:Fill = @{ REPO_HOST = 'git.corp' }
    Test-WsHostKnown 'git.corp:443' | Should -BeTrue
    Test-WsHostKnown 'downloads.claude.ai' | Should -BeFalse
    Test-WsHostKnown '' | Should -BeFalse
  }

  It 'net-host-blocked: 1 aviso no singular' {
    $script:Msgs.ui.final_aviso1 | Should -Match '^There is 1 warning above\.'
    ${function:Write-WsSummary}.ToString() | Should -Match "Avisos -eq 1\) \{ \`$lines \+= \(M 'final_aviso1'\)"
  }

  It 'run-ctrlc-arena: a Arena com a marca final e so o commit do kit ganha a tag; com um ficheiro da pessoa nao' {
    if (-not $script:GitExe) { Set-ItResult -Skipped -Because 'sem git'; return }
    $script:Proj = Join-Path $TestDrive 'r3proj'
    $demo = Join-Path $script:Proj 'demo-project'
    New-R3Arena $demo ''
    Invoke-WsStep9Migrate
    (& $script:GitExe -C $demo tag -l) | Should -BeExactly 'arena-start'
    New-R3Arena $demo ''
    [IO.File]::WriteAllText((Join-Path $demo 'MY.md'), 'mine')
    Invoke-WsStep9Migrate
    (& $script:GitExe -C $demo tag -l) | Should -BeNullOrEmpty
  }

  It 'run-upgrade-uninstall: a Arena do rc.1 (so arena-inicial) migra ao instalar e no -Check nao e historico proprio' {
    if (-not $script:GitExe) { Set-ItResult -Skipped -Because 'sem git'; return }
    Mock Initialize-WsKit { return $true }
    Mock Test-WsAppTests { return $true }
    $script:Proj = Join-Path $TestDrive 'r3proj2'
    $script:KitSrc = Join-Path $TestDrive 'r3kit'
    New-Item -ItemType Directory -Path $script:KitSrc -Force | Out-Null
    $script:ProjShow = '%USERPROFILE%\workshop-claude'
    $script:Cur = '9'
    $demo = Join-Path $script:Proj 'demo-project'
    New-R3Arena $demo 'arena-inicial'
    [IO.File]::WriteAllText((Join-Path $demo 'MY.md'), 'mine')
    $script:Mode = 'check'
    Test-WsStep9 | Out-Null
    @($script:T['9'].Avisos).Count | Should -Be 0
    @(& $script:GitExe -C $demo tag -l) -join ' ' | Should -BeExactly 'arena-inicial'
    $script:T = New-WsStateTable
    $script:Mode = 'install'
    Test-WsStep9 | Out-Null
    @($script:T['9'].Avisos).Count | Should -Be 0
    @(& $script:GitExe -C $demo tag -l) -join ' ' | Should -BeExactly 'arena-inicial arena-start'
  }
}

Describe 'chaos round 2 R1-env' {
  BeforeEach {
    $script:T = New-WsStateTable; $script:Cur = '0'; $script:Mode = 'install'
    $script:StepLog = New-Object System.Text.StringBuilder
    $script:Saved = @{}
    foreach ($k in @('FORCE_COLOR', 'NODE_OPTIONS', 'PYTHONHOME', 'PYTHONPATH', 'SSL_CERT_FILE', 'CURL_CA_BUNDLE', 'ANTHROPIC_MODEL', 'CLAUDE_CONFIG_DIR', 'UV_DEFAULT_INDEX', 'UV_INDEX_URL', 'UV_INDEX', 'UV_EXTRA_INDEX_URL', 'TMPDIR', 'TEMP', 'TMP')) {
      $script:Saved[$k] = [Environment]::GetEnvironmentVariable($k)
    }
  }
  AfterEach {
    foreach ($k in $script:Saved.Keys) { [Environment]::SetEnvironmentVariable($k, $script:Saved[$k]) }
  }
  It 'os programas que o setup corre nao recebem cores forcadas, NODE_OPTIONS, o Python de outro ambiente nem certificados que nao existem' {
    $envExe = '/usr/bin/env'
    if (-not (Test-Path -LiteralPath $envExe)) { Set-ItResult -Skipped -Because 'sem /usr/bin/env'; return }
    $good = Join-Path $TestDrive 'ca.pem'; [IO.File]::WriteAllText($good, 'x')
    $env:FORCE_COLOR = '3'; $env:NODE_OPTIONS = '--require /nao/existe.js'; $env:PYTHONHOME = '/opt/conda'
    $env:SSL_CERT_FILE = (Join-Path $TestDrive 'nao-existe.pem'); $env:CURL_CA_BUNDLE = $good
    $r = Invoke-WsProcess $envExe @() -TimeoutSec 30
    $r.StdOut | Should -Not -Match '(?m)^(FORCE_COLOR|NODE_OPTIONS|PYTHONHOME|SSL_CERT_FILE)='
    $r.StdOut | Should -Match '(?m)^NO_COLOR=1'
    $r.StdOut | Should -Match ('(?m)^CURL_CA_BUNDLE=' + [regex]::Escape($good))
    $r = Invoke-WsProcess $envExe @() -TimeoutSec 30 -Environment @{ NODE_OPTIONS = '--x' }
    $r.StdOut | Should -Match '(?m)^NODE_OPTIONS=--x' -Because 'o -Environment volta a por o NODE_OPTIONS (o teste do E-NODE-03)'
    $env:NODE_OPTIONS | Should -Be '--require /nao/existe.js' -Because 'o ambiente do proprio PowerShell fica como estava'
  }
  It 'disco cheio: o erro de escrita do download e E-SO-06, e uma falha com a mensagem no log do passo tambem' {
    $e = New-Object System.IO.IOException('There is not enough space on the disk.', -2147024784)
    (Get-WsWebErrorInfo $e).Status | Should -Be 'DiskFull'
    Get-WsNetCode 'DiskFull' 0 | Should -Be 'E-SO-06'
    $script:UserHome = 'C:\Users\ana'
    [void]$script:StepLog.Append('download failed: https://x There is not enough space on the disk.')
    $script:Cur = '8'; Set-WsFail 'E-KIT-01' ''
    Invoke-WsPermReclass
    $script:T['8'].Falha[0] | Should -Be 'E-SO-06'
    $script:T['8'].Falha[1] | Should -Be 'No space left on device - E-KIT-01'
    $script:Cur = '12'; Set-WsFail 'E-SMOKE-02' ''
    Invoke-WsPermReclass
    $script:T['12'].Falha[0] | Should -Be 'E-SMOKE-02' -Because 'sem creditos nao e o disco'
  }
  It 'CLAUDE_CONFIG_DIR: so caminhos absolutos' {
    Test-WsAbsolutePath 'C:\Users\ana\.claude-work' | Should -BeTrue
    Test-WsAbsolutePath '\\servidor\partilha\claude' | Should -BeTrue
    Test-WsAbsolutePath '~\.claude-work' | Should -BeFalse
    Test-WsAbsolutePath '.claude-work' | Should -BeFalse
    Test-WsAbsolutePath 'C:claude' | Should -BeFalse
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match "(?s)Test-WsAbsolutePath \`$env:CLAUDE_CONFIG_DIR.*?Write-WsCode 'E-CFG-08'.*?return 1.*?New-WsTmpDir"
  }
  It 'CLAUDE_CONFIG_DIR so neste terminal: nota e E-CFG-09' {
    $script:Cur = '8'
    $env:CLAUDE_CONFIG_DIR = 'C:\Users\ana\.claude-work'; $script:ClaudeDir = $env:CLAUDE_CONFIG_DIR
    Test-WsClaudeConfigDir
    $script:T['8'].Notas[0] | Should -Be (M 's8_claude_dir' @{ CAMINHO = 'C:\Users\ana\.claude-work' })
    if (-not [Environment]::GetEnvironmentVariable('CLAUDE_CONFIG_DIR', 'User')) {
      $script:T['8'].Avisos[0] -join '|' | Should -Be 'E-CFG-09|C:\Users\ana\.claude-work - new terminal: not set'
    }
    $script:T = New-WsStateTable; Remove-Item Env:CLAUDE_CONFIG_DIR
    Test-WsClaudeConfigDir
    @($script:T['8'].Notas).Count | Should -Be 0
  }
  It 'passo 0: modelos trocados, certificados que nao existem e um TEMP que nao serve' {
    $script:ClaudeDir = Join-Path $TestDrive 'cdm'
    New-Item -ItemType Directory -Path $script:ClaudeDir -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $script:ClaudeDir 'settings.json'), '{"env":{"ANTHROPIC_DEFAULT_SONNET_MODEL":"anthropic.claude-old-v1"}}')
    $env:ANTHROPIC_MODEL = 'claude-velho'; $env:SSL_CERT_FILE = (Join-Path $TestDrive 'nao-existe.pem')
    $script:TmpBad = 'TEMP=X:\Temp\'
    Mock Get-WsSettingsEnv { return $null } -ParameterFilter { $Name -ne 'ANTHROPIC_DEFAULT_SONNET_MODEL' }
    Test-WsEnvWarnings
    $w = @($script:T['0'].Avisos | ForEach-Object { $_ -join '|' })
    $w | Should -Contain ('E-CFG-10|ANTHROPIC_MODEL=claude-velho (shell) - ANTHROPIC_DEFAULT_SONNET_MODEL=anthropic.claude-old-v1 (' + (Join-Path $script:ClaudeDir 'settings.json') + ')')
    $w | Should -Contain ('E-NET-09|SSL_CERT_FILE=' + $env:SSL_CERT_FILE)
    $w | Should -Contain 'E-SO-09|TEMP=X:\Temp\'
    $script:TmpBad = ''
  }
  It 'pasta temporaria: um TEMP que nao serve passa para a pasta do workshop' {
    if ($IsWindows -or $env:OS -eq 'Windows_NT') { Set-ItResult -Skipped -Because 'no Windows o GetTempPath le o TMP do sistema'; return }
    $script:WsHome = Join-Path $TestDrive 'wsh'; New-Item -ItemType Directory -Path $script:WsHome -Force | Out-Null
    $f = Join-Path $TestDrive 'um-ficheiro'; [IO.File]::WriteAllText($f, 'x')
    $env:TMPDIR = $f + '/'
    $script:TmpBad = ''
    $t = New-WsTmpDir
    $t | Should -Not -BeNullOrEmpty
    $t.StartsWith((Join-Path $script:WsHome 'tmp')) | Should -BeTrue
    Test-Path -LiteralPath (Join-Path $t '.ws-tmp') | Should -BeTrue
    $script:TmpBad | Should -Match '^TEMP='
    $script:TmpBad = ''
  }
  It 'NODE_OPTIONS: o major vem do -e e um NODE_OPTIONS que parte o Node da E-NODE-03' {
    Mock Invoke-WsProcess { return @{ ExitCode = 0; StdOut = '24.11.1'; StdErr = '' } }
    Get-WsNodeMajor 'node.exe' | Should -Be 24
    Should -Invoke Invoke-WsProcess -ParameterFilter { (@($Arguments) -join ' ') -eq '-e process.stdout.write(process.versions.node)' }
    $script:Cur = '4'; $script:Mode = 'check'
    $script:C = @{ NODE_MIN_MAJOR = '22' }
    $script:WsHome = Join-Path $TestDrive 'ws4'
    $script:NodeExe = Join-Path $TestDrive 'node4.exe'; Set-Content -LiteralPath $script:NodeExe -Value 'x'
    Mock Get-Command { return $null } -ParameterFilter { $Name -eq 'node' }
    Mock Get-WsDriveType { return 3 }
    Mock Test-WsNetworkPath { return $false }
    Mock Get-WsNodeMajor { return 24 }
    Mock Get-WsFreshNodeMajor { return 24 }
    Mock Sync-WsExtras { }
    Mock Invoke-WsProcess { if ($Environment -and $Environment.NODE_OPTIONS) { return @{ ExitCode = 9; StdOut = ''; StdErr = 'not allowed' } }; return @{ ExitCode = 0; StdOut = 'v24.11.1'; StdErr = '' } }
    $env:NODE_OPTIONS = '--experimental-policy=policy.json'
    Test-WsStep4 | Should -BeTrue
    $script:T['4'].Avisos[0] -join '|' | Should -Be 'E-NODE-03|NODE_OPTIONS=--experimental-policy=policy.json'
    $script:T = New-WsStateTable; Remove-Item Env:NODE_OPTIONS
    Test-WsStep4 | Should -BeTrue
    @($script:T['4'].Avisos).Count | Should -Be 0
  }
  It 'Node do workshop sem o npm nao conta' {
    $d = Join-Path $TestDrive 'node-sem-npm'; New-Item -ItemType Directory -Path $d -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $d 'node.exe'), 'x')
    Test-WsNodeComplete $d | Should -BeFalse
  }
  It 'uv: espelho de pacotes mostrado sem credenciais (E-MEM-08) e o retry de certificados sem o SSL_CERT_FILE' {
    foreach ($k in @('UV_DEFAULT_INDEX', 'UV_INDEX', 'UV_EXTRA_INDEX_URL')) { [Environment]::SetEnvironmentVariable($k, $null) }
    $env:UV_INDEX_URL = 'https://bea:segredo@pypi.empresa.pt/simple'
    Get-WsUvIndex | Should -Be 'UV_INDEX_URL=https://pypi.empresa.pt/simple'
    Remove-Item Env:UV_INDEX_URL
    Get-WsUvIndex | Should -Be ''
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $text | Should -Match "(?s)\`$ix = Get-WsUvIndex\s+if \(\`$ix\) \{ Set-WsFail 'E-MEM-08' \`$ix \}"
    $text | Should -Match "-RemoveEnv \(\`$script:UvBlockEnv \+ @\('SSL_CERT_FILE', 'SSL_CERT_DIR'\)\)"
  }
  It 'MCP: um registo sem o PYTHONHOME vazio e refeito (sem nota de troca); o aviso E-MEM-09 com o PYTHONHOME na shell' {
    $script:Cur = '10'; $script:ClaudeExe = 'claude.exe'; $script:Calls = @()
    $exe = 'C:\u\.local\bin\agent-memory.exe'
    $script:Out = "agent-memory:`n  Type: stdio`n  Command: $exe`n  Args: mcp"
    Mock Register-WsExtra { }
    Mock Invoke-WsProcess {
      $a = @($Arguments); $script:Calls += ($a -join ' ')
      if ($a[1] -eq 'get') { if ($a[2] -eq 'agent-memory') { return @{ ExitCode = 0; StdOut = $script:Out } }; return @{ ExitCode = 1; StdOut = '' } }
      if ($a[1] -eq 'add') { $script:Out = "agent-memory:`n  Command: $exe`n  Args: mcp`n  Environment:`n    PYTHONHOME=`n"; return @{ ExitCode = 0; StdOut = '' } }
      return @{ ExitCode = 0; StdOut = '' }
    }
    $env:PYTHONHOME = 'C:\Miniconda3'
    Test-WsMemoryMcp $exe | Should -BeFalse -Because 'com o PYTHONHOME na shell, o registo antigo nao arranca'
    Register-WsMemoryMcp $exe | Should -BeTrue
    ($script:Calls -join ';') | Should -Match 'mcp add --scope user agent-memory -e PYTHONHOME= -e PYTHONPATH= -e PYTHONSTARTUP= -- '
    @($script:T['10'].Notas).Count | Should -Be 0
    Test-WsMemoryMcp $exe | Should -BeTrue
    Mock Invoke-WsProcess { return @{ ExitCode = 0; StdOut = "[OK] Python 3.12.15`n"; StdErr = '' } }
    Invoke-WsMemorySelftest $exe '0.5.0' | Should -BeTrue
    $script:T['10'].Avisos[0] -join '|' | Should -Be 'E-MEM-09|PYTHONHOME=C:\Miniconda3'
  }
  It 'os codigos novos existem nos dois catalogos' {
    $pt = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/messages.pt.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
    foreach ($c in @('E-NET-09', 'E-SO-09', 'E-SO-10', 'E-CFG-08', 'E-CFG-09', 'E-CFG-10', 'E-NODE-03', 'E-MEM-08', 'E-MEM-09', 'E-MEM-10')) {
      $script:Msgs.erros.$c.titulo | Should -Not -BeNullOrEmpty -Because $c
      $pt.erros.$c.titulo | Should -Not -BeNullOrEmpty -Because $c
    }
  }
}

Describe 'chaos round 2 R2-cfg-auth' {
  BeforeEach {
    $script:T = New-WsStateTable; $script:Cur = '0'; $script:Mode = 'install'; $script:Sim = $false; $script:SubstSl = $false
    $script:ClaudeDir = Join-Path $TestDrive 'r2claude'
    $script:UserHome = Join-Path $TestDrive 'r2home'
    $script:Tmp = Join-Path $TestDrive 'r2tmp'
    New-Item -ItemType Directory -Path $script:ClaudeDir, $script:UserHome, $script:Tmp -Force | Out-Null
    Remove-Item -LiteralPath (Join-Path $script:ClaudeDir 'settings.json') -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $script:UserHome '.claude.json') -Force -ErrorAction SilentlyContinue
    $script:GwDown = $false; $script:GwUrl = ''; $script:EnvProxyDead = $false; $script:ClaudeExe = 'claude-falso'
    $script:R2Keep = @{}
    foreach ($k in @('CLAUDE_CONFIG_DIR', 'ProgramFiles', 'ProgramData', 'HTTPS_PROXY', 'UV_SYSTEM_CERTS', 'UV_CONFIG_FILE', 'APPDATA')) {
      $script:R2Keep[$k] = [Environment]::GetEnvironmentVariable($k)
      [Environment]::SetEnvironmentVariable($k, $null)
    }
    Mock Write-WsSay { }
  }
  AfterEach {
    foreach ($k in $script:R2Keep.Keys) { [Environment]::SetEnvironmentVariable($k, $script:R2Keep[$k]) }
  }

  It 'Read-WsResult: um hook que bloqueia o pedido (0 turnos) e a resposta curta' {
    $o = Read-WsResult ('{"is_error":false,"subtype":"success","num_turns":0,"result":"UserPromptSubmit operation blocked by hook:\nCompany policy: every prompt needs a ticket id\n\nOriginal prompt: Reply","modelUsage":{}}')
    $o.Hook | Should -BeExactly 'UserPromptSubmit'
    $o.HookMotivo | Should -BeExactly 'Company policy: every prompt needs a ticket id'
    $o.Turnos | Should -Be 0
    $o = Read-WsResult ('{"is_error":false,"num_turns":1,"result":"\n OK \n\nThe MCP server needs authentication: run /mcp and a very long tail of text","modelUsage":{}}')
    $o.Hook | Should -BeExactly ''
    $o.Curta | Should -BeExactly 'OK'
    $o = Read-WsResult ('{"is_error":false,"result":"' + ('x' * 60) + '"}')
    $o.Turnos | Should -BeNullOrEmpty
    $o.Curta.Length | Should -Be 40
  }

  It 'passo 12: hook que bloqueia = E-SMOKE-05; 0 turnos sem hook = E-SMOKE-01; resposta normal continua Done' {
    $script:Cur = '12'
    $script:R2Out = '{"is_error":false,"num_turns":0,"result":"UserPromptSubmit operation blocked by hook:\nCompany policy: ticket id\n\nOriginal prompt: x","modelUsage":{}}'
    Mock Invoke-WsProcess { return @{ ExitCode = 0; StdOut = $script:R2Out; StdErr = '' } }
    Install-WsStep12 | Should -BeFalse
    $script:T['12'].Falha -join '|' | Should -BeExactly 'E-SMOKE-05|UserPromptSubmit: Company policy: ticket id'
    $script:T = New-WsStateTable
    $script:R2Out = '{"is_error":false,"num_turns":0,"result":"","modelUsage":{}}'
    Install-WsStep12 | Should -BeFalse
    $script:T['12'].Falha[0] | Should -Be 'E-SMOKE-01'
    $script:T = New-WsStateTable
    $script:R2Out = '{"is_error":false,"num_turns":1,"result":"OK","modelUsage":{}}'
    Install-WsStep12 | Should -BeTrue
    $script:T['12'].Detalhe | Should -Match '"OK"|OK'
  }

  It 'passo 12: sem resposta com um SessionStart da pessoa, tenta uma vez sem hooks (--settings) = E-SMOKE-06' {
    $script:Cur = '12'
    [IO.File]::WriteAllText((Join-Path $script:ClaudeDir 'settings.json'), '{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"git -C notes pull","timeout":600}]}],"Stop":[{"hooks":[{"type":"command","command":"\"C:/n/node.exe\" \"C:/u/.workshop-claude/kit/hooks/stop.mjs\""}]}]}}')
    Get-WsUserHooks | Should -BeExactly 'SessionStart'
    $script:R2Args = @()
    Mock Invoke-WsProcess {
      $script:R2Args += , (@($Arguments) -join ' ')
      if (@($Arguments) -contains '--settings') { return @{ ExitCode = 0; StdOut = '{"is_error":false,"num_turns":1,"result":"OK"}'; StdErr = '' } }
      return @{ ExitCode = -2; StdOut = ''; StdErr = '' }
    }
    Install-WsStep12 | Should -BeFalse
    $script:T['12'].Falha[0] | Should -Be 'E-SMOKE-06'
    $script:T['12'].Falha[1] | Should -Match '^SessionStart . .*settings\.json$'
    $script:R2Args.Count | Should -Be 2
    $script:R2Args[1] | Should -Match '--settings \{"disableAllHooks":true\}'
    [IO.File]::WriteAllText((Join-Path $script:ClaudeDir 'settings.json'), '{"model":"sonnet"}')
    $script:T = New-WsStateTable; $script:R2Args = @()
    Install-WsStep12 | Should -BeFalse
    $script:T['12'].Falha[0] | Should -Be 'E-SMOKE-01'
    $script:R2Args.Count | Should -Be 1
  }

  It 'ajudante: corre sem os hooks da pessoa; E-SMOKE-05/06 nao o oferecem' {
    $script:R2Args = ''
    Mock Invoke-WsProcess { $script:R2Args = (@($Arguments) -join ' '); return @{ ExitCode = 0; StdOut = '{"is_error":false,"result":"{}"}'; StdErr = '' } }
    [void](Invoke-WsClaudeHelper 'pedido' '' 5)
    $script:R2Args | Should -Match '--settings \{"disableAllHooks":true\}'
    $script:AuthOk = $true
    foreach ($c in @('E-SMOKE-05', 'E-SMOKE-06')) {
      $script:T = New-WsStateTable; $script:T['12'].Falha = @($c, 'x')
      Invoke-WsHelper '12' | Should -BeFalse
    }
    Should -Invoke Write-WsSay -Times 0 -Exactly -ParameterFilter { $Text -match 'analy' }
  }

  It 'passo 3: o auth status corre na pasta temporaria; sem origem conhecida diz "Claude Code settings"' {
    $script:R2Wd = ''
    Mock Invoke-WsProcess { $script:R2Wd = $WorkingDirectory; return @{ ExitCode = 0; StdOut = '{"loggedIn":true,"apiProvider":"firstParty"}' } }
    [void](Read-WsAuth)
    $script:R2Wd | Should -BeExactly $script:Tmp
  }

  It 'passo 7: um registo stdio antigo no .claude.json decide-se sem o "mcp get"; os segredos dos argumentos nao aparecem' {
    $script:Cur = '7'
    $script:C = @{ ATLASSIAN_MCP_URL = 'https://mcp.atlassian.com/v2/mcp' }
    $u = Get-WsMcpUser 'atlassian' '{"mcpServers":{"atlassian":{"type":"stdio","command":"npx","args":["-y","mcp-remote","https://mcp.atlassian.com/v1/sse","--header","Authorization: Bearer segredo","--api-token=abc"]}}}'
    $u.Kind | Should -Be 'cmd'
    $u.Cmd | Should -BeExactly 'npx -y mcp-remote https://mcp.atlassian.com/v1/sse --header *** --api-token=***'
    (Get-WsMcpUser 'atlassian' '{"mcpServers":{}}').Kind | Should -Be 'nenhum'
    (Get-WsMcpUser 'atlassian' '{"mcpServers":{"atlassian":{"type":"http","url":"https://mcp.atlassian.com/v2/mcp"}}}').Url | Should -BeExactly 'https://mcp.atlassian.com/v2/mcp'
    Get-WsMcpUser 'atlassian' '{ estragado' | Should -BeNullOrEmpty
    Get-WsMcpUser 'atlassian' | Should -BeNullOrEmpty -Because 'sem .claude.json fica o mcp get'
    [IO.File]::WriteAllText((Join-Path $script:UserHome '.claude.json'), '{"mcpServers":{"atlassian":{"type":"stdio","command":"npx","args":["-y","mcp-remote","https://mcp.atlassian.com/v1/sse"]},"agent-memory":{"type":"stdio","command":"C:\\u\\bin\\agent-memory.exe","args":["mcp"]}}}')
    $script:R2Calls = @()
    Mock Invoke-WsProcess { $script:R2Calls += , (@($Arguments) -join ' '); return @{ ExitCode = 0; StdOut = ''; StdErr = '' } }
    Test-WsStep7 | Should -BeFalse
    $script:T['7'].Falha -join '|' | Should -BeExactly 'E-MCP-01|atlassian: npx -y mcp-remote https://mcp.atlassian.com/v1/sse'
    $script:S7Old | Should -BeExactly 'npx -y mcp-remote https://mcp.atlassian.com/v1/sse'
    @($script:R2Calls | Where-Object { $_ -like 'mcp get*' }).Count | Should -Be 0
    Test-WsMemoryMcp 'C:\U\BIN\agent-memory.exe' | Should -BeTrue
    Test-WsMemoryMcp 'C:\outro\agent-memory.exe' | Should -BeFalse
    @($script:R2Calls | Where-Object { $_ -like 'mcp get*' }).Count | Should -Be 0
  }

  It 'passo 8: E-CFG-11 (disableAllHooks), nota do item da pessoa e -ReplaceStatusline num kit instalado' {
    $script:Cur = '8'
    Read-WsInstallUserOutput ("skills`t7`nagentes`t6`naviso`tE-CFG-11`nalheio`t" + $script:UserHome + '/.workshop-claude/backup/2026/skills/memory' + "`n")
    $script:T['8'].Avisos[0][0] | Should -Be 'E-CFG-11'
    $script:T['8'].Avisos[0][1] | Should -Match 'settings\.json: disableAllHooks$'
    ($script:T['8'].Notas -join "`n") | Should -Match 'Your memory has the same name as one in the kit'
    Mock Initialize-WsKit { return $true }
    Mock Sync-WsExtras { }
    Mock Invoke-WsInstallUser { return @{ ExitCode = 0; StdOut = "ok`t1`nskills`t7`nagentes`t6`nstatusline`talheia`naviso`tE-CFG-06`n" } }
    $script:SubstSl = $true; $script:Mode = 'install'
    Test-WsStep8 | Should -BeFalse
    $script:SubstSl = $false
    Test-WsStep8 | Should -BeTrue
    $script:SubstSl = $true; $script:Mode = 'check'
    Test-WsStep8 | Should -BeTrue
  }

  It 'passo 10: definicoes do uv da pessoa = E-UV-03 (sintaxe) e E-UV-04 (mirror que nao responde)' {
    $cfg = Join-Path $TestDrive 'uv.toml'
    [IO.File]::WriteAllText($cfg, 'python-install-mirror = "http://10.255.255.1/artifactory/github"')
    $r = Get-WsUvConfigCause ("error: Failed to parse: ``AppData\Roaming\uv\uv.toml```n  Caused by: TOML parse error at line 2, column 13") @($cfg) 'C:\Users\Ana'
    $r[0] | Should -Be 'E-UV-03'
    $r[1] | Should -Match 'uv\.toml . TOML parse error at line 2, column 13$'
    $r = Get-WsUvConfigCause "error: Failed to download http://10.255.255.1/artifactory/github/x.tar.gz`n  Caused by: operation timed out" @($cfg) ''
    $r -join '|' | Should -Match '^E-UV-04\|.*uv\.toml . 10\.255\.255\.1$'
    Get-WsUvConfigCause 'error: Failed to fetch: `https://pypi.org/simple/x/`' @($cfg) '' | Should -BeNullOrEmpty
    Get-WsUvConfigCause 'error: Failed to download http://10.255.255.1/x' @((Join-Path $TestDrive 'nao-existe.toml')) '' | Should -BeNullOrEmpty
  }

  It 'passo 10: certificado da empresa: UV_SYSTEM_CERTS, depois o ca.pem do IT pelo SSL_CERT_FILE; sem ca.pem = E-NET-10' {
    $script:Cur = '10'
    $script:C = @{ MEMORY_APP_VERSION = 'v0.5.0'; PYTHON_VERSION = '3.12.13'; MEMORY_APP_REPO_URL = 'https://h/o/app'; RELEASE_DOWNLOAD_URL = 'https://h/{file}' }
    $script:WsHome = Join-Path $TestDrive 'r2ws'; New-Item -ItemType Directory -Path $script:WsHome -Force | Out-Null
    Remove-Item -LiteralPath (Join-Path $script:WsHome 'ca.pem') -Force -ErrorAction SilentlyContinue
    $script:UvExe = 'uv.exe'; $script:ClaudeExe = $null
    Mock Get-WsReleaseUrl { return ('https://rel.invalid/' + $File) }
    Mock Invoke-WsDownload { Set-Content -LiteralPath $OutFile -Value 'x'; return $true }
    Mock Get-WsMemoryWheel { return 'agent_memory-0.5.0-py3-none-any.whl' }
    Mock Get-WsSumFor { return 'abc' }
    Mock Get-WsSha256 { return 'abc' }
    Mock Install-WsWebView2 { return $true }
    Mock Register-WsExtra { }
    Mock Get-WsUvBin { return (Join-Path $TestDrive 'r2bin') }
    Mock Get-WsMemoryExe { return $null }
    Mock Invoke-WsProcess {
      if ((@($Arguments) -join ' ') -like 'tool install*') {
        $c = ''; $s = ''
        if ($Environment) { $c = [string]$Environment['UV_SYSTEM_CERTS']; $s = [string]$Environment['SSL_CERT_FILE'] }
        $script:UvCalls += ('certs=' + $c + ' ssl=' + [bool]$s)
        if ($s -and ([IO.File]::ReadAllText($s) -match 'CA DO IT')) { return @{ ExitCode = 0; StdOut = ''; StdErr = '' } }
        return @{ ExitCode = 1; StdOut = ''; StdErr = 'error: invalid peer certificate: UnknownIssuer' }
      }
      return @{ ExitCode = 0; StdOut = ''; StdErr = '' }
    }
    $script:UvCalls = @()
    Install-WsStep10 | Should -BeFalse
    $script:T['10'].Falha -join '|' | Should -BeExactly 'E-NET-10|uv: github.com / pypi.org'
    $script:UvCalls -join ',' | Should -BeExactly 'certs= ssl=False,certs=true ssl=False'
    [IO.File]::WriteAllText((Join-Path $script:WsHome 'ca.pem'), "-----BEGIN CERTIFICATE-----`nCA DO IT`n-----END CERTIFICATE-----`n")
    $script:T = New-WsStateTable; $script:UvCalls = @()
    Install-WsStep10 | Should -BeFalse
    $script:T['10'].Falha[0] | Should -Be 'E-MEM-03' -Because 'passou o uv (o programa falso nao existe)'
    $script:UvCalls -join ',' | Should -BeExactly 'certs= ssl=False,certs=true ssl=False,certs=true ssl=True'
    [IO.File]::ReadAllText((Join-Path $script:WsHome 'ca.pem')) | Should -Match 'CA DO IT'
  }

  It 'passo 0: o Test-WsTls nunca escreve o ca.pem da pessoa (junta-o no ca-company.pem)' {
    $text = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/setup-windows.ps1'))
    $tls = ([regex]::Match($text, '(?s)function Test-WsTls \{.*?\n\}')).Value
    $tls | Should -Match "'ca-company\.pem'"
    $tls | Should -Match "'ca-system\.pem'"
    $tls | Should -Not -Match 'WriteAllText\(\$mine'
  }

  It 'resumo: 1 aviso no singular; as mensagens novas existem nos dois catalogos' {
    M 'final_aviso1' | Should -BeExactly "There is 1 warning above. It doesn't block the workshop, but read it."
    $pt = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/messages.pt.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
    foreach ($k in @('final_aviso1', 's12_sem_hooks', 's8_alheio', 's0_proxy_curlrc')) { [string]$pt.ui.$k | Should -Not -BeNullOrEmpty -Because $k }
    foreach ($c in @('E-SMOKE-05', 'E-SMOKE-06', 'E-CFG-11', 'E-UV-03', 'E-UV-04', 'E-NET-10')) {
      $script:Msgs.erros.$c.titulo | Should -Not -BeNullOrEmpty -Because $c
      $pt.erros.$c.titulo | Should -Not -BeNullOrEmpty -Because $c
    }
  }
}

Describe 'agent memory folder rules (a regra da app, src/memoria/config.py)' {
  BeforeEach {
    $script:T = New-WsStateTable; $script:Cur = '10'; $script:Mode = 'install'
    $script:StepLog = [Text.StringBuilder]::new()
    $script:AmKeep = @{}
    foreach ($k in @('AGENT_MEMORY_HOME', 'MEMORIA_HOME', 'PYTHONHOME', 'PYTHONPATH', 'CLAUDE_CONFIG_DIR')) {
      $script:AmKeep[$k] = [Environment]::GetEnvironmentVariable($k)
      [Environment]::SetEnvironmentVariable($k, $null)
    }
    $env:CLAUDE_CONFIG_DIR = (Join-Path $TestDrive 'amcc')
    $script:AmHome = Join-Path $TestDrive ('amh-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $script:AmHome -Force | Out-Null
    $script:UserHome = $script:AmHome
  }
  AfterEach {
    foreach ($k in $script:AmKeep.Keys) { [Environment]::SetEnvironmentVariable($k, $script:AmKeep[$k]) }
  }

  It 'variaveis: AGENT_MEMORY_HOME, senao MEMORIA_HOME, sem espacos; ~ e relativo contam a partir do perfil' {
    $h = $script:AmHome
    Get-WsMemoryHome @{ AGENT_MEMORY_HOME = '/x/a'; MEMORIA_HOME = '/x/m' } $h | Should -Be '/x/a'
    Get-WsMemoryHome @{ MEMORIA_HOME = '/x/m' } $h | Should -Be '/x/m'
    Get-WsMemoryHome @{ AGENT_MEMORY_HOME = '  /x/a  ' } $h | Should -Be '/x/a'
    Get-WsMemoryHome @{ AGENT_MEMORY_HOME = '~' } $h | Should -Be $h
    Get-WsMemoryHome @{ AGENT_MEMORY_HOME = '~/notas' } $h | Should -Be (Join-Path $h 'notas')
    Get-WsMemoryHome @{ AGENT_MEMORY_HOME = '~\notas' } $h | Should -Be (Join-Path $h 'notas')
    Get-WsMemoryHome @{ MEMORIA_HOME = ' rel ' } $h | Should -Be (Join-Path $h 'rel')
    Get-WsMemoryHome @{ AGENT_MEMORY_HOME = '   '; MEMORIA_HOME = '/x/m' } $h | Should -Be (Join-Path $h '.agent-memory') -Because 'como a app: so espacos = pasta por omissao'
  }

  It 'pasta por omissao: ~\.memoria enquanto ~\.agent-memory nao tiver notas; ~\.agent-memory com notas ganha' {
    $h = $script:AmHome
    $new = Join-Path $h '.agent-memory'; $old = Join-Path $h '.memoria'
    Get-WsMemoryHome @{} $h | Should -Be $new
    Set-Content -LiteralPath $old -Value 'x'
    Get-WsMemoryHome @{} $h | Should -Be $new -Because 'um ficheiro ~\.memoria nao conta'
    Remove-Item -LiteralPath $old -Force
    New-Item -ItemType Directory -Path $old -Force | Out-Null
    Get-WsMemoryHome @{} $h | Should -Be $old
    New-Item -ItemType Directory -Path (Join-Path $new '.index') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $new 'config.json') -Value '{}'
    Set-Content -LiteralPath (Join-Path $new '.index/n.md') -Value 'x'
    Get-WsMemoryHome @{} $h | Should -Be $new -Because 'as duas sem notas'
    New-Item -ItemType Directory -Path (Join-Path $old 'proj') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $old 'proj/2026-01-01-a.md') -Value 'x'
    Get-WsMemoryHome @{} $h | Should -Be $old -Because 'so config.json e .index nao escondem as notas antigas'
    New-Item -ItemType Directory -Path (Join-Path $new 'proj') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $new 'proj/2026-01-02-b.md') -Value 'x'
    Get-WsMemoryHome @{} $h | Should -Be $new
  }

  It 'link partido: ~\.memoria continua a ser a pasta e o config.json nunca cria nada atras dele' {
    if (-not (Test-Path -LiteralPath '/bin/sh')) { Set-ItResult -Skipped -Because 'so em macOS/Linux (links simbolicos sem admin)'; return }
    $h = $script:AmHome
    $new = Join-Path $h '.agent-memory'; $old = Join-Path $h '.memoria'; $cloud = Join-Path $TestDrive 'amcloud/memoria'
    New-Item -ItemType SymbolicLink -Path $old -Target $cloud | Out-Null
    Get-WsMemoryHome @{} $h | Should -Be $old
    New-Item -ItemType Directory -Path $new -Force | Out-Null
    Get-WsMemoryHome @{} $h | Should -Be $old -Because '~\.agent-memory sem notas'
    $script:C = @{ MEMORY_APP_REPO_URL = 'https://h/o/app'; RELEASE_DOWNLOAD_URL = 'https://h/{file}'; PYTHON_VERSION = '3.12.13' }; $script:UvExe = $null
    Mock Get-WsMemoryHome { return $old }
    Write-WsMemoryConfig | Should -BeFalse
    $script:StepLog.ToString() | Should -Match '^config\.json: .+ is a link that does not lead to a folder'
    Test-Path -LiteralPath (Join-Path $TestDrive 'amcloud') | Should -BeFalse
  }

  It 'selftest: [WARN] de memorias que nao aparecem (codigo 0) = E-MEM-11; o [WARN] nao e o motivo de uma falha' {
    $script:AmOut = "Agent Memory 0.5.1 . Python 3.12.13`n  [OK] SQLite 3.50 with FTS5`n  [OK] Memory folder: C:\u\.agent-memory`n  [WARN] C:\u\.memoria (~/.memoria) has 3 memories that are not shown (the folder in use is the one above). Move them there.`n"
    $script:AmRc = 0
    Mock Invoke-WsProcess { return @{ ExitCode = $script:AmRc; StdOut = $script:AmOut; StdErr = '' } }
    Invoke-WsMemorySelftest 'agent-memory.exe' '0.5.1' | Should -BeTrue
    $script:T['10'].Avisos[0] -join '|' | Should -BeExactly 'E-MEM-11|C:\u\.memoria (~/.memoria) has 3 memories that are not shown'
    $script:T = New-WsStateTable
    $script:AmOut = "  [OK] x`n  [WARN] Something else`n"
    Invoke-WsMemorySelftest 'agent-memory.exe' '0.5.1' | Should -BeTrue
    @($script:T['10'].Avisos).Count | Should -Be 0
    $script:T = New-WsStateTable
    $script:AmOut = "  [OK] x`n  [WARN] C:\u\.memoria (~/.memoria) has 3 memories that are not shown`n  [FAIL] FTS5 is not available`n"; $script:AmRc = 1
    Mock Get-WsMemoryHome { return (Join-Path $TestDrive 'amself') }
    Invoke-WsMemorySelftest 'agent-memory.exe' '0.5.1' | Should -BeFalse
    $script:T['10'].Avisos[0] -join '|' | Should -BeExactly 'E-MEM-05|FTS5 is not available'
  }

  It 'atalho do menu Iniciar: a variavel so nesta janela (nao no HKCU\Environment) = E-MEM-12' {
    $h = $script:AmHome
    $script:AmUser = @{}
    Mock Get-WsNewWindowEnv { return [string]$script:AmUser[$Name] }
    Test-WsMemoryHomeNewWindow
    @($script:T['10'].Avisos).Count | Should -Be 0 -Because 'sem variavel nao ha nada a avisar'
    $env:AGENT_MEMORY_HOME = (Join-Path $h 'dados')
    Test-WsMemoryHomeNewWindow
    $script:T['10'].Avisos[0][0] | Should -Be 'E-MEM-12'
    ($script:T['10'].Avisos[0][1] -replace '/', '\') | Should -BeExactly '~\dados - new window: ~\.agent-memory'
    $script:T = New-WsStateTable
    $script:AmUser = @{ AGENT_MEMORY_HOME = ((Join-Path $h 'dados') + '\') }
    Test-WsMemoryHomeNewWindow
    @($script:T['10'].Avisos).Count | Should -Be 0 -Because 'o mesmo valor nas variaveis do Utilizador'
    $script:AmUser = @{ MEMORIA_HOME = '~/dados' }
    Test-WsMemoryHomeNewWindow
    @($script:T['10'].Avisos).Count | Should -Be 0 -Because 'a mesma pasta pelo nome antigo'
    $env:AGENT_MEMORY_HOME = $null; $env:MEMORIA_HOME = '/outra'
    Test-WsMemoryHomeNewWindow
    $script:T['10'].Avisos[0][0] | Should -Be 'E-MEM-12'
  }

  It 'os codigos novos existem nos dois catalogos' {
    $pt = [IO.File]::ReadAllText((Join-Path $script:Root 'setup/messages.pt.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
    foreach ($c in @('E-MEM-11', 'E-MEM-12')) {
      $script:Msgs.erros.$c.titulo | Should -Not -BeNullOrEmpty -Because $c
      $pt.erros.$c.titulo | Should -Not -BeNullOrEmpty -Because $c
    }
  }
}
