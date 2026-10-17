import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'pw-06',
  title: 'A política de passwords tem regras más',
  category: 'passwords',
  difficulty: 2,
  concept: 'Mudanças forçadas e dicas de password tornam as passwords mais fracas, não mais fortes.',
  prompt: 'A Empresa Atlas publicou esta política. Que regras vão contra as boas práticas atuais?',
  language: 'text',
  segments: [
    'Mínimo de 12 caracteres.',
    'Obrigatório mudar a password a cada 30 dias.',
    'Permitir colar a password no campo de login.',
    'Recusar passwords que aparecem em fugas conhecidas.',
    'Mostrar uma dica da password no ecrã de login.',
    'MFA obrigatória em todas as contas.',
  ],
  answer: [1, 4],
  explanation: 'Quem muda à força acaba em Verao2025!, Verao2026!, e a dica ajuda sobretudo o atacante. Muda a password só quando houver sinais de fuga e deixa colar, para os gestores de passwords funcionarem.',
});
