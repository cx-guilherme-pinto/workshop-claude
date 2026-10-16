# Regras do PSScriptAnalyzer para os .ps1 do kit: as regras por defeito e as de compatibilidade com o
# Windows PowerShell 5.1 (Windows 10). Corre-se com:
#   docker run --rm --platform linux/amd64 -e DOTNET_EnableWriteXorExecute=0 -v "$PWD:/w" -w /w mcr.microsoft.com/powershell:latest \
#     pwsh -c "Install-Module PSScriptAnalyzer -Force -Scope CurrentUser; Invoke-ScriptAnalyzer -Path setup,tools -Recurse -Settings setup/test/pssa-settings.psd1"
@{
  IncludeDefaultRules = $true
  Severity            = @('Error', 'Warning', 'Information')
  ExcludeRules        = @(
    # O setup e uma ferramenta de consola interativa: escreve com cores para o terminal.
    'PSAvoidUsingWriteHost',
    # Funcoes internas (nao sao cmdlets publicos): sem -WhatIf/-Confirm.
    'PSUseShouldProcessForStateChangingFunctions',
    # Comandos sugeridos pelo ajudante Claude: so correm depois de a pessoa confirmar um a um.
    'PSAvoidUsingInvokeExpression',
    # Nomes no plural intencionais (Get-WsSecretLiterals, Get-WsUvPythonBlockers, ...).
    'PSUseSingularNouns',
    # Chamadas de melhor esforco (limpezas, sondas de rede/registo): a falha e tratada a seguir ou fica no log.
    'PSAvoidUsingEmptyCatchBlock',
    # Funcoes auxiliares internas chamadas com argumentos posicionais (nivel Information).
    'PSAvoidUsingPositionalParameters'
  )
  Rules               = @{
    PSUseCompatibleSyntax   = @{ Enable = $true; TargetVersions = @('5.1') }
    PSUseCompatibleCommands = @{
      Enable         = $true
      TargetProfiles = @(
        'win-48_x64_10.0.17763.0_5.1.17763.316_x64_4.0.30319.42000_framework',
        'win-8_x64_10.0.14393.0_5.1.14393.2791_x64_4.0.30319.42000_framework'
      )
    }
    PSUseCompatibleTypes    = @{
      Enable         = $true
      TargetProfiles = @(
        'win-48_x64_10.0.17763.0_5.1.17763.316_x64_4.0.30319.42000_framework',
        'win-8_x64_10.0.14393.0_5.1.14393.2791_x64_4.0.30319.42000_framework'
      )
    }
    PSUseCompatibleCmdlets  = @{ Compatibility = @('desktop-5.1.14393.206-windows') }
  }
}
