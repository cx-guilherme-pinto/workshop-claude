# Card pv-08 — The boarding pass photo

- **Category:** privacy
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

The barcode on a boarding pass contains your name and booking reference.

## Prompt (field `prompt`)

Which of these posts helps a scammer the most?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Photo of the sunset on the beach |
| b | Photo of your boarding pass with the barcode visible |
| c | Review of a movie |
| d | Photo of your cat |

Field `answer`: `"b"`

## Explanation (field `explanation`)

With your name and booking reference, someone can change or cancel your flight. Post after the trip and never show codes or documents.

## Done when

```
node --test cards/pv-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
