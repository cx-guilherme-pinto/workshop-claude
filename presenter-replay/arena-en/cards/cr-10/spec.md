# Card cr-10 — Truly random numbers

- **Category:** cryptography
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Security tokens need a cryptographic random generator, not Math.random().

## Prompt (field `prompt`)

You are generating the token for a password reset link. Which do you use?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Math.random() |
| b | Date.now() |
| c | crypto.getRandomValues() |
| d | The user's email in Base64 |

Field `answer`: `"c"`

## Explanation (field `explanation`)

Math.random() and the time are predictable, and the email in Base64 can be guessed. Use crypto.getRandomValues() or crypto.randomBytes() with at least 128 bits.

## Done when

```
node --test cards/cr-10/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
