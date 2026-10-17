# Card pw-08 — Your email showed up in a breach

- **Category:** passwords
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

When an account shows up in a breach, change the password on that site and everywhere it was reused.

## Prompt (field `prompt`)

A breach-checking service says your email appeared in a breach of an online shop. What do you do first?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Delete the email account and create a new one |
| b | Change the password for that shop and wherever I reused it |
| c | Nothing, the breach was months ago |
| d | Reply to the alert with my password to confirm |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Breach lists circulate for years, so the exposed password is no longer safe to use. Change it wherever it is reused and turn on MFA for those accounts.

## Done when

```
node --test cards/pw-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
