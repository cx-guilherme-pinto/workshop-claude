// Merge seguro do ~/.claude/settings.json do utilizador.
// Regras: nunca apaga chaves alheias; acrescenta os hooks SubagentStop/Stop do workshop;
// so define a statusLine se nao existir nenhuma (ou com --substituir-statusline);
// so define a "language" (lingua das respostas do Claude, D-20) se a pessoa nao tiver uma;
// regista em "record" o que mudou, para o --desinstalar repor exatamente o anterior.
import { join } from 'node:path';

export const HOOKS = [
  ['SubagentStop', 'hooks/subagent-stop.mjs'],
  ['Stop', 'hooks/stop.mjs'],
];
export const STATUSLINE_FILE = 'statusline/statusline.mjs';
export const HOOK_TIMEOUT = 30;

export const fwd = (p) => String(p).replace(/\\/g, '/');
export const quote = (p) => `"${fwd(p)}"`;
export const command = (node, file) => `${quote(node)} ${quote(file)}`;

// Um comando e "nosso" se aponta para a pasta do kit instalado (~/.workshop-claude/kit/).
export function isOurs(cmd) {
  return typeof cmd === 'string' && fwd(cmd).includes('/.workshop-claude/kit/');
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export class SettingsError extends Error {
  constructor(message, code = 'E-CFG-05') {
    super(message);
    this.code = code;
  }
}

// Le o texto do settings.json. Vazio ou so espacos conta como {}.
export function parseSettings(text) {
  if (text === null || text === undefined || String(text).trim() === '') return {};
  let v;
  try {
    v = JSON.parse(String(text).replace(/^﻿/, ''));
  } catch (e) {
    throw new SettingsError(`settings.json nao e JSON valido: ${e.message}`);
  }
  if (!isObj(v)) throw new SettingsError('settings.json tem de ser um objeto JSON');
  return v;
}

export function expectedEntries({ node, kitDir }) {
  return {
    hooks: HOOKS.map(([event, file]) => ({ event, command: command(node, join(kitDir, file)) })),
    statusLine: { type: 'command', command: command(node, join(kitDir, STATUSLINE_FILE)), refreshInterval: 5 },
  };
}

// current: objeto atual. opts: { node, kitDir, env: {K: V}, substituirStatusline, language }
// prevRecord: registo de uma instalacao anterior (para manter os valores "anteriores" originais).
// Devolve { settings, record, changed, warnings }.
export function mergeSettings(current, opts, prevRecord = null) {
  const { node, kitDir, env = {}, substituirStatusline = false, language = null } = opts;
  if (!node || !kitDir) throw new Error('mergeSettings: faltam node e kitDir');
  const s = clone(current) || {};
  const before = JSON.stringify(s);
  const warnings = [];
  const prev = prevRecord || {};
  const record = {
    hooks_criado: prev.hooks_criado ?? !('hooks' in s),
    env_criado: prev.env_criado ?? !('env' in s),
    env_anterior: { ...(prev.env_anterior || {}) },
    env_valor: { ...(prev.env_valor || {}) },
    statusline_nossa: false,
    statusline_anterior: prev.statusline_anterior,
    statusline_mantida: false,
    language_criado: prev.language_criado ?? false,
    language_valor: prev.language_valor ?? null,
  };
  const exp = expectedEntries({ node, kitDir });

  if (s.hooks !== undefined && !isObj(s.hooks)) throw new SettingsError('"hooks" no settings.json nao e um objeto');
  s.hooks = s.hooks || {};
  for (const { event, command: cmd } of exp.hooks) {
    const file = cmd.split('/').pop(); // ex.: stop.mjs" (com a aspa final)
    if (s.hooks[event] !== undefined && !Array.isArray(s.hooks[event])) {
      throw new SettingsError(`"hooks.${event}" no settings.json nao e uma lista`);
    }
    let groups = s.hooks[event] || [];
    let found = false;
    const emptied = new Set();
    for (const g of groups) {
      if (!isObj(g) || !Array.isArray(g.hooks)) continue;
      const keep = [];
      for (const h of g.hooks) {
        if (isObj(h) && isOurs(h.command) && fwd(h.command).endsWith('/' + file)) {
          if (found) continue; // duplicado nosso: sai
          found = true;
          h.type = 'command';
          h.command = cmd;
          h.timeout = HOOK_TIMEOUT;
        }
        keep.push(h);
      }
      if (keep.length === 0 && g.hooks.length > 0) emptied.add(g);
      g.hooks = keep;
    }
    groups = groups.filter((g) => !emptied.has(g));
    if (!found) groups.push({ hooks: [{ type: 'command', command: cmd, timeout: HOOK_TIMEOUT }] });
    s.hooks[event] = groups;
  }

  const sl = s.statusLine;
  if (!sl) {
    s.statusLine = exp.statusLine;
    record.statusline_nossa = true;
  } else if (isObj(sl) && isOurs(sl.command)) {
    s.statusLine = exp.statusLine;
    record.statusline_nossa = true;
  } else if (substituirStatusline) {
    if (record.statusline_anterior === undefined) record.statusline_anterior = clone(sl);
    s.statusLine = exp.statusLine;
    record.statusline_nossa = true;
  } else {
    record.statusline_mantida = true;
    warnings.push('E-CFG-06');
  }

  if (s.env !== undefined && !isObj(s.env)) throw new SettingsError('"env" no settings.json nao e um objeto');
  s.env = s.env || {};
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined || v === null || v === '') continue;
    const val = String(v);
    if (s.env[k] !== val) {
      if (!(k in record.env_anterior)) record.env_anterior[k] = k in s.env ? s.env[k] : null;
      s.env[k] = val;
    } else if (!(k in record.env_anterior) && !(k in record.env_valor)) {
      // ja tinha exatamente este valor antes do workshop: nao e nosso, nao se remove
      continue;
    }
    record.env_valor[k] = val;
  }
  if (Object.keys(s.env).length === 0 && record.env_criado) delete s.env;

  // "language": so se nao houver nenhuma, ou se a que la esta foi posta pelo workshop e ninguem lhe mexeu.
  if (language) {
    const nossa = record.language_criado && s.language === record.language_valor;
    if (!('language' in s) || nossa) {
      s.language = language;
      record.language_criado = true;
      record.language_valor = language;
    }
  }

  return { settings: s, record, changed: JSON.stringify(s) !== before, warnings };
}

