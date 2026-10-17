# Card cs-04 — The calculator with eval

- **Category:** secure-code
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

eval() runs any text it receives as code.

## Prompt (field `prompt`)

A web calculator runs eval(input) on whatever the user types. Why is that dangerous?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | It is slow |
| b | It runs any code the user types |
| c | It does not accept decimal numbers |
| d | It does not work on phones |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Anyone who types code instead of a sum can run it. Use an expression parser that accepts only numbers and operators.

## Done when

```
node --test cards/cs-04/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
