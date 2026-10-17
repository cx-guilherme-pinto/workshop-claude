# Card cr-08 — Storing passwords: from worst to best

- **Category:** cryptography
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

Passwords are stored with a slow, salted hash, designed on purpose to be costly to test.

## Prompt (field `prompt`)

Order these ways of storing passwords, from worst to best.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | SHA-256 with salt |
| b | Plain text |
| c | Argon2id with salt |
| d | MD5 without salt |

Field `answer` (right order): `["b","d","a","c"]`

## Explanation (field `explanation`)

SHA-256 is too fast: a graphics card tries billions of guesses per second. Use Argon2id, scrypt or bcrypt, which are slow on purpose.

## Done when

```
node --test cards/cr-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
