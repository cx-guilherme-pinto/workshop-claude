// The Pocketknife testkit: the same test API in Node (node:test) and in the browser (the shell's "Run tests").
// Tests import from here, never from "node:test" directly, so that they run in both.
//
//   import { test, assert, readSource } from '../../lib/testkit.js';

const isNode = typeof process !== 'undefined' && !!process.versions?.node && typeof window === 'undefined';

let api;
if (isNode) {
  const nodeTest = await import('node:test');
  const nodeAssert = await import('node:assert/strict');
  const { readFile } = await import('node:fs/promises');
  api = { test: nodeTest.test, assert: nodeAssert.default, readSource: (rel, base) => readFile(new URL(rel, base), 'utf8') };
} else {
  api = await import('./testkit-browser.js');
}

export const test = api.test;
export const assert = api.assert;
export const readSource = api.readSource;
export const environment = isNode ? 'node' : 'browser';

// Two outputs are the same: equal, with numbers compared to 1e-9 (relative), inside arrays and objects too.
export function same(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a === b || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => same(a[k], b[k]));
}
