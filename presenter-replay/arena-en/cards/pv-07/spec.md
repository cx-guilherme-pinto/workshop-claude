# Card pv-07 — No cookies and they still recognize you

- **Category:** privacy
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Browser fingerprinting combines technical details that identify you without cookies.

## Prompt (field `prompt`)

You deleted all your cookies, but a site still recognizes you. How is that possible?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Browser fingerprinting: screen, fonts, version and other details |
| b | The site read your email |
| c | The Wi-Fi told the site |
| d | It was a coincidence |

Field `answer`: `"a"`

## Explanation (field `explanation`)

The combination of small browser details is almost unique. Use a browser with fingerprinting protection and few extensions.

## Done when

```
node --test cards/pv-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
