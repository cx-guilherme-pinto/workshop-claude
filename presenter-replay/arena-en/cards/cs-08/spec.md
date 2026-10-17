# Card cs-08 — Unlimited attempts

- **Category:** secure-code
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Without a limit on attempts, the login is open to brute-force attacks.

## Prompt (field `prompt`)

The /login endpoint accepts unlimited requests. Which attack becomes easier?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Password brute force |
| b | XSS |
| c | Path traversal |
| d | None, the login is protected by the password |

Field `answer`: `"a"`

## Explanation (field `explanation`)

A bot can try thousands of passwords per minute. Limit attempts per account and per IP and add increasing delays.

## Done when

```
node --test cards/cs-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
