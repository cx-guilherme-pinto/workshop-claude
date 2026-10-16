# Relatório final — kit do workshop "Orquestração de Agentes com Claude"

[English](../REPORT.md) · **Português**

Data: 16 out. 2026. Releases de desenvolvimento no Gitea:
- `workshop-claude` **v1.0.0-dev.3** (prerelease): setup-mac.sh, bootstrap-windows.ps1, setup-windows.ps1, o kit em .tar.gz e .zip (0,9 MB) e SHA256SUMS;
- `claude-memory-app` **v0.4.0** (línguas pt, en, hi e he; registo das chamadas MCP): wheel, constraints.txt, instaladores, a app portátil (Mac arm64 e x86_64, Windows x64) e SHA256SUMS.

## O que foi feito

| Peça | Estado | Onde |
|---|---|---|
| Setup de um só comando, Mac e Windows | Instala e configura tudo a partir do zero, sem admin: git (portátil no Mac sem Command Line Tools), Claude Code, login Claude, Node, uv + Python, gh, login GitHub (obrigatório), MCP Jira e o Atlassian CLI como reserva, skills, agentes, hooks, statusline, projetos, app de memória e Desktop (opcional). Tem `--check`, `--doctor` (com o ajudante Claude), `--uninstall` e retoma | `setup/`, `installer/` |
| Línguas (D-20) | O setup fala só inglês (opções em inglês; as portuguesas continuam a funcionar) e grava a definição `language` do Claude Code com a língua da máquina, se não existir. Skills e agentes em inglês, que respondem na língua do participante. Arena, orquestrador e statusline em português ou inglês, conforme a máquina (`WORKSHOP_LANG` força). Docs em português e inglês | `setup/messages.en.json`, `docs/en/`, `README.en.md` |
| URLs num só ficheiro | `repos.conf`; README e docs gerados; `tools/switch-repos` e `docs/pt/PUBLISHING.md` para mudar para os repositórios públicos | `repos.conf`, `tools/` |
| Arena de Segurança (Projeto 1) | 100 cartões especificados em 10 categorias (15 no modo participante), 4 modelos, testes pré-escritos, servidor com CSP, galeria, `/estado` ao vivo e em replay, e soluções de referência fora do kit | `demo-project/`, `dev/solutions/` |
| Orquestrador determinístico | `next-wave` (ondas, dependências, sem ficheiros em comum no mesmo lote, tentativas com escalada para Sonnet), `grade`, `gate`, `digest`, `report`, `painel`, `validate-plan`, estimativa calibrada | `orquestrador/` |
| Medição de custo | Hooks `SubagentStop`/`Stop` que leem os tokens reais dos transcripts × `pricing.json`; statusline; aviso informativo aos US$ 5 e aos US$ 10 | `hooks/`, `statusline/`, `pricing.json` |
| Skills e agentes | Demo: `/demo-plan`, `/demo-swarm`, `/demo-review`, `/demo-cost`, `/demo-reset`, `/memoria`. Produção: `/task-intake`, `/task-plan`, `/task-swarm`, `/task-gate`, `/task-report`, `/memoria`. Agentes Opus, Sonnet e Haiku | `skills-*/`, `agents/` |
| Projeto de treino (Projeto 2 sem Jira) | Biblioteca Municipal com 3 issues locais, ligadas ao épico EX-100 | `exemplo-projeto-real/` |
| App Memória | Markdown + SQLite FTS5, grafo, pesquisa por nome, projeto, ticket e épico, servidor MCP, `memoria update`, e o mesmo visual da Arena | repo `claude-memory-app` |
| Skill de design | Fork MIT dentro do repo (commit `2b44c81`), sem o script de rede | `skills-shared/design-taste-frontend/` |
| Apresentação | 47 slides para 90 min, com notas, relógio acumulado, slides "Faça agora", o vídeo real dos 100 agentes e capturas | `slides/workshop.pptx`, `slides/speaker-notes.md` |
| Preview do swarm | Vídeo acelerado (92 s), GIF e a Arena gravada para replay sem API | `slides/media/`, `presenter-replay/` |
| Documentação | FAQ, TROUBLESHOOTING (catálogo de erros), INSTALAR, ORGANIZADOR, PUBLICAR, TESTES-MANUAIS, DECISIONS (D-01 a D-21); primeiro em inglês, as docs também em português, e o README e o guia de instalação em hindi e hebraico | `docs/`, `docs/pt/`, `docs/hi/`, `docs/he/`, `DECISIONS.md` |

