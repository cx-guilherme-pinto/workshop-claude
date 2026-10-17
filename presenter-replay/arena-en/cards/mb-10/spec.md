# Card mb-10 — What shows on the lock screen

- **Category:** mobile
- **Difficulty:** 1
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Notifications on the lock screen can show codes to anyone who picks up the phone.

## Prompt (field `prompt`)

This is your phone's lock screen. Which notification should not appear like this?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "10:42 · Battery 80%",
  "Lumen Bank: your confirmation code is 482913",
  "Tom: I'll be there at 8",
  "Calendar: meeting at 3 pm"
]
```

Field `answer` (unsafe indexes): `[1]`

## Explanation (field `explanation`)

Anyone who picks up the phone can read the code without unlocking it. Set notifications to hide their content on the lock screen.

## Done when

```
node --test cards/mb-10/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
