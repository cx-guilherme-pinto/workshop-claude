import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'cs-10',
  title: 'Versões fixas',
  category: 'codigo-seguro',
  difficulty: 2,
  concept: 'O lockfile fixa as versões exatas de todas as dependências, incluindo as indiretas.',
  prompt: 'No npm, que ficheiro fixa as versões exatas de todas as dependências instaladas?',
  placeholder: 'Nome do ficheiro',
  accept: ['package-lock.json', 'package-lock', 'lockfile'],
  explanation: 'Com o lockfile no git, todos instalam exatamente o mesmo código, que é o que foi auditado. Usa npm ci no CI e revê as mudanças do lockfile.',
});
