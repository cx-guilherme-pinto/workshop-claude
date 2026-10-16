import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'ph-05',
  title: 'O QR colado no parquímetro',
  category: 'phishing',
  difficulty: 1,
  concept: 'Um QR falso colado por cima do verdadeiro leva a um site de pagamento falso.',
  prompt: 'No parquímetro há um autocolante com um QR para pagar. O QR abre parque-pagar.test e pede os dados do cartão. O que fazes?',
  explanation: 'Um QR é só um link que não consegues ler antes de abrir. Desconfia de autocolantes e paga pelos canais oficiais.',
  options: [
    { id: 'a', text: 'Pago, é mais rápido' },
    { id: 'b', text: 'Pago na máquina ou na app oficial do parque' },
    { id: 'c', text: 'Leio o QR com outra app' },
    { id: 'd', text: 'Pago e guardo o recibo' },
  ],
  answer: 'b',
});
