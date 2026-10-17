# Card sc-08 — The cloud root account

- **Category:** cloud-secrets
- **Difficulty:** 1
- **Template:** `answer` from `../../templates/answer.js`

## Concept

The main cloud account controls everything and needs the strongest protection.

## Prompt (field `prompt`)

Atlas Corp's cloud root account only has a password. What protection should you turn on right away?

## Content

Field `placeholder`: `Acronym`

Field `accept`: `["MFA","2FA","multi-factor authentication","multifactor authentication","two-factor authentication","two factor authentication","two factors"]`

Example of a right answer: `MFA`

## Explanation (field `explanation`)

Whoever gets into the root account can delete everything or create resources at your expense. Turn on MFA with a physical key and use accounts with fewer permissions day to day.

## Done when

```
node --test cards/sc-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
