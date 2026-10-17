# Card es-08 — Tailor-made phishing

- **Category:** social-engineering
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

Spear phishing: phishing aimed at one person, with real details to look legitimate.

## Prompt (field `prompt`)

An email uses your name, your boss's name and the project you work on. What is this kind of targeted phishing called?

## Content

Field `placeholder`: `Name of the attack`

Field `accept`: `["spear phishing","spear-phishing","spearphishing"]`

Example of a right answer: `spear phishing`

## Explanation (field `explanation`)

The details come from social media and data breaches, so looking personal proves nothing. Confirm unusual requests through another channel.

## Done when

```
node --test cards/es-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