## Custos medidos

Tokens reais × preços publicados (`pricing.json`). Detalhe em `benchmark/REPORT.md`.

| Execução | N | Sucesso | Custo médio (máx.) | Duração média (máx.) |
|---|---|---|---|---|
| Sessão completa do participante (`/demo-plan` → `/demo-cost`) | 10 | 10/10 | **US$ 1,03** (1,12) | **4,0 min** (4,8) |
| Modo apresentador, 100 cartões, 107 agentes | 3 | 3/3 | **US$ 2,54** (2,55) | **7,1 min** (7,9) |
| Projeto 2 no projeto de treino (EX-3) | 1 | 1/1 | US$ 0,60 | 3,9 min |
| Ajudante de erros e teste final (Haiku) | — | — | < US$ 0,01 | segundos |

- Critério de aceitação **cumprido com folga**: alvo de US$ 5 por participante e teto de US$ 10, sem nenhum corte.
- O total da sessão do participante, mesmo somando o Projeto 2, fica perto de US$ 2.
- **Atenção:** o `/usage` do Claude Code 2.1.285/2.1.292 mostra 2 a 4× mais, porque ainda não conhece o Haiku 5.5. O FAQ explica isto e a Console é a referência.

## Verificado

- Testes automáticos: hooks (9), orquestrador (6), Arena (665 com soluções), app da Arena (16), setup (80 bash, 32 Node, 41 Pester), memória (147).
- Lint: shellcheck limpo e PSScriptAnalyzer sem erros (regras de compatibilidade com PS 5.1). `check-repo` confirma que não há URLs fora do `repos.conf`, que os `.ps1` são ASCII e que não há chamadas a Python.
- Setup de ponta a ponta no Mac, em HOMEs vazios com acentos e espaços, a partir do comando de uma linha real no Gitea: instala tudo; idempotente; retoma; `--check`, `--desinstalar`.
- Mac sem Command Line Tools → git portátil. Sem Python no sistema → Python do uv. Sem Node → Node oficial. Downloads por `curl` → sem pedidos do Gatekeeper, mesmo com binários sem assinatura (D-17).

## Riscos em aberto

1. **Logins interativos** (Claude Console, GitHub e Atlassian CLI): o código está pronto e os comandos foram verificados, mas o fluxo no browser só se testa com uma pessoa a correr o setup. Checklist M5 a M7 em `docs/TESTES-MANUAIS.md`.
2. **Windows real nunca foi corrido**: só análise estática, Pester e PSScriptAnalyzer. É preciso correr W1 a W17 em Windows 10 e 11, numa conta sem admin.
3. **Contas Console novas (tier Evaluation)**: os limites de taxa não são públicos e pode haver 429 (lentidão, não falha). Mitigação: paralelismo 8, pré-trabalho uns dias antes, replay como plano B.
4. **Jira de cada empresa**: o administrador pode restringir o MCP da Atlassian; as chamadas gastam créditos Rovo. Reserva: o Atlassian CLI (`acli`), que lê a issue e publica os comentários quando o MCP falha (D-19). O admin tem de autorizar a app ACLI no site uma vez, e o `acli` não regista horas. Sem Jira: o projeto de treino.
5. **Redes corporativas**: interceção TLS tratada; proxies só NTLM não são suportados; EDR/AppLocker podem bloquear binários no perfil (D-17 tem o plano de assinatura).
6. **Benchmark sem isolamento total**: o token de benchmark ficou truncado ao colar. Os números de tokens e de custo não são afetados. Para repetir isolado: `claude setup-token` e guardar o token inteiro no Keychain (`workshop-benchmark-oauth`).
7. **Versão do Claude Code**: fixada em 2.1.292. Se mudar antes do workshop, repetir uma execução do benchmark.

## Próximos passos do organizador

1. Correr os testes manuais M5 a M7 (Mac) e W1 a W17 (Windows), e registar os resultados no `DECISIONS.md`.
2. Uma sessão interativa cronometrada do Projeto 1 numa conta Console nova.
3. Quando houver repositórios públicos: seguir o `docs/pt/PUBLISHING.md` (atualizar o `repos.conf`, regenerar, criar as releases e fazer `--check`).
