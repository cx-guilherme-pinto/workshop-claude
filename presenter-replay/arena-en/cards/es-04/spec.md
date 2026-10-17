# Card es-04 — 15 approval requests

- **Category:** social-engineering
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

MFA fatigue: the attacker already has the password and sends requests until someone approves one.

## Prompt (field `prompt`)

Your phone shows 15 requests in a row to approve a login you did not make. What do you do?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Approve one to make them stop |
| b | Deny them all, change my password and tell the security team |
| c | Turn off my phone and wait |
| d | Uninstall the authenticator app |

Field `answer`: `"b"`

## Explanation (field `explanation`)

The requests show that someone already knows your password. Deny them, change it right away and ask for MFA with number matching or a physical key.

## Done when

```
node --test cards/es-04/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
