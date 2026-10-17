# Card web-10 — CORS that is too open

- **Category:** web
- **Difficulty:** 3
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Reflecting any origin with credentials lets any site read responses on the user's behalf.

## Prompt (field `prompt`)

This API only serves the shop.example app. Which line exposes it to any site?

## Content

Field `language`: `"js"`

Field `segments` (indexes start at 0):

```json
[
  "app.use(cors({",
  "  origin: (origin, cb) => cb(null, origin),",
  "  credentials: true,",
  "  methods: ['GET', 'POST'],",
  "}));"
]
```

Field `answer` (unsafe indexes): `[1]`

## Explanation (field `explanation`)

Accepting whatever origin arrives, with credentials, lets any site read the responses with the victim's cookies. Use a fixed list: origin: ['https://shop.example'].

## Done when

```
node --test cards/web-10/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
