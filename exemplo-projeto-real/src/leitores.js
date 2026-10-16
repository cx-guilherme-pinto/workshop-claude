import { dados, proximoId } from './dados.js';
import { ErroValidacao } from './erros.js';

export function obterLeitor(id) {
  return dados.leitores.find((l) => l.id === Number(id)) ?? null;
}

// TODO(EX-1): validar o formato do email.
export function criarLeitor({ nome, email }) {
  if (!nome) throw new ErroValidacao('O nome é obrigatório');
  const leitor = { id: proximoId(), nome: String(nome).trim(), email: String(email ?? '').trim().toLowerCase() };
  dados.leitores.push(leitor);
  return leitor;
}

// Emprestimos de um leitor. "pedidoPor" e o id do leitor autenticado.
// BUG(EX-3): nao verifica se quem pede e o proprio leitor.
export function emprestimosDoLeitor(leitorId, pedidoPor) {
  void pedidoPor;
  return dados.emprestimos.filter((e) => e.leitorId === Number(leitorId));
}
