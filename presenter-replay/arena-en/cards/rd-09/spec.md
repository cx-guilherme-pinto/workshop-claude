# Card rd-09 — The badly configured router

- **Category:** networks
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

WEP and WPS are well-known weak points in home Wi-Fi.

## Prompt (field `prompt`)

These are the router settings. Which lines weaken the network?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "Network name: SmithHome",
  "Security: WEP",
  "Password: 20 random characters",
  "WPS: on",
  "Firmware: up to date"
]
```

Field `answer` (unsafe indexes): `[1,3]`

## Explanation (field `explanation`)

WEP can be cracked in minutes and the WPS PIN can be guessed by brute force. Use WPA3 (or WPA2) and turn WPS off.

## Done when

```
node --test cards/rd-09/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
