// Minimal DOM to test the cards' render() in Node, with no dependencies.
// Supports only what the templates use: createElement, createTextNode, append,
// textContent, setAttribute, classList, dataset, events and simple querySelectorAll.

class ClassList {
  constructor() {
    this.set = new Set();
  }
  add(...c) {
    c.forEach((x) => this.set.add(x));
  }
  remove(...c) {
    c.forEach((x) => this.set.delete(x));
  }
  toggle(c, force) {
    const on = force === undefined ? !this.set.has(c) : force;
    if (on) this.set.add(c);
    else this.set.delete(c);
    return on;
  }
  contains(c) {
    return this.set.has(c);
  }
  toString() {
    return [...this.set].join(' ');
  }
}

class FakeNode {
  constructor(doc, tag, text) {
    this.ownerDocument = doc;
    this.nodeType = tag ? 1 : 3;
    this.tagName = tag ? tag.toUpperCase() : undefined;
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = {};
    this.listeners = {};
    this.classList = new ClassList();
    this.dataset = {};
    this.style = {};
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this._text = text ?? '';
  }
  get children() {
    return this.childNodes.filter((n) => n.nodeType === 1);
  }
  get className() {
    return this.classList.toString();
  }
  set className(v) {
    this.classList = new ClassList();
    String(v).split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c));
  }
  appendChild(n) {
    if (typeof n === 'string') n = this.ownerDocument.createTextNode(n);
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this;
    this.childNodes.push(n);
    return n;
  }
  append(...ns) {
    ns.forEach((n) => this.appendChild(n));
  }
  replaceChildren(...ns) {
    this.childNodes.forEach((c) => (c.parentNode = null));
    this.childNodes = [];
    this.append(...ns);
  }
  removeChild(n) {
    this.childNodes = this.childNodes.filter((c) => c !== n);
    n.parentNode = null;
    return n;
  }
  insertBefore(n, ref) {
    if (n.parentNode) n.parentNode.removeChild(n);
    const i = this.childNodes.indexOf(ref);
    n.parentNode = this;
    if (i < 0) this.childNodes.push(n);
    else this.childNodes.splice(i, 0, n);
    return n;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  get textContent() {
    if (this.nodeType === 3) return this._text;
    return this.childNodes.map((c) => c.textContent).join('');
  }
  set textContent(v) {
    if (this.nodeType === 3) {
      this._text = String(v);
      return;
    }
    this.replaceChildren(this.ownerDocument.createTextNode(String(v)));
  }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === 'class') this.className = v;
    if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
  }
  getAttribute(k) {
    return k in this.attributes ? this.attributes[k] : null;
  }
  removeAttribute(k) {
    delete this.attributes[k];
  }
  hasAttribute(k) {
    return k in this.attributes;
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  removeEventListener(type, fn) {
    this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn);
  }
  dispatchEvent(ev) {
    ev.target ??= this;
    ev.currentTarget = this;
    (this.listeners[ev.type] || []).forEach((f) => f(ev));
    if (!ev._stop && this.parentNode) this.parentNode.dispatchEvent(ev);
    return true;
  }
  click() {
    if (this.disabled) return;
    if (this.tagName === 'INPUT' && (this.attributes.type === 'checkbox' || this.attributes.type === 'radio')) this.checked = !this.checked;
    this.dispatchEvent(fakeEvent('click'));
  }
  focus() {}
  blur() {}
  scrollIntoView() {}
  matches(sel) {
    return matchSimple(this, sel);
  }
  closest(sel) {
    let n = this;
    while (n && n.nodeType === 1) {
      if (matchSimple(n, sel)) return n;
      n = n.parentNode;
    }
    return null;
  }
  querySelectorAll(sel) {
    const out = [];
    const walk = (n) => {
      for (const c of n.children) {
        if (sel.split(',').some((s) => matchSimple(c, s.trim()))) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] ?? null;
  }
}

function fakeEvent(type, extra = {}) {
  return {
    type,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this._stop = true;
    },
    ...extra,
  };
}

// Simple selectors: "tag", ".class", "#id", "[attr]", "[attr=value]" and combinations without spaces.
function matchSimple(n, sel) {
  if (!sel || n.nodeType !== 1) return false;
  const re = /([a-zA-Z][\w-]*)|\.([\w-]+)|#([\w-]+)|\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]/g;
  let m;
  let any = false;
  while ((m = re.exec(sel))) {
    any = true;
    if (m[1] && n.tagName !== m[1].toUpperCase()) return false;
    if (m[2] && !n.classList.contains(m[2])) return false;
    if (m[3] && n.attributes.id !== m[3]) return false;
    if (m[4]) {
      if (!(m[4] in n.attributes)) return false;
      if (m[5] !== undefined && n.attributes[m[4]] !== m[5]) return false;
    }
  }
  return any;
}

export function createFakeDocument() {
  const doc = {
    createElement: (tag) => new FakeNode(doc, tag),
    createTextNode: (t) => new FakeNode(doc, null, String(t)),
    createDocumentFragment: () => new FakeNode(doc, '#fragment'),
  };
  doc.body = new FakeNode(doc, 'body');
  return doc;
}

export { fakeEvent };
