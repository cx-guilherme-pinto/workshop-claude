import { choice } from '../../templates/choice.js';

export default choice({
  id: 'web-05',
  title: 'Para onde vais depois do login?',
  category: 'web',
  difficulty: 2,
  concept: 'Open redirect: o site reencaminha para qualquer endereço que venha no URL.',
  prompt: 'Depois do login, a loja manda-te para o endereço do parâmetro voltar: https://loja.example/login?voltar=https://loja-falsa.test. Qual é o risco?',
  options: [
    { id: 'a', text: 'Nenhum, o login é na loja verdadeira' },
    { id: 'b', text: 'Acabas num site falso que parece a loja' },
    { id: 'c', text: 'O login fica mais lento' },
    { id: 'd', text: 'Os cookies são apagados' },
  ],
  answer: 'b',
  explanation: 'O link começa no domínio verdadeiro, o que dá confiança, e depois leva a vítima para o site falso. Aceita só caminhos internos, como /conta, ou uma lista fixa de destinos.',
});
