# Card es-09 — The supplier changed banks

- **Category:** social-engineering
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Bank details fraud: an email asks you to pay into a new account and avoids any confirmation.

## Prompt (field `prompt`)

This email seems to come from a regular supplier. Which lines are signs of fraud?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "From: Atlas Supplies <accounts@atlas-supplies.test>",
  "Good morning, here is the October invoice.",
  "We've changed banks: please pay right away to the new IBAN attached.",
  "Don't call, the phone line is under maintenance.",
  "Kind regards, Finance Department"
]
```

Field `answer` (unsafe indexes): `[2,3]`

## Explanation (field `explanation`)

A change of bank account plus a request not to call is the pattern of this fraud. Always confirm by phone, using a number you already had.

## Done when

```
node --test cards/es-09/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
