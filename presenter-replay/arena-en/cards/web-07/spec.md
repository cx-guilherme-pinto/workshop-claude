# Card web-07 — A well-configured session cookie

- **Category:** web
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

A session cookie should have Secure, HttpOnly and SameSite.

## Prompt (field `prompt`)

Which of these headers creates a well-protected session cookie?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Set-Cookie: session=8f3a; Path=/ |
| b | Set-Cookie: session=8f3a; Secure; HttpOnly; SameSite=Lax; Path=/ |
| c | Set-Cookie: session=8f3a; HttpOnly |
| d | Set-Cookie: session=8f3a; Secure; SameSite=None |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Secure sends it only over HTTPS, HttpOnly hides it from JavaScript and SameSite=Lax does not send it with POSTs coming from other sites. Use all three on the session cookie.

## Done when

```
node --test cards/web-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
