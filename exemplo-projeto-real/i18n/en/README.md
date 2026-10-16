# Municipal Library (training project)

A small API in Node, with no dependencies, to manage books, readers and loans. Use it for **Project 2** of the workshop when you don't have access to a Jira or GitHub of your own.

```
npm test          # or: node --test
npm start         # http://127.0.0.1:3100
```

The tasks are in `issues/` (same format that `/task-intake` reads from Jira/GitHub):

```
/task-intake issues/EX-1.json
```

| Issue | Size | What |
|---|---|---|
| EX-1 | small | validate ISBN and email when creating books and readers |
| EX-2 | medium | search books by title/author, with pagination |
| EX-3 | small, security | a reader can see another reader's loans (IDOR) |
