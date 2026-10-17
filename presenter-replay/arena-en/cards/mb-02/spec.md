# Card mb-02 — The paid game for free

- **Category:** mobile
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Apps installed outside the official stores are the main way malware gets onto phones.

## Prompt (field `prompt`)

A friend sends you the APK of a paid game, 'for free'. What do you do?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Install it and turn on 'unknown sources' |
| b | Don't install it; use only the official store |
| c | Install it and then run an antivirus |
| d | Install it on an old phone |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Pirated apps often carry hidden malware. Install only from the official store and keep installing from unknown sources turned off.

## Done when

```
node --test cards/mb-02/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
