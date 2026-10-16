// In-memory data. Each test can call reset() to start from scratch.
export const data = { books: [], readers: [], loans: [], seq: 1 };

export function reset() {
  data.books = [
    { id: 1, title: 'One Hundred Years of Solitude', author: 'Gabriel García Márquez', isbn: '9780060883287' },
    { id: 2, title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518' },
    { id: 3, title: 'Love in the Time of Cholera', author: 'Gabriel García Márquez', isbn: '9780307389732' },
  ];
  data.readers = [
    { id: 10, name: 'Alice Smith', email: 'alice@example.com' },
    { id: 11, name: 'Bob Jones', email: 'bob@example.com' },
  ];
  data.loans = [
    { id: 100, readerId: 10, bookId: 1, due: '2026-11-01' },
    { id: 101, readerId: 11, bookId: 2, due: '2026-11-03' },
  ];
  data.seq = 1000;
}

export function nextId() {
  return ++data.seq;
}

reset();
