// Simple static analysis of the source code of the tools and of the app (adapted from the Security Arena).
// Removes strings and comments (the text of a challenge may talk about "innerHTML" or "eval"
// without being code) and looks for dangerous patterns in what is left. The problem names come from ./texts.js.
import { T } from './texts.js';

const S = T.security;

// Removes comments and the content of strings, keeping the ${...} expressions of template literals.
export function stripStringsAndComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && d === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      out += c + c;
      i++;
      while (i < n && src[i] !== c) {
        if (src[i] === '\\') i++;
        if (src[i] === '\n') break;
        i++;
      }
      i++;
      continue;
    }
    if (c === '`') {
      out += '``';
      i++;
      while (i < n && src[i] !== '`') {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === '$' && src[i + 1] === '{') {
          // copy the expression (real code) up to the matching }
          i += 2;
          let depth = 1;
          let expr = '';
          while (i < n && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            if (depth > 0) expr += src[i];
            i++;
          }
          out += ' ' + stripStringsAndComments(expr) + ' ';
          continue;
        }
        i++;
      }
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const DANGEROUS = [
  [/\binnerHTML\b/, 'innerHTML'],
  [/\bouterHTML\b/, 'outerHTML'],
  [/\binsertAdjacentHTML\b/, 'insertAdjacentHTML'],
  [/\bdocument\s*\.\s*write(ln)?\b/, 'document.write'],
  [/\beval\s*\(/, 'eval('],
  [/\bnew\s+Function\b|\bFunction\s*\(/, 'Function('],
  [/\bset(Timeout|Interval)\s*\(\s*(""|''|``)/, S.setTimeoutString],
  [/\bsrcdoc\b/, 'srcdoc'],
  [/\bcreateContextualFragment\b/, 'createContextualFragment'],
  [/\.\s*on[a-z]+\s*=/, S.onAssignment],
];

// Patterns that only make sense in the original text (inside strings).
const DANGEROUS_IN_STRINGS = [
  [/setAttribute\s*\(\s*['"`]on[a-z]+/i, "setAttribute('on...')"],
  [/javascript\s*:/i, 'URL javascript:'],
];

export function securityProblems(src, { inStrings = true } = {}) {
  const code = stripStringsAndComments(src);
  const out = [];
  for (const [re, name] of DANGEROUS) if (re.test(code)) out.push(name);
  if (inStrings) {
    const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const [re, name] of DANGEROUS_IN_STRINGS) if (re.test(noComments)) out.push(name);
  }
  return out;
}

// Extra rules for tool.js: only computation; the UI belongs to the shell, the parsing to the templates.
const FORBIDDEN_IN_TOOL = [
  [/\bdocument\b/, S.document],
  [/\bwindow\b/, S.window],
  [/\bfetch\s*\(|XMLHttpRequest|WebSocket|navigator\s*\.\s*sendBeacon/, S.network],
  [/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\s*\.\s*cookie/, S.storage],
  [/\bimport\s*\(/, S.dynamicImport],
  [/\bMath\s*\.\s*random\b|\bcrypto\s*\.\s*(getRandomValues|randomUUID)\b/, S.globalRandom],
];

export function toolProblems(src) {
  const code = stripStringsAndComments(src);
  const out = securityProblems(src, { inStrings: false });
  for (const [re, name] of FORBIDDEN_IN_TOOL) if (re.test(code)) out.push(name);
  // Imports only from the project's own templates/ and lib/.
  for (const m of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
    const target = m[1];
    if (!/^\.\.\/\.\.\/(templates|lib)\/[\w-]+\.js$/.test(target)) out.push(S.importNotAllowed(target));
  }
  return out;
}
