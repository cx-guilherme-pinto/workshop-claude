# Card rd-08 — Where to connect the cheap cameras

- **Category:** networks
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Putting untrusted devices on their own network limits the damage if they are attacked.

## Prompt (field `prompt`)

You bought cheap Wi-Fi cameras for your home. Where do you connect them?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | On the same network as your work laptop |
| b | On a separate network, like the guest network |
| c | Straight to the internet, without a router |
| d | On any network, as long as it has a password |

Field `answer`: `"b"`

## Explanation (field `explanation`)

If a camera is attacked, on a separate network it cannot reach your laptop or your files. Also change its factory password and update the firmware.

## Done when

```
node --test cards/rd-08/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
