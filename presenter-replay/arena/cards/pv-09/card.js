import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'pv-09',
  title: 'Dados pessoais no URL',
  category: 'privacy',
  difficulty: 2,
  concept: 'Dados pessoais no URL ficam no histórico e nos registos dos servidores por onde o pedido passa.',
  prompt: 'Este link foi gerado por uma loja depois do registo. Que partes não deviam estar no URL?',
  language: 'url',
  segments: [
    'https://loja.example/bem-vindo',
    '?origem=newsletter',
    '&email=ana@exemplo.pt',
    '&telefone=910000000',
    '&idioma=pt',
  ],
  answer: [2, 3],
  explanation: 'O URL fica gravado no histórico, nos registos de servidores e proxies e em ferramentas de análise. Envia dados pessoais no corpo de um pedido POST, por HTTPS.',
});
