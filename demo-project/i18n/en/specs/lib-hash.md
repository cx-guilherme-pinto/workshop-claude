# Task `lib-hash` — shared cryptography utility

Write `lib/hash.js`: an ES module **with no dependencies** that works the same in Node and in the browser. Do not use `node:crypto` or `crypto.subtle`, because the cards' `validate()` is synchronous.

Export exactly these functions:

| Function | What it does |
|---|---|
| `sha256Hex(texto)` | SHA-256 of the text encoded as UTF-8 (use `TextEncoder`); returns 64 lowercase hexadecimal characters |
| `cesar(texto, deslocamento)` | Caesar cipher: shifts only the letters A–Z and a–z, keeps upper and lower case and leaves everything else unchanged; accepts negative shifts and shifts greater than 26 |
| `paraBase64(texto)` | Base64 of the text as UTF-8 (must work with accented characters) |
| `deBase64(b64)` | the inverse of `paraBase64` |

Check:

```
node --test lib/hash.test.js
```

Do not touch any other file. The cryptography cards depend on this module.
