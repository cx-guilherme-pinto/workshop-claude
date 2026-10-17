# Card ph-09 — Phishing by SMS

- **Category:** phishing
- **Difficulty:** 1
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Smishing: the same trick as phishing, but by SMS, where the link is harder to see.

## Prompt (field `prompt`)

This SMS arrived on your phone. Which parts are signs of smishing?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "SwiftPost:",
  "Package SP-4471 could not be delivered.",
  "Reason: incomplete address.",
  "Update it at http://sp-address.test/en",
  "No reply within 12h and it will be returned."
]
```

Field `answer` (unsafe indexes): `[3,4]`

## Explanation (field `explanation`)

The link points to a strange domain and the short deadline is there to make you act without thinking. Open the official app or site and look up the tracking number there.

## Done when

```
node --test cards/ph-09/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
