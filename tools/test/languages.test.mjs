// Machine language (installer/lib/languages.mjs) with the cases shared with bash and PowerShell (D-20).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linguaMaquina } from '../../installer/lib/languages.mjs';
import { normalizar } from '../../hooks/lib/language.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CASOS = JSON.parse(readFileSync(join(ROOT, 'tools/test/language-cases.json'), 'utf8'));

test('etiqueta, lingua do kit e definicao language de cada caso partilhado', () => {
  for (const c of CASOS.etiquetas) {
    const r = linguaMaquina(c.in);
    assert.deepEqual({ tag: r.tag, kit: r.kit, claude: r.claude }, { tag: c.tag, kit: c.kit, claude: c.claude }, JSON.stringify(c.in));
  }
});

test('a lingua do kit no instalador e a do hooks/lib/language.mjs coincidem', () => {
  for (const c of CASOS.etiquetas) {
    if (!c.in || /^(c|posix)$/i.test(c.in)) continue;
    assert.equal(normalizar(c.in), c.kit, c.in);
  }
});
