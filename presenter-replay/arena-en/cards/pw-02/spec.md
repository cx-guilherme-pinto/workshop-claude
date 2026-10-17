# Card pw-02 — From the strongest second factor to the weakest

- **Category:** passwords
- **Difficulty:** 1
- **Template:** `order` from `../../templates/order.js`

## Concept

Not every second factor protects you equally: the ones that resist phishing come out on top.

## Prompt (field `prompt`)

Order these ways of signing in to an account, from most secure to least secure.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | Code by SMS |
| b | Password only |
| c | Security key or passkey |
| d | Authenticator app (6-digit code) |

Field `answer` (right order): `["c","d","a","b"]`

## Explanation (field `explanation`)

Security keys and passkeys do not work on a fake site, so they resist phishing. SMS can be hijacked with a SIM swap, but it is still better than a password alone.

## Done when

```
node --test cards/pw-02/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
