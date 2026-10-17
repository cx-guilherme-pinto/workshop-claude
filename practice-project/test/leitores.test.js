import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reiniciar } from '../src/dados.js';
import { criarLeitor, emprestimosDoLeitor } from '../src/leitores.js';

beforeEach(reiniciar);

test('cria um leitor e normaliza o email', () => {
  const l = criarLeitor({ nome: 'Marta', email: ' Marta@Exemplo.PT ' });
  assert.equal(l.email, 'marta@exemplo.pt');
});

test('o próprio leitor vê os seus empréstimos', () => {
  assert.equal(emprestimosDoLeitor(10, 10).length, 1);
});
