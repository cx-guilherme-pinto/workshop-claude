import { answer } from '../../templates/answer.js';

export default answer({
  id: 'es-03',
  title: 'O banco ao telefone',
  category: 'social-engineering',
  difficulty: 1,
  concept: 'Vishing: burla por chamada de voz em que o burlão finge ser do banco ou do apoio técnico.',
  prompt: "Liga alguém do 'apoio do Banco Luz' e pede o código que acabaste de receber por SMS. Quantas vezes um banco a sério te pede esse código ao telefone?",
  placeholder: 'Uma palavra',
  accept: ['nunca', '0', 'zero', 'nenhuma', 'nenhuma vez', 'jamais'],
  explanation: 'O código serve para tu aprovares uma operação; quem o pede quer aprová-la por ti. Desliga e liga para o número que está no verso do cartão.',
});
