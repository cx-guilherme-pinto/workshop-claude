import { choice } from '../../templates/choice.js';

export default choice({
  id: 'es-04',
  title: '15 pedidos de aprovação',
  category: 'social-engineering',
  difficulty: 2,
  concept: 'Fadiga de MFA: o atacante já tem a password e envia pedidos até alguém aprovar.',
  prompt: 'O teu telemóvel mostra 15 pedidos seguidos para aprovar um login que não fizeste. O que fazes?',
  options: [
    { id: 'a', text: 'Aprovo um para pararem' },
    { id: 'b', text: 'Recuso todos, mudo a password e aviso a equipa de segurança' },
    { id: 'c', text: 'Desligo o telemóvel e espero' },
    { id: 'd', text: 'Desinstalo a app autenticadora' },
  ],
  answer: 'b',
  explanation: 'Os pedidos mostram que alguém já sabe a tua password. Recusa, muda-a já e pede MFA com correspondência de números ou uma chave física.',
});
