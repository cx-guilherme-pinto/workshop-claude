# Tarefa `review` — revisão de segurança e qualidade (gate final)

És o último passo do swarm. O Canivete corre no browser de cada participante e carrega código escrito por agentes: um servidor que deixa sair ficheiros, ou uma ferramenta que mexe no DOM, seria o pior exemplo possível. Não corriges código: dás um veredito com problemas concretos.

## O que lês, e só isto

1. `.workshop/review-summary.md`, gerado por `tools/review-digest.mjs`. Traz três coisas:
   - a tabela das tarefas;
   - as verificações estáticas: CSP no servidor, se liga só a `127.0.0.1`, quantas ferramentas têm `tool.js` e os padrões perigosos encontrados em `tools/*/tool.js`, `public/`, `pages/`, `templates/` e `lib/`;
   - a lista "Ficheiros a rever com atenção".
2. Os ficheiros dessa lista, e mais nenhum. Se o resumo apontar um padrão perigoso num ficheiro que não está na lista, lê também esse.

Não explores o resto do projeto. O orçamento é curto.

## Lista de verificação

### `server.js`
- Liga só a `127.0.0.1`.
- Todas as respostas levam a CSP sem `'unsafe-inline'` nem `'unsafe-eval'`, incluindo as de erro, de JSON e de SSE. A CSP esperada tem `default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'` e `require-trusted-types-for 'script'`.
- Também leva `X-Content-Type-Options: nosniff`, `Referrer-Policy` e `Cross-Origin-Opener-Policy`.
- **Path traversal:**
  - o caminho é descodificado antes de ser validado;
  - recusa segmentos começados por `.` (apanha `..`, `.workshop`, `.claude`, `.git`), `\`, NUL e `:`;
  - resolve dentro da pasta permitida e confirma com `realpath`, por causa das ligações simbólicas;
  - serve só `public/`, `templates/*.js`, `lib/*.js`, `pages/*.js`, `replays/<nome>/*.json(l)` e, de `tools/`, **só** `tools/<id>/tool.js` e `tools/<id>/tool.test.js`, e só extensões conhecidas;
  - `server.js`, `package.json`, `plan.json`, `specs/` (também `specs/my-tool.json`), `.workshop/` e o resto de `tools/` (`gen.mjs`, `workshop/`…) nunca são servidos.
- `/api/tools` só manda os campos que a casca usa (sem copiar o `specs/my-tool.json` tal como está) e `/api/replay/<nome>` valida o nome com uma expressão regular antes de tocar no disco.
- Sem `eval`, sem `child_process`, sem leitura de `.env`. Um erro não devolve o stack trace ao browser.

### A casca: `public/app.js`, `public/tool-view.js`, `public/finder.js`, `public/testrun.js`, `public/dom.js` e `public/status.js`
- **Dados no DOM:** só por `textContent`, `createTextNode` ou `el()` de `public/dom.js`. Nunca `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `srcdoc` nem `on…=`. O resultado de uma ferramenta e o texto que a pessoa escreve aparecem sempre como texto.
- Os ids que vêm do hash (`#/tool/<id>`) e de `/api/tools` são validados antes de entrarem num `import()` ou num URL. Os `href` são só internos.
- O `sessionStorage` está dentro de `try/catch` e não guarda nada sensível. O acaso da casca (`crypto.getRandomValues`) só serve para a seed do modelo `generate`.
- Sem `eval`, `Function` nem `setTimeout` com uma string.

### `pages/catalog.js`
- Módulo puro: sem `document`, `window`, `fetch`, armazenamento nem `import()`; imports só de `../lib/` e `../templates/`.
- Não muda as listas nem os objetos que recebe.
- Segue `specs/index-page.md`: a pesquisa não distingue maiúsculas nem acentos e procura no id, no título, no conceito e no nome da categoria; os grupos vêm pela ordem das categorias.

### `templates/common.js` e `templates/generate.js`
- `run()` devolve `{ error }` só para um `ToolError`; qualquer outra exceção não é escondida.
- O acaso do `generate` vem só da seed (sem `Math.random`).

### As ferramentas (`tools/<id>/tool.js`)
Revê só as que o resumo aponta (um padrão perigoso, ou uma tarefa que falhou de vez).
- Só calculam: sem DOM, sem rede, sem armazenamento, sem `eval`, sem `Function` e sem `Math.random`; imports só de `../../templates/` e `../../lib/`.
- Usam o modelo da spec e lançam `ToolError` com a mensagem da spec para as entradas que não aceitam.

### Segredos, em todos os ficheiros lidos
Procura chaves e tokens no código: `sk-ant-`, `ghp_`, `AKIA`, `-----BEGIN` e `password =` com um valor literal.

## Gravidade

| `severity` | Quando |
|---|---|
| `high` | Explorável: XSS, path traversal, um ficheiro fora da lista servido, CSP em falta ou com `unsafe-*`, servidor aberto fora de 127.0.0.1, segredo no código. |
| `medium` | Uma defesa em falta mas sem exploração direta; uma ferramenta que usa `Math.random` ou toca no DOM; uma tarefa que falhou de vez (um problema por tarefa, até 3). |
| `low` | Qualidade: texto fora do pt-PT, código morto, nomes confusos. |

## Veredito

- `rejected`: há pelo menos um problema `high`.
- `approved_with_reservations`: há problemas, mas nenhum `high`.
- `approved`: não há nenhum problema.

## Resultado: `.workshop/verdict.json`

JSON válido, sem comentários, exatamente com estes campos:

```json
{
  "verdict": "approved_with_reservations",
  "summary": "O servidor e a casca passam nos pontos críticos: CSP estrita, caminhos recusados e DOM só por textContent. Fica uma reserva: a ferramenta nm-03 falhou de vez e mostra-se como por construir.",
  "issues": [
    {
      "severity": "medium",
      "file": "tools/nm-03/tool.js",
      "description": "A tarefa falhou de vez: run() arredonda 1,005 com toFixed(2) e devolve 1 em vez de 1,01.",
      "fix": "Completar a regra em tools/nm-03/spec.md e correr /demo-swarm --retry nm-03."
    }
  ]
}
```

- **`summary`:** duas frases.
- **`issues`:** no máximo 8, do mais grave para o menos grave. Cada `description` tem até 200 caracteres e diz onde está o problema (função ou linha). Cada `fix` diz o que mudar e onde. Sem problemas, `issues` é `[]`.
- Mantém as chaves e os valores de `verdict` e `severity` exatamente como estão: o orquestrador lê-os.
- Texto em português de Portugal.
- Não alteres nenhum outro ficheiro.

No fim responde com UMA única linha: `OK review: <verdict>`.
