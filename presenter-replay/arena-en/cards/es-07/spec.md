# Card es-07 — The USB drive in the parking lot

- **Category:** social-engineering
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Baiting: leaving a tempting object, like a USB drive, and waiting for someone to use it.

## Prompt (field `prompt`)

You find a USB drive in the company parking lot labeled 'Salaries 2026'. What do you do?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Plug it into my laptop to see whose it is |
| b | Hand it to the security team without plugging it in |
| c | Plug it into a computer at reception |
| d | Format it and keep it |

Field `answer`: `"b"`

## Explanation (field `explanation`)

A USB drive can run code as soon as it is plugged in, or pretend to be a keyboard. Hand it in without plugging it into anything.

## Done when

```
node --test cards/es-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
