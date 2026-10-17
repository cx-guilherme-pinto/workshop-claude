# Card pv-04 — Taking your data with you

- **Category:** privacy
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

The GDPR gives you the right to receive your data in a format another service can read.

## Prompt (field `prompt`)

Which GDPR right lets you take your data to another service, in a machine-readable format?

## Content

Field `placeholder`: `Name of the right`

Field `accept`: `["portability","data portability","right to portability","right to data portability","the right to data portability"]`

Example of a right answer: `portability`

## Explanation (field `explanation`)

The right to data portability (Article 20) applies to the data you provided. Ask the service for it and import it into the new one.

## Done when

```
node --test cards/pv-04/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
