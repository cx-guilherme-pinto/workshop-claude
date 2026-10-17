import { choice } from '../../templates/choice.js';

export default choice({
  id: 'cs-04',
  title: 'A calculadora com eval',
  category: 'secure-code',
  difficulty: 1,
  concept: 'eval() executa como código qualquer texto que receber.',
  prompt: 'Uma calculadora web faz eval(entrada) com o que o utilizador escreve. Porque é perigoso?',
  options: [
    { id: 'a', text: 'É lento' },
    { id: 'b', text: 'Executa qualquer código que o utilizador escrever' },
    { id: 'c', text: 'Não aceita números decimais' },
    { id: 'd', text: 'Não funciona no telemóvel' },
  ],
  answer: 'b',
  explanation: 'Quem escrever código em vez de uma conta consegue executá-lo. Usa um parser de expressões que só aceite números e operadores.',
});
