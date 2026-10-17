# Card pw-03 — One password, thousands of accounts

- **Category:** passwords
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Password spraying: trying one common password on many accounts avoids the lockout after failed attempts.

## Prompt (field `prompt`)

An attacker tries 'Summer2026!' just once on each of Atlas Corp's 5,000 accounts. What is this attack called?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Brute force on a single account |
| b | Password spraying |
| c | Keylogger |
| d | SIM swap |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Because each account fails only once, the lockout never triggers. Reject common passwords at sign-up and require MFA.

## Done when

```
node --test cards/pw-03/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
