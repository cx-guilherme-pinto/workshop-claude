# Card rd-07 — DNS that nobody can read

- **Category:** networks
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

Traditional DNS travels unencrypted; DoH hides the names you look up.

## Prompt (field `prompt`)

Which acronym stands for DNS encrypted inside HTTPS?

## Content

Field `placeholder`: `Acronym`

Field `accept`: `["DoH","DNS over HTTPS"]`

Example of a right answer: `DoH`

## Explanation (field `explanation`)

Without encryption, anyone on the network can see and fake the names you ask for. Turn on encrypted DNS (DoH or DoT) in your browser or your system.

## Done when

```
node --test cards/rd-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
