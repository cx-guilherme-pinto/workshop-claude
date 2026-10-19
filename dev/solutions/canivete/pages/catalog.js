// Reference solution of the index-page task (canivete-project/specs/index-page.md). NOT part of the kit.
import { T } from '../lib/texts.js';

export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const haystack = (t) => normalize([t?.id, t?.title, t?.concept, t?.category_name].map((v) => v ?? '').join(' '));

export function search(tools, query) {
  if (!Array.isArray(tools)) return [];
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return tools.slice();
  return tools.filter((t) => {
    const h = haystack(t);
    return words.every((w) => h.includes(w));
  });
}

export function byCategory(tools, categories) {
  const list = Array.isArray(tools) ? tools : [];
  const cats = Array.isArray(categories) ? categories : [];
  const known = new Set(cats.map((c) => c.id));
  const group = (id, name, ts) => ({ id, name, tools: ts, built: ts.filter((t) => t.built === true).length });
  const out = cats.map((c) => group(c.id, c.name, list.filter((t) => t.category === c.id))).filter((g) => g.tools.length);
  const rest = list.filter((t) => !known.has(t.category));
  if (rest.length) out.push(group('other', T.catalog.other, rest));
  return out;
}

export function summary(tools) {
  const list = Array.isArray(tools) ? tools : [];
  const built = list.filter((t) => t.built === true).length;
  return { total: list.length, built, to_build: list.length - built };
}
