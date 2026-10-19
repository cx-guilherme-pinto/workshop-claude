# Card rd-09 — The badly configured router

- **Category:** networks
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

A home router has several doors: the Wi-Fi itself, the admin page and the devices connected to it.

## Prompt (field `prompt`)

These are the settings of the Smiths' router. Which lines let a neighbor who does not know the Wi-Fi password get onto the network?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "Network name: SmithHome",
  "Wi-Fi security: WEP",
  "Admin page password: admin (the factory one)",
  "WPS: on, with an 8-digit PIN",
  "UPnP: on",
  "Remote administration: off"
]
```

Field `answer` (unsafe indexes): `[1,3]`

## Explanation (field `explanation`)

A neighbor within range can attack the Wi-Fi itself for days without anyone noticing. Use WPA3 (or WPA2) with a long password, turn WPS off, change the factory admin password and turn UPnP off if you do not need it.

## Done when

```
node --test cards/rd-09/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
