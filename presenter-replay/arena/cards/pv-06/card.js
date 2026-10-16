import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'pv-06',
  title: 'Pedir os teus dados a uma empresa',
  category: 'privacidade',
  difficulty: 2,
  concept: 'O direito de acesso deixa-te saber que dados uma empresa tem sobre ti.',
  prompt: 'Queres saber que dados a TelcoNet guarda sobre ti. Ordena os passos.',
  explanation: 'O contacto do encarregado de proteção de dados está na política de privacidade. A empresa tem, em regra, um mês para responder, e podes pedir a correção do que estiver errado.',
  items: [
    { id: 'a', text: 'Recebes uma cópia dos dados, em regra até um mês' },
    { id: 'b', text: 'Descobres o contacto do encarregado de proteção de dados' },
    { id: 'c', text: 'Pedes a correção do que estiver errado' },
    { id: 'd', text: 'Envias o pedido de acesso por escrito' },
  ],
  answer: ['b', 'd', 'a', 'c'],
});
