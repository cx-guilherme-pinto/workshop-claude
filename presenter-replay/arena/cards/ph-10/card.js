import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'ph-10',
  title: 'A app pede acesso ao teu email',
  category: 'phishing',
  difficulty: 3,
  concept: 'Phishing de consentimento: a app pede autorização para entrar na tua conta, sem pedir a password.',
  prompt: 'Ao abrir um PDF partilhado, uma app pede: \'Ler, enviar e apagar emails em teu nome\'. O que fazes?',
  explanation: 'A autorização dá à app um token próprio, que pode continuar válido mesmo depois de mudares a password. Recusa pedidos desproporcionados e revoga apps suspeitas nas definições da conta.',
  options: [
    { id: 'a', text: 'Aceito, todas as apps pedem isto' },
    { id: 'b', text: 'Recuso e reporto: um leitor de PDF não precisa do teu email' },
    { id: 'c', text: 'Aceito e depois mudo a password' },
    { id: 'd', text: 'Aceito só desta vez' },
  ],
  answer: 'b',
});
