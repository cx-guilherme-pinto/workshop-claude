import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'pw-08',
  title: 'O teu email apareceu numa fuga',
  category: 'passwords',
  difficulty: 1,
  concept: 'Quando uma conta aparece numa fuga, muda-se a password nesse site e em todos onde se repetia.',
  prompt: 'Um serviço de verificação de fugas diz que o teu email apareceu na fuga de uma loja online. O que fazes primeiro?',
  explanation: 'As listas de fugas circulam durante anos, por isso a password exposta deixa de servir. Muda-a onde quer que se repita e ativa MFA nessas contas.',
  options: [
    { id: 'a', text: 'Apago o email e crio outro' },
    { id: 'b', text: 'Mudo a password dessa loja e de onde a reutilizei' },
    { id: 'c', text: 'Nada, a fuga já foi há meses' },
    { id: 'd', text: 'Respondo ao aviso com a password para confirmar' },
  ],
  answer: 'b',
});
