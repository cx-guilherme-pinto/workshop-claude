# Card pv-07 — No cookies and they still recognize you

- **Category:** privacy
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

A site can recognize you without cookies, through details that do not change when you delete them.

## Prompt (field `prompt`)

At home, you deleted all your cookies and opened the site in another browser, on the same laptop. The site still recognizes you. What is the most likely explanation?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Browser fingerprinting: version, extensions, settings and other browser details |
| b | The public IP address of your home connection |
| c | The site read your browser history |
| d | It was a coincidence |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Deleting cookies only clears what the browser stored. What the site sees from the outside depends on the browser you use and the network you connect from. For visits you do not want linked to each other, use a VPN or Tor.

## Done when

```
node --test cards/pv-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
