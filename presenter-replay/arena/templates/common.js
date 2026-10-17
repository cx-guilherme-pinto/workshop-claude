// Shared base of the 4 card templates.
// Golden rule: only textContent and attributes from an allow list. Never HTML built from data.
// The texts (buttons, labels, errors) come from ../lib/texts.js, in the Arena's language.
import { T } from '../lib/texts.js';

export const TEXT = T.card;

const ALLOWED_ATTRIBUTES = new Set([
  'class', 'id', 'role', 'type', 'name', 'value', 'tabindex', 'for', 'placeholder', 'title',
  'draggable', 'disabled', 'hidden', 'lang', 'autocomplete', 'spellcheck', 'maxlength', 'inputmode',
]);

// h(doc, 'button', { class: 'x', on: { click: fn }, attrs: { 'aria-pressed': 'false' } }, 'text', child)
export function h(doc, tag, props = {}, ...children) {
  const el = doc.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'on') {
      for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    } else if (k === 'text') {
      el.textContent = String(v);
    } else if (k === 'attrs') {
      for (const [a, av] of Object.entries(v)) setAttribute(el, a, av);
    } else {
      setAttribute(el, k, v === true ? '' : v);
    }
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? doc.createTextNode(String(c)) : c);
  }
  return el;
}

function setAttribute(el, name, value) {
  const ok = ALLOWED_ATTRIBUTES.has(name) || /^aria-[a-z]+$/.test(name) || /^data-[a-z][a-z0-9-]*$/.test(name);
  if (!ok) throw new Error(TEXT.attributeNotAllowed(name));
  el.setAttribute(name, String(value));
}

// Normalizes text answers: lowercase, no accents, no extra spaces and no punctuation at the ends.
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s"'.,;:!?()[\]{}]+|[\s"'.,;:!?()[\]{}]+$/g, '');
}

const REQUIRED_FIELDS = ['id', 'title', 'category', 'difficulty', 'prompt', 'explanation'];

export function checkDefinition(def, template, extra = []) {
  for (const f of [...REQUIRED_FIELDS, ...extra]) {
    if (def[f] === undefined || def[f] === null || def[f] === '') throw new Error(TEXT.missingField(def.id ?? '?', template, f));
  }
  if (!/^[a-z0-9-]+$/.test(def.id)) throw new Error(TEXT.invalidId(def.id));
}

// Builds the contract object (see cards/CONTRACT.md).
export function createCard(template, def, { render, validate }) {
  return Object.freeze({
    id: def.id,
    title: def.title,
    category: def.category,
    difficulty: def.difficulty,
    template,
    concept: def.concept ?? '',
    explanation: def.explanation,
    render,
    validate: (answer) => {
      try {
        return validate(answer) === true;
      } catch {
        return false;
      }
    },
  });
}

// Header shared by every card.
export function cardHeader(doc, def) {
  return h(doc, 'header', { class: 'card-header' },
    h(doc, 'h2', { class: 'card-title', text: def.title }),
    h(doc, 'p', { class: 'card-prompt', text: def.prompt }),
  );
}

// Optional scenario: an email, a URL, a text excerpt or a chat, always as text.
export function scenario(doc, sc) {
  if (!sc) return null;
  const lines = Array.isArray(sc.lines) ? sc.lines : [String(sc.text ?? '')];
  return h(doc, 'figure', { class: `scenario scenario-${sc.kind || 'text'}` },
    sc.label ? h(doc, 'figcaption', { class: 'scenario-label', text: sc.label }) : null,
    h(doc, 'div', { class: 'scenario-body' }, ...lines.map((l) => h(doc, 'p', { class: 'scenario-line', text: l }))),
  );
}

export function confirmButton(doc, onConfirm) {
  return h(doc, 'button', { class: 'button button-primary', type: 'button', on: { click: onConfirm } }, TEXT.confirm);
}

export function lock(container) {
  for (const b of container.querySelectorAll('button, input')) b.disabled = true;
}
