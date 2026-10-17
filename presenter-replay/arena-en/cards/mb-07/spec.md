# Card mb-07 — Is the app ready for the store?

- **Category:** mobile
- **Difficulty:** 3
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

A published app must not be in debug mode or accept unencrypted traffic.

## Prompt (field `prompt`)

This is the Android manifest for the version going to the store. Which lines are insecure?

## Content

Field `language`: `"html"`

Field `segments` (indexes start at 0):

```json
[
  "<application",
  "  android:label=\"Atlas\"",
  "  android:debuggable=\"true\"",
  "  android:allowBackup=\"false\"",
  "  android:usesCleartextTraffic=\"true\">"
]
```

Field `answer` (unsafe indexes): `[2,4]`

## Explanation (field `explanation`)

Debug mode lets tools attach to the app, and unencrypted traffic can be read on the network. Publish with debuggable set to false and with HTTPS only.

## Done when

```
node --test cards/mb-07/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
