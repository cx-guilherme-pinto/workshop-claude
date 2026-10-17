// Catalogos do setup em pt e en (D-20): o setup mostra o en; o pt gera o docs/TROUBLESHOOTING.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogDiff, usedCodesAndKeys } from '../check-repo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ler = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));

test('messages.pt.json e messages.en.json tem a mesma estrutura e os mesmos marcadores', () => {
  assert.deepEqual(catalogDiff(ler('setup/messages.pt.json'), ler('setup/messages.en.json')), []);
});

test('catalogDiff apanha chaves, listas e marcadores diferentes', () => {
  const a = { ui: { x: 'Passo {N}', y: 'a' }, erros: { 'E-A-01': { so: 'mac', fazer: ['1', '2'] } } };
  const b = { ui: { x: 'Step', z: 'b' }, erros: { 'E-A-01': { so: 'todos', fazer: ['1'] } } };
  const d = catalogDiff(a, b).join('\n');
  assert.match(d, /\$\.ui\.x: marcadores \{N\} != -/);
  assert.match(d, /\$\.ui\.y: falta no segundo/);
  assert.match(d, /\$\.ui\.z: falta no primeiro/);
  assert.match(d, /\$\.erros\.E-A-01\.so: mac != todos/);
  assert.match(d, /\$\.erros\.E-A-01\.fazer: listas diferentes/);
});

test('o setup usa so chaves do catalogo ingles e nao tem frases em portugues fora dele', () => {
  const en = ler('setup/messages.en.json');
  for (const [f, kind] of [['setup/setup-mac.sh', 'sh'], ['setup/setup-windows.ps1', 'ps1']]) {
    const text = readFileSync(join(ROOT, f), 'utf8');
    const { codes, keys } = usedCodesAndKeys(text, kind);
    for (const c of codes) assert.ok(en.erros[c], `${f}: ${c}`);
    for (const k of keys) assert.ok(en.ui[k] !== undefined, `${f}: ${k}`);
    assert.match(text, /messages\.en\.json/, f);
    // Textos mostrados ou enviados ao Claude: nada de "Responde em portugues", "Passo que falhou", "Nao corras"...
    assert.doesNotMatch(text, /Responde em portugues|Passo que falhou|Excerto do log|Nao corras|ja esta a correr|Opcao desconhecida/, f);
  }
});
