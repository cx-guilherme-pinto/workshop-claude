# Canivete

Uma página com 30 pequenas ferramentas do dia a dia: contar palavras, dividir a conta, converter cores… É o Projeto 1 do workshop Claude Code: um swarm de agentes Claude escreve cada ferramenta, com o seu teste, e a pesquisa que as encontra.

## Correr

Precisas do Node 22 ou mais recente. Não há dependências para instalar.

```
node tools/gen.mjs        # gera as specs e os testes das ferramentas (tools/<id>/) a partir de specs/tools.json
node server.js            # mostra o endereço: normalmente http://localhost:3000 (se a porta estiver ocupada, usa a seguinte)
node server.js --port 4000
node --test               # todos os testes
```

O servidor só aceita ligações deste computador (127.0.0.1).

| Endereço | O que é |
|---|---|
| `/` | A casca: as ferramentas por categoria, a pesquisa e o botão "Correr testes" (corre os `tool.test.js` no browser) |
| `/#/tool/<id>` | Uma ferramenta: as entradas e o resultado ao vivo |
| `/status` | O estado do swarm ao vivo, um quadrado por tarefa (tema escuro, para o projetor) |
| `/status?replay=example` | Uma execução sintética, repetida sem chamar a API |

Uma ferramenta que ainda não existe aparece como "Por construir" (a cinzento) e fica pronta assim que um agente escreve o `tools/<id>/tool.js`, sem recarregar a página. Enquanto a pesquisa da onda 2 (`pages/catalog.js`) não passar no teste dela, a casca usa uma pesquisa simples, só no título.

## Onde está cada coisa

| Pasta ou ficheiro | Conteúdo |
|---|---|
| `specs/tools.json` | O catálogo: as categorias e as ferramentas. `node tools/gen.mjs` gera daqui as specs, os testes e o `TASKS.md` |
| `specs/my-tool.example.json` | O exemplo da tua ferramenta (ver "As tuas decisões") |
| `tools/<id>/` | `spec.md` e `tool.test.js` são gerados; o `tool.js` é escrito por um agente (ver `tools/CONTRACT.md`) |
| `templates/` | Os 4 modelos de ferramenta: `calc` (números → resultado), `convert` (nos dois sentidos), `text` (texto → texto) e `generate` (ao acaso, com seed) |
| `lib/` | Testes que correm no Node e no browser (`testkit.js`), verificações de segurança (`security.js`) e todos os textos (`texts.js`) |
| `pages/` | A pesquisa e as categorias (`catalog.js`, onda 2); o teste já vem pronto |
| `public/` | A casca: `app.js` (a grelha e a pesquisa), `tool-view.js` (o painel de uma ferramenta), `status.js` (`/status`), `styles.css` (tokens do `DESIGN.md`) e a fonte |
| `server.js` | O servidor, sem dependências e com CSP estrita. Só serve `public/`, `templates/`, `lib/`, `pages/`, `replays/` e, de `tools/`, só os `tool.js` e `tool.test.js` |
| `mcp-server.mjs` | O servidor MCP: cada `tools/<id>/tool.js` passa a ser uma ferramenta do Claude Code (`mcp__canivete__<id>`) |
| `test/app.test.js` | Testes de segurança da app: cabeçalhos, caminhos recusados, `/api/tools` e fonte sem padrões perigosos |
| `replays/` | Repetições para o `/status` (formato em `replays/README.md`) |
| `specs/tasks.json` e `specs/*.md` | As tarefas de suporte: `index-page`, `integration` e `review` |
| `tools/` | `gen.mjs` (e `my-tool.mjs`), `check-integration.mjs`, `review-digest.mjs` e `reset.mjs` |
| `DESIGN.md` | O sistema de design, numa página |

## O swarm

No Claude Code, dentro desta pasta:

1. `/demo-plan` gera o plano (`plan.json` e `PLAN.md`) e a estimativa de custo. Escolhe o paralelismo (`--parallel 4`, `8` ou `12`) e o modelo das ferramentas (`--model haiku` ou `sonnet`).
2. `/demo-swarm` corre as ondas:
   - onda 1: as ferramentas (e a tua);
   - onda 2: a pesquisa e as categorias (`pages/catalog.js`);
   - onda 3: a integração;
   - onda 4: a revisão.
3. `/demo-reset` volta ao início com `node tools/reset.mjs`. O histórico de cada execução fica em `.workshop/history/`.

Os resultados de cada tarefa ficam em `.workshop/status/` e os custos em `.workshop/usage.jsonl`. O `/status` lê os dois.

## As ferramentas no Claude Code

O `.mcp.json` regista o servidor `canivete` (`mcp-server.mjs`, sem dependências). Cada `tools/<id>/tool.js` válido é uma ferramenta do Claude Code com o nome `mcp__canivete__<id>` (por exemplo `mcp__canivete__my-01`); as entradas da ferramenta são os argumentos e a saída vem em JSON. O servidor volta a ler `tools/` de cada vez que o Claude pede a lista, por isso uma ferramenta aparece assim que fica verde (se não aparecer, `/mcp` e reconectar). O `.claude/settings.json` já aprova o servidor e permite as suas ferramentas: não há pedido de aprovação. Para o ver a trabalhar: «usa a minha ferramenta para …».

## As tuas decisões

- **A tua ferramenta.** Copia o exemplo e muda-o: título, conceito, `template` (`calc`, `convert`, `text` ou `generate`), entradas, saída, regras e exemplos (`category` é opcional; sem ela, `daily`).
  ```
  cp specs/my-tool.example.json specs/my-tool.json          # Windows: Copy-Item specs\my-tool.example.json specs\my-tool.json
  node tools/gen.mjs
  ```
  O `gen.mjs` diz que campo está mal e dá um exemplo. Gera a ferramenta `my-01`, que entra no plano, na casca e no `/status`. Sem `specs/my-tool.json` nada muda.
- **As ferramentas partidas de propósito.** A `spec.md` de três ferramentas (`tx-02`, `nm-03` e `dn-01`) deixa de fora a regra que decide alguns casos, por isso o agente adivinha, e o teste só guarda um hash curto do resultado certo. Quando uma ficar vermelha, a mensagem do teste diz o que a ferramenta devolveu e o que a spec não decide, nunca o valor certo. Decide-o tu, a partir do conceito, escreve a regra em `tools/<id>/spec.md` (nenhum agente pode mudar uma spec) e corre só essa outra vez: `/demo-swarm --retry <id>`.
