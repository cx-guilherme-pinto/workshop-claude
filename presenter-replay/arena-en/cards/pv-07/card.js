import { choice } from '../../templates/choice.js';

export default choice({
  id: 'pv-07',
  title: 'Sem cookies e ainda te reconhecem',
  category: 'privacy',
  difficulty: 2,
  concept: 'A impressão digital do browser junta detalhes técnicos que te identificam sem cookies.',
  prompt: 'Apagaste todos os cookies, mas um site continua a reconhecer-te. Como é possível?',
  options: [
    { id: 'a', text: 'Impressão digital do browser: ecrã, fontes, versão e outros detalhes' },
    { id: 'b', text: 'O site leu o teu email' },
    { id: 'c', text: 'O Wi-Fi contou ao site' },
    { id: 'd', text: 'Foi coincidência' },
  ],
  answer: 'a',
  explanation: 'A combinação de pequenos detalhes do browser é quase única. Usa um browser com proteção contra fingerprinting e poucas extensões.',
});
