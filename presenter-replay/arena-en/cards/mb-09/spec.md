# Card mb-09 — Managing the company's phones

- **Category:** mobile
- **Difficulty:** 3
- **Template:** `answer` from `../../templates/answer.js`

## Concept

Mobile device management enforces security rules and lets the company wipe data remotely.

## Prompt (field `prompt`)

Which acronym names the system a company uses to require a screen lock on work phones and to wipe them remotely?

## Content

Field `placeholder`: `Acronym`

Field `accept`: `["MDM","mobile device management"]`

Example of a right answer: `MDM`

## Explanation (field `explanation`)

With MDM, the company requires a lock and encryption and can wipe only the work data if the phone is lost. On a personal phone, use a separate work profile.

## Done when

```
node --test cards/mb-09/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
