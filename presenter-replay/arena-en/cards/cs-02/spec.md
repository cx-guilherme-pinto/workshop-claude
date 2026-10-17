# Card cs-02 — Validating age

- **Category:** secure-code
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Validating against a list of what is allowed is safer than trying to block what is dangerous.

## Prompt (field `prompt`)

A form asks for your age. What is the best validation on the server?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Remove the < and > characters |
| b | Accept only whole numbers between 0 and 130 |
| c | Validate only in the browser, with JavaScript |
| d | Accept anything and deal with it later |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Defining what is valid shuts the door on everything else, including tricks you did not foresee. Browser validation helps the user, but the server has to repeat all of it.

## Done when

```
node --test cards/cs-02/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
