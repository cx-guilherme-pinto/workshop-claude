# Card ph-06 — Read the URL in the right order

- **Category:** phishing
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

The domain is what sits between :// and the first slash; it tells you who owns the site.

## Prompt (field `prompt`)

Order the parts of this URL, from left to right: https://lumenbank.example/login?ref=email

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | ?ref=email (parameters) |
| b | https:// (protocol) |
| c | lumenbank.example (domain) |
| d | /login (path) |

Field `answer` (right order): `["b","c","d","a"]`

## Explanation (field `explanation`)

Only the domain tells you who controls the site; the path and the parameters can contain any text, even 'lumenbank'. Find the domain before you trust a link.

## Done when

```
node --test cards/ph-06/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
