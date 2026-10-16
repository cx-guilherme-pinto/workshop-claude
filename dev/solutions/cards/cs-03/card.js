import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'cs-03',
  title: 'A password no registo',
  category: 'codigo-seguro',
  difficulty: 1,
  concept: 'Passwords e tokens nunca devem ir para os registos da aplicação.',
  prompt: 'Este código regista cada login. Que linha põe dados secretos nos registos?',
  language: 'js',
  segments: [
    "logger.info('login', {",
    '  utilizador: req.body.email,',
    '  password: req.body.password,',
    '  ip: req.ip,',
    '});',
  ],
  answer: [2],
  explanation: 'Os registos são lidos por muitas pessoas e ferramentas e guardados durante meses. Regista o evento e o utilizador, nunca a password nem o token.',
});
