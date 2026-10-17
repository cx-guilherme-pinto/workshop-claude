# Card mb-03 — The cleaner app wants accessibility

- **Category:** mobile
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

The accessibility service lets an app read the screen and tap buttons for you.

## Prompt (field `prompt`)

An app to 'clean up your phone' asks for access to the accessibility service. Why is that dangerous?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | It uses a lot of battery |
| b | It lets the app read the screen and tap buttons for you |
| c | It changes the font size |
| d | It is not dangerous |

Field `answer`: `"b"`

## Explanation (field `explanation`)

With this access, a malicious app reads codes and approves payments without you seeing. Give it only to accessibility apps you trust.

## Done when

```
node --test cards/mb-03/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
