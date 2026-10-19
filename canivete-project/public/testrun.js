// Runs one test file in the browser, the same as "node --test" would, one file at a time.
// The browser testkit (lib/testkit-browser.js) collects the results in globalThis.__toolsResults and the promises in
// __toolsPending; both are emptied in place (the testkit keeps the reference) before each file. Used by "Run tests"
// (tools/<id>/tool.test.js) and by the search (pages/catalog.test.js, before the shell uses pages/catalog.js).
import { T } from '/lib/texts.js';

const A = T.app;

let queue = Promise.resolve();

function withTimeout(p, ms, msg) {
  let t;
  return Promise.race([p, new Promise((_, rej) => (t = setTimeout(() => rej(new Error(msg)), ms)))]).finally(() => clearTimeout(t));
}

async function runNow(url) {
  const results = (globalThis.__toolsResults ||= []);
  const pending = (globalThis.__toolsPending ||= []);
  results.length = 0;
  pending.length = 0;
  const before = new Set(document.body.children);
  const start = performance.now();
  try {
    await withTimeout(import(url), 15000, A.slowToLoad);
    let n = -1;
    while (n !== pending.length) {
      n = pending.length;
      await withTimeout(Promise.allSettled([...pending]), 15000, A.slow);
    }
  } catch (e) {
    results.push({ name: A.loadTest, ok: false, error: String(e?.message || e) });
  } finally {
    for (const child of [...document.body.children]) if (!before.has(child)) child.remove();
  }
  const list = results.slice();
  const failures = list.filter((x) => !x.ok);
  return {
    status: list.length && !failures.length ? 'passed' : 'failed',
    passed: list.length - failures.length,
    total: list.length,
    failures,
    ms: performance.now() - start,
  };
}

// `url` is a path of this server (built by the caller from a validated id). The files run one after the other.
export function runTestFile(url) {
  const p = queue.then(() => runNow(url));
  queue = p.catch(() => {});
  return p;
}