// Remove o que o workshop acrescentou, deixando tudo o resto como esta.
export function unmergeSettings(current, record = {}) {
  const s = clone(current) || {};
  if (isObj(s.hooks)) {
    for (const event of Object.keys(s.hooks)) {
      if (!Array.isArray(s.hooks[event])) continue;
      const groups = [];
      for (const g of s.hooks[event]) {
        if (isObj(g) && Array.isArray(g.hooks)) {
          const had = g.hooks.length;
          g.hooks = g.hooks.filter((h) => !(isObj(h) && isOurs(h.command)));
          if (had > 0 && g.hooks.length === 0) continue;
        }
        groups.push(g);
      }
      if (groups.length) s.hooks[event] = groups;
      else delete s.hooks[event];
    }
    if (Object.keys(s.hooks).length === 0 && record.hooks_criado !== false) delete s.hooks;
  }
  if (isObj(s.statusLine) && isOurs(s.statusLine.command)) {
    if (record.statusline_anterior) s.statusLine = clone(record.statusline_anterior);
    else delete s.statusLine;
  }
  if (isObj(s.env)) {
    for (const [k, prevVal] of Object.entries(record.env_anterior || {})) {
      const ours = record.env_valor?.[k];
      if (ours !== undefined && s.env[k] !== ours) continue; // a pessoa mudou-o depois: fica
      if (prevVal === null || prevVal === undefined) delete s.env[k];
      else s.env[k] = prevVal;
    }
    if (Object.keys(s.env).length === 0 && record.env_criado !== false) delete s.env;
  }
  if (record.language_criado && s.language === record.language_valor) delete s.language;
  return s;
}

// Verifica se o settings atual tem o que o workshop precisa (para o --check).
export function checkSettings(current, opts) {
  const exp = expectedEntries(opts);
  const faltam = [];
  for (const { event, command: cmd } of exp.hooks) {
    const ok = (current?.hooks?.[event] || []).some((g) => (g?.hooks || []).some((h) => h?.command === cmd));
    if (!ok) faltam.push(`hook ${event}`);
  }
  for (const [k, v] of Object.entries(opts.env || {})) {
    if (v && current?.env?.[k] !== String(v)) faltam.push(`env ${k}`);
  }
  const sl = current?.statusLine;
  const statusline = !sl ? 'falta' : isOurs(sl.command) ? (sl.command === exp.statusLine.command ? 'nossa' : 'desatualizada') : 'alheia';
  if (statusline === 'falta' || statusline === 'desatualizada') faltam.push('statusLine');
  return { ok: faltam.length === 0, faltam, statusline };
}

export function serialize(s) {
  return JSON.stringify(s, null, 2) + '\n';
}
