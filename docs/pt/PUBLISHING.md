<!-- GERADO por tools/render.mjs a partir de tools/templates/pt/PUBLISHING.md.tmpl e do repos.conf. Não editar à mão: edita o template. -->

# Publicar nos repositórios públicos

[English](../PUBLISHING.md) · **Português**

Hoje o kit aponta para **https://github.com/cx-guilherme-pinto/workshop-claude** (app de memória: **https://github.com/cx-guilherme-pinto/claude-memory-app**). A troca faz-se num só ficheiro, `repos.conf`, e o resto é gerado.

## Checklist (5 passos)

1. **Atualizar o `repos.conf`.** Usa o script, que edita o ficheiro e volta a gerar a documentação:

   ```bash
   tools/switch-repos.sh --workshop-url https://github.com/<dono>/workshop-claude.git \
     --memory-url https://github.com/<dono>/claude-memory-app.git \
     --raw-pattern 'https://raw.githubusercontent.com/{owner}/{name}/{version}/{path}' \
     --release-pattern '{repo}/releases/download/{version}/{file}'
   ```

   No Windows: `tools/switch-repos.ps1 -WorkshopUrl … -MemoryUrl …`. Para criar as releases no GitHub, muda também `RELEASE_PROVIDER=github`.

2. **Gerar outra vez os slides e a documentação.** `node tools/render.mjs` (os READMEs de todas as línguas, `docs/pt/INSTALL.md`, `docs/pt/TROUBLESHOOTING.md`, este ficheiro e as versões em `docs/`, `docs/hi/` e `docs/he/`) e o build dos slides, que leem o `repos.conf` diretamente.

3. **Criar as releases públicas com as mesmas versões.** Kit `v1.0.0-rc.4` e app `v0.5.0`:

   ```bash
   tools/build-release.sh v1.0.0-rc.4
   tools/publish-release.sh v1.0.0-rc.4 --dry-run   # confirma o que vai ser enviado
   tools/publish-release.sh v1.0.0-rc.4
   ```

   A app de memória publica-se a partir do repositório dela, com a mesma versão.

4. **Correr o `--check` contra os URLs novos**, numa máquina limpa ou com `HOME` temporário:

   ```bash
   curl -fsSL https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.4/setup-mac.sh | bash -s -- --check
   ```

   No Windows: `$env:WORKSHOP_SETUP_ARGS='-Check'; irm https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.4/bootstrap-windows.ps1 | iex`.

5. **Procurar restos do servidor de desenvolvimento.** `node tools/check-repo.mjs` falha se `gitea.guilhermepinto.pt` aparecer fora do `repos.conf` e dos ficheiros gerados. Confirma também com `git grep -n gitea.guilhermepinto.pt`.

Valores atuais: release em https://github.com/cx-guilherme-pinto/workshop-claude/releases/tag/v1.0.0-rc.4, checksums em https://github.com/cx-guilherme-pinto/workshop-claude/releases/download/v1.0.0-rc.4/SHA256SUMS.
