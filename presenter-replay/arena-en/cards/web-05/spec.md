# Card web-05 — Where do you go after logging in?

- **Category:** web
- **Difficulty:** 2
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Open redirect: the site redirects to any address that comes in the URL.

## Prompt (field `prompt`)

After login, the shop sends you to the address in the next parameter: https://shop.example/login?next=https://fake-shop.test. What is the risk?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | None, the login is on the real shop |
| b | You end up on a fake site that looks like the shop |
| c | Login gets slower |
| d | Your cookies are deleted |

Field `answer`: `"b"`

## Explanation (field `explanation`)

The link starts on the real domain, which builds trust, and then takes the victim to the fake site. Accept only internal paths, like /account, or a fixed list of destinations.

## Done when

```
node --test cards/web-05/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
