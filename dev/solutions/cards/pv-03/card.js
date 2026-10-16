import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'pv-03',
  title: 'A imagem de 1 píxel',
  category: 'privacidade',
  difficulty: 1,
  concept: 'Um píxel de rastreio num email avisa o remetente de quando e onde o abriste.',
  prompt: 'Um email de publicidade tem uma imagem invisível de 1×1 píxel. Para que serve?',
  options: [
    { id: 'a', text: 'Decoração' },
    { id: 'b', text: 'Saber se, quando e onde abriste o email' },
    { id: 'c', text: 'Acelerar o carregamento' },
    { id: 'd', text: 'Proteger contra spam' },
  ],
  answer: 'b',
  explanation: 'Ao carregar a imagem, o teu programa de email faz um pedido ao servidor do remetente. Bloqueia as imagens remotas por omissão.',
});
