# Card cs-01 — Find the path traversal

- **Category:** secure-code
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Joining a file name that comes from the user onto a path lets it escape the intended folder.

## Prompt (field `prompt`)

This endpoint serves files from the uploads folder. Which line lets someone read files outside that folder?

## Content

Field `language`: `"js"`

Field `segments` (indexes start at 0):

```json
[
  "app.get('/download', (req, res) => {",
  "  const name = req.query.file;",
  "  const filePath = path.join('/srv/uploads', name);",
  "  res.sendFile(filePath);",
  "});"
]
```

Field `answer` (unsafe indexes): `[2]`

## Explanation (field `explanation`)

With file=../../etc/passwd, the path escapes the uploads folder. Use path.basename(name) or check that the resolved path starts with /srv/uploads/.

## Done when

```
node --test cards/cs-01/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
