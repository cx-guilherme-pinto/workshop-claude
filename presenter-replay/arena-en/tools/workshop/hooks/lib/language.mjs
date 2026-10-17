// Language of the kit texts: 'pt' or 'en' (D-20). Used by the hooks, the statusline, the orchestrator
// and the Arena tools. The kit only has texts in Portuguese and in English: any other language
// (Hindi and Hebrew included) falls back to English. Claude's answers follow Claude Code's "language"
// setting, which the setup writes from the machine language.
//
// Order:
//   1. WORKSHOP_LANG (for tests or to force it), only when it is pt, en, hi or he (see forcedLanguage);
//   2. language.json at the root of the engine, written at install time (~/.workshop-claude/kit/language.json,
//      <arena>/tools/workshop/language.json); older installs have lingua.json, which is still read;
//   3. the system locale (LC_ALL, LC_MESSAGES, LANG and, last, Node's Intl);
//   4. 'en'.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LANGUAGES = ['pt', 'en'];
export const ENGINE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// The file the installers write next to the engine (and the name older installs used).
export const LANGUAGE_FILE = 'language.json';
export const LEGACY_LANGUAGE_FILE = 'lingua.json';

// 'pt-PT', 'pt_BR.UTF-8', 'pt' -> 'pt'; 'en-US', 'he-IL', 'hi' -> 'en'; empty, 'C', 'POSIX' and what is not
// a language tag ('UTF-8', 'brasil', 'Português', 'pt-*', 'en,pt') -> null (no information).
export function normalize(tag) {
  const t = String(tag ?? '').trim().toLowerCase().replace(/_/g, '-').replace(/[.@].*$/, '');
  if (!t || /^(c|posix)$/.test(t)) return null;
  if (!/^[a-z]{2,3}(-[a-z0-9]{0,8})*$/.test(t) || /^utf(-|$)/.test(t)) return null;
  return /^pt(-|$)/.test(t) ? 'pt' : 'en';
}

// WORKSHOP_LANG only forces the kit language when it is one of the workshop languages (pt, en, hi, he):
// a typo such as 'br' or 'brasil' left in a .zshrc must not turn the kit to English over language.json.
export function forcedLanguage(value) {
  const t = String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
  return ['pt', 'en', 'hi', 'he', 'iw'].includes(t.split(/[-.@]/)[0]) ? normalize(t) : null;
}

// The kit language stored in <root>/language.json (or the legacy lingua.json), or null.
export function storedLanguage(root = ENGINE_ROOT) {
  for (const f of [LANGUAGE_FILE, LEGACY_LANGUAGE_FILE]) {
    try {
      const j = JSON.parse(readFileSync(join(root, f), 'utf8'));
      const l = normalize(j.language ?? j.lingua);
      if (l) return l;
    } catch {
      /* no file: development repository or an older install */
    }
  }
  return null;
}

export function language({ env = process.env, raiz, root = raiz ?? ENGINE_ROOT } = {}) {
  const forced = forcedLanguage(env.WORKSHOP_LANG);
  if (forced) return forced;
  const stored = storedLanguage(root);
  if (stored) return stored;
  for (const k of ['LC_ALL', 'LC_MESSAGES', 'LANG']) {
    const l = normalize(env[k]);
    if (l) return l;
  }
  try {
    return normalize(Intl.DateTimeFormat().resolvedOptions().locale) || 'en';
  } catch {
    return 'en';
  }
}

// Picks the dictionary of the current language: texts({ pt: {...}, en: {...} }).
export function texts(dic, l = language()) {
  return dic[l] ?? dic.en;
}

// Older names (the Arena tools and earlier kit code import these).
export const LINGUAS = LANGUAGES;
export const RAIZ_MOTOR = ENGINE_ROOT;
export const normalizar = normalize;
export const lingua = language;
export const textos = texts;
