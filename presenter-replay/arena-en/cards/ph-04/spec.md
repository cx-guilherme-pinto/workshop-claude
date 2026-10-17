# Card ph-04 — The name proves nothing

- **Category:** phishing
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

The sender name is free text; what counts is the domain after the @.

## Prompt (field `prompt`)

Lumen Bank only sends emails from @lumenbank.example. Which senders are fake?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "Lumen Bank <alerts@lumenbank.example>",
  "Lumen Bank <statements@lumenbank.example>",
  "Lumen Bank <security@lumenbank-example.test>",
  "Lumen Bank <help@lumenbank.example>",
  "Lumen Bank <lumenbank.example@free-mail.test>"
]
```

Field `answer` (unsafe indexes): `[2,4]`

## Explanation (field `explanation`)

Anyone can put 'Lumen Bank' as the name. Look at what comes after the @: only lumenbank.example belongs to the bank.

## Done when

```
node --test cards/ph-04/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
