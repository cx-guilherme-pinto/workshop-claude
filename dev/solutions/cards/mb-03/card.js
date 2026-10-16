import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'mb-03',
  title: 'A app de limpeza quer acessibilidade',
  category: 'mobile',
  difficulty: 2,
  concept: 'O serviço de acessibilidade deixa uma app ler o ecrã e carregar em botões por ti.',
  prompt: "Uma app para 'limpar o telemóvel' pede acesso ao serviço de acessibilidade. Porque é perigoso?",
  options: [
    { id: 'a', text: 'Gasta muita bateria' },
    { id: 'b', text: 'Deixa a app ler o ecrã e carregar em botões por ti' },
    { id: 'c', text: 'Muda o tamanho da letra' },
    { id: 'd', text: 'Não é perigoso' },
  ],
  answer: 'b',
  explanation: 'Com este acesso, uma app maliciosa lê códigos e aprova pagamentos sem tu veres. Dá-o só a apps de acessibilidade em que confias.',
});
