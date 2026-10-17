# Card web-06 — Where can scripts come from?

- **Category:** web
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

The Content-Security-Policy tells the browser which origins it may load scripts and other resources from.

## Prompt (field `prompt`)

Which HTTP header tells the browser where it may load scripts from, to stop XSS?

## Content

Field `placeholder`: `Header name`

Field `accept`: `["Content-Security-Policy","CSP","Content Security Policy"]`

Example of a right answer: `Content-Security-Policy`

## Explanation (field `explanation`)

With script-src 'self', an injected inline script or one from another origin does not run. It is a second barrier: keep handling user text safely.

## Done when

```
node --test cards/web-06/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
