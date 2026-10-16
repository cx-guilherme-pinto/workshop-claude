import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'cs-05',
  title: 'Corrigir uma dependência vulnerável',
  category: 'codigo-seguro',
  difficulty: 2,
  concept: 'Uma dependência com uma falha conhecida corrige-se atualizando-a, com testes antes do deploy.',
  prompt: 'O npm audit avisa que uma dependência tem uma falha conhecida. Ordena os passos para a corrigir.',
  explanation: 'Uma falha publicada é explorada depressa, por isso atualizar é urgente, mas os testes evitam partir a app. Automatiza os avisos com npm audit ou um bot de dependências.',
  items: [
    { id: 'a', text: 'Atualizar a versão no package.json e no lockfile' },
    { id: 'b', text: 'Correr os testes' },
    { id: 'c', text: 'Ler o aviso e ver que versão corrige a falha' },
    { id: 'd', text: 'Fazer deploy' },
  ],
  answer: ['c', 'a', 'b', 'd'],
});
