import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'ph-07',
  title: 'O link mente',
  category: 'phishing',
  difficulty: 2,
  concept: 'O texto de um link pode mostrar um endereço e levar a outro.',
  prompt: 'Num email, o link mostra um endereço, mas ao passar o rato o browser mostra outro. Que domínio vais abrir se clicares?',
  scenario: {
    kind: 'texto',
    label: 'Link no email',
    lines: [
      'Texto do link: https://bancoluz.example/extrato',
      'Destino ao passar o rato: http://extrato-luz.test/abc',
    ],
  },
  placeholder: 'Domínio',
  accept: ['extrato-luz.test', 'http://extrato-luz.test', 'http://extrato-luz.test/abc'],
  explanation: 'O texto do link é só texto; o destino real é o que o browser mostra ao passar o rato. No telemóvel, mantém o dedo no link para o ver antes de abrir.',
});
