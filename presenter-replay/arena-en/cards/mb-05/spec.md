# Card mb-05 — How a phone number gets stolen

- **Category:** mobile
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

SIM swap: the attacker convinces the carrier to move your number to their own SIM card.

## Prompt (field `prompt`)

Order the stages of a SIM swap attack, from first to last.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | The carrier activates the number on a new SIM |
| b | Calls the carrier pretending to be the victim |
| c | The attacker receives the victim's SMS codes |
| d | Gathers the victim's personal data |

Field `answer` (right order): `["d","b","a","c"]`

## Explanation (field `explanation`)

After the swap, every SMS code goes to the attacker. Ask your carrier, like TelcoNet, for a PIN for account changes and use an authenticator app instead of SMS.

## Done when

```
node --test cards/mb-05/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
