# Card rd-06 — Too many ports open on the firewall

- **Category:** networks
- **Difficulty:** 2
- **Template:** `spotTheFlaw` from `../../templates/spot-the-flaw.js`

## Concept

A web server should only expose the ports it needs to the internet.

## Prompt (field `prompt`)

These are the firewall rules of a public web server. Which rules expose too much?

## Content

Field `language`: `"text"`

Field `segments` (indexes start at 0):

```json
[
  "allow tcp 443 from any",
  "allow tcp 80 from any (redirects to 443)",
  "allow tcp 22 from any",
  "allow tcp 3306 from any",
  "deny all"
]
```

Field `answer` (unsafe indexes): `[2,3]`

## Explanation (field `explanation`)

The database (3306) should never be open to the internet and SSH (22) should only accept the VPN or the team's IPs. Leave only ports 80 and 443 open.

## Done when

```
node --test cards/rd-06/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
