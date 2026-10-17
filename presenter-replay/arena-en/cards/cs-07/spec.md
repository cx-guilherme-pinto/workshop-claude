# Card cs-07 — The error that says too much

- **Category:** secure-code
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Detailed error messages show the attacker how the application works inside.

## Prompt (field `prompt`)

This is the API's error handler. Which line reveals internal details to whoever made the request?

## Content

Field `language`: `"js"`

Field `segments` (indexes start at 0):

```json
[
  "app.use((err, req, res, next) => {",
  "  log.error(err);",
  "  res.status(500).send(err.stack);",
  "});"
]
```

Field `answer` (unsafe indexes): `[2]`

## Explanation (field `explanation`)

The stack trace shows paths, versions and parts of the code. Log the details on the server and return only a generic message with an error id.

## Done when

```
node --test cards/cs-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
