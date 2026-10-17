import { createServer } from 'node:http';
import { listBooks, getBook, createBook } from './books.js';
import { createReader, loansForReader } from './readers.js';
import { ValidationError, AccessError } from './errors.js';

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let txt = '';
  for await (const c of req) {
    txt += c;
    if (txt.length > 100_000) throw new ValidationError('Request too large');
  }
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    throw new ValidationError('Invalid JSON');
  }
}

// Toy authentication: the reader comes in the X-Reader header.
const authenticatedReader = (req) => Number(req.headers['x-reader']) || null;

export function createLibraryServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/books') return json(res, 200, listBooks());
      let m = /^\/books\/(\d+)$/.exec(url.pathname);
      if (req.method === 'GET' && m) {
        const b = getBook(m[1]);
        return b ? json(res, 200, b) : json(res, 404, { error: 'Book not found' });
      }
      if (req.method === 'POST' && url.pathname === '/books') return json(res, 201, createBook(await readBody(req)));
      if (req.method === 'POST' && url.pathname === '/readers') return json(res, 201, createReader(await readBody(req)));
      m = /^\/readers\/(\d+)\/loans$/.exec(url.pathname);
      if (req.method === 'GET' && m) return json(res, 200, loansForReader(m[1], authenticatedReader(req)));
      return json(res, 404, { error: 'Not found' });
    } catch (e) {
      if (e instanceof ValidationError) return json(res, 400, { error: e.message });
      if (e instanceof AccessError) return json(res, 403, { error: e.message });
      return json(res, 500, { error: 'Internal error' });
    }
  });
}

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const isMain = (() => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (isMain) {
  const port = Number(process.env.PORT || 3100);
  createLibraryServer().listen(port, '127.0.0.1', () => console.log(`Library at http://127.0.0.1:${port}`));
}
