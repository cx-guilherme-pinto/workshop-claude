# Card pw-01 — Which password is strongest?

- **Category:** passwords
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Length and unpredictability matter more than swapping letters for symbols.

## Prompt (field `prompt`)

An attacker tries billions of combinations per second. Which of these holds out the longest?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | P@ssw0rd! |
| b | Liverpool2024 |
| c | horse-stapler-battery-cloud |
| d | Qw3rty!! |

Field `answer`: `"c"`

## Explanation (field `explanation`)

Four random words make a long, unpredictable phrase. Swapping a for @ does not help: those swaps are already in attackers' dictionaries.

## Done when

```
node --test cards/pw-01/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
