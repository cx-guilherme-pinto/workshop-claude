# Card mb-06 — You lost your phone

- **Category:** mobile
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Locking and wiping remotely protects the data on a lost phone.

## Prompt (field `prompt`)

You lost your phone with your work email on it. What do you do first?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Wait for someone to return it |
| b | Lock it remotely, wipe it if needed and tell the company |
| c | Post on social media that I lost it |
| d | Buy another one and forget about it |

Field `answer`: `"b"`

## Explanation (field `explanation`)

With the find-my-device feature, you can locate, lock and wipe the phone. Tell the company so it can end any open sessions.

## Done when

```
node --test cards/mb-06/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
