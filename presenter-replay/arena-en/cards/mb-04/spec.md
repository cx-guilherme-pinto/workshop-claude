# Card mb-04 — The pending update

- **Category:** mobile
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Security updates fix flaws that attackers already know about.

## Prompt (field `prompt`)

Your phone has had a security update pending for three weeks. What do you do?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Wait for the next major version |
| b | Install it as soon as I can |
| c | Only update if I notice problems |
| d | Turn off updates |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Once the fix is out, the flaw becomes public and attacks increase. Turn on automatic updates and replace your phone when it stops getting them.

## Done when

```
node --test cards/mb-04/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
