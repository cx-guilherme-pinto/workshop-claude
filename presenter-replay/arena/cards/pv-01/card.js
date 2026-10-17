import { choice } from '../../templates/choice.js';

export default choice({
  id: 'pv-01',
  title: 'A calculadora curiosa',
  category: 'privacy',
  difficulty: 1,
  concept: 'Uma app só deve ter as permissões de que precisa para funcionar.',
  prompt: 'Uma app de calculadora pede acesso. Que permissão faz sentido dares-lhe?',
  options: [
    { id: 'a', text: 'Contactos' },
    { id: 'b', text: 'Localização precisa' },
    { id: 'c', text: 'Microfone' },
    { id: 'd', text: 'Nenhuma destas' },
  ],
  answer: 'd',
  explanation: 'Uma calculadora não precisa de saber quem conheces nem onde estás. Recusa o que não faz sentido e revê as permissões nas definições.',
});
