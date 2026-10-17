# Card sc-04 — From minimal access to full access

- **Category:** cloud-secrets
- **Difficulty:** 1
- **Template:** `order` from `../../templates/order.js`

## Concept

Least privilege: each account or service gets only the access it needs.

## Prompt (field `prompt`)

Order these permissions on a bucket, from most restricted to broadest.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | Administer the whole cloud account |
| b | Read and write the whole bucket |
| c | Read a single file |
| d | Read the whole bucket |

Field `answer` (right order): `["c","d","b","a"]`

## Explanation (field `explanation`)

If a service is compromised, the attacker gets only what that service could do. Start with minimal access and widen it only when needed.

## Done when

```
node --test cards/sc-04/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
