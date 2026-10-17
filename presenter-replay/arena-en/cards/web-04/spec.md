# Card web-04 — Other people's invoices

- **Category:** web
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

IDOR: the server returns an object by its id alone, without checking that it belongs to whoever is asking.

## Prompt (field `prompt`)

Any logged-in customer can see another customer's invoice by changing the number in the URL. Which line causes the problem?

## Content

Field `language`: `"js"`

Field `segments` (indexes start at 0):

```json
[
  "app.get('/invoices/:id', authenticated, async (req, res) => {",
  "  const invoice = await db.invoices.findOne({ id: req.params.id });",
  "  if (!invoice) return res.status(404).end();",
  "  res.json(invoice);",
  "});"
]
```

Field `answer` (unsafe indexes): `[1]`

## Explanation (field `explanation`)

Being logged in is not enough: the owner check is missing. Look it up with findOne({ id: req.params.id, customerId: req.user.id }) so each customer sees only their own invoices.

## Done when

```
node --test cards/web-04/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
