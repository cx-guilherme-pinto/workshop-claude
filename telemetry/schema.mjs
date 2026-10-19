// Validation of telemetry events against allowlist.json (docs/pt/WORKSHOP-V2-SPEC.md, section 6.4).
// Pure functions without Node APIs: the panel server (the Cloudflare Worker too) uses the same code.
// A field that is not in the allowlist, or has a value outside its type, is dropped; an unknown event is refused.

const INT_MAX = 100000;
const NUM_MAX = 1000;
const CATALOG_ID = /^(?:[a-z]{2}-\d{2}|my-\d{2})$/;
const NICKNAME = /^[A-Za-z0-9 _-]{1,16}$/;
const MISSING = Symbol('missing');

// The value if it fits the type, otherwise MISSING.
export function checkValue(type, v) {
  if (Array.isArray(type)) return type.includes(v) ? v : MISSING;
  switch (type) {
    case 'int':
      return Number.isInteger(v) && v >= 0 && v <= INT_MAX ? v : MISSING;
    case 'int_or_null':
      return v === null || (Number.isInteger(v) && v >= 0 && v <= INT_MAX) ? v : MISSING;
    case 'num':
      return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= NUM_MAX ? Math.round(v * 1e6) / 1e6 : MISSING;
    case 'catalog_id':
      return typeof v === 'string' && CATALOG_ID.test(v) ? v : MISSING;
    case 'nickname':
      return typeof v === 'string' && NICKNAME.test(v) ? v : MISSING;
    default:
      return MISSING;
  }
}

function pick(spec = {}, values = {}) {
  const out = {};
  for (const [k, type] of Object.entries(spec)) {
    if (!values || !Object.prototype.hasOwnProperty.call(values, k)) continue;
    const v = checkValue(type, values[k]);
    if (v !== MISSING) out[k] = v;
  }
  return out;
}

// { fields, local, localOnly } with only the allowed fields; throws on an unknown event.
export function sanitize(allow, ev, fields = {}, local = {}) {
  const spec = allow?.events?.[ev];
  if (!spec) throw new Error(`unknown telemetry event: ${ev}`);
  return { fields: pick(spec.fields, fields), local: pick(spec.local, local), localOnly: spec.local_only === true };
}

const ROOMS = new Set(['A', 'B']);
const ID = /^[0-9a-f]{32}$/;
const WS_CODE = /^[A-Za-z0-9_-]{1,40}$/;
const KIT = /^[A-Za-z0-9._-]{1,40}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

// An event as it leaves the machine (and as the server accepts it), or null if it does not fit.
export function envelope(allow, { ws, room, p, kit, ev, t }, fields) {
  if (!WS_CODE.test(ws || '') || !ROOMS.has(room) || !ID.test(p || '') || !KIT.test(kit || '') || !ISO.test(t || '')) return null;
  const e = { v: 1, ws, room, p, ev, t, kit, ...fields };
  return JSON.stringify(e).length <= (allow.max_bytes || 512) ? e : null;
}

// Server side: an event received from a laptop, checked again field by field. Returns the clean event or null.
export function checkIncoming(allow, e, wsCode) {
  if (!e || typeof e !== 'object' || Array.isArray(e) || e.v !== 1 || e.ws !== wsCode) return null;
  const spec = allow?.events?.[e.ev];
  if (!spec || spec.local_only) return null;
  const known = new Set([...(allow.envelope || []), ...Object.keys(spec.fields || {})]);
  if (Object.keys(e).some((k) => !known.has(k))) return null;
  const fields = pick(spec.fields, e);
  if (Object.keys(fields).length !== Object.keys(e).filter((k) => !(allow.envelope || []).includes(k)).length) return null;
  return envelope(allow, e, fields);
}
