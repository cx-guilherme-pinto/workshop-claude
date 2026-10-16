# Cartão sc-07 — O segredo no registo do CI

- **Categoria:** segredos-cloud
- **Dificuldade:** 2
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Tudo o que um pipeline escreve fica nos registos, que muita gente pode ler.

## Enunciado (campo `prompt`)

Este pipeline de CI corre em cada push. Que passo expõe um segredo?

## Conteúdo

Campo `language`: `"texto"`

Campo `segments` (índices a partir de 0):

```json
[
  "steps:",
  "  - run: npm ci",
  "  - run: echo \"A usar o token $DEPLOY_TOKEN\"",
  "  - run: npm test",
  "  - run: ./deploy.sh"
]
```

Campo `answer` (índices inseguros): `[2]`

## Explicação (campo `explanation`)

O echo escreve o token nos registos, onde fica guardado. Passa-o como segredo do CI à ferramenta que precisa dele e nunca o imprimas.

## Feito quando

```
node --test cards/sc-07/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
