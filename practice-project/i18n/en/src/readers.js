import { data, nextId } from './data.js';
import { ValidationError } from './errors.js';

export function getReader(id) {
  return data.readers.find((r) => r.id === Number(id)) ?? null;
}

// TODO(EX-1): validate the email format.
export function createReader({ name, email }) {
  if (!name) throw new ValidationError('Name is required');
  const reader = { id: nextId(), name: String(name).trim(), email: String(email ?? '').trim().toLowerCase() };
  data.readers.push(reader);
  return reader;
}

// Loans of a reader. "requestedBy" is the id of the authenticated reader.
// BUG(EX-3): does not check that the requester is the reader themselves.
export function loansForReader(readerId, requestedBy) {
  void requestedBy;
  return data.loans.filter((l) => l.readerId === Number(readerId));
}
