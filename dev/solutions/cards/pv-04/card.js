import { answer } from '../../templates/answer.js';

export default answer({
  id: 'pv-04',
  title: 'Levar os dados contigo',
  category: 'privacy',
  difficulty: 2,
  concept: 'O RGPD dá-te o direito de receber os teus dados num formato que outro serviço consegue ler.',
  prompt: 'Que direito do RGPD te deixa levar os teus dados para outro serviço, num formato legível por máquina?',
  placeholder: 'Nome do direito',
  accept: ['portabilidade', 'direito à portabilidade', 'portabilidade dos dados', 'direito de portabilidade'],
  explanation: 'O direito à portabilidade (artigo 20.º) aplica-se aos dados que forneceste. Pede-os ao serviço e importa-os no novo.',
});
