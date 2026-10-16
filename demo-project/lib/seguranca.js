// Analise estatica simples do codigo-fonte dos cartoes e da app.
// Remove strings e comentarios (o texto dos desafios pode falar de "innerHTML" ou "eval"
// sem ser codigo) e procura padroes perigosos no que sobra. Os nomes dos problemas vem de ./textos.js.
import { T } from './textos.js';

const S = T.seguranca;

// Remove comentarios e o conteudo de strings, mantendo as expressoes ${...} dos template literals.
export function semStringsNemComentarios(src) {
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
          // copiar a expressao (codigo real) ate ao } correspondente
          i += 2;
          let depth = 1;
          let expr = '';
          while (i < n && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            if (depth > 0) expr += src[i];
            i++;
          }
          out += ' ' + semStringsNemComentarios(expr) + ' ';
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

const PERIGOSOS = [
  [/\binnerHTML\b/, 'innerHTML'],
  [/\bouterHTML\b/, 'outerHTML'],
  [/\binsertAdjacentHTML\b/, 'insertAdjacentHTML'],
  [/\bdocument\s*\.\s*write(ln)?\b/, 'document.write'],
  [/\beval\s*\(/, 'eval('],
  [/\bnew\s+Function\b|\bFunction\s*\(/, 'Function('],
  [/\bset(Timeout|Interval)\s*\(\s*(""|''|``)/, S.setTimeoutString],
  [/\bsrcdoc\b/, 'srcdoc'],
  [/\bcreateContextualFragment\b/, 'createContextualFragment'],
  [/\.\s*on[a-z]+\s*=/, S.atribuicaoOn],
];

// Padroes que so fazem sentido verificar no texto original (dentro de strings).
const PERIGOSOS_EM_STRINGS = [
  [/setAttribute\s*\(\s*['"`]on[a-z]+/i, "setAttribute('on...')"],
  [/javascript\s*:/i, 'URL javascript:'],
];

export function problemasDeSeguranca(src, { emStrings = true } = {}) {
  const codigo = semStringsNemComentarios(src);
  const out = [];
  for (const [re, nome] of PERIGOSOS) if (re.test(codigo)) out.push(nome);
  if (emStrings) {
    const semComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const [re, nome] of PERIGOSOS_EM_STRINGS) if (re.test(semComentarios)) out.push(nome);
  }
  return out;
}

// Regras extra para card.js: so dados + validate(); o render e dos templates.
const PROIBIDOS_NO_CARTAO = [
  [/\bdocument\b/, S.document],
  [/\bwindow\b/, S.window],
  [/\bfetch\s*\(|XMLHttpRequest|WebSocket|navigator\s*\.\s*sendBeacon/, S.rede],
  [/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\s*\.\s*cookie/, S.armazenamento],
  [/\bimport\s*\(/, S.importDinamico],
];

export function problemasNoCartao(src) {
  const codigo = semStringsNemComentarios(src);
  const out = problemasDeSeguranca(src, { emStrings: false });
  for (const [re, nome] of PROIBIDOS_NO_CARTAO) if (re.test(codigo)) out.push(nome);
  // Imports so de templates/ e lib/ do proprio projeto.
  for (const m of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
    const alvo = m[1];
    if (!/^\.\.\/\.\.\/(templates|lib)\/[\w-]+\.js$/.test(alvo)) out.push(S.importProibido(alvo));
  }
  return out;
}
