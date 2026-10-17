# Card cs-09 — Find the command injection

- **Category:** secure-code
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

Gluing user text onto a shell command lets other commands run.

## Prompt (field `prompt`)

This endpoint pings a server. Which line allows command injection?

## Content

Field `language`: `"js"`

Field `segments` (indexes start at 0):

```json
[
  "const host = req.query.host;",
  "exec('ping -c 1 ' + host, (err, output) => {",
  "  res.send(output);",
  "});"
]
```

Field `answer` (unsafe indexes): `[1]`

## Explanation (field `explanation`)

With host=example.com; ls, the shell runs a second command. Use execFile('ping', ['-c', '1', host]), which does not go through the shell, and validate the host.

## Done when

```
node --test cards/cs-09/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
