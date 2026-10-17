import { choice } from '../../templates/choice.js';

export default choice({
  id: 'pw-03',
  title: 'Uma password, milhares de contas',
  category: 'passwords',
  difficulty: 2,
  concept: 'Password spraying: testar uma password comum em muitas contas evita o bloqueio por tentativas falhadas.',
  prompt: "Um atacante testa 'Verao2026!' uma única vez em cada uma das 5000 contas da Empresa Atlas. Como se chama este ataque?",
  options: [
    { id: 'a', text: 'Força bruta a uma só conta' },
    { id: 'b', text: 'Password spraying' },
    { id: 'c', text: 'Keylogger' },
    { id: 'd', text: 'Troca de SIM' },
  ],
  answer: 'b',
  explanation: 'Como cada conta só falha uma vez, o bloqueio nunca dispara. Recusa passwords comuns na criação e exige MFA.',
});
