# Card cs-05 — Fixing a vulnerable dependency

- **Category:** secure-code
- **Difficulty:** 2
- **Template:** `order` from `../../templates/order.js`

## Concept

A dependency with a known flaw is fixed by updating it, with tests before the deploy.

## Prompt (field `prompt`)

npm audit warns that a dependency has a known flaw. Order the steps to fix it.

## Content

Field `items` (already shuffled; keep this order):

| id | text |
| --- | --- |
| a | Update the version in package.json and in the lockfile |
| b | Run the tests |
| c | Read the advisory and find which version fixes the flaw |
| d | Deploy |

Field `answer` (right order): `["c","a","b","d"]`

## Explanation (field `explanation`)

A published flaw gets exploited fast, so updating is urgent, but the tests keep you from breaking the app. Automate the alerts with npm audit or a dependency bot.

## Done when

```
node --test cards/cs-05/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
