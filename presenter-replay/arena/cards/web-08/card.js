import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'web-08',
  title: 'A sessão do princípio ao fim',
  category: 'web',
  difficulty: 2,
  concept: 'O id de sessão deve ser novo depois do login e destruído no logout.',
  prompt: 'Ordena o ciclo de uma sessão segura, do primeiro ao último passo.',
  explanation: 'Criar o id só depois do login impede que um atacante te imponha um id que já conhece (fixação de sessão). No logout, apaga a sessão no servidor e não só o cookie.',
  items: [
    { id: 'a', text: 'O browser envia o cookie em cada pedido' },
    { id: 'b', text: 'O utilizador faz login com sucesso' },
    { id: 'c', text: 'O servidor cria um id de sessão novo e aleatório' },
    { id: 'd', text: 'No logout, o servidor apaga a sessão' },
  ],
  answer: ['b', 'c', 'a', 'd'],
});
