import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'es-05',
  title: 'A história da migração',
  category: 'social-engineering',
  difficulty: 1,
  concept: 'Pretexting: uma história credível serve para pedir algo que nunca se deve dar.',
  prompt: 'Recebeste estas mensagens no chat da empresa. Que trechos são sinais de alerta?',
  language: 'text',
  segments: [
    'Olá, sou o Rui da informática.',
    'Estamos a migrar as contas de email hoje.',
    'Preciso da tua password para copiar a tua caixa.',
    'O diretor quer isto feito até às 17h.',
    'Obrigado pela ajuda!',
  ],
  answer: [2, 3],
  explanation: 'A informática nunca precisa da tua password, e a pressa de um chefe serve para não pensares. Confirma o pedido por outro canal e reporta-o.',
});
