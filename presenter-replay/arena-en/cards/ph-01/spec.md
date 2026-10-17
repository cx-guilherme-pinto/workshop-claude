# Card ph-01 — Which is the real site?

- **Category:** phishing
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Look-alike domains swap a letter or add a hyphen to fool people who read quickly.

## Prompt (field `prompt`)

Lumen Bank uses the domain lumenbank.example. Which of these links really goes to the bank?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | https://bancoIuz.example/login |
| b | https://lumen-bank.example/login |
| c | https://lumenbank.example/login |
| d | https://bancolux.example/login |

Field `answer`: `"c"`

## Explanation (field `explanation`)

In a there is a capital I instead of the l, in b an extra hyphen and in d an x at the end. Read the domain letter by letter or, better, use a saved bookmark.

## Done when

```
node --test cards/ph-01/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
