# Card pv-06 — Asking a company for your data

- **Category:** privacy
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

The right of access lets you find out what data a company holds about you.

## Prompt (field `prompt`)

You want to know what data TelcoNet keeps about you. Order the steps.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | You receive a copy of the data, usually within a month |
| b | You find the contact for the data protection officer |
| c | You ask for anything wrong to be corrected |
| d | You send the access request in writing |

Field `answer` (right order): `["b","d","a","c"]`

## Explanation (field `explanation`)

The data protection officer's contact is in the privacy policy. The company usually has one month to reply, and you can ask for anything wrong to be corrected.

## Done when

```
node --test cards/pv-06/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
