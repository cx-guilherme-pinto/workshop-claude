import { answer } from '../../templates/answer.js';

export default answer({
  id: 'web-06',
  title: 'De onde podem vir os scripts?',
  category: 'web',
  difficulty: 2,
  concept: 'A Content-Security-Policy diz ao browser de que origens pode carregar scripts e outros recursos.',
  prompt: 'Que cabeçalho HTTP diz ao browser de onde pode carregar scripts, para travar XSS?',
  placeholder: 'Nome do cabeçalho',
  accept: ['Content-Security-Policy', 'CSP', 'Content Security Policy'],
  explanation: "Com script-src 'self', um script injetado inline ou de outra origem não corre. É uma segunda barreira: continua a tratar bem o texto do utilizador.",
});
