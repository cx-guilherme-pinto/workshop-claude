import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'es-07',
  title: 'A pen USB no parque',
  category: 'engenharia-social',
  difficulty: 1,
  concept: 'Baiting: deixar um objeto apelativo, como uma pen USB, à espera de que alguém o use.',
  prompt: "Encontras uma pen USB no parque da empresa com a etiqueta 'Salários 2026'. O que fazes?",
  explanation: 'Uma pen pode correr código assim que é ligada, ou fazer-se passar por um teclado. Entrega-a sem a ligar a nada.',
  options: [
    { id: 'a', text: 'Ligo-a ao meu portátil para ver de quem é' },
    { id: 'b', text: 'Entrego-a à equipa de segurança sem a ligar' },
    { id: 'c', text: 'Ligo-a a um computador da receção' },
    { id: 'd', text: 'Formato-a e fico com ela' },
  ],
  answer: 'b',
});
