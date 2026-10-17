# Card es-02 — Do you hold the door?

- **Category:** social-engineering
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Tailgating: getting into a secure area by following closely behind someone who has access.

## Prompt (field `prompt`)

At the office door, someone carrying a heavy box asks you to hold the door. They have no badge in sight. What do you do?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Hold the door, it's polite |
| b | Offer to help and walk them to reception to sign in |
| c | Lend them my badge |
| d | Let them in and report it later |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Being friendly does not mean opening the door. Send anyone without a badge to reception.

## Done when

```
node --test cards/es-02/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
