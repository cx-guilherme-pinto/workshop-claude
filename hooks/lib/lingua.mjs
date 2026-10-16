// Lingua dos textos do kit: 'pt' ou 'en' (D-20). Usada pelos hooks, pela statusline, pelo orquestrador
// e pelas ferramentas da Arena. O kit so tem textos em portugues e em ingles: qualquer outra lingua
// (hindi e hebraico incluidos) fica em ingles. A resposta do Claude segue a definicao "language" do
// Claude Code, que o setup grava com a lingua da maquina.
//
// Ordem:
//   1. WORKSHOP_LANG (para testes ou para forcar);
//   2. lingua.json na raiz do motor, escrito na instalacao (~/.workshop-claude/kit/lingua.json,
//      <arena>/tools/workshop/lingua.json);
//   3. locale do sistema (LC_ALL, LC_MESSAGES, LANG e, por fim, o Intl do Node);
//   4. 'en'.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LINGUAS = ['pt', 'en'];
export const RAIZ_MOTOR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// 'pt-PT', 'pt_BR.UTF-8', 'pt' -> 'pt'; 'en-US', 'he-IL', 'hi' -> 'en'; vazio, 'C' e 'POSIX' -> null (sem informacao).
export function normalizar(tag) {
  const t = String(tag ?? '').trim().toLowerCase().replace(/_/g, '-');
  if (!t || /^(c|posix)([.@]|$)/.test(t)) return null;
  return /^pt([-.@]|$)/.test(t) ? 'pt' : 'en';
}

export function lingua({ env = process.env, raiz = RAIZ_MOTOR } = {}) {
  const forcada = normalizar(env.WORKSHOP_LANG);
  if (forcada) return forcada;
  try {
    const l = normalizar(JSON.parse(readFileSync(join(raiz, 'lingua.json'), 'utf8')).lingua);
    if (l) return l;
  } catch {
    /* sem lingua.json: repositorio de desenvolvimento ou instalacao antiga */
  }
  for (const k of ['LC_ALL', 'LC_MESSAGES', 'LANG']) {
    const l = normalizar(env[k]);
    if (l) return l;
  }
  try {
    return normalizar(Intl.DateTimeFormat().resolvedOptions().locale) || 'en';
  } catch {
    return 'en';
  }
}

// Escolhe o dicionario da lingua atual: textos({ pt: {...}, en: {...} }).
export function textos(dic, l = lingua()) {
  return dic[l] ?? dic.en;
}
