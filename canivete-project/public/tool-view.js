// The panel of one tool (#/tool/<id>): a field for each input, the result live as the person types and the errors
// inline. The tool only computes (tools/CONTRACT.md); the UI is all here, the same for the 4 templates:
//   - number, integer, text, multiline, date, choice and list fields;
//   - convert: the "direction" choice is a swap control (and the result moves to the value field);
//   - generate: "Generate again" passes a new seed;
//   - the result: fields as labelled rows, lists as lists, a number or a text.
import { el } from './dom.js';
import { formatNumber, TEMPLATE_NAME } from './formats.js';
import { T } from '/lib/texts.js';

const X = T.tool;

// Loads tools/<id>/tool.js (a new module for each version of the file). Throws with a readable message.
export async function loadTool(meta) {
  const mod = await import(`/tools/${meta.id}/tool.js?v=${encodeURIComponent(String(meta.version))}`);
  const tool = mod.default;
  if (!tool || typeof tool.run !== 'function' || !Array.isArray(tool.inputs)) throw new Error(X.notATool);
  return tool;
}

const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

// ---------- showing a value ----------

function show(v) {
  if (typeof v === 'number') return formatNumber(v);
  if (typeof v === 'boolean') return v ? X.yes : X.no;
  if (typeof v === 'string') return v === '' ? X.emptyText : v;
  if (Array.isArray(v)) return v.length ? v.map(show).join(', ') : X.emptyList;
  if (v === null || v === undefined) return '—';
  return JSON.stringify(v);
}

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

// The rows of an object result: the fields of the spec first (with their labels), then any other key.
function rowsOf(out, spec) {
  const fields = Array.isArray(spec?.fields) ? spec.fields : [];
  const rows = fields.filter((f) => Object.hasOwn(out, f.name)).map((f) => [f.label || f.name, out[f.name]]);
  const named = new Set(fields.map((f) => f.name));
  for (const [k, v] of Object.entries(out)) if (!named.has(k)) rows.push([k, v]);
  return rows;
}

function renderOutput(out, spec, { code }) {
  if (isPlainObject(out)) {
    return el('dl', { class: 'result-fields' }, ...rowsOf(out, spec).flatMap(([label, v]) => [
      el('dt', { text: label }),
      el('dd', { class: typeof v === 'number' ? 'number' : null, text: show(v) }),
    ]));
  }
  const label = spec?.label ? el('p', { class: 'result-label', text: spec.label }) : null;
  if (Array.isArray(out)) {
    const body = out.length
      ? el('ol', { class: `result-list${code ? ' is-code' : ''}`, role: 'list' }, ...out.map((x) => el('li', { text: show(x) })))
      : el('p', { class: 'note', text: X.emptyList });
    return [label, body];
  }
  if (typeof out === 'number' || typeof out === 'boolean') return [label, el('p', { class: 'result-number number', text: show(out) })];
  return [label, el('p', { class: `result-text${code ? ' is-code' : ''}`, text: show(out) })];
}

function plainText(out, spec) {
  if (isPlainObject(out)) return rowsOf(out, spec).map(([label, v]) => `${label}: ${show(v)}`).join('\n');
  if (Array.isArray(out)) return out.map(show).join('\n');
  return typeof out === 'string' ? out : show(out);
}

// ---------- fields ----------

function hint(def) {
  const parts = [];
  if (def.optional) parts.push(X.optional);
  // A choice always has a value (its default is already selected): no "empty: …" hint with an option's id.
  if (def.type !== 'choice' && def.default !== undefined && def.default !== '') parts.push(X.whenEmpty(def.default));
  const has = (k) => def[k] !== undefined && def[k] !== null;
  if (has('min') && has('max')) parts.push(X.range(formatNumber(Number(def.min)), formatNumber(Number(def.max))));
  else if (has('min')) parts.push(X.min(formatNumber(Number(def.min))));
  else if (has('max')) parts.push(X.max(formatNumber(Number(def.max))));
  if (def.type === 'list') parts.push(X.listHint);
  return parts.join(' · ');
}

function textField(def, id, value, onInput) {
  const common = { id, name: def.name, autocomplete: 'off', spellcheck: 'false', 'aria-describedby': `${id}-hint` };
  let input;
  if (def.type === 'multiline' || def.type === 'list') {
    input = el('textarea', { class: 'field-input field-area', rows: def.type === 'list' ? '4' : '6', ...common });
  } else if (def.type === 'date') {
    input = el('input', { class: 'field-input', type: 'date', ...common });
  } else {
    const numeric = def.type === 'number' || def.type === 'integer';
    input = el('input', { class: `field-input${numeric ? ' number' : ''}`, type: 'text', inputmode: def.type === 'integer' ? 'numeric' : numeric ? 'decimal' : null, autocapitalize: numeric ? 'off' : null, ...common });
  }
  input.value = value;
  input.addEventListener('input', onInput);
  input.addEventListener('change', onInput);
  return { input, get: () => input.value, set: (v) => (input.value = v), focus: () => input.focus() };
}

