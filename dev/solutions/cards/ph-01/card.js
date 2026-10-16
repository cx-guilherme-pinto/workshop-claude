import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'ph-01',
  title: 'Qual é o site verdadeiro?',
  category: 'phishing',
  difficulty: 1,
  concept: 'Domínios parecidos trocam uma letra ou juntam um hífen para enganar quem lê depressa.',
  prompt: 'O Banco Luz usa o domínio bancoluz.example. Qual destes links leva mesmo ao banco?',
  options: [
    { id: 'a', text: 'https://bancoIuz.example/entrar' },
    { id: 'b', text: 'https://banco-luz.example/entrar' },
    { id: 'c', text: 'https://bancoluz.example/entrar' },
    { id: 'd', text: 'https://bancolux.example/entrar' },
  ],
  answer: 'c',
  explanation: 'Em a há um I maiúsculo no lugar do l, em b um hífen a mais e em d um x no fim. Lê o domínio letra a letra ou, melhor, usa um marcador guardado.',
});
