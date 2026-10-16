// Lingua da maquina (installer/lib/linguas.mjs) com os casos partilhados com o bash e o PowerShell (D-20).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linguaMaquina } from '../../installer/lib/linguas.mjs';
import { normalizar } from '../../hooks/lib/lingua.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CASOS = JSON.parse(readFileSync(join(ROOT, 'tools/test/lingua-cases.json'), 'utf8'));

test('etiqueta, lingua do kit e definicao language de cada caso partilhado', () => {
  for (const c of CASOS.etiquetas) {
    const r = linguaMaquina(c.in);
    assert.deepEqual({ tag: r.tag, kit: r.kit, claude: r.claude }, { tag: c.tag, kit: c.kit, claude: c.claude }, JSON.stringify(c.in));
  }
});

test('a lingua do kit no instalador e a do hooks/lib/lingua.mjs coincidem', () => {
  for (const c of CASOS.etiquetas) {
    if (!c.in || /^(c|posix)$/i.test(c.in)) continue;
    assert.equal(normalizar(c.in), c.kit, c.in);
  }
});
