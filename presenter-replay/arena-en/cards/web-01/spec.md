# Card web-01 — Find the SQL injection

- **Category:** web
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Gluing user text into an SQL query lets the attacker rewrite the query.

## Prompt (field `prompt`)

This login code goes to production tomorrow. Which line allows SQL injection?

## Content

Field `language`: `"js"`

Field `segments` (indexes start at 0):

```json
[
  "const email = req.body.email;",
  "const pass = req.body.password;",
  "const sql = \"SELECT * FROM users WHERE email = '\" + email + \"'\";",
  "const user = await db.query(sql);",
  "if (!user || !(await verify(pass, user.hash))) return res.status(401).end();"
]
```

Field `answer` (unsafe indexes): `[2]`

## Explanation (field `explanation`)

By pasting the email into the SQL, the attacker can close the quote and add ' OR '1'='1. Use parameterized queries: db.query('… WHERE email = ?', [email]).

## Done when

```
node --test cards/web-01/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
