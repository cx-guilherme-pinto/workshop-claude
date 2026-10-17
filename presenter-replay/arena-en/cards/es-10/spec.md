# Card es-10 — The new number scam

- **Category:** social-engineering
- **Difficulty:** 1
- **Template:** `order` from `../../templates/order.js`

## Concept

The 'I changed my number' scam uses family trust to ask for money in a hurry.

## Prompt (field `prompt`)

Order the stages of this messaging scam, from first to last.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | Writes: 'Hi Mom, this is my new number' |
| b | Asks for money to pay an urgent bill |
| c | The victim sends the money without confirming by voice |
| d | Says the old phone broke and they can't call |

Field `answer` (right order): `["a","d","b","c"]`

## Explanation (field `explanation`)

The excuse for not being able to call is the key point. Call the old number or ask a question only the real person could answer.

## Done when

```
node --test cards/es-10/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
