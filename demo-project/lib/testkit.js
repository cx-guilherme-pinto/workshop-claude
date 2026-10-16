// Testkit da Arena: a mesma API de testes em Node (node:test) e no browser.
// Os testes importam daqui, nunca de "node:test" diretamente, para poderem correr nos dois.
//
//   import { test, assert, readSource, novoContentor } from '../../lib/testkit.js';

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
    novoContentor: () => {
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
export const novoContentor = api.novoContentor;
export const ambiente = isNode ? 'node' : 'browser';
