<!-- GERADO por tools/render.mjs a partir de tools/templates/pt/INSTALL.md.tmpl e do repos.conf. Não editar à mão: edita o template. -->

# Instalar o kit do workshop

[English](../INSTALL.md) · **Português** · [हिन्दी](../hi/INSTALL.md) · [עברית](../he/INSTALL.md)

Faz isto **antes** do workshop. Demora 10 a 20 minutos. Não precisas de admin.

## 1. Antes de começar

- Cria uma conta na [Console da Anthropic](https://platform.claude.com) e adiciona créditos em Billing. Recomendamos um limite de gasto bem acima de US$ 10: o workshop custa cerca de US$ 5.
- **Mac:** abre o Terminal e corre `xcode-select --install`. Carrega em «Instalar» e espera que termine (5 a 15 minutos). Se disser que já está instalado, ótimo.
- **Windows:** não precisas de preparar nada. Usa o PowerShell (de preferência no Windows Terminal).
- Se estiveres numa rede da empresa com proxy, o setup deteta-o. Se algo falhar na rede, experimenta o hotspot do telemóvel.

## 2. Correr o setup

**macOS** (Terminal):

```bash
curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/setup-mac.sh | bash
```

Alternativa: `bash <(curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/setup-mac.sh)`

**Windows** (PowerShell):

```powershell
irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/bootstrap-windows.ps1 | iex
```

Usa o Windows PowerShell, não o PowerShell ISE. Atrás de um proxy da empresa que responde `(407) Proxy Authentication Required`, usa antes este (envia o teu login do Windows ao proxy):

```powershell
[Net.WebRequest]::DefaultWebProxy.Credentials = [Net.CredentialCache]::DefaultNetworkCredentials; irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/bootstrap-windows.ps1 | iex
```

Se o PowerShell bloquear o comando acima, descarrega o [setup-windows.ps1](https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/setup-windows.ps1) e corre, na pasta onde o guardaste:

```powershell
Unblock-File .\setup-windows.ps1; powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-windows.ps1
```

O setup fala inglês, em todas as máquinas. Faz algumas perguntas (por exemplo, o login na Console, que abre o browser). Cada passo termina com um de quatro estados: ✅ Done (feito) · ⏭️ Already done (já estava feito) · ⚠️ Done with warning (feito com aviso) · ❌ Failed (falhou). Quando algo falha, o setup diz porquê e o que fazer, com o comando exato.

O setup também deteta a língua da máquina. Se ainda não tiveres a definição `language` do Claude Code, grava-a (português, inglês, hindi ou hebraico). As skills estão em inglês, mas respondem na tua língua. A Arena, o orquestrador e a statusline ficam em português numa máquina em português e em inglês nas restantes.

## 3. Confirmar

No fim aparece «Everything is ready for the workshop.» (está tudo pronto) ou a lista do que falta. Para verificar outra vez, sem instalar nada:

- macOS: `bash ~/.workshop-claude/setup-mac.sh --check`
- Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Check`

Depois, fecha e volta a abrir o terminal (e o VS Code).

## 4. Se algo falhar

- Volta a correr o mesmo comando: os passos feitos são saltados.
- Procura o código do erro em [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
- Diagnóstico com ajuda do Claude (custa menos de US$ 0,01): `bash ~/.workshop-claude/setup-mac.sh --doctor` ou `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Doctor`.
- Envia ao organizador o ficheiro `~/.workshop-claude/summary.txt`. O `setup.log` também ajuda e já vem sem segredos.

## Verificar antes de executar (opcional)

Os SHA-256 de todos os ficheiros da release estão em https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.1/SHA256SUMS. Página da release: https://github.com/cx-guilherme-pinto/workshop-claude/releases/tag/v1.0.0-rc.1.
