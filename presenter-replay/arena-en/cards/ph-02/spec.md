# Card ph-02 — What gives this email away?

- **Category:** phishing
- **Difficulty:** 1
- **Template:** `choice` from `../../templates/choice.js`

## Concept

Urgency and links to another domain are the most common signs of phishing.

## Prompt (field `prompt`)

This email arrived today. What is the strongest sign that it is phishing?

## Scenario (field `scenario`)

```json
{
  "kind": "email",
  "label": "Inbox",
  "lines": [
    "From: SwiftPost <alerts@swiftpost.example>",
    "Subject: Your package has been held",
    "Pay €1.99 within the next 2 hours or the package will be returned.",
    "Pay now: http://sp-payments.test/en"
  ]
}
```

## Content

Field `options` (keep the ids):

| id | text |
| --- | --- |
| a | The amount is small |
| b | The 2-hour deadline and the link to another domain |
| c | The email has a subject line |
| d | It mentions a package |

Field `answer`: `"b"`

## Explanation (field `explanation`)

Urgency is there to stop you thinking, and the link goes to sp-payments.test, which does not belong to SwiftPost. Open the official site yourself and check the package there.

## Done when

```
node --test cards/ph-02/card.test.js
```

passes with no errors. Rules: `cards/CONTRACT.md`.
