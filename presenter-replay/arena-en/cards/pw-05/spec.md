# Card pw-05 — The three types of factor

- **Category:** passwords
- **Difficulty:** 1
- **Template:** `answer` from `../../templates/answer.js`

## Concept

MFA combines factors of different types: something you know, something you have and something you are.

## Prompt (field `prompt`)

A password is something you know. A fingerprint is something you are. And a physical key or your phone is something you…?

## Content

Field `placeholder`: `One word`

Field `accept`: `["have","something you have","possess","something you possess","possession","own"]`

Example of a right answer: `have`

## Explanation (field `explanation`)

Combining different types of factor forces the attacker to steal two different things. Two passwords in a row are still just one type of factor.

## Done when

```
node --test cards/pw-05/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
