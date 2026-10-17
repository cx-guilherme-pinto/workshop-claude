# Card cr-09 — The S in HTTPS

- **Category:** cryptography
- **Difficulty:** 1
- **Template:** `answer` from `../../templates/answer.js`

## Concept

HTTPS is HTTP inside TLS; the old SSL is no longer secure.

## Prompt (field `prompt`)

Which protocol encrypts the connection when you see https:// in the browser's address bar?

## Content

Field `placeholder`: `Acronym`

Field `accept`: `["TLS","Transport Layer Security","SSL/TLS"]`

Example of a right answer: `TLS`

## Explanation (field `explanation`)

SSL and the first versions of TLS have known flaws. Configure servers with TLS 1.2 and 1.3 only.

## Done when

```
node --test cards/cr-09/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
