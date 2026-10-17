# Cartão sc-01 — A chave no código

- **Categoria:** cloud-secrets
- **Dificuldade:** 1
- **Modelo:** `spotTheFlaw` de `../../templates/spot-the-flaw.js`

## Conceito

Segredos escritos no código acabam no git e em todas as cópias do repositório.

## Enunciado (campo `prompt`)

Este ficheiro de configuração vai para o repositório. Que linha expõe um segredo?

## Conteúdo

Campo `language`: `"js"`

Campo `segments` (índices a partir de 0):

```json
[
  "const config = {",
  "  porta: process.env.PORT || 3000,",
  "  dbUrl: process.env.DATABASE_URL,",
  "  apiKey: 'atlas_prod_9f2c7e1b44d0',",
  "  regiao: 'eu-west-1',",
  "};"
]
```

Campo `answer` (índices inseguros): `[3]`

## Explicação (campo `explanation`)

Quem tiver acesso ao repositório, ou a uma cópia antiga dele, fica com a chave. Lê-a de uma variável de ambiente ou de um cofre de segredos, como em process.env.API_KEY.

## Feito quando

```
node --test cards/sc-01/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
