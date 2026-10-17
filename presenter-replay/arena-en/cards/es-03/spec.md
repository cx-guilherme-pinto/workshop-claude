# Card es-03 — The bank on the phone

- **Category:** social-engineering
- **Difficulty:** 1
- **Template:** `answer` from `../../templates/answer.js`

## Concept

Vishing: a voice-call scam where the scammer pretends to be from the bank or tech support.

## Prompt (field `prompt`)

Someone from 'Lumen Bank support' calls and asks for the code you just received by SMS. How often does a real bank ask you for that code over the phone?

## Content

Field `placeholder`: `One word`

Field `accept`: `["never","0","zero","none","not once","never ever"]`

Example of a right answer: `never`

## Explanation (field `explanation`)

The code is for you to approve an operation; whoever asks for it wants to approve it for you. Hang up and call the number on the back of your card.

## Done when

```
node --test cards/es-03/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
