# Card web-08 — A session from start to finish

- **Category:** web
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

The session id must be new after login and destroyed at logout.

## Prompt (field `prompt`)

Order the life cycle of a secure session, from first step to last.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | The browser sends the cookie with every request |
| b | The user logs in successfully |
| c | The server creates a new, random session id |
| d | At logout, the server deletes the session |

Field `answer` (right order): `["b","c","a","d"]`

## Explanation (field `explanation`)

Creating the id only after login stops an attacker from forcing an id they already know on you (session fixation). At logout, delete the session on the server, not just the cookie.

## Done when

```
node --test cards/web-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
