import { createServer } from 'node:http';
import { listarLivros, obterLivro, criarLivro } from './livros.js';
import { criarLeitor, emprestimosDoLeitor } from './leitores.js';
import { ErroValidacao, ErroAcesso } from './erros.js';

function json(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(corpo));
}

async function lerCorpo(req) {
  let txt = '';
  for await (const c of req) {
    txt += c;
    if (txt.length > 100_000) throw new ErroValidacao('Pedido demasiado grande');
  }
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    throw new ErroValidacao('JSON inválido');
  }
}

// Autenticacao de brincar: o leitor vem no cabecalho X-Leitor.
const leitorAutenticado = (req) => Number(req.headers['x-leitor']) || null;

export function criarServidor() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/livros') return json(res, 200, listarLivros());
      let m = /^\/livros\/(\d+)$/.exec(url.pathname);
      if (req.method === 'GET' && m) {
        const l = obterLivro(m[1]);
        return l ? json(res, 200, l) : json(res, 404, { erro: 'Livro não encontrado' });
      }
      if (req.method === 'POST' && url.pathname === '/livros') return json(res, 201, criarLivro(await lerCorpo(req)));
      if (req.method === 'POST' && url.pathname === '/leitores') return json(res, 201, criarLeitor(await lerCorpo(req)));
      m = /^\/leitores\/(\d+)\/emprestimos$/.exec(url.pathname);
      if (req.method === 'GET' && m) return json(res, 200, emprestimosDoLeitor(m[1], leitorAutenticado(req)));
      return json(res, 404, { erro: 'Não encontrado' });
    } catch (e) {
      if (e instanceof ErroValidacao) return json(res, 400, { erro: e.message });
      if (e instanceof ErroAcesso) return json(res, 403, { erro: e.message });
      return json(res, 500, { erro: 'Erro interno' });
    }
  });
}

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const principal = (() => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (principal) {
  const porta = Number(process.env.PORTA || 3100);
  criarServidor().listen(porta, '127.0.0.1', () => console.log(`Biblioteca em http://127.0.0.1:${porta}`));
}
