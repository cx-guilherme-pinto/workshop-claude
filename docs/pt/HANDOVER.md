# Handover — kit do workshop

[English](../HANDOVER.md) · **Português**

Para a sessão do Claude que continua o trabalho na máquina da empresa, onde há Jira, Confluence e GitHub corporativo, mas não o Gitea de desenvolvimento. Escrito a 16 out. 2026, no fim da construção.

Lê também o `CLAUDE.md` (regras e comandos), o `DECISIONS.md` (D-01 a D-21: o que se decidiu e porquê) e o `docs/HANDOVER.md` da app Memória, no repositório `claude-memory-app`.

## De onde vem isto

O kit e a app foram construídos noutra máquina, contra um Gitea privado (`repos.conf` → `DEV_REPO_HOST`). Chegaram aqui num zip com dois git bundles: o histórico completo, todos os branches e todas as tags. Os branches `claude/*` são de sessões paralelas e já estão juntos no `main`; ficam só como histórico.

## Estado

| Peça | Estado | Validado como |
|---|---|---|
| Setup (Mac e Windows) | Completo. Instala tudo de raiz, sem admin, e fala inglês desde a D-20 | 115 testes bash, 44 Pester, PSScriptAnalyzer sem erros, ponta a ponta no Mac em HOMEs vazios. **O Windows real nunca foi corrido** |
| Projeto 1 (Arena) | 100 cartões; 15 no modo participante | Benchmark com as skills em pt (D-16): 10/10, US$ 1,03 de média e 4,0 min. Com as skills em inglês: 6/6, US$ 0,94 a 1,05 e 4,0 a 4,5 min (Arena em pt e em en; D-20). Apresentador: 3/3, US$ 2,54 e 7,1 min |
| Projeto 2 (`/task-*`) | Jira pelo MCP, com o `acli` de reserva (D-19); Confluence pelo MCP ou pelo `acli`; GitHub pelo `gh` | Ponta a ponta no projeto de treino (D-18). **Nunca correu num Jira, Confluence ou GitHub corporativo reais** |
| App Memória v0.4.0 | 4 línguas, registo das chamadas MCP, app portátil | 227 testes, selftest e instalação isolada |
| Slides | 45 slides, 90 min, em pt e en | Render no LibreOffice |
| Releases | `v1.0.0-dev.3` no Gitea | O `--check` a partir da release |

## O que falta (por ordem)

1. **Testar a máquina sem contas:** `bash tools/test-machine.sh --only 1`. A fase 1 (kit e app) tem de ficar toda verde. Já foi validada a partir de um clone do zip.
2. **Publicar no GitHub da empresa:** `bash tools/publish-to-github.sh --owner <org> [--host <host>] --dry-run`, e depois sem `--dry-run`. O script:
   - cria os repositórios (privados por defeito);
   - envia o histórico;
   - muda os URLs (kit: `tools/switch-repos.sh`; app: `scripts/mudar-alojamento.sh`);
   - publica a app (v0.4.1) e depois o kit (`v1.0.0-rc.1`);
   - corre a fase 5 do teste.
   Pede o "sim" antes de cada passo.
3. **Teste completo com contas reais:** `bash tools/test-machine.sh --install --jira <issue de teste> --confluence <id> --github-host <host> --github-repo <org>/workshop-claude`. Junta `--arena` (cerca de US$ 1) e `--write` (1 comentário de teste) quando quiseres. O organizador traz o `report.md`.
4. **Decisões que o relatório pode pedir:**
   - **Repositório privado ou interno.** Os participantes podem não conseguir fazer o `curl … | bash` sem login. A fase 5 testa sem login e com token. Se nenhum funcionar, a distribuição do setup tem de mudar. Por exemplo: o setup num sítio público, ou o `gh release download` depois de um `gh auth login`, mas o setup é que instala o `gh`, por isso é preciso desenhar a ordem.
   - **GitHub Enterprise Server.** O passo 6 do setup faz `gh auth login --hostname github.com`. Se a empresa usa outro servidor, falta uma chave no `repos.conf` (por exemplo, `GITHUB_HOST`) que o setup use no login e no `gh auth setup-git`. Hoje não existe.
   - **Jira.** Um administrador tem de autorizar o MCP da Atlassian (domínios e créditos Rovo) e a app ACLI no site (OAuth, uma vez). Ver `docs/pt/ORGANIZER.md` e `E-ACLI-02`.
5. **Windows real:** os testes W1 a W17 de `docs/pt/MANUAL-TESTS.md`, em Windows 10 e 11, numa conta sem admin.
6. **Uma sessão interativa cronometrada** do Projeto 1 numa conta Console nova (tier Evaluation; pode haver 429).
7. **Logins interativos:** M5 a M7 (Claude Console, GitHub e `acli`).

## Riscos conhecidos

- **Versões fixadas:**
  - Claude Code 2.1.292: se mudar antes do workshop, repete 1 benchmark;
  - `acli` 1.3.39: cada versão só tem suporte durante 6 meses, até mar. 2027;
  - Node 24.22.0, uv 0.13.1 e gh 2.102.0.
- **Custo:** o `/usage` do Claude Code mostra 2 a 4× mais, porque ainda não conhece o preço do Haiku 5.5. A referência é a Console (ver o FAQ).
- **Redes corporativas:** a interceção TLS está tratada; proxies só NTLM não são suportados; EDR ou AppLocker podem bloquear binários no perfil. O D-17 tem o plano de assinatura do Mac.

## Regras desta continuação

- **Escritas:** nada é escrito no Jira, no Confluence ou no GitHub sem o "sim" do organizador na conversa. O mesmo para push, releases e criação de repositórios.
- **Tokens:** não são mostrados, gravados nem passados na linha de comandos.
- **Dados da empresa:** não aparecem nos relatórios; issues e páginas só se mostram por chave, estado e tamanho.
- **Testes:** antes de qualquer push, `bash tools/test-all.sh` e `bash setup/test/test-mac.sh` verdes. Se mexeres no setup do Windows, também o Pester (comando no `CLAUDE.md`).
- **Decisões novas:** vão para o `DECISIONS.md` (D-21 em diante), com data e o que foi validado.
