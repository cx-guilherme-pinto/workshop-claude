# Card sc-01 — The key in the code

- **Category:** cloud-secrets
- **Difficulty:** 1
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Secrets written in the code end up in git and in every copy of the repository.

## Prompt (field `prompt`)

This configuration file is going into the repository. Which line exposes a secret?

## Content

Field `language`: `"js"`

Field `segments` (indexes start at 0):

```json
[
  "const config = {",
  "  port: process.env.PORT || 3000,",
  "  dbUrl: process.env.DATABASE_URL,",
  "  apiKey: 'atlas_prod_9f2c7e1b44d0',",
  "  region: 'eu-west-1',",
  "};"
]
```

Field `answer` (unsafe indexes): `[3]`

## Explanation (field `explanation`)

Anyone with access to the repository, or to an old copy of it, gets the key. Read it from an environment variable or a secrets vault, as in process.env.API_KEY.

## Done when

```
node --test cards/sc-01/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
