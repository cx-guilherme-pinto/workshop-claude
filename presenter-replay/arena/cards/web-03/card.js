import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'web-03',
  title: 'O formulário escondido',
  category: 'web',
  difficulty: 2,
  concept: 'CSRF: outro site faz o teu browser enviar um pedido com a tua sessão, sem tu saberes.',
  prompt: 'Tens sessão aberta no Banco Luz. Um site malicioso tem um formulário escondido que envia um POST para bancoluz.example/transferir. O que trava o ataque?',
  explanation: 'O site malicioso não conhece o token secreto do formulário, e com SameSite o browser não envia o cookie de sessão nesse pedido. Usa os dois.',
  options: [
    { id: 'a', text: 'O site do banco usar HTTPS' },
    { id: 'b', text: 'Um token anti-CSRF no formulário e cookies SameSite' },
    { id: 'c', text: 'Uma password mais longa' },
    { id: 'd', text: 'Esconder o URL do formulário' },
  ],
  answer: 'b',
});
