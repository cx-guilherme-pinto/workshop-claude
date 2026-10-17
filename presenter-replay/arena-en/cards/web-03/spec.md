# Card web-03 — The hidden form

- **Category:** web
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

CSRF: another site makes your browser send a request with your session, without you knowing.

## Prompt (field `prompt`)

You are logged in to Lumen Bank. A malicious site has a hidden form that sends a POST to lumenbank.example/transfer. What stops the attack?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | The bank's site using HTTPS |
| b | An anti-CSRF token in the form and SameSite cookies |
| c | A longer password |
| d | Hiding the form's URL |

Field `answer`: `"b"`

## Explanation (field `explanation`)

The malicious site does not know the form's secret token, and with SameSite the browser does not send the session cookie with that request. Use both.

## Done when

```
node --test cards/web-03/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
