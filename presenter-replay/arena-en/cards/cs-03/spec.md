# Card cs-03 — The password in the log

- **Category:** secure-code
- **Difficulty:** 1
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Passwords and tokens must never go into the application logs.

## Prompt (field `prompt`)

This code logs every login. Which line puts secret data in the logs?

## Content

Field `language`: `"js"`

Field `segments` (indexes start at 0):

```json
[
  "logger.info('login', {",
  "  user: req.body.email,",
  "  password: req.body.password,",
  "  ip: req.ip,",
  "});"
]
```

Field `answer` (unsafe indexes): `[2]`

## Explanation (field `explanation`)

Logs are read by many people and tools and kept for months. Log the event and the user, never the password or the token.

## Done when

```
node --test cards/cs-03/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
