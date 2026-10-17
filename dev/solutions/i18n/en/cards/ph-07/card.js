import { answer } from '../../templates/answer.js';

export default answer({
  id: "ph-07",
  title: "The link lies",
  category: "phishing",
  difficulty: 2,
  concept: "The text of a link can show one address and take you to another.",
  prompt: "In an email, the link shows one address, but when you hover over it the browser shows another. Which domain will you open if you click?",
  scenario: {
    kind: "text",
    label: "Link in the email",
    lines: [
      "Link text: https://lumenbank.example/statement",
      "Destination on hover: http://statement-lumen.test/abc"
    ]
  },
  placeholder: "Domain",
  accept: [
    "statement-lumen.test",
    "http://statement-lumen.test",
    "http://statement-lumen.test/abc"
  ],
  explanation: "The link text is just text; the real destination is what the browser shows on hover. On a phone, press and hold the link to see it before opening."
});
