import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'cr-05',
  title: 'Hash ou cifra?',
  category: 'criptografia',
  difficulty: 1,
  concept: 'Uma cifra reverte-se com a chave; um hash é de sentido único.',
  prompt: 'Qual é a diferença entre cifrar e calcular um hash?',
  options: [
    { id: 'a', text: 'São a mesma coisa com nomes diferentes' },
    { id: 'b', text: 'A cifra reverte-se com a chave; o hash não se reverte' },
    { id: 'c', text: 'O hash precisa de uma chave secreta; a cifra não' },
    { id: 'd', text: 'O hash é sempre mais seguro do que a cifra' },
  ],
  answer: 'b',
  explanation: 'Cifra-se o que se vai voltar a ler, como um ficheiro. Para passwords guarda-se um hash lento com salt, porque só é preciso comparar.',
});
