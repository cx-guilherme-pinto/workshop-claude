# Card pv-10 — Who sees your post?

- **Category:** privacy
- **Difficulty:** 1
- **Template:** `order` from `../../templates/order.js`

## Concept

Each sharing level widens who sees what you post; the most restricted is the most private.

## Prompt (field `prompt`)

Order the sharing options, from most private to most public.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | Friends |
| b | Only me |
| c | Public |
| d | Friends of friends |

Field `answer` (right order): `["b","a","d","c"]`

## Explanation (field `explanation`)

Friends of friends can be thousands of strangers. Choose Friends by default and review your old posts.

## Done when

```
node --test cards/pv-10/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
