// The hashes of the tools broken on purpose (specs/tools.json "spec_gaps"), shared by tools/gen.mjs (the generated
// tests) and installer/assemble-canivete.mjs (the catalogue without the answers in a participant's project).
// No side effects: importing it runs nothing.

// The canonical form of an output for the hash: numbers with 12 significant digits (no float noise), JSON.
export const canon = (v) => JSON.stringify(v, (k, x) => (typeof x === 'number' ? Number(x.toPrecision(12)) : x));

// FNV-1a (32 bits, over UTF-16 code units) of "<id>:<canonical output>".
export function fnv(id, v) {
  const s = id + ':' + v;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

export const gapHash = (id, out) => fnv(id, canon(out));

// The catalogue as it goes into a participant's project: each gap keeps "what" and its cases' inputs with the hash of
// the right output ("right"); the rule, the outputs and the obvious answers are dropped.
export function withoutAnswers(catalogue) {
  return {
    ...catalogue,
    tools: catalogue.tools.map((t) =>
      t.spec_gaps?.length ? { ...t, spec_gaps: t.spec_gaps.map((g) => ({ what: g.what, cases: g.cases.map((c) => ({ in: c.in, right: c.right ?? gapHash(t.id, c.out) })) })) } : t,
    ),
  };
}
