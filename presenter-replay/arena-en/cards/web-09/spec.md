# Card web-09 — The site inside an iframe

- **Category:** web
- **Difficulty:** 3
- **Template:** `answer` from `../../templates/answer.js`

## Concept

Clickjacking: another site loads yours in an invisible iframe and tricks the user into clicking.

## Prompt (field `prompt`)

Which classic header stops other sites from loading yours inside an iframe?

## Content

Field `placeholder`: `Header name`

Field `accept`: `["X-Frame-Options","frame-ancestors","Content-Security-Policy","CSP","CSP frame-ancestors"]`

Example of a right answer: `X-Frame-Options`

## Explanation (field `explanation`)

With X-Frame-Options: DENY or the CSP directive frame-ancestors 'none', the browser refuses to show the site in someone else's iframe. Turn one of them on for every page.

## Done when

```
node --test cards/web-09/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
