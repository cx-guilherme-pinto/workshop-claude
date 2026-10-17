# Card es-06 — The stages of a social engineering attack

- **Category:** social-engineering
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

A social engineering attack starts long before contact: with research on the target.

## Prompt (field `prompt`)

Order the stages of the attack, from first to last.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | Research the target on social media and the company website |
| b | Ask for the access, the data or the money |
| c | Leave without a trace |
| d | Build trust with a believable story |

Field `answer` (right order): `["a","d","b","c"]`

## Explanation (field `explanation`)

The more the attacker knows about you, the more believable the story. Share fewer work details in public.

## Done when

```
node --test cards/es-06/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
