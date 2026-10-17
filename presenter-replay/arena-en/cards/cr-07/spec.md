# Card cr-07 — From the weakest key to the strongest

- **Category:** cryptography
- **Difficulty:** 1
- **Template:** `order` from `../../templates/order.js`

## Concept

Each extra bit in a key doubles the number of keys an attacker has to try.

## Prompt (field `prompt`)

Order these ciphers, from weakest key to strongest.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | DES (56 bits) |
| b | AES-128 |
| c | AES-256 |
| d | Caesar (25 keys) |

Field `answer` (right order): `["d","a","b","c"]`

## Explanation (field `explanation`)

Caesar and DES break by brute force; AES-128 is already out of reach and AES-256 gives extra margin. Use AES with 128-bit or 256-bit keys.

## Done when

```
node --test cards/cr-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
