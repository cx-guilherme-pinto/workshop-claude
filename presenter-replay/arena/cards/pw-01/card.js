import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'pw-01',
  title: 'Qual é a password mais forte?',
  category: 'passwords',
  difficulty: 1,
  concept: 'O comprimento e a imprevisibilidade pesam mais do que trocar letras por símbolos.',
  prompt: 'Um atacante testa milhares de milhões de combinações por segundo. Qual destas aguenta mais tempo?',
  explanation: 'Quatro palavras ao acaso formam uma frase longa e imprevisível. Trocar a por @ não ajuda: essas trocas já estão nos dicionários dos atacantes.',
  options: [
    { id: 'a', text: 'P@ssw0rd!' },
    { id: 'b', text: 'Benfica2024' },
    { id: 'c', text: 'cavalo-agrafo-bateria-nuvem' },
    { id: 'd', text: 'Qw3rty!!' },
  ],
  answer: 'c',
});
