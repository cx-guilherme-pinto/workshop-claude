# Card pv-05 — Too much data for a newsletter

- **Category:** privacy
- **Difficulty:** 1
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Data minimization: collect only the data you need for the stated purpose.

## Prompt (field `prompt`)

This form is only for signing up to the newsletter. Which fields ask for too much data?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "Email",
  "Name (optional)",
  "National ID card number",
  "Full date of birth",
  "I agree to receive the newsletter"
]
```

Field `answer` (unsafe indexes): `[2,3]`

## Explanation (field `explanation`)

To send a newsletter, the email is enough. Data you do not collect cannot be stolen in a breach.

## Done when

```
node --test cards/pv-05/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
