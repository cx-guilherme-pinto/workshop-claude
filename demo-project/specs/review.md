# Tarefa `review` — revisão de segurança e qualidade (gate final)

És o último passo do swarm. Um jogo de segurança com falhas de segurança seria o pior exemplo possível. Não corriges código: dás um veredito com problemas concretos.

## O que lês, e só isto

1. `.workshop/review-summary.md`, gerado por `tools/review-digest.mjs`. Traz três coisas:
   - a tabela das tarefas;
   - as verificações estáticas (CSP no servidor e padrões perigosos encontrados em `cards/`, `public/`, `pages/`, `templates/` e `lib/`);
   - a lista "Ficheiros a rever com atenção".
2. Os ficheiros dessa lista, e mais nenhum. Se o resumo apontar um padrão perigoso num ficheiro que não está na lista (um `card.js`, por exemplo), lê também esse.

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
  - serve só as pastas da lista (`public/`, `cards/`, `templates/`, `lib/`, `pages/`, `replays/`) e só extensões conhecidas;
  - `server.js`, `package.json` e `plan.json` nunca são servidos.
- `/api/replay/<name>` valida o nome com uma expressão regular antes de tocar no disco.
- Sem `eval`, sem `child_process`, sem leitura de `.env`. Um erro não devolve o stack trace ao browser.

### `public/app.js` (e os módulos que importa de `public/`, se estiverem na lista)
- **Dados no DOM:** só por `textContent`, `createTextNode`, `el()` ou `h()`. Nunca `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `srcdoc` nem `on…=`.
- Os ids que vêm do hash (`#/card/<id>`) são validados antes de entrarem num `import()` ou num URL. Os `href` são só internos.
- O `localStorage` e o `sessionStorage` estão dentro de `try/catch` e não guardam nada sensível.
- Sem `eval`, `Function` nem `setTimeout` com uma string.

### `pages/category.js` e `pages/score.js`
- Usam só `h()` de `../templates/common.js`, nunca `document` nem `window`, e nenhum HTML a partir de texto.
- As contas batem com a spec: pontos = `difficulty × 10` e só `correct === true` conta.

### `lib/hash.js`
- É um módulo puro: sem rede, sem `node:crypto`, sem `crypto.subtle` e sem estado global.

### `validate()` dos cartões
Revê-o só nos cartões apontados pelo resumo, ou nos que tenham o teste vermelho.
- Aceita só a resposta certa e compara de forma estrita (`===` ou `normalize()`).
- Rejeita `''`, `undefined` e tipos errados.
- Nunca lança exceções.

### Segredos, em todos os ficheiros lidos
Procura chaves e tokens no código: `sk-ant-`, `ghp_`, `AKIA`, `-----BEGIN` e `password =` com um valor literal.

## Gravidade

| `severity` | Quando |
|---|---|
| `high` | Explorável: XSS, path traversal, CSP em falta ou com `unsafe-*`, servidor aberto fora de 127.0.0.1, segredo no código. |
| `medium` | Uma defesa em falta mas sem exploração direta; um `validate()` que aceita respostas erradas; uma tarefa que falhou de vez (um problema por tarefa, até 3). |
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
  "summary": "O servidor e a app passam nos pontos críticos: CSP estrita, caminhos recusados e DOM só por textContent. Fica uma reserva: o cartão rd-01 falhou de vez e não entra no jogo.",
  "issues": [
    {
      "severity": "medium",
      "file": "cards/rd-01/card.js",
      "description": "A tarefa falhou de vez: o validate() aceita a opção errada \"a\".",
      "fix": "Comparar a resposta com o id da opção certa com ===, como em templates/choice.js."
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
