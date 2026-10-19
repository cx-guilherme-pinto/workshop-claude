# Testar na máquina da apresentação

[English](../TEST-MACHINE.md) · **Português**

Bateria completa de testes para correr no Mac que tem tudo: o Jira e o Confluence da empresa, o GitHub corporativo e a tua conta Claude. Mostra o que funciona e o que falta, e grava um relatório que podes trazer para rever.

O script é `tools/test-machine.sh` e só funciona em macOS.

## 1. Levar o kit para essa máquina

**Se essa máquina chega ao Gitea:** `git clone` dos dois repositórios, lado a lado na mesma pasta.

**Se não chega** (rede da empresa): nesta máquina, corre:

```bash
bash tools/pack-for-transfer.sh
```

O resultado é um zip, `dist/transfer/workshop-claude-package-<date>.zip`, com:
- `workshop-claude.bundle` e `claude-memory-app.bundle`: o histórico completo, todos os branches e todas as tags, mas só o que está commitado;
- `SHA256SUMS`;
- `README.md` (inglês) e `LEIA-ME.md` (português): os passos para verificar, clonar, testar e publicar no GitHub corporativo com o histórico (`git push --mirror`).

Antes de fechar o zip, o script clona cada bundle e confirma que tem o mesmo número de commits que o original. Copia o zip por AirDrop ou numa pen USB e, na outra máquina:

```bash
unzip workshop-claude-package-*.zip && cd workshop-claude-package-*
shasum -a 256 -c SHA256SUMS
git clone workshop-claude.bundle workshop-claude
git clone claude-memory-app.bundle claude-memory-app
```

## 2. O que preparar antes

- **Uma issue de teste do Jira** (`--jira ABC-123`). De preferência com um link para uma página do Confluence na descrição, para testar também a leitura das páginas. O script só a lê; só escreve com `--write` e depois do teu "sim".
- **O id de uma página do Confluence** (`--confluence 123456`): é o número no URL `…/wiki/spaces/<espaço>/pages/<id>/…`.
- **O GitHub corporativo** (`--github-host github.empresa.com` e `--github-repo equipa/workshop-claude`), quando o kit já lá estiver publicado. Se a empresa usa o github.com, não precisas de `--github-host`.
- **Logins feitos:** Claude Code, `gh` (no servidor da empresa), Jira no `/mcp` e `acli auth login`. Se ainda não instalaste nada, usa `--install`: o script corre o setup como um participante e pede os logins pelo caminho.

## 3. Correr

Abre o Terminal na pasta `workshop-claude`.

**Antes de publicar no GitHub corporativo** (testa o kit, o setup e as contas):

```bash
bash tools/test-machine.sh --install --jira ABC-123 --confluence 123456
```

**Depois de publicar** (testa também a release e o download que os participantes vão fazer):

```bash
bash tools/test-machine.sh --jira ABC-123 --confluence 123456 --github-host github.empresa.com --github-repo equipa/workshop-claude
```

**Completo**, com a sessão inteira do Projeto 1 e um comentário de teste no Jira:

```bash
bash tools/test-machine.sh --jira ABC-123 --confluence 123456 --github-host github.empresa.com --github-repo equipa/workshop-claude --arena --write
```

Para repetir só uma parte, usa `--only` com os números das fases, por exemplo `--only 3,4`. A ajuda completa está em `bash tools/test-machine.sh --help`.

## 4. O que cada fase faz

