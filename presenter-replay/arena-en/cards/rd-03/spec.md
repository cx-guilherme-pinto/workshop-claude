# Card rd-03 — Always HTTPS

- **Category:** networks
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

HSTS forces the browser to use HTTPS on a site, even if someone types http://.

## Prompt (field `prompt`)

Which mechanism tells the browser to always use HTTPS on a site, even if you type http:// in the address bar?

## Content

Field `placeholder`: `Acronym or header name`

Field `accept`: `["HSTS","Strict-Transport-Security","HTTP Strict Transport Security"]`

Example of a right answer: `HSTS`

## Explanation (field `explanation`)

Without HSTS, the first request over http:// can be intercepted on a hostile network. Send Strict-Transport-Security with a long max-age on every HTTPS response.

## Done when

```
node --test cards/rd-03/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
