# Card sc-08 — The production secret

- **Category:** cloud-secrets
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

Authorization: being signed in does not mean you may read every secret.

## Prompt (field `prompt`)

A signed-in developer asks Atlas Corp's secrets API for GET /secrets/prod-db-password, but has no permission for production secrets. Which HTTP status code should the API return?

## Content

Field `placeholder`: `3-digit HTTP code`

Field `accept`: `["404","404 Not Found","Not Found","HTTP 404"]`

Example of a right answer: `404`

## Explanation (field `explanation`)

A secret's name already says a lot (prod-db-password, stripe-live-key). If the API answers 'not allowed' differently from 'does not exist', anyone with an account can try names and find out which secrets exist. Log the attempt so the security team sees it.

## Done when

```
node --test cards/sc-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
