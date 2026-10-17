import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reiniciar } from '../src/dados.js';
import { listarLivros, obterLivro, criarLivro } from '../src/livros.js';

beforeEach(reiniciar);

test('lista os livros iniciais', () => {
  assert.equal(listarLivros().length, 3);
});

test('obtém um livro pelo id', () => {
  assert.equal(obterLivro(1).titulo, 'Os Maias');
  assert.equal(obterLivro(999), null);
});

test('cria um livro com título e autor', () => {
  const l = criarLivro({ titulo: ' Mensagem ', autor: 'Fernando Pessoa', isbn: '9789722040686' });
  assert.equal(l.titulo, 'Mensagem');
  assert.equal(listarLivros().length, 4);
});

test('recusa livro sem título', () => {
  assert.throws(() => criarLivro({ autor: 'X' }), { name: 'ErroValidacao' });
});
