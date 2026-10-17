// Formats in the Arena's language (lib/texts.js), the same as the orchestrator's task table.
import { T } from '/lib/texts.js';

// Decimal comma in Portuguese, point in English.
export function decimal(text) {
  return String(text).replace('.', T.decimal);
}

// "US$ 0,0042" below 10 cents, "US$ 1,23" above.
export function usd(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return 'US$ ' + decimal(v.toFixed(v < 0.1 ? 4 : 2));
}

// Totals: always with 2 decimals ("US$ 0,00").
export function usdTotal(v) {
  return 'US$ ' + decimal((Number(v) || 0).toFixed(2));
}

// "42 s", "3 min 05 s".
export function duration(s) {
  if (s === null || s === undefined || Number.isNaN(s)) return '—';
  if (s < 60) return `${Math.round(s)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;
}

// Clock for the header: "4:07", "1:02:30".
export function clock(s) {
  const t = Math.max(0, Math.floor(Number(s) || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function modelName(m) {
  if (!m) return '—';
  const x = String(m).toLowerCase();
  if (x.includes('haiku')) return 'Haiku';
  if (x.includes('sonnet')) return 'Sonnet';
  if (x.includes('opus')) return 'Opus';
  if (x.includes('fable')) return 'Fable';
  return String(m);
}

export const STATE_NAME = T.states;

export const TEMPLATE_NAME = T.templates;
