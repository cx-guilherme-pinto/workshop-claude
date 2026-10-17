# Task `lib-hash` — shared cryptography utility

Write `lib/hash.js`: an ES module **with no dependencies** that works the same in Node and in the browser. Do not use `node:crypto` or `crypto.subtle`, because the cards' `validate()` is synchronous.

Export exactly these functions:

| Function | What it does |
|---|---|
| `sha256Hex(text)` | SHA-256 of the text encoded as UTF-8 (use `TextEncoder`); returns 64 lowercase hexadecimal characters |
| `caesar(text, shift)` | Caesar cipher: shifts only the letters A–Z and a–z, keeps upper and lower case and leaves everything else unchanged; accepts negative shifts and shifts greater than 26 |
| `toBase64(text)` | Base64 of the text as UTF-8 (must work with accented characters) |
| `fromBase64(b64)` | the inverse of `toBase64`; if the text is not valid Base64, throw an `Error` with the message `Invalid Base64.` |

Check:

```
node --test lib/hash.test.js
```

Do not touch any other file. The cryptography cards depend on this module.
