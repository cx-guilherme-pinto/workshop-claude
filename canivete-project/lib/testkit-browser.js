// Minimal test()/assert implementation to run the tool tests in the browser.
// The results go to globalThis.__toolsResults, read by the "Run tests" button.
import { T } from './texts.js';

const M = T.tests;

const results = (globalThis.__toolsResults ||= []);
const pending = (globalThis.__toolsPending ||= []);

function fail(msg) {
  const e = new Error(msg);
  e.name = 'AssertionError';
  throw e;
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

export const assert = {
  ok: (v, msg) => v || fail(msg || M.expectedTruthy),
  equal: (a, b, msg) => Object.is(a, b) || fail(msg || M.expected(JSON.stringify(b), JSON.stringify(a))),
  notEqual: (a, b, msg) => !Object.is(a, b) || fail(msg || M.shouldNotBe(JSON.stringify(b))),
  deepEqual: (a, b, msg) => deepEqual(a, b) || fail(msg || M.expected(JSON.stringify(b), JSON.stringify(a))),
  match: (s, re, msg) => re.test(s) || fail(msg || M.doesNotMatch(JSON.stringify(s), re)),
  fail: (msg) => fail(msg || M.failed),
  throws: (fn, msg) => {
    try {
      fn();
    } catch {
      return;
    }
    fail(msg || M.expectedException);
  },
};

export function test(name, fn) {
  const p = (async () => {
    const start = performance.now();
    try {
      await fn();
      results.push({ name, ok: true, ms: performance.now() - start });
    } catch (e) {
      results.push({ name, ok: false, ms: performance.now() - start, error: String(e?.message || e) });
    }
  })();
  pending.push(p);
  return p;
}

export async function readSource(rel, base) {
  const r = await fetch(new URL(rel, base), { cache: 'no-store' });
  if (!r.ok) throw new Error(M.couldNotRead(rel, r.status));
  return r.text();
}