function choiceField(def, id, value, onInput) {
  const options = def.options || [];
  if (options.length > 4) {
    const select = el('select', { class: 'field-input field-select', id, name: def.name, 'aria-describedby': `${id}-hint` },
      ...options.map((o) => el('option', { value: o.value, text: o.label })));
    select.value = value;
    select.addEventListener('change', onInput);
    return { input: select, get: () => select.value, set: (v) => (select.value = v), focus: () => select.focus() };
  }
  let current = value;
  const buttons = options.map((o) => el('button', {
    class: 'segmented-option', type: 'button', 'data-value': o.value, attrs: { 'aria-pressed': o.value === current ? 'true' : 'false' },
    on: { click: () => { set(o.value); onInput(); } },
  }, o.label));
  const set = (v) => {
    current = v;
    for (const b of buttons) b.setAttribute('aria-pressed', b.dataset.value === v ? 'true' : 'false');
  };
  const group = el('div', { class: 'segmented', id, role: 'group', 'aria-labelledby': `${id}-label` }, ...buttons);
  return { input: group, get: () => current, set, focus: () => buttons[0]?.focus() };
}

// The convert template's "direction": the current direction and a button that swaps it.
function swapField(def, id, value, onSwap) {
  const options = def.options || [];
  let i = Math.max(0, options.findIndex((o) => o.value === value));
  const current = el('p', { class: 'swap-current', id: `${id}-value`, attrs: { 'aria-live': 'polite' }, text: options[i]?.label ?? '' });
  const button = el('button', { class: 'button swap-button', type: 'button', 'aria-describedby': `${id}-value`, on: { click: () => onSwap() } }, X.swap);
  const set = (v) => {
    i = Math.max(0, options.findIndex((o) => o.value === v));
    current.textContent = options[i]?.label ?? '';
  };
  return {
    input: el('div', { class: 'swap', id, role: 'group', 'aria-labelledby': `${id}-label` }, current, button),
    get: () => options[i]?.value ?? '',
    set,
    next: () => options[(i + 1) % options.length]?.value ?? '',
    focus: () => button.focus(),
  };
}

// ---------- the page ----------

