// Template "order": the player puts the items in the right order (arrows or drag and drop).
// The answer is the list of ids in the chosen order.
//
// order({
//   id, title, category, difficulty, concept, prompt, explanation,
//   items: [{ id: 'x', text: '...' }, ...],   // order in which they show up (shuffled)
//   answer: ['y', 'x', 'z'],                  // right order
// })
import { h, createCard, checkDefinition, cardHeader, confirmButton, lock, TEXT } from './common.js';

export function order(def) {
  checkDefinition(def, 'order', ['items', 'answer']);
  const ids = def.items.map((i) => i.id);
  if (ids.length < 3) throw new Error(TEXT.tooFewItems(def.id));
  if (def.answer.length !== ids.length || !def.answer.every((x) => ids.includes(x))) {
    throw new Error(TEXT.itemIds(def.id));
  }
  if (def.answer.every((x, i) => x === ids[i])) throw new Error(TEXT.alreadyOrdered(def.id));

  return createCard('order', def, {
    validate: (given) => Array.isArray(given) && given.length === def.answer.length && given.every((x, i) => x === def.answer[i]),
    render(container, api) {
      const doc = container.ownerDocument;
      let current = [...ids];
      const byId = new Map(def.items.map((i) => [i.id, i]));
      const list = h(doc, 'ol', { class: 'order-list' });
      let dragged = null;

      const move = (id, delta) => {
        const i = current.indexOf(id);
        const j = i + delta;
        if (j < 0 || j >= current.length) return;
        [current[i], current[j]] = [current[j], current[i]];
        draw();
      };

      function draw() {
        list.replaceChildren(
          ...current.map((id, pos) =>
            h(doc, 'li', {
              class: 'order-item', draggable: 'true', 'data-item': id,
              on: {
                dragstart: () => (dragged = id),
                dragover: (ev) => ev.preventDefault(),
                drop: (ev) => {
                  ev.preventDefault();
                  if (dragged && dragged !== id) {
                    current = current.filter((x) => x !== dragged);
                    current.splice(current.indexOf(id), 0, dragged);
                    dragged = null;
                    draw();
                  }
                },
              },
            },
            h(doc, 'span', { class: 'order-text', text: byId.get(id).text }),
            h(doc, 'span', { class: 'order-arrows' },
              h(doc, 'button', { class: 'arrow', type: 'button', disabled: pos === 0, 'data-move': 'up', attrs: { 'aria-label': TEXT.moveUp }, on: { click: () => move(id, -1) } }, '↑'),
              h(doc, 'button', { class: 'arrow', type: 'button', disabled: pos === current.length - 1, 'data-move': 'down', attrs: { 'aria-label': TEXT.moveDown }, on: { click: () => move(id, 1) } }, '↓'),
            )),
          ),
        );
      }

      draw();
      const confirm = confirmButton(doc, () => {
        lock(container);
        api.submit([...current]);
      });
      container.replaceChildren(
        h(doc, 'article', { class: 'card card-order', 'data-card': def.id },
          cardHeader(doc, def),
          list,
          h(doc, 'div', { class: 'card-actions' }, confirm),
        ),
      );
    },
  });
}
