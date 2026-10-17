import { answer } from '../../templates/answer.js';

export default answer({
  id: 'cr-09',
  title: 'O S do HTTPS',
  category: 'cryptography',
  difficulty: 1,
  concept: 'O HTTPS é HTTP dentro de TLS; o antigo SSL já não é seguro.',
  prompt: 'Que protocolo cifra a ligação quando vês https:// na barra do browser?',
  placeholder: 'Sigla',
  accept: ['TLS', 'Transport Layer Security', 'SSL/TLS'],
  explanation: 'O SSL e as primeiras versões do TLS têm falhas conhecidas. Configura os servidores só com TLS 1.2 e 1.3.',
});
