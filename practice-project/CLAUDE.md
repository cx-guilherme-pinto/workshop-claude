# Convenções do projeto

- Node 22+, módulos ES, **sem dependências externas**.
- Testes com `node --test` em `test/*.test.js`, um ficheiro por módulo.
- Erros de validação lançam `ErroValidacao` (de `src/erros.js`) com uma mensagem curta em português.
- Os dados vivem em memória (`src/dados.js`); não há base de dados.
- Texto para o utilizador em português de Portugal.
