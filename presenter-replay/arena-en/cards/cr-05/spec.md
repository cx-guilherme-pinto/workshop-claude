# Card cr-05 — Hash or encryption?

- **Category:** cryptography
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Encryption can be reversed with the key; a hash is one-way.

## Prompt (field `prompt`)

What is the difference between encrypting and computing a hash?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | They are the same thing with different names |
| b | Encryption can be reversed with the key; a hash cannot be reversed |
| c | A hash needs a secret key; encryption does not |
| d | A hash is always more secure than encryption |

Field `answer`: `"b"`

## Explanation (field `explanation`)

You encrypt what you will need to read again, like a file. For passwords you store a slow, salted hash, because you only need to compare.

## Done when

```
node --test cards/cr-05/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
