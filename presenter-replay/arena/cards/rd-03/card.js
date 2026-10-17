import { answer } from '../../templates/answer.js';

export default answer({
  id: 'rd-03',
  title: 'Sempre HTTPS',
  category: 'networks',
  difficulty: 2,
  concept: 'O HSTS obriga o browser a usar HTTPS num site, mesmo que se escreva http://.',
  prompt: 'Que mecanismo diz ao browser para usar sempre HTTPS num site, mesmo que escrevas http:// na barra?',
  placeholder: 'Sigla ou nome do cabeçalho',
  accept: ['HSTS', 'Strict-Transport-Security', 'HTTP Strict Transport Security'],
  explanation: 'Sem HSTS, o primeiro pedido em http:// pode ser intercetado numa rede hostil. Envia Strict-Transport-Security com um max-age longo em todas as respostas HTTPS.',
});
