# Card rd-05 — What a VPN does not do

- **Category:** networks
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

A VPN encrypts the path to the VPN server; it does not stop phishing or malware.

## Prompt (field `prompt`)

You turned on a VPN. What does it actually protect you from?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Phishing sites |
| b | People on the same Wi-Fi network seeing your traffic |
| c | Malware that is already on your laptop |
| d | The site knowing who you are after you log in |

Field `answer`: `"b"`

## Explanation (field `explanation`)

A VPN hides your traffic from the local network, but the VPN provider can now see it. For phishing and malware you need other defenses, such as MFA and updates.

## Done when

```
node --test cards/rd-05/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
