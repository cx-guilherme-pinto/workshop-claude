# Card pw-09 — The security question

- **Category:** passwords
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

The true answers to security questions can often be found on social media.

## Prompt (field `prompt`)

A site asks for an answer to 'Name of your first pet'. What is the best option?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | The pet's real name |
| b | A made-up random answer, stored in the password manager |
| c | The pet's name with 123 at the end |
| d | The same answer I use on other sites |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Anyone who follows you on social media may know your pet's name. Treat the answer like a password: random and stored in the manager.

## Done when

```
node --test cards/pw-09/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
