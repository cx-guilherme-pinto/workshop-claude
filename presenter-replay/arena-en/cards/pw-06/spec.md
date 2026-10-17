# Card pw-06 — The password policy has bad rules

- **Category:** passwords
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Forced changes and password hints make passwords weaker, not stronger.

## Prompt (field `prompt`)

Atlas Corp published this policy. Which rules go against current best practice?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "At least 12 characters.",
  "Passwords must be changed every 30 days.",
  "Allow pasting the password into the login field.",
  "Reject passwords that appear in known breaches.",
  "Show a password hint on the login screen.",
  "MFA required on every account."
]
```

Field `answer` (unsafe indexes): `[1,4]`

## Explanation (field `explanation`)

People forced to change end up with Summer2025!, Summer2026!, and the hint mostly helps the attacker. Change a password only when there are signs of a breach, and allow pasting so password managers work.

## Done when

```
node --test cards/pw-06/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
