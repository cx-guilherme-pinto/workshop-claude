// Template "spot-the-flaw": shows an excerpt (code, URL, message) split into segments;
// the player clicks the unsafe segment(s). The answer is a list of indexes (e.g. [2]).
//
// spotTheFlaw({
//   id, title, category, difficulty, concept, prompt, explanation,
//   language?: 'html'|'js'|'sql'|'text'|'url',
//   segments: ['line 0', 'line 1', ...],
//   answer: [1],            // indexes of the unsafe segments
// })
import { h, createCard, checkDefinition, cardHeader, confirmButton, lock, TEXT } from './common.js';

function normalizeIndexes(v) {
  const arr = Array.isArray(v) ? v : [v];
  if (!arr.every((x) => Number.isInteger(x))) return null;
  return [...new Set(arr)].sort((a, b) => a - b);
}

export function spotTheFlaw(def) {
  checkDefinition(def, 'spot-the-flaw', ['segments', 'answer']);
  const right = normalizeIndexes(def.answer);
  if (!right || right.length === 0) throw new Error(TEXT.noIndex(def.id));
  if (right.some((i) => i < 0 || i >= def.segments.length)) throw new Error(TEXT.indexOutside(def.id));

  return createCard('spot-the-flaw', def, {
    validate: (given) => {
      const a = normalizeIndexes(given);
      return !!a && a.length === right.length && a.every((x, i) => x === right[i]);
    },
    render(container, api) {
      const doc = container.ownerDocument;
      const marked = new Set();
      const segments = def.segments.map((text, i) =>
        h(doc, 'button', {
          class: 'segment', type: 'button', 'data-index': i,
          attrs: { 'aria-pressed': 'false' },
          on: {
            click: (ev) => {
              const b = ev.currentTarget;
              if (marked.has(i)) marked.delete(i);
              else marked.add(i);
              b.setAttribute('aria-pressed', marked.has(i) ? 'true' : 'false');
            },
          },
        },
        h(doc, 'span', { class: 'segment-number', text: String(i + 1) }),
        h(doc, 'code', { class: 'segment-text', text })),
      );
      const confirm = confirmButton(doc, () => {
        if (marked.size === 0) return;
        lock(container);
        api.submit([...marked].sort((a, b) => a - b));
      });
      container.replaceChildren(
        h(doc, 'article', { class: 'card card-spot-the-flaw', 'data-card': def.id },
          cardHeader(doc, def),
          h(doc, 'div', { class: `excerpt excerpt-${def.language || 'text'}`, role: 'group', attrs: { 'aria-label': TEXT.excerpt } }, ...segments),
          h(doc, 'p', { class: 'card-help', text: TEXT.spotTheFlawHelp }),
          h(doc, 'div', { class: 'card-actions' }, confirm),
        ),
      );
    },
  });
}
