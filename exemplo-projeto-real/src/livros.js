import { dados, proximoId } from './dados.js';
import { ErroValidacao } from './erros.js';

export function listarLivros() {
  return [...dados.livros];
}

export function obterLivro(id) {
  return dados.livros.find((l) => l.id === Number(id)) ?? null;
}

// TODO(EX-1): validar o ISBN (ISBN-13 com digito de controlo).
export function criarLivro({ titulo, autor, isbn }) {
  if (!titulo || !autor) throw new ErroValidacao('Título e autor são obrigatórios');
  const livro = { id: proximoId(), titulo: String(titulo).trim(), autor: String(autor).trim(), isbn: String(isbn ?? '') };
  dados.livros.push(livro);
  return livro;
}
