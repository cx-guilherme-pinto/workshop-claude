import { order } from '../../templates/order.js';

export default order({
  id: 'cr-07',
  title: 'Que password gerada aguenta mais?',
  category: 'cryptography',
  difficulty: 2,
  concept: 'A força de uma password gerada ao acaso é o número de possibilidades do gerador.',
  prompt: 'Um gestor de passwords gerou estas quatro passwords ao acaso. O atacante sabe como cada uma foi gerada e experimenta todas as possibilidades. Ordena-as, da que cai mais depressa à que aguenta mais.',
  items: [
    { id: 'a', text: '4 palavras ao acaso de uma lista de 2000, como nuvem-agrafo-cavalo-rio' },
    { id: 'b', text: '12 caracteres ao acaso dos 94 do teclado, como q7#Vm2!xR9pL' },
    { id: 'c', text: '8 algarismos ao acaso, como 40718325' },
    { id: 'd', text: '6 letras minúsculas ao acaso, como kqzmwe' },
  ],
  answer: ['c', 'd', 'a', 'b'],
  explanation: 'Conta as possibilidades de cada gerador: as opções de um símbolo, multiplicadas uma vez por cada símbolo. Um atacante que conhece o gerador só experimenta essas.',
});
