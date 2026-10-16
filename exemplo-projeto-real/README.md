# Biblioteca Municipal (projeto de treino)

Uma API pequena, em Node sem dependências, para gerir livros, leitores e empréstimos. Serve para o **Projeto 2** do workshop quando não tens acesso a um Jira ou GitHub teu.

```
npm test          # ou: node --test
npm start         # http://127.0.0.1:3100
```

As tarefas estão em `issues/` (formato igual ao que o `/task-intake` lê do Jira/GitHub):

```
/task-intake issues/EX-1.json
```

| Issue | Tamanho | O quê |
|---|---|---|
| EX-1 | pequena | validar ISBN e email ao criar livros e leitores |
| EX-2 | média | pesquisa de livros por título/autor, com paginação |
| EX-3 | pequena, de segurança | um leitor consegue ver os empréstimos de outro (IDOR) |
