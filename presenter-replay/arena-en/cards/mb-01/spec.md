# Card mb-01 — From the weakest lock to the strongest

- **Category:** mobile
- **Difficulty:** 1
- **Template:** `order` from `../../templates/order.js`

## Concept

The more combinations a lock has, the longer it takes to guess.

## Prompt (field `prompt`)

Order these screen locks, from weakest to strongest.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | Long password with letters and numbers |
| b | No lock |
| c | 6-digit PIN |
| d | 4-digit PIN |

Field `answer` (right order): `["b","d","c","a"]`

## Explanation (field `explanation`)

A 4-digit PIN has 10,000 combinations and a 6-digit one has a million. Use at least 6 digits or a password, with biometrics on top.

## Done when

```
node --test cards/mb-01/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
