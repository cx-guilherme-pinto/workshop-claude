import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'pw-09',
  title: 'A pergunta de segurança',
  category: 'passwords',
  difficulty: 2,
  concept: 'As respostas verdadeiras a perguntas de segurança encontram-se muitas vezes nas redes sociais.',
  prompt: "Um site pede uma resposta para 'Nome do primeiro animal de estimação'. Qual é a melhor opção?",
  explanation: 'Quem te segue nas redes sociais pode saber o nome do teu animal. Trata a resposta como uma password: aleatória e guardada no gestor.',
  options: [
    { id: 'a', text: 'O nome verdadeiro do animal' },
    { id: 'b', text: 'Uma resposta inventada e aleatória, guardada no gestor de passwords' },
    { id: 'c', text: 'O nome do animal com 123 no fim' },
    { id: 'd', text: 'A mesma resposta que uso noutros sites' },
  ],
  answer: 'b',
});
