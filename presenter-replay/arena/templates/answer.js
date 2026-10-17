// Template "answer": a free answer, checked. The answer is text.
//
// answer({
//   id, title, category, difficulty, concept, prompt, explanation,
//   scenario?: { kind, label?, lines: [...] },
//   placeholder?: '...',
//   accept: ['right answer', 'variant'],        // compared after normalize()
//   check?: (normalized, original) => boolean,   // instead of accept, for custom logic
// })
import { h, createCard, checkDefinition, cardHeader, scenario, confirmButton, lock, normalize, TEXT } from './common.js';

export { normalize };

export function answer(def) {
  checkDefinition(def, 'answer');
  if (!def.check && !(Array.isArray(def.accept) && def.accept.length > 0)) {
    throw new Error(TEXT.noAcceptOrCheck(def.id));
  }
  const accepted = new Set((def.accept || []).map(normalize));

  return createCard('answer', def, {
    validate: (given) => {
      if (typeof given !== 'string' || given.trim() === '') return false;
      const n = normalize(given);
      return def.check ? def.check(n, given) === true : accepted.has(n);
    },
    render(container, api) {
      const doc = container.ownerDocument;
      const field = h(doc, 'input', {
        class: 'answer-field', type: 'text', name: `answer-${def.id}`,
        autocomplete: 'off', spellcheck: 'false', maxlength: 200,
        placeholder: def.placeholder || TEXT.placeholder,
        attrs: { 'aria-label': TEXT.answer },
      });
      const confirm = confirmButton(doc, () => {
        if (!field.value || !String(field.value).trim()) return;
        lock(container);
        api.submit(String(field.value));
      });
      field.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') confirm.click();
      });
      container.replaceChildren(
        h(doc, 'article', { class: 'card card-answer', 'data-card': def.id },
          cardHeader(doc, def),
          scenario(doc, def.scenario),
          h(doc, 'div', { class: 'answer-row' }, field),
          h(doc, 'div', { class: 'card-actions' }, confirm),
        ),
      );
    },
  });
}
