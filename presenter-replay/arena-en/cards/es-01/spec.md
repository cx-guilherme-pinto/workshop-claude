# Card es-01 — The CEO's urgent request

- **Category:** social-engineering
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

CEO fraud: someone pretends to be a boss to ask for an urgent, secret transfer.

## Prompt (field `prompt`)

This email reached Atlas Corp's accounting team. What do you do?

## Scenario (field `scenario`)

```json
{
  "kind": "email",
  "label": "Email received",
  "lines": [
    "From: CEO <ceo.atlas@quick-mail.test>",
    "I need an urgent transfer of €18,000 to a new supplier.",
    "I'm in a meeting, don't call me. Reply by email only."
  ]
}
```

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Make the transfer, it's the CEO |
| b | Confirm by phone, using the internal number I already know |
| c | Reply to the email asking for more details |
| d | Ask a colleague to make the transfer |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Urgency, secrecy and an address from outside the company are the classic signs. Always confirm through a channel you already know, never the one in the message.

## Done when

```
node --test cards/es-01/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
