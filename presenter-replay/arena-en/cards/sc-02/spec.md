# Card sc-02 — I deleted the key in the next commit

- **Category:** cloud-secrets
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

What goes into git stays in the history; an exposed key must be revoked.

## Prompt (field `prompt`)

You committed an API key and deleted it in the next commit. Is it fixed?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Yes, it's no longer in the code |
| b | No: it stays in the history; revoke the key and create a new one |
| c | Yes, if the repository is private |
| d | Just rename the variable |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Every clone or fork keeps the old commit, and bots scan public repositories for keys. Revoke the key right away and only then clean the history.

## Done when

```
node --test cards/sc-02/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
