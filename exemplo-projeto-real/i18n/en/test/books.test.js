import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset } from '../src/data.js';
import { listBooks, getBook, createBook } from '../src/books.js';

beforeEach(reset);

test('lists the initial books', () => {
  assert.equal(listBooks().length, 3);
});

test('gets a book by id', () => {
  assert.equal(getBook(1).title, 'One Hundred Years of Solitude');
  assert.equal(getBook(999), null);
});

test('creates a book with title and author', () => {
  const b = createBook({ title: ' The Old Man and the Sea ', author: 'Ernest Hemingway', isbn: '9780684801223' });
  assert.equal(b.title, 'The Old Man and the Sea');
  assert.equal(listBooks().length, 4);
});

test('rejects a book without a title', () => {
  assert.throws(() => createBook({ author: 'X' }), { name: 'ValidationError' });
});
