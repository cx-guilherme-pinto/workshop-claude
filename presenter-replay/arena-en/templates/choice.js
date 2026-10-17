// Template "choice": visual multiple choice. The answer is the id of one option (e.g. "b").
//
// choice({
//   id, title, category, difficulty, concept, prompt, explanation,
//   scenario?: { kind: 'email'|'url'|'text'|'chat', label?, lines: [...] },
//   options: [{ id: 'a', text: '...', detail?: '...' }, ...],
//   answer: 'b',
// })
import { h, createCard, checkDefinition, cardHeader, scenario, confirmButton, lock, TEXT } from './common.js';

export function choice(def) {
  checkDefinition(def, 'choice', ['options', 'answer']);
  const ids = def.options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) throw new Error(TEXT.repeatedOptions(def.id));
  if (!ids.includes(def.answer)) throw new Error(TEXT.answerIsNotAnOption(def.id, def.answer));

  return createCard('choice', def, {
    validate: (given) => given === def.answer,
    render(container, api) {
      const doc = container.ownerDocument;
      let picked = null;
      const buttons = def.options.map((o) =>
        h(doc, 'button', {
          class: 'option', type: 'button', role: 'radio', 'data-option': o.id,
          attrs: { 'aria-checked': 'false' },
          on: {
            click: () => {
              picked = o.id;
              for (const b of buttons) b.setAttribute('aria-checked', b.dataset.option === o.id ? 'true' : 'false');
            },
          },
        },
        h(doc, 'span', { class: 'option-text', text: o.text }),
        o.detail ? h(doc, 'span', { class: 'option-detail', text: o.detail }) : null),
      );
      const confirm = confirmButton(doc, () => {
        if (picked === null) return;
        lock(container);
        api.submit(picked);
      });
      container.replaceChildren(
        h(doc, 'article', { class: 'card card-choice', 'data-card': def.id },
          cardHeader(doc, def),
          scenario(doc, def.scenario),
          h(doc, 'div', { class: 'options', role: 'radiogroup', attrs: { 'aria-label': TEXT.options } }, ...buttons),
          h(doc, 'div', { class: 'card-actions' }, confirm),
        ),
      );
    },
  });
}
