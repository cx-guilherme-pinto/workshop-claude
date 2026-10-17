# Card es-05 — The migration story

- **Category:** social-engineering
- **Difficulty:** 1
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Pretexting: a believable story is used to ask for something you should never hand over.

## Prompt (field `prompt`)

You received these messages in the company chat. Which parts are warning signs?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "Hi, I'm Tom from IT.",
  "We're migrating the email accounts today.",
  "I need your password to copy your mailbox.",
  "The director wants this done by 5 pm.",
  "Thanks for your help!"
]
```

Field `answer` (unsafe indexes): `[2,3]`

## Explanation (field `explanation`)

IT never needs your password, and pressure from a boss is there to stop you thinking. Confirm the request through another channel and report it.

## Done when

```
node --test cards/es-05/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
