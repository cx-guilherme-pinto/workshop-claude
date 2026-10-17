import { order } from '../../templates/order.js';

export default order({
  id: 'es-10',
  title: 'O golpe do número novo',
  category: 'social-engineering',
  difficulty: 1,
  concept: "O golpe do 'mudei de número' usa a confiança da família para pedir dinheiro com pressa.",
  prompt: 'Ordena as fases deste golpe por mensagem, da primeira à última.',
  items: [
    { id: 'a', text: "Escreve: 'Olá mãe, este é o meu número novo'" },
    { id: 'b', text: 'Pede dinheiro para pagar uma conta urgente' },
    { id: 'c', text: 'A vítima transfere sem confirmar por voz' },
    { id: 'd', text: 'Diz que o telemóvel antigo avariou e que não pode ligar' },
  ],
  answer: ['a', 'd', 'b', 'c'],
  explanation: 'A desculpa para não poder ligar é o ponto-chave. Liga para o número antigo ou faz uma pergunta que só a pessoa verdadeira saiba responder.',
});
