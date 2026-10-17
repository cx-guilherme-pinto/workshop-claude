# Card ph-05 — The QR code stuck on the parking meter

- **Category:** phishing
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Quishing: a fake QR code stuck over the real one leads to a fake payment site.

## Prompt (field `prompt`)

There is a sticker with a QR code to pay on the parking meter. The QR code opens parking-pay.test and asks for your card details. What do you do?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Pay, it's faster |
| b | Pay at the machine or in the official parking app |
| c | Scan the QR code with another app |
| d | Pay and keep the receipt |

Field `answer`: `"b"`

## Explanation (field `explanation`)

A QR code is just a link you cannot read before opening it. Be suspicious of stickers and pay through the official channels.

## Done when

```
node --test cards/ph-05/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
