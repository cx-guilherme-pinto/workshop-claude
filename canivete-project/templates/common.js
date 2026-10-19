// What the 4 templates share (tools/CONTRACT.md): reading the inputs as the person typed them, the ToolError a
// tool throws for an input it does not accept, and the tool object the shell and the tests use:
//
//   { id, title, template, inputs, run(values, options?) → { output } | { error } }
//
// The inputs arrive as text (what is in the fields). Types: number (accepts "1,5" and "1.5"), integer, text,
// multiline, date (YYYY-MM-DD), choice (one of options[].value), list (items separated by commas or lines).
// An input that cannot be read gives { error } with the message of lib/texts.js; the tool's own function never
// sees it. A ToolError thrown by the tool gives { error: its message }. Any other exception is a bug of the tool
// and is not hidden (the test shows it).
import { T } from '../lib/texts.js';

export class ToolError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolError';
  }
}

const TYPES = new Set(['number', 'integer', 'text', 'multiline', 'date', 'choice', 'list']);
const MAX_TEXT = 20000;

export function parseNumber(s) {
  const t = String(s).trim().replace(/\s/g, '');
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(t)) return NaN;
  return Number(t.replace(',', '.'));
}

function parseOne(def, raw) {
  const label = def.label || def.name;
  const s = raw === undefined || raw === null ? '' : String(raw);
  const empty = s.trim() === '';
  if (empty) {
    if (def.default !== undefined) return parseOne(def, def.default);
    if (def.optional) return def.type === 'list' ? [] : null;
    throw new ToolError(T.input.required(label));
  }
  switch (def.type) {
    case 'number':
    case 'integer': {
      const n = parseNumber(s);
      if (!Number.isFinite(n)) throw new ToolError(T.input.number(label));
      if (def.type === 'integer' && !Number.isInteger(n)) throw new ToolError(T.input.integer(label));
      if (def.min !== undefined && n < def.min) throw new ToolError(T.input.min(label, def.min));
      if (def.max !== undefined && n > def.max) throw new ToolError(T.input.max(label, def.max));
      return n;
    }
    case 'date': {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
      // setUTCFullYear, not Date.UTC: Date.UTC turns the years 0 to 99 into 1900 to 1999
      const d = m && new Date(0);
      if (d) d.setUTCFullYear(+m[1], +m[2] - 1, +m[3]);
      if (!d || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) throw new ToolError(T.input.date(label));
      return s.trim();
    }
    case 'choice': {
      const ok = (def.options || []).some((o) => o.value === s.trim());
      if (!ok) throw new ToolError(T.input.choice(label));
      return s.trim();
    }
    case 'list': {
      const items = s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
      if (!items.length) throw new ToolError(T.input.list(label));
      return items;
    }
    default:
      if (s.length > MAX_TEXT) throw new ToolError(T.input.tooLong(label));
      return def.type === 'text' ? s.trim() : s;
  }
}

// Reads every input of the definition from `values` (an object of strings). Throws ToolError.
export function readInputs(inputs, values = {}) {
  const out = {};
  for (const def of inputs) out[def.name] = parseOne(def, values?.[def.name]);
  return out;
}

// The tool object of one template. `fn(parsed, extra)` computes the output.
export function makeTool(template, spec, extra = {}) {
  const { id, title, inputs, run: fn } = spec || {};
  if (typeof id !== 'string' || !id) throw new Error('the tool needs an id');
  if (!Array.isArray(inputs) || !inputs.every((d) => d && typeof d.name === 'string' && TYPES.has(d.type))) throw new Error(`${id}: inputs must be [{ name, type, label }] with a known type`);
  if (typeof fn !== 'function') throw new Error(`${id}: the tool needs a run(values) function`);
  return {
    id,
    title,
    template,
    inputs,
    ...(spec.output ? { output: spec.output } : {}),
    ...extra.fields,
    run(values, options = {}) {
      let parsed;
      try {
        parsed = readInputs(inputs, values);
        const output = fn(parsed, extra.context ? extra.context(options) : options);
        return { output };
      } catch (e) {
        if (e instanceof ToolError) return { error: e.message };
        throw e;
      }
    },
  };
}
