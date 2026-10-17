# Card pw-10 — Signing in without a password

- **Category:** passwords
- **Difficulty:** 2
- **Template:** `answer` from `../../templates/answer.js`

## Concept

A passkey replaces the password with a key pair: the private key never leaves your device.

## Prompt (field `prompt`)

What is the name of the credential that replaces the password with a key pair stored on your phone or computer?

## Content

Field `placeholder`: `One word`

Field `accept`: `["passkey","passkeys"]`

Example of a right answer: `passkey`

## Explanation (field `explanation`)

A passkey only works on the real domain and the server stores only the public key, so there is no secret to steal. Turn it on for the sites that offer it.

## Done when

```
node --test cards/pw-10/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
