# Card sc-10 — How the app reaches the database

- **Category:** cloud-secrets
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Temporary credentials, given by the cloud to a service, avoid fixed keys that can leak.

## Prompt (field `prompt`)

A cloud app needs to read a database. Which credential is safest?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | A fixed access key in the code |
| b | A role with temporary credentials managed by the cloud |
| c | The admin password, shared by the team |
| d | A key in a file on the desktop |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Temporary credentials expire on their own and there is nothing fixed in the code to steal. Give the role only the read permissions the app needs.

## Done when

```
node --test cards/sc-10/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
