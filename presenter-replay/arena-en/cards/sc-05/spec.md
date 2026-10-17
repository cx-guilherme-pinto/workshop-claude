# Card sc-05 — The public bucket

- **Category:** cloud-secrets
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

A bucket with public read access can be reached by anyone on the internet.

## Prompt (field `prompt`)

The atlas-backups bucket has public read access turned on. Who can read the backups?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Only the Atlas Corp team |
| b | Anyone on the internet who knows or guesses the name |
| c | Nobody, buckets are always private |
| d | Only people with an account at the same provider |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Some people search for open buckets automatically, trying predictable names. Turn on public access blocking and grant access only to specific accounts.

## Done when

```
node --test cards/sc-05/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
