# Cartão sc-09 — O segredo na imagem

- **Categoria:** segredos-cloud
- **Dificuldade:** 2
- **Modelo:** `clicaErro` de `../../templates/clica-erro.js`

## Conceito

Um segredo escrito no Dockerfile fica gravado na imagem, ao alcance de quem a descarregar.

## Enunciado (campo `prompt`)

Esta imagem vai para um registo partilhado. Que linha deixa lá um segredo?

## Conteúdo

Campo `language`: `"texto"`

Campo `segments` (índices a partir de 0):

```json
[
  "FROM node:22-alpine",
  "WORKDIR /app",
  "COPY package*.json ./",
  "RUN npm ci --omit=dev",
  "COPY src ./src",
  "ENV DB_PASSWORD=atlas-2026-prod",
  "CMD [\"node\", \"src/server.js\"]"
]
```

Campo `answer` (índices inseguros): `[5]`

## Explicação (campo `explanation`)

Qualquer pessoa com a imagem vê o valor com docker history ou docker inspect. Passa o segredo só quando o contentor arranca, a partir de um cofre de segredos.

## Feito quando

```
node --test cards/sc-09/card.test.js
```

passa sem erros. Regras: `cards/CONTRACT.md`.
