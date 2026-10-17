# Card mb-08 — Charging at the airport

- **Category:** mobile
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

A public USB port can exchange data with your phone, not just power.

## Prompt (field `prompt`)

At the airport, you want to charge your phone. What is safest?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Use the USB port and accept 'Trust This Computer' |
| b | Use your own charger in a power outlet, or a USB data blocker |
| c | Use the USB port with Wi-Fi turned off |
| d | Use the USB port with the phone on silent |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Only power goes through a power outlet. If you use a USB port, never accept 'Trust This Computer'.

## Done when

```
node --test cards/mb-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
