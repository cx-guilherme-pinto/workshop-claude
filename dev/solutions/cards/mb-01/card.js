import { order } from '../../templates/order.js';

export default order({
  id: 'mb-01',
  title: 'Do bloqueio mais fraco ao mais forte',
  category: 'mobile',
  difficulty: 1,
  concept: 'Quanto mais combinações o bloqueio tiver, mais tempo leva a adivinhar.',
  prompt: 'Ordena estes bloqueios de ecrã, do mais fraco ao mais forte.',
  items: [
    { id: 'a', text: 'Password longa com letras e números' },
    { id: 'b', text: 'Sem bloqueio' },
    { id: 'c', text: 'PIN de 6 dígitos' },
    { id: 'd', text: 'PIN de 4 dígitos' },
  ],
  answer: ['b', 'd', 'c', 'a'],
  explanation: 'Um PIN de 4 dígitos tem 10 000 combinações e um de 6 tem um milhão. Usa pelo menos 6 dígitos ou uma password, e a biometria por cima.',
});
