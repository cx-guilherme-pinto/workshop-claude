// Implementacao minima de test()/assert para correr os testes dos cartoes no browser.
// Os resultados ficam em globalThis.__arenaResultados, lidos pelo botao "Correr testes".

const resultados = (globalThis.__arenaResultados ||= []);
const pendentes = (globalThis.__arenaPendentes ||= []);

function falha(msg) {
  const e = new Error(msg);
  e.name = 'AssertionError';
  throw e;
}

function igualProfundo(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => igualProfundo(a[k], b[k]));
}

export const assert = {
  ok: (v, msg) => v || falha(msg || 'esperado verdadeiro'),
  equal: (a, b, msg) => Object.is(a, b) || falha(msg || `esperado ${JSON.stringify(b)}, recebido ${JSON.stringify(a)}`),
  notEqual: (a, b, msg) => !Object.is(a, b) || falha(msg || `nao devia ser ${JSON.stringify(b)}`),
  deepEqual: (a, b, msg) => igualProfundo(a, b) || falha(msg || `esperado ${JSON.stringify(b)}, recebido ${JSON.stringify(a)}`),
  match: (s, re, msg) => re.test(s) || falha(msg || `${JSON.stringify(s)} nao corresponde a ${re}`),
  fail: (msg) => falha(msg || 'falhou'),
  throws: (fn, msg) => {
    try {
      fn();
    } catch {
      return;
    }
    falha(msg || 'esperava uma excecao');
  },
};

export function test(nome, fn) {
  const p = (async () => {
    const inicio = performance.now();
    try {
      await fn();
      resultados.push({ nome, ok: true, ms: performance.now() - inicio });
    } catch (e) {
      resultados.push({ nome, ok: false, ms: performance.now() - inicio, erro: String(e?.message || e) });
    }
  })();
  pendentes.push(p);
  return p;
}

export async function readSource(rel, base) {
  const r = await fetch(new URL(rel, base), { cache: 'no-store' });
  if (!r.ok) throw new Error(`nao foi possivel ler ${rel} (${r.status})`);
  return r.text();
}

export function novoContentor() {
  const c = document.createElement('div');
  c.hidden = true;
  document.body.appendChild(c);
  return c;
}
