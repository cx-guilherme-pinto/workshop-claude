import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'mb-05',
  title: 'Como se rouba um número de telemóvel',
  category: 'mobile',
  difficulty: 2,
  concept: 'Troca de SIM: o atacante convence a operadora a passar o teu número para um cartão dele.',
  prompt: 'Ordena as fases de um ataque de troca de SIM, da primeira à última.',
  explanation: 'Depois da troca, todos os códigos por SMS vão para o atacante. Pede à tua operadora, como a TelcoNet, um PIN para alterações e usa uma app autenticadora em vez de SMS.',
  items: [
    { id: 'a', text: 'A operadora ativa o número num SIM novo' },
    { id: 'b', text: 'Liga para a operadora e faz-se passar pela vítima' },
    { id: 'c', text: 'O atacante recebe os códigos por SMS da vítima' },
    { id: 'd', text: 'Recolhe dados pessoais da vítima' },
  ],
  answer: ['d', 'b', 'a', 'c'],
});
