// Reference solution for the score-table task, English Arena (dev/solutions: NOT part of the kit).
import { h } from '../templates/common.js';

const TEXT = {
  title: 'Score',
  summary: (points, max) => `You have ${points} points out of ${max} possible.`,
  solved: (ok, n) => `${ok} of ${n}`,
  category: 'Category',
  solvedHeader: 'Solved',
  points: 'Points',
};

const pointsOf = (c) => ([1, 2, 3].includes(c.difficulty) ? c.difficulty * 10 : 0);

export function renderScore(container, { categories = [], cards = [], progress = {} }) {
  const doc = container.ownerDocument;
  const correct = (c) => progress?.[c.id]?.correct === true;

  const rows = categories.map((cat) => {
    const cs = cards.filter((c) => c.category === cat.id);
    const ok = cs.filter(correct);
    return {
      cat,
      cards: cs.length,
      solved: ok.length,
      points: ok.reduce((s, c) => s + pointsOf(c), 0),
      max: cs.reduce((s, c) => s + pointsOf(c), 0),
    };
  });
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const total = { cards: sum('cards'), solved: sum('solved'), points: sum('points'), max: sum('max') };

  const numbers = (r) => [
    h(doc, 'td', { class: 'number', 'data-solved': '', text: TEXT.solved(r.solved, r.cards) }),
    h(doc, 'td', { class: 'number', 'data-points': '', text: String(r.points) }),
  ];

  container.replaceChildren(
    h(doc, 'section', { class: 'score' },
      h(doc, 'header', { class: 'page-header' },
        h(doc, 'h1', { class: 'page-title', text: TEXT.title }),
        h(doc, 'p', { class: 'page-summary', 'data-summary': '', text: TEXT.summary(total.points, total.max) }),
      ),
      h(doc, 'table', { class: 'score-table' },
        h(doc, 'thead', {},
          h(doc, 'tr', {},
            h(doc, 'th', { text: TEXT.category }),
            h(doc, 'th', { class: 'number', text: TEXT.solvedHeader }),
            h(doc, 'th', { class: 'number', text: TEXT.points }),
          ),
        ),
        h(doc, 'tbody', {}, ...rows.map((r) => h(doc, 'tr', { 'data-category': r.cat.id }, h(doc, 'th', { text: r.cat.name }), ...numbers(r)))),
        h(doc, 'tfoot', {}, h(doc, 'tr', { class: 'total', 'data-total': '' }, h(doc, 'th', { text: 'Total' }), ...numbers(total))),
      ),
    ),
  );
}
