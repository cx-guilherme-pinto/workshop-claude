# Card sc-09 — The secret in the image

- **Category:** cloud-secrets
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

A secret written in the Dockerfile is baked into the image, within reach of anyone who downloads it.

## Prompt (field `prompt`)

This image is going to a shared registry. Which line leaves a secret in it?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

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

Field `answer` (unsafe indexes): `[5]`

## Explanation (field `explanation`)

Anyone with the image can see the value with docker history or docker inspect. Pass the secret only when the container starts, from a secrets vault.

## Done when

```
node --test cards/sc-09/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
