# Card pw-07 — How credential stuffing works

- **Category:** passwords
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

Credential stuffing: email and password pairs stolen from one site are tried on many others.

## Prompt (field `prompt`)

Order the stages of this attack, from first to last.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | They get into the accounts where the password was reused |
| b | Attackers try the pairs on shops, banks and email |
| c | A forum suffers a breach of emails and passwords |
| d | The list of pairs is sold or published |

Field `answer` (right order): `["c","d","b","a"]`

## Explanation (field `explanation`)

The attack only works where the password is reused. A different password on every site, plus MFA, stops it.

## Done when

```
node --test cards/pw-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
