// The Arena testkit: the same test API in Node (node:test) and in the browser.
// Tests import from here, never from "node:test" directly, so that they run in both.
//
//   import { test, assert, readSource, newContainer } from '../../lib/testkit.js';

const isNode = typeof process !== 'undefined' && !!process.versions?.node && typeof window === 'undefined';

let api;
if (isNode) {
  const nodeTest = await import('node:test');
  const nodeAssert = await import('node:assert/strict');
  const { readFile } = await import('node:fs/promises');
  const { createFakeDocument } = await import('./fakedom.js');
  api = {
    test: nodeTest.test,
    assert: nodeAssert.default,
    readSource: (rel, base) => readFile(new URL(rel, base), 'utf8'),
    newContainer: () => {
      const doc = createFakeDocument();
      const c = doc.createElement('div');
      doc.body.appendChild(c);
      return c;
    },
  };
} else {
  api = await import('./testkit-browser.js');
}

export const test = api.test;
export const assert = api.assert;
export const readSource = api.readSource;
export const newContainer = api.newContainer;
export const environment = isNode ? 'node' : 'browser';
