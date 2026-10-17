# Card ph-08 — Enable content?

- **Category:** phishing
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

The macros in a document are code; enabling them can install malware.

## Prompt (field `prompt`)

A document received by email says: 'Enable content to view the invoice.' What do you do?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Enable it, otherwise I can't see the invoice |
| b | Close it and check with the sender through another channel |
| c | Forward it to a colleague to open |
| d | Save it and open it later |

Field `answer`: `"b"`

## Explanation (field `explanation`)

A real invoice does not need macros to be read. Close the file and check with the sender by phone or through the official portal.

## Done when

```
node --test cards/ph-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
