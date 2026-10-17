// Dados em memoria. Cada teste pode chamar reiniciar() para comecar do zero.
export const dados = { livros: [], leitores: [], emprestimos: [], seq: 1 };

export function reiniciar() {
  dados.livros = [
    { id: 1, titulo: 'Os Maias', autor: 'Eça de Queirós', isbn: '9789722037327' },
    { id: 2, titulo: 'Memorial do Convento', autor: 'José Saramago', isbn: '9789722124256' },
    { id: 3, titulo: 'A Cidade e as Serras', autor: 'Eça de Queirós', isbn: '9789720046314' },
  ];
  dados.leitores = [
    { id: 10, nome: 'Ana Silva', email: 'ana@exemplo.pt' },
    { id: 11, nome: 'Rui Costa', email: 'rui@exemplo.pt' },
  ];
  dados.emprestimos = [
    { id: 100, leitorId: 10, livroId: 1, ate: '2026-11-01' },
    { id: 101, leitorId: 11, livroId: 2, ate: '2026-11-03' },
  ];
  dados.seq = 1000;
}

export function proximoId() {
  return ++dados.seq;
}

reiniciar();
