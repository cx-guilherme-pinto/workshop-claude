import { data, nextId } from './data.js';
import { ValidationError } from './errors.js';

export function listBooks() {
  return [...data.books];
}

export function getBook(id) {
  return data.books.find((b) => b.id === Number(id)) ?? null;
}

// TODO(EX-1): validate the ISBN (ISBN-13 with check digit).
export function createBook({ title, author, isbn }) {
  if (!title || !author) throw new ValidationError('Title and author are required');
  const book = { id: nextId(), title: String(title).trim(), author: String(author).trim(), isbn: String(isbn ?? '') };
  data.books.push(book);
  return book;
}
