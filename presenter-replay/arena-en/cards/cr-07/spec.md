# Card cr-07 — Which generated password lasts longest?

- **Category:** cryptography
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

The strength of a randomly generated password is the number of possibilities of its generator.

## Prompt (field `prompt`)

A password manager generated these four passwords at random. The attacker knows how each one was generated and tries every possibility. Order them, from the one that falls fastest to the one that lasts longest.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | 4 random words from a list of 2,000, like cloud-stapler-horse-river |
| b | 12 random characters from the 94 on the keyboard, like q7#Vm2!xR9pL |
| c | 8 random digits, like 40718325 |
| d | 6 random lowercase letters, like kqzmwe |

Field `answer` (right order): `["c","d","a","b"]`

## Explanation (field `explanation`)

Count each generator's possibilities: the options for one symbol, multiplied once for every symbol. An attacker who knows the generator only tries those.

## Done when

```
node --test cards/cr-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
