import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'pv-08',
  title: 'A foto do cartão de embarque',
  category: 'privacidade',
  difficulty: 2,
  concept: 'O código de barras de um cartão de embarque contém o nome e a referência da reserva.',
  prompt: 'Qual destas publicações ajuda mais um burlão?',
  options: [
    { id: 'a', text: 'Foto do pôr do sol na praia' },
    { id: 'b', text: 'Foto do cartão de embarque com o código de barras visível' },
    { id: 'c', text: 'Opinião sobre um filme' },
    { id: 'd', text: 'Foto do teu gato' },
  ],
  answer: 'b',
  explanation: 'Com o nome e a referência da reserva, alguém pode alterar ou cancelar o voo. Publica depois da viagem e nunca mostres códigos nem documentos.',
});
