import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'rd-01',
  title: 'Duas redes no café',
  category: 'redes',
  difficulty: 1,
  concept: 'Qualquer pessoa pode criar uma rede Wi-Fi com o nome de um café (evil twin).',
  prompt: "No café aparecem as redes 'Cafe_Central' e 'Cafe_Central_Gratis'. O que fazes?",
  options: [
    { id: 'a', text: 'Escolho a grátis, é aberta' },
    { id: 'b', text: 'Pergunto ao balcão qual é a oficial e uso só sites com HTTPS' },
    { id: 'c', text: 'Escolho a que tem mais sinal' },
    { id: 'd', text: 'Tanto faz, o Wi-Fi é sempre cifrado' },
  ],
  answer: 'b',
  explanation: 'Uma rede falsa pode ver e alterar o tráfego que não for cifrado. Confirma o nome com o café, prefere HTTPS ou os dados móveis e evita operações sensíveis.',
});
