# Card sc-06 — The life of a secret

- **Category:** cloud-secrets
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

A secret has a life cycle: it is created in a vault, rotated regularly and revoked at the end.

## Prompt (field `prompt`)

Order the life cycle of an API key, from first step to last.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | Give access only to the service that uses it |
| b | Revoke the key when the service is shut down |
| c | Rotate the key regularly |
| d | Create the key in the secrets vault |

Field `answer` (right order): `["d","a","c","b"]`

## Explanation (field `explanation`)

Rotating limits how long a stolen key is useful, and revoking it at the end avoids forgotten keys. Automate rotation in the secrets vault.

## Done when

```
node --test cards/sc-06/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
