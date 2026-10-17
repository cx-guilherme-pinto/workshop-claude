# Card pw-04 — How do you store 80 passwords?

- **Category:** passwords
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

A password manager creates and stores a unique, strong password for every site.

## Prompt (field `prompt`)

You have 80 online accounts. What is the safest way to have a different password for each one?

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | A notebook on your office desk |
| b | A spreadsheet called passwords.xlsx |
| c | A password manager protected by a passphrase and MFA |
| d | One base password with the site name at the end |

Field `answer`: `"c"`

## Explanation (field `explanation`)

The manager generates long random passwords and you only have to remember one passphrase. Protect it with MFA, because it becomes the key to everything.

## Done when

```
node --test cards/pw-04/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
