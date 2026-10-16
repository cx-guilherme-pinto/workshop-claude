---
name: task-intake
description: Começa uma tarefa real do dia a dia. Lê a issue do Jira (MCP Atlassian, ou o Atlassian CLI se o MCP falhar), do GitHub (gh) ou de um ficheiro JSON local, extrai os critérios de aceitação e resume o repositório atual em .workshop/tarefa.md. Primeiro passo do Projeto 2; depois vem /task-plan.
argument-hint: "<ID Jira | URL | #N do GitHub | ficheiro.json>"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - Bash(node *)
  - Bash(gh issue view *)
  - Bash(gh repo view *)
  - Bash(git rev-parse *)
  - Bash(git log *)
  - Read
  - Glob
  - Write(.workshop/**)
  - mcp__atlassian__getAccessibleAtlassianResources
  - mcp__atlassian__getJiraIssue
  - mcp__atlassian__searchJiraIssuesUsingJql
  - Bash(acli auth status*)
  - Bash(acli jira auth status*)
  - Bash(acli jira workitem view *)
  - Bash(acli jira workitem search *)
  - mcp__memoria__memoria_procurar
---

# /task-intake — perceber a tarefa antes de planear

**Comandos:** corre cada comando exatamente como está escrito, sozinho. Não lhe juntes `;`, `&&`, `|`, `echo` nem `ls`, porque as permissões só aceitam o comando tal como está. Os scripts já mostram o resultado e o estado.

Argumento: `$ARGUMENTS`. Esta skill **só lê**: não escreve nada no Jira nem no GitHub.

1. **Preparar.** Corre `node "{{KIT_DIR}}/orquestrador/init-workshop.mjs"`. Se disser que não é um repositório git, para e explica que o Claude Code tem de ser aberto na raiz do projeto.
2. **Ler a tarefa**, conforme o argumento:
   - **Jira** (`ABC-123` ou um URL `…atlassian.net/browse/ABC-123`):
     1. chama `getAccessibleAtlassianResources` para obter o `cloudId`;
     2. chama `getJiraIssue` com o `cloudId` e a chave;
     3. guarda o resumo, a descrição, os critérios de aceitação (campo próprio, ou a secção da descrição), as subtarefas existentes (chaves e títulos), o estado, o URL, as etiquetas (labels) e o **épico**: a chave do `parent` quando é um Epic (ou o campo "Epic Link"). Se a própria issue for um Epic, o épico é ela.
     **Reserva: Atlassian CLI (`acli`).** Se as ferramentas `mcp__atlassian__*` não existirem, pedirem autenticação ou falharem (erro, 401/403, timeout), não insistas no MCP:
     1. corre `acli auth status`; se falhar, corre `acli jira auth status`;
     2. se os dois falharem (ou o `acli` não existir), para e diz: "O MCP do Jira não respondeu e o Atlassian CLI ainda não tem login. Escolhe um: `/mcp` → *atlassian* → login; ou, num terminal, `acli auth login`. Depois repete o `/task-intake`.";
     3. com login, corre `acli jira workitem view <CHAVE> --fields summary,description,status,issuetype,labels,parent,subtasks --json`. O épico é o `parent` quando o tipo dele é Epic. Se o `parent` for outra issue (uma história), corre `acli jira workitem view <CHAVE do parent> --fields issuetype,parent --json` e usa o `parent` dela. O URL é `https://<site>/browse/<CHAVE>`, com o site tirado do campo `self`;
     4. guarda os mesmos dados que o MCP daria (resumo, descrição, critérios, subtarefas, estado, URL, etiquetas e épico) e marca `"via":"acli"` no `tarefa.json`, para o `/task-report` usar logo o `acli`.
   - **GitHub** (URL de issue ou `#N`): `gh issue view <N ou URL> --json number,title,body,labels,milestone,comments,url`. O id da tarefa é `owner/repo#N`; o épico é o milestone, se existir. Se o `gh` não estiver autenticado, diz para correr `gh auth login --web` num terminal.
   - **Ficheiro `.json`** (por exemplo, o sandbox `exemplo-projeto-real/issues/EX-1.json`): lê-o diretamente. Tem os campos `id`, `titulo`, `descricao`, `criterios`, `url`, `epico` e `etiquetas`.
3. **Critérios de aceitação.** Lista-os como estão. Se não existirem, escreve 3 a 6 critérios testáveis a partir da descrição e marca cada um com "(inferido)".
4. **Repositório.** Corre `node "{{KIT_DIR}}/orquestrador/explorar.mjs"` e não explores mais. Se existir `CLAUDE.md` ou `AGENTS.md`, lê só as primeiras 80 linhas, para conhecer as convenções.
5. **Memória.** Se a ferramenta `memoria_procurar` existir, chama-a duas vezes:
   - com `projeto` (nome do repositório) e `texto` (título da tarefa);
   - se houver épico, com `epico: <chave do épico>`, para trazer as lições de outras tarefas do mesmo épico.
   Guarda até 5 lições relevantes.
6. **Escrever** `.workshop/tarefa.md`, com estas secções:
   - `## Fonte` (Jira, GitHub ou local; id; URL);
   - `## Título`;
   - `## Descrição` (resumida, até 1500 caracteres);
   - `## Critérios de aceitação`;
   - `## Subtarefas existentes` (só Jira);
   - `## Repositório` (a saída do explorar);
   - `## Convenções`;
   - `## Lições da memória`.
   Escreve também `.workshop/tarefa.json`: `{"fonte":"jira|github|local","id":"ABC-123 ou owner/repo#12","epico":"ABC-100 (se houver)","url":"…","titulo":"…","etiquetas":["…"],"cloudId":"…(jira)","subtarefas":["ABC-124",…],"via":"mcp|acli (só Jira)"}`.
7. **Mostrar** ao utilizador, em poucas linhas: o título, os critérios e o comando de teste provável. Termina com: "Próximo passo: `/task-plan`."
