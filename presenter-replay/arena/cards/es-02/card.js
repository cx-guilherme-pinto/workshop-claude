import { choice } from '../../templates/choice.js';

export default choice({
  id: 'es-02',
  title: 'Seguras a porta?',
  category: 'social-engineering',
  difficulty: 1,
  concept: 'Tailgating: entrar numa zona protegida colado a quem tem acesso.',
  prompt: 'À porta do escritório, alguém com uma caixa pesada pede-te para segurar a porta. Não tem cartão à vista. O que fazes?',
  options: [
    { id: 'a', text: 'Seguro a porta, é ser educado' },
    { id: 'b', text: 'Ofereço ajuda e acompanho-o à receção para se identificar' },
    { id: 'c', text: 'Empresto-lhe o meu cartão' },
    { id: 'd', text: 'Deixo entrar e aviso mais tarde' },
  ],
  answer: 'b',
  explanation: 'Ser simpático não obriga a abrir a porta. Encaminha quem não tem cartão para a receção.',
});
