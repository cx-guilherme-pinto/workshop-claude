import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'sc-06',
  title: 'A vida de um segredo',
  category: 'segredos-cloud',
  difficulty: 2,
  concept: 'Um segredo tem ciclo de vida: cria-se num cofre, roda-se com regularidade e revoga-se no fim.',
  prompt: 'Ordena o ciclo de vida de uma chave de API, do primeiro ao último passo.',
  explanation: 'Rodar limita o tempo em que uma chave roubada serve, e revogar no fim evita chaves esquecidas. Automatiza a rotação no cofre de segredos.',
  items: [
    { id: 'a', text: 'Dar acesso só ao serviço que a usa' },
    { id: 'b', text: 'Revogar a chave quando o serviço é desligado' },
    { id: 'c', text: 'Rodar a chave com regularidade' },
    { id: 'd', text: 'Criar a chave no cofre de segredos' },
  ],
  answer: ['d', 'a', 'c', 'b'],
});
