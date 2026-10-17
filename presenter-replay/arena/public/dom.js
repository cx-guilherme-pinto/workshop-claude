// Safe DOM for the app: only createElement, textContent and attributes from a list.
// The same as h() in templates/common.js, plus href (only paths of this server) and aria-current.
// Never HTML built from text.
import { T } from '/lib/texts.js';

const ALLOWED = new Set([
  'class', 'id', 'role', 'type', 'name', 'value', 'tabindex', 'for', 'placeholder', 'title',
  'hidden', 'disabled', 'lang', 'autocomplete', 'spellcheck', 'maxlength', 'inputmode', 'href', 'datetime',
]);

// Internal links only: "#/..." or "/..." (never "//another-site" or schemes).
function safeHref(v) {
  const s = String(v);
  const internal = s.startsWith('#') || (s.startsWith('/') && !s.startsWith('//'));
  if (!internal) throw new Error(T.card.linkNotAllowed(s));
  return s;
}

function set(node, name, value) {
  const ok = ALLOWED.has(name) || /^aria-[a-z]+$/.test(name) || /^data-[a-z][a-z0-9-]*$/.test(name);
  if (!ok) throw new Error(T.card.attributeNotAllowed(name));
  node.setAttribute(name, name === 'href' ? safeHref(value) : String(value));
}

// el('a', { class: 'x', href: '#/', on: { click: fn } }, 'text', child)
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'on') {
      for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
    } else if (k === 'text') {
      node.textContent = String(v);
    } else if (k === 'attrs') {
      for (const [a, av] of Object.entries(v)) if (av !== undefined && av !== null && av !== false) set(node, a, av === true ? '' : av);
    } else {
      set(node, k, v === true ? '' : v);
    }
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c === undefined || c === null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

// Restarts a CSS animation (a square changing state, for example).
export function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

export const VALID_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
