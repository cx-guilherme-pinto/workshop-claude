import { choice } from '../../templates/choice.js';

export default choice({
  id: 'cs-08',
  title: 'Tentativas sem limite',
  category: 'secure-code',
  difficulty: 2,
  concept: 'Sem limite de tentativas, o login fica aberto a ataques de força bruta.',
  prompt: 'O endpoint /login aceita pedidos sem limite. Que ataque fica mais fácil?',
  options: [
    { id: 'a', text: 'Força bruta de passwords' },
    { id: 'b', text: 'XSS' },
    { id: 'c', text: 'Path traversal' },
    { id: 'd', text: 'Nenhum, o login está protegido pela password' },
  ],
  answer: 'a',
  explanation: 'Um robô pode testar milhares de passwords por minuto. Limita as tentativas por conta e por IP e acrescenta atrasos crescentes.',
});
