# Card ph-03 — The disguised attachment

- **Category:** phishing
- **Difficulty:** 1
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

A double extension hides a program behind a name that looks like a document.

## Prompt (field `prompt`)

These attachments came from a supplier. Which one is a disguised program?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "report_march.pdf",
  "invoice_0423.pdf.exe",
  "event_photos.jpg",
  "contract.docx",
  "budget.xlsx"
]
```

Field `answer` (unsafe indexes): `[1]`

## Explanation (field `explanation`)

What counts is the last extension: .exe is a program. Turn on the option to show file extensions and never open programs received by email.

## Done when

```
node --test cards/ph-03/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
