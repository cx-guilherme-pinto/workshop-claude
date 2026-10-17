import { choice } from '../../templates/choice.js';

export default choice({
  id: 'sc-05',
  title: 'O bucket público',
  category: 'cloud-secrets',
  difficulty: 1,
  concept: 'Um bucket com leitura pública fica acessível a qualquer pessoa na internet.',
  prompt: 'O bucket atlas-backups tem a leitura pública ativa. Quem consegue ler os backups?',
  options: [
    { id: 'a', text: 'Só a equipa da Empresa Atlas' },
    { id: 'b', text: 'Qualquer pessoa na internet que saiba ou adivinhe o nome' },
    { id: 'c', text: 'Ninguém, os buckets são sempre privados' },
    { id: 'd', text: 'Só quem tiver conta no mesmo fornecedor' },
  ],
  answer: 'b',
  explanation: 'Há quem procure buckets abertos de forma automática, testando nomes previsíveis. Ativa o bloqueio de acesso público e dá acesso só a contas concretas.',
});
