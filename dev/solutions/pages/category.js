// Reference solution for the category-page task (dev/solutions: NOT part of the kit).
import { h } from '../templates/common.js';

const TEXT = {
  not_built: 'Por construir',
  not_played: 'Por jogar',
  solved: 'Resolvido',
  wrong: 'Errado, tenta outra vez',
  meta: (d) => `Nível ${d} · ${d * 10} pontos`,
  summary: (ok, total, points) => `${ok} de ${total} resolvidos · ${points} pontos`,
  empty: 'Ainda não há cartões nesta categoria.',
};

function statusOf(card, progress) {
  if (card.status === 'not_built') return 'not_built';
  const p = progress[card.id];
  if (!p) return 'not_played';
  return p.correct === true ? 'solved' : 'wrong';
}

export function renderCategory(container, { category, cards = [], progress = {}, open = () => {} }) {
  const doc = container.ownerDocument;
  const states = cards.map((c) => statusOf(c, progress || {}));
  const solved = cards.filter((_, i) => states[i] === 'solved');
  const points = solved.reduce((s, c) => s + c.difficulty * 10, 0);

  const items = cards.map((c, i) => {
    const st = states[i];
    const playable = st !== 'not_built';
    return h(doc, 'li', { class: 'tile-item', 'data-card': c.id, 'data-status': st },
      h(doc, 'button', {
        class: 'tile', type: 'button', 'data-open': c.id, disabled: !playable,
        on: { click: () => { if (playable) open(c.id); } },
      },
      h(doc, 'span', { class: 'tile-title', text: c.title }),
      h(doc, 'span', { class: 'tile-meta', text: TEXT.meta(c.difficulty) }),
      h(doc, 'span', { class: 'tile-status', text: TEXT[st] })),
    );
  });

  container.replaceChildren(
    h(doc, 'section', { class: 'category', 'data-category': category.id },
      h(doc, 'header', { class: 'page-header' },
        h(doc, 'h1', { class: 'page-title', text: category.name }),
        h(doc, 'p', { class: 'page-summary', 'data-summary': '', text: TEXT.summary(solved.length, cards.length, points) }),
      ),
      items.length
        ? h(doc, 'ul', { class: 'tiles' }, ...items)
        : h(doc, 'p', { class: 'page-empty', text: TEXT.empty }),
    ),
  );
}
