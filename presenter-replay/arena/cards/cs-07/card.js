import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'cs-07',
  title: 'O erro que conta demais',
  category: 'codigo-seguro',
  difficulty: 2,
  concept: 'Mensagens de erro detalhadas revelam ao atacante como a aplicação funciona por dentro.',
  prompt: 'Este é o tratamento de erros da API. Que linha revela detalhes internos a quem fez o pedido?',
  explanation: 'O stack trace mostra caminhos, versões e partes do código. Regista os detalhes no servidor e devolve só uma mensagem genérica com um id do erro.',
  language: 'js',
  segments: [
    'app.use((err, req, res, next) => {',
    '  log.error(err);',
    '  res.status(500).send(err.stack);',
    '});',
  ],
  answer: [2],
});
