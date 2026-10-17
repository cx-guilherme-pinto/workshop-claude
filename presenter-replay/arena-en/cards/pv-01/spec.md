# Card pv-01 — The curious calculator

- **Category:** privacy
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

An app should only have the permissions it needs to work.

## Prompt (field `prompt`)

A calculator app asks for access. Which permission makes sense to give it?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Contacts |
| b | Precise location |
| c | Microphone |
| d | None of these |

Field `answer`: `"d"`

## Explanation (field `explanation`)

A calculator does not need to know who you know or where you are. Refuse what makes no sense and review permissions in your settings.

## Done when

```
node --test cards/pv-01/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
