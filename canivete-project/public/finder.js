// The search and the categories of the home page. They come from pages/catalog.js (the index-page task, wave 2 of
// the swarm; specs/index-page.md), but only after its test (pages/catalog.test.js) passes here in the browser. Until
// then, and whenever it throws, a simple search is used: title only, case-insensitive, accents count.
import { runTestFile } from './testrun.js';
import { T } from '/lib/texts.js';

const A = T.app;

export const SIMPLE = {
  search(tools, query) {
    const q = String(query ?? '').trim().toLowerCase();
    return q ? tools.filter((t) => String(t.title ?? '').toLowerCase().includes(q)) : tools.slice();
  },
  byCategory(tools, categories) {
    const known = new Set(categories.map((c) => c.id));
    const group = (id, name, ts) => ({ id, name, tools: ts, built: ts.filter((t) => t.built === true).length });
    const out = categories.map((c) => group(c.id, c.name, tools.filter((t) => t.category === c.id))).filter((g) => g.tools.length);
    const rest = tools.filter((t) => !known.has(t.category));
    if (rest.length) out.push(group('other', T.catalog.other, rest));
    return out;
  },
  summary(tools) {
    const built = tools.filter((t) => t.built === true).length;
    return { total: tools.length, built, to_build: tools.length - built };
  },
};

// { impl, source: 'catalog' | 'simple', note } for the version of pages/catalog.js the server reports.
export async function loadFinder(page) {
  const v = typeof page?.version === 'number' ? page.version : NaN;
  if (!Number.isFinite(v) || !page?.test) return { impl: SIMPLE, source: 'simple', note: A.simpleSearch, version: null };
  const r = await runTestFile(`/pages/catalog.test.js?v=${v}`);
  if (r.status !== 'passed') {
    const first = r.failures[0];
    const why = first ? `${first.name}: ${String(first.error || '').replace(/\s+/g, ' ').slice(0, 160)}` : '';
    return { impl: SIMPLE, source: 'simple', note: A.catalogFailing(why), version: v };
  }
  try {
    // The same URL the test imported: the very module that passed.
    const mod = await import(`/pages/catalog.js?v=${v}`);
    return { impl: guarded(mod), source: 'catalog', note: null, version: v };
  } catch (e) {
    return { impl: SIMPLE, source: 'simple', note: A.catalogFailing(String(e?.message || e)), version: v };
  }
}

// A module that passed its test but throws (or answers nonsense) with the real catalogue does not break the page.
function guarded(mod) {
  const safe = (name, check) => (...args) => {
    try {
      const out = mod[name](...args);
      if (check(out)) return out;
    } catch {
      /* fall through */
    }
    return SIMPLE[name](...args);
  };
  return {
    search: safe('search', Array.isArray),
    byCategory: safe('byCategory', (g) => Array.isArray(g) && g.every((x) => x && Array.isArray(x.tools))),
    summary: safe('summary', (s) => s && Number.isFinite(s.total) && Number.isFinite(s.built)),
  };
}
