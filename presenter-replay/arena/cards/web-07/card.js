import { choice } from '../../templates/choice.js';

export default choice({
  id: 'web-07',
  title: 'O cookie de sessão bem configurado',
  category: 'web',
  difficulty: 2,
  concept: 'Um cookie de sessão deve ter Secure, HttpOnly e SameSite.',
  prompt: 'Qual destes cabeçalhos cria um cookie de sessão bem protegido?',
  options: [
    { id: 'a', text: 'Set-Cookie: sessao=8f3a; Path=/' },
    { id: 'b', text: 'Set-Cookie: sessao=8f3a; Secure; HttpOnly; SameSite=Lax; Path=/' },
    { id: 'c', text: 'Set-Cookie: sessao=8f3a; HttpOnly' },
    { id: 'd', text: 'Set-Cookie: sessao=8f3a; Secure; SameSite=None' },
  ],
  answer: 'b',
  explanation: 'Secure só o envia por HTTPS, HttpOnly esconde-o do JavaScript e SameSite=Lax não o envia em POST vindos de outros sites. Usa os três no cookie de sessão.',
});
