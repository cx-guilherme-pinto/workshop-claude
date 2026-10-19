import { order } from '../../templates/order.js';

export default order({
  id: 'cr-07',
  title: 'Which generated password lasts longest?',
  category: 'cryptography',
  difficulty: 2,
  concept: 'The strength of a randomly generated password is the number of possibilities of its generator.',
  prompt: 'A password manager generated these four passwords at random. The attacker knows how each one was generated and tries every possibility. Order them, from the one that falls fastest to the one that lasts longest.',
  items: [
    { id: 'a', text: '4 random words from a list of 2,000, like cloud-stapler-horse-river' },
    { id: 'b', text: '12 random characters from the 94 on the keyboard, like q7#Vm2!xR9pL' },
    { id: 'c', text: '8 random digits, like 40718325' },
    { id: 'd', text: '6 random lowercase letters, like kqzmwe' },
  ],
  answer: ['c', 'd', 'a', 'b'],
  explanation: 'Count each generator\'s possibilities: the options for one symbol, multiplied once for every symbol. An attacker who knows the generator only tries those.',
});
