# Card rd-10 — Certificate warning

- **Category:** networks
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

A certificate warning can be a sign that someone is intercepting the connection.

## Prompt (field `prompt`)

On the hotel Wi-Fi, the browser warns 'Your connection is not private' when you open shop.example. What do you do?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Click 'Proceed anyway' |
| b | Leave the page and do not type any data |
| c | Reload until the warning goes away |
| d | Turn off the antivirus |

Field `answer`: `"b"`

## Explanation (field `explanation`)

An invalid certificate can mean someone has put themselves in the middle of the connection. Leave, use mobile data and try again later.

## Done when

```
node --test cards/rd-10/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
