import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'pw-05',
  title: 'Os três tipos de fator',
  category: 'passwords',
  difficulty: 1,
  concept: 'A MFA junta fatores de tipos diferentes: algo que sabes, algo que tens e algo que és.',
  prompt: 'A password é algo que sabes. A impressão digital é algo que és. E uma chave física ou o telemóvel é algo que…?',
  placeholder: 'Uma palavra',
  accept: ['tens', 'algo que tens', 'possuis', 'algo que possuis', 'posse'],
  explanation: 'Juntar fatores de tipos diferentes obriga o atacante a roubar duas coisas distintas. Duas passwords seguidas continuam a ser um só tipo de fator.',
});
