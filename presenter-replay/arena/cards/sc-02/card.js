import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'sc-02',
  title: 'Apaguei a chave no commit seguinte',
  category: 'segredos-cloud',
  difficulty: 2,
  concept: 'O que entra no git fica no histórico; uma chave exposta tem de ser revogada.',
  prompt: 'Fizeste commit de uma chave de API e apagaste-a no commit seguinte. Está resolvido?',
  explanation: 'Qualquer clone ou fork guarda o commit antigo, e há robôs que procuram chaves em repositórios públicos. Revoga já a chave e só depois limpa o histórico.',
  options: [
    { id: 'a', text: 'Sim, já não está no código' },
    { id: 'b', text: 'Não: fica no histórico; revoga a chave e cria outra' },
    { id: 'c', text: 'Sim, se o repositório for privado' },
    { id: 'd', text: 'Basta mudar o nome da variável' },
  ],
  answer: 'b',
});
