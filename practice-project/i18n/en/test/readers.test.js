import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset } from '../src/data.js';
import { createReader, loansForReader } from '../src/readers.js';

beforeEach(reset);

test('creates a reader and normalises the email', () => {
  const r = createReader({ name: 'Martha', email: ' Martha@Example.COM ' });
  assert.equal(r.email, 'martha@example.com');
});

test('the reader can see their own loans', () => {
  assert.equal(loansForReader(10, 10).length, 1);
});
