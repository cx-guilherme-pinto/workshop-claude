import { choice } from '../../templates/choice.js';

export default choice({
  id: 'pv-07',
  title: 'Sem cookies e ainda te reconhecem',
  category: 'privacy',
  difficulty: 2,
  concept: 'Um site pode reconhecer-te sem cookies, através de detalhes que não mudam quando os apagas.',
  prompt: 'Em casa, apagaste todos os cookies e abriste o site noutro browser, no mesmo portátil. O site continua a reconhecer-te. Qual é a explicação mais provável?',
  options: [
    { id: 'a', text: 'Impressão digital do browser: versão, extensões, definições e outros detalhes do browser' },
    { id: 'b', text: 'O endereço IP público da tua ligação de casa' },
    { id: 'c', text: 'O site leu o histórico do teu browser' },
    { id: 'd', text: 'Foi coincidência' },
  ],
  answer: 'b',
  explanation: 'Apagar os cookies só limpa o que o browser guardou. O que o site vê de fora depende do browser que usas e da rede de onde te ligas. Para visitas que não queres ligadas entre si, usa uma VPN ou o Tor.',
});
