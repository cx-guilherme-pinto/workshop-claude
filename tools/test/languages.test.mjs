// Machine language (installer/lib/languages.mjs) with the cases shared with bash and PowerShell (D-20).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { etiqueta, linguaMaquina } from '../../installer/lib/languages.mjs';
import { normalizar, forcedLanguage } from '../../hooks/lib/language.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CASOS = JSON.parse(readFileSync(join(ROOT, 'tools/test/language-cases.json'), 'utf8'));

test('etiqueta, lingua do kit e definicao language de cada caso partilhado', () => {
  for (const c of CASOS.etiquetas) {
    const r = linguaMaquina(c.in);
    assert.deepEqual({ tag: r.tag, kit: r.kit, claude: r.claude }, { tag: c.tag, kit: c.kit, claude: c.claude }, JSON.stringify(c.in));
  }
});

test('o que nao e uma etiqueta de lingua nao da informacao (casos invalidas)', () => {
  for (const c of CASOS.invalidas) {
    assert.equal(etiqueta(c.in), '', JSON.stringify(c.in));
    const r = linguaMaquina(c.in);
    assert.deepEqual({ tag: r.tag, kit: r.kit, claude: r.claude }, { tag: 'en', kit: 'en', claude: 'English' }, JSON.stringify(c.in));
    assert.equal(normalizar(c.in), null, JSON.stringify(c.in));
    assert.equal(forcedLanguage(c.in), null, JSON.stringify(c.in));
  }
});

test('WORKSHOP_LANG so forca a lingua do kit nas linguas do workshop', () => {
  for (const [w, l] of [['pt-BR', 'pt'], ['pt', 'pt'], ['en', 'en'], ['he-IL', 'en'], ['iw', 'en'], ['hi', 'en'], ['br', null], ['es', null], ['', null]]) {
    assert.equal(forcedLanguage(w), l, w);
  }
});

test('a lingua do kit no instalador e a do hooks/lib/language.mjs coincidem', () => {
  for (const c of CASOS.etiquetas) {
    if (!c.in || /^(c|posix)$/i.test(c.in)) continue;
    assert.equal(normalizar(c.in), c.kit, c.in);
  }
});