| Fase | O que testa | Escreve? | Custo | Tempo |
|---|---|---|---|---|
| 1. Kit | `tools/test-all.sh`, os testes do setup e os da app Agent Memory (se o clone estiver ao lado) | não | — | 3 a 5 min |
| 5. Release | A release no GitHub corporativo: os 6 ficheiros, os SHA-256, se o `repos.conf` da release aponta para lá, se o `curl \| bash` dos participantes funciona sem login e com token, e a release da app Agent Memory | não | — | 1 min |
| 2. Setup | `--install` corre o setup a sério; depois corre sempre o `--check`. Usa o script da release, se a fase 5 o descarregou | só com `--install` (no teu perfil, como um participante) | — | 3 a 15 min |
| 3. Contas | Login e um pedido de teste ao Claude; `gh` no servidor da empresa e a permissão no repositório; o MCP do Jira a responder; `acli` com login a ler a issue e a página (mede o tamanho em `storage` e `view`); app Agent Memory e o MCP dela | não | ~US$ 0,01 | 1 min |
| 4. Projeto 2 | `/task-intake <issue>` numa cópia do projeto de treino, primeiro pelo MCP e depois com o MCP desligado, para obrigar a usar o `acli`. Confirma o `.workshop/task.json` (`source`, `id`, `epic`, `via`) e a secção do Confluence | só na pasta do teste | ~US$ 0,15 a 0,30 | 2 a 4 min |
| 6. Arena | Só com `--arena`: a sessão completa do participante (o cartão próprio, `/demo-plan` → `/demo-swarm` → `--retry` dos 4 cartões partidos → `/demo-review` → `/demo-cost`) | só na pasta do teste | ~US$ 4,5 | ~15 min |
| 7. Escrita | Só com `--write`: publica 1 comentário de teste na issue com o `acli`, depois do teu "sim" | **sim**, 1 comentário | — | segundos |

A ordem real é 1, 5, 2, 3, 4, 6, 7, porque a fase 5 descarrega o setup que a fase 2 usa.

## 5. Publicar no GitHub corporativo

Segue o `docs/pt/PUBLISHING.md`. Em resumo, na máquina da empresa:

```bash
git remote add empresa https://github.empresa.com/equipa/workshop-claude.git
tools/switch-repos.sh --workshop-url https://github.empresa.com/equipa/workshop-claude.git --memory-url https://github.empresa.com/equipa/claude-memory-app.git --raw-pattern 'https://github.empresa.com/{owner}/{name}/raw/{version}/{path}' --release-pattern '{repo}/releases/download/{version}/{file}'
```

(Este padrão `raw` é o de um GitHub Enterprise com servidor próprio; no github.com usa o do `docs/pt/PUBLISHING.md`.)

- **Configurar:** no `repos.conf`, muda para `RELEASE_PROVIDER=github`. Num GitHub Enterprise com servidor próprio, muda também `GITHUB_API_URL=https://github.empresa.com/api/v3` e `GITHUB_UPLOADS_URL=https://github.empresa.com/api/uploads`.
- **Publicar:** commit, tag e `git push empresa main --tags`. Depois `tools/build-release.sh <versão>`, `tools/publish-release.sh <versão> --dry-run` e `tools/publish-release.sh <versão> --prerelease`. O token vem do `gh auth login` nesse servidor.
- **App Agent Memory:** faz o mesmo no repositório dela.
- **Confirmar:** volta a correr o teste com `--github-host` e `--github-repo`.

## 6. O relatório

O resultado fica em `~/workshop-test/<date>/report.md`: uma tabela com ✅ ⚠️ ❌ ⏭️ por verificação, o custo das chamadas ao Claude e o resumo do `setup --check`.

- **O que partilhar:** só o `report.md`. Não tem tokens nem o conteúdo das issues e páginas: só chaves, estados e tamanhos.
- **O que não partilhar:** a pasta `logs/` e as pastas `project2-*`. Têm as respostas completas do Jira e do Confluence (dados da empresa), mesmo depois de redigidas para tirar os tokens.
- **O script sai com o código 0** quando não há nenhum ❌.

**O que olhar primeiro** (os nomes das verificações no relatório estão em inglês):
- **Fase 5, "One-line install without login":** se o repositório for privado ou interno, os participantes não conseguem fazer `curl | bash` sem login. O aviso seguinte diz se o mesmo URL funciona com um token. Se nenhum funcionar, há que mudar a forma de distribuir o setup antes do workshop.
- **Fase 3, "GitHub server":** o setup só faz login em github.com. Se a empresa usa um servidor próprio, os participantes precisam do login nesse servidor.
- **Fase 3, "acli login":** "site admin must authorize" quer dizer que um administrador do Jira tem de aprovar a app ACLI uma vez (`E-ACLI-02`).
