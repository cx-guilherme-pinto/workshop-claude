# Tarefa `lib-hash` — utilitário partilhado de criptografia

Escreve `lib/hash.js`: um módulo ES **sem dependências** que funcione igual no Node e no browser. Não uses `node:crypto` nem `crypto.subtle`, porque o `validate()` dos cartões é síncrono.

Exporta exatamente estas funções:

| Função | O que faz |
|---|---|
| `sha256Hex(text)` | SHA-256 do texto codificado em UTF-8 (usa `TextEncoder`); devolve 64 caracteres hexadecimais em minúsculas |
| `caesar(text, shift)` | cifra de César: desloca só as letras A–Z e a–z, mantém maiúsculas e minúsculas e deixa tudo o resto igual; aceita deslocamentos negativos e maiores do que 26 |
| `toBase64(text)` | Base64 do texto em UTF-8 (tem de funcionar com acentos) |
| `fromBase64(b64)` | o inverso de `toBase64`; se o texto não for Base64 válido, lança um `Error` com a mensagem `Base64 inválido.` |

Verificar:

```
node --test lib/hash.test.js
```

Não mexas em mais nenhum ficheiro. Os cartões de criptografia dependem deste módulo.
