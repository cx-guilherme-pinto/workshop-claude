import { order } from '../../templates/order.js';

export default order({
  id: 'pw-07',
  title: 'Como funciona o credential stuffing',
  category: 'passwords',
  difficulty: 2,
  concept: 'Credential stuffing: pares de email e password roubados num site são testados em muitos outros.',
  prompt: 'Ordena as fases deste ataque, da primeira à última.',
  items: [
    { id: 'a', text: 'Entram nas contas onde a password foi reutilizada' },
    { id: 'b', text: 'Os atacantes testam os pares em lojas, bancos e email' },
    { id: 'c', text: 'Um fórum sofre uma fuga de emails e passwords' },
    { id: 'd', text: 'A lista de pares é vendida ou publicada' },
  ],
  answer: ['c', 'd', 'b', 'a'],
  explanation: 'O ataque só resulta onde a password se repete. Uma password diferente em cada site e MFA travam-no.',
});