// Draws the tool page in `container`. `meta` is the tool from /api/tools; `tool` is the loaded module (or null when
// tools/<id>/tool.js does not exist or did not load: then `loadError`). `keep` has the values to keep (a reload of the
// same tool). Returns { values() } for that.
export function renderToolPage(container, meta, { tool = null, loadError = null, keep = null, notice = null, back = '#/' } = {}) {
  const head = el('header', { class: 'tool-head' },
    el('p', { class: 'note tool-crumbs' }, [meta.category_name, TEMPLATE_NAME[meta.template] ?? meta.template, meta.id].filter(Boolean).join(' · '), meta.mine ? el('span', { class: 'tool-mine', text: T.app.mine }) : null),
    el('h1', { class: 'tool-title', text: tool?.title || meta.title }),
    meta.concept ? el('p', { class: 'tool-concept', text: meta.concept }) : null);
  const footer = el('p', { class: 'tool-footer' }, el('a', { class: 'link', href: back }, T.app.back), el('span', { class: 'note', text: X.spec(meta.id) }));

  if (!tool) {
    container.replaceChildren(el('section', { class: 'tool-page' }, head, notBuilt(meta, loadError), footer));
    return { values: () => keep || {} };
  }

  const inputs = tool.inputs;
  const values0 = { ...(meta.example || {}), ...(keep || {}) };
  const fields = [];
  let seed = newSeed();
  let last = null; // the last good output, for the swap and for "Copy"
  let swapField_ = null;
  const code = meta.category === 'dev';

  const resultBody = el('div', { class: 'result-body', 'data-state': 'empty' });
  const copied = el('span', { class: 'note result-copied', attrs: { 'aria-live': 'polite' } });
  const copyButton = el('button', { class: 'button button-small', type: 'button', disabled: true, on: { click: copy } }, X.copy);
  const again = tool.template === 'generate'
    ? el('button', { class: 'button button-primary button-small', type: 'button', on: { click: () => { seed = newSeed(); compute(); } } }, X.again)
    : null;

  const form = el('form', { class: 'tool-form', on: { submit: (ev) => ev.preventDefault() } },
    el('h2', { class: 'section-title', text: X.inputs }));
  for (const def of inputs) {
    const id = `in-${def.name}`;
    let value = values0[def.name] ?? '';
    if (def.type === 'choice' && !(def.options || []).some((o) => o.value === value)) value = def.default ?? def.options?.[0]?.value ?? '';
    const isSwap = tool.template === 'convert' && def.name === 'direction' && def.type === 'choice';
    const f = isSwap ? swapField(def, id, value, swap) : def.type === 'choice' ? choiceField(def, id, value, compute) : textField(def, id, value, compute);
    if (isSwap) swapField_ = f;
    fields.push({ def, ...f });
    const h = hint(def);
    const labelTag = isSwap || def.type === 'choice' ? 'p' : 'label';
    form.append(el('div', { class: `field field-${isSwap ? 'swap' : def.type}` },
      el(labelTag, { class: 'field-label', id: `${id}-label`, for: labelTag === 'label' ? id : null, text: isSwap ? `${def.label || X.direction}` : def.label || def.name }),
      f.input,
      el('p', { class: 'note field-hint', id: `${id}-hint`, text: h })));
  }

  const result = el('section', { class: 'tool-result', attrs: { 'aria-labelledby': 'result-title' } },
    el('h2', { class: 'section-title', id: 'result-title', text: X.result }),
    resultBody,
    el('div', { class: 'result-actions' }, again, copyButton, copied));

  container.replaceChildren(el('section', { class: 'tool-page' },
    head,
    notice ? el('p', { class: 'note tool-notice', text: notice }) : null,
    el('div', { class: 'tool-body' }, form, result),
    footer));

  function current() {
    return Object.fromEntries(fields.map((f) => [f.def.name, f.get()]));
  }

  // Nothing typed yet (only defaults and choices): a neutral hint instead of "Missing: …".
  function untouched(values) {
    return inputs.every((d) => d.type === 'choice' || d.default !== undefined || d.optional || String(values[d.name] ?? '').trim() === '')
      && inputs.some((d) => d.type !== 'choice' && d.default === undefined && !d.optional);
  }

  function setResult(state, ...children) {
    resultBody.dataset.state = state;
    resultBody.replaceChildren(...children.flat().filter(Boolean));
    copyButton.disabled = state !== 'ok';
    copied.textContent = '';
  }

  function compute() {
    const values = current();
    let r;
    try {
      r = tool.run(values, tool.template === 'generate' ? { seed } : {});
    } catch (e) {
      last = null;
      return setResult('error', el('p', { class: 'result-error', text: X.bug(String(e?.message || e).slice(0, 300)) }));
    }
    if (r && typeof r.error === 'string') {
      last = null;
      if (untouched(values)) return setResult('empty', el('p', { class: 'note', text: X.fillIn }));
      return setResult('error', el('p', { class: 'result-error', attrs: { role: 'alert' }, text: r.error }));
    }
    last = { output: r?.output };
    return setResult('ok', renderOutput(r?.output, meta.output, { code }));
  }

  // Swaps the direction; a single value result goes into the value field, so the swap reads as "and back".
  function swap() {
    if (!swapField_) return;
    const others = fields.filter((f) => f.def.name !== 'direction');
    const target = others.length === 1 && ['number', 'integer', 'text', 'multiline'].includes(others[0].def.type) ? others[0] : null;
    const out = last?.output;
    if (target && (typeof out === 'number' || typeof out === 'string')) target.set(typeof out === 'number' ? formatNumber(out) : out);
    swapField_.set(swapField_.next());
    compute();
  }

  async function copy() {
    if (!last) return;
    try {
      await navigator.clipboard.writeText(plainText(last.output, meta.output));
      copied.textContent = X.copied;
    } catch {
      copied.textContent = X.copyFailed;
    }
  }

  compute();
  return { values: current };
}

function notBuilt(meta, loadError) {
  const st = meta.state;
  const text = loadError ? X.didNotLoad(meta.id, String(loadError?.message || loadError).slice(0, 300)) : X.notBuiltText(meta.id);
  return el('div', { class: 'not-built', 'data-state': loadError ? 'red' : st === 'working' ? 'working' : st === 'failed' ? 'red' : 'todo' },
    el('p', { class: 'not-built-title', text: X.notBuiltTitle }),
    el('p', { class: 'not-built-wave', text: X.wave1 }),
    el('p', { class: 'not-built-text', text }),
    st === 'working' && !loadError ? el('p', { class: 'not-built-text', text: X.working }) : null,
    st === 'failed' && !loadError ? el('p', { class: 'not-built-text', text: X.failedForGood }) : null,
    (meta.inputs || []).length ? el('div', { class: 'not-built-inputs' },
      el('p', { text: X.willHave }),
      el('ul', { role: 'list' }, ...meta.inputs.map((d) => el('li', { text: `${d.label || d.name} (${d.type})` })))) : null);
}
