# Tarefa `lib-hash` — utilitário partilhado de criptografia

Escreve `lib/hash.js`: um módulo ES **sem dependências** que funcione igual no Node e no browser. Não uses `node:crypto` nem `crypto.subtle`, porque o `validate()` dos cartões é síncrono.

Exporta exatamente estas funções:

| Função | O que faz |
|---|---|
| `sha256Hex(texto)` | SHA-256 do texto codificado em UTF-8 (usa `TextEncoder`); devolve 64 caracteres hexadecimais em minúsculas |
| `cesar(texto, deslocamento)` | cifra de César: desloca só as letras A–Z e a–z, mantém maiúsculas e minúsculas e deixa tudo o resto igual; aceita deslocamentos negativos e maiores do que 26 |
| `paraBase64(texto)` | Base64 do texto em UTF-8 (tem de funcionar com acentos) |
| `deBase64(b64)` | o inverso de `paraBase64` |

Verificar:

```
node --test lib/hash.test.js
```

Não mexas em mais nenhum ficheiro. Os cartões de criptografia dependem deste módulo.
