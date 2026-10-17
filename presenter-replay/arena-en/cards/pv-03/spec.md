# Card pv-03 — The 1-pixel image

- **Category:** privacy
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

A tracking pixel in an email tells the sender when and where you opened it.

## Prompt (field `prompt`)

A marketing email has an invisible 1×1 pixel image. What is it for?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Decoration |
| b | Finding out whether, when and where you opened the email |
| c | Making it load faster |
| d | Protecting against spam |

Field `answer`: `"b"`

## Explanation (field `explanation`)

When the image loads, your email program sends a request to the sender's server. Block remote images by default.

## Done when

```
node --test cards/pv-03/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
