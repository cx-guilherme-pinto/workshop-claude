import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'mb-10',
  title: 'O que se vê no ecrã bloqueado',
  category: 'mobile',
  difficulty: 1,
  concept: 'Notificações no ecrã bloqueado podem mostrar códigos a quem pegar no telemóvel.',
  prompt: 'Este é o ecrã bloqueado do teu telemóvel. Que notificação não devia aparecer assim?',
  explanation: 'Quem pegar no telemóvel lê o código sem o desbloquear. Configura as notificações para esconder o conteúdo no ecrã bloqueado.',
  language: 'texto',
  segments: [
    '10:42 · Bateria 80%',
    'Banco Luz: o seu código de confirmação é 482913',
    'Rui: chego às 8',
    'Calendário: reunião às 15h',
  ],
  answer: [1],
});
