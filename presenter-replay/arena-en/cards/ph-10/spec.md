# Card ph-10 — The app wants access to your email

- **Category:** phishing
- **Difficulty:** 3
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Consent phishing: instead of your password, the attacker asks you to authorize an app to get into your account.

## Prompt (field `prompt`)

When you open a shared PDF, an app asks to: 'Read, send and delete emails on your behalf'. What do you do?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | Accept, every app asks for this |
| b | Refuse and report it: a PDF reader does not need your email |
| c | Accept and change my password afterwards |
| d | Accept just this once |

Field `answer`: `"b"`

## Explanation (field `explanation`)

The authorization gives the app its own token, which can stay valid even after you change your password. Refuse requests that ask for too much and revoke suspicious apps in your account settings.

## Done when

```
node --test cards/ph-10/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
