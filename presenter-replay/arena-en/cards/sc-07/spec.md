# Card sc-07 — The secret in the CI log

- **Category:** cloud-secrets
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Everything a pipeline prints ends up in the logs, which many people can read.

## Prompt (field `prompt`)

This CI pipeline runs on every push. Which step exposes a secret?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "steps:",
  "  - run: npm ci",
  "  - run: echo \"Using token $DEPLOY_TOKEN\"",
  "  - run: npm test",
  "  - run: ./deploy.sh"
]
```

Field `answer` (unsafe indexes): `[2]`

## Explanation (field `explanation`)

The echo writes the token to the logs, where it stays. Pass it as a CI secret to the tool that needs it and never print it.

## Done when

```
node --test cards/sc-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
