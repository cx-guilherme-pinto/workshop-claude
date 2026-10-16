import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'web-09',
  title: 'O site dentro de um iframe',
  category: 'web',
  difficulty: 3,
  concept: 'Clickjacking: outro site carrega o teu num iframe invisível e engana o utilizador para clicar.',
  prompt: 'Que cabeçalho clássico impede que outros sites carreguem o teu dentro de um iframe?',
  placeholder: 'Nome do cabeçalho',
  accept: ['X-Frame-Options', 'frame-ancestors', 'Content-Security-Policy', 'CSP', 'CSP frame-ancestors'],
  explanation: "Com X-Frame-Options: DENY ou a diretiva CSP frame-ancestors 'none', o browser recusa mostrar o site num iframe alheio. Ativa um deles em todas as páginas.",
});
