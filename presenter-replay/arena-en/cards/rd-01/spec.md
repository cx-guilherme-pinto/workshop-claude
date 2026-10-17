# Card rd-01 — Two networks at the coffee shop

- **Category:** networks
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Anyone can create a Wi-Fi network named after a coffee shop (evil twin).

## Prompt (field `prompt`)

At the coffee shop you see the networks 'Cafe_Central' and 'Cafe_Central_Free'. What do you do?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Pick the free one, it's open |
| b | Ask at the counter which one is official and only use HTTPS sites |
| c | Pick the one with the strongest signal |
| d | It doesn't matter, Wi-Fi is always encrypted |

Field `answer`: `"b"`

## Explanation (field `explanation`)

A fake network can see and change any traffic that is not encrypted. Check the name with the staff, prefer HTTPS or mobile data and avoid sensitive tasks.

## Done when

```
node --test cards/rd-01/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
