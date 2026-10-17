import { order } from '../../templates/order.js';

export default order({
  id: 'rd-02',
  title: 'Por onde passa o teu tráfego',
  category: 'networks',
  difficulty: 2,
  concept: 'Cada ponto entre ti e o site pode ver para onde vais; o HTTPS esconde o conteúdo, não o destino.',
  prompt: 'Ordena o caminho de um pedido, do teu portátil até ao site.',
  items: [
    { id: 'a', text: 'Router de casa' },
    { id: 'b', text: 'Fornecedor de internet' },
    { id: 'c', text: 'Servidor do site' },
    { id: 'd', text: 'Portátil' },
  ],
  answer: ['d', 'a', 'b', 'c'],
  explanation: 'O router e o fornecedor de internet veem a que sites te ligas e quando, mesmo com HTTPS. O que o HTTPS garante é que o conteúdo e as passwords seguem cifrados até ao site.',
});
