import { answer } from '../../templates/answer.js';

export default answer({
  id: 'sc-08',
  title: 'A conta root da cloud',
  category: 'cloud-secrets',
  difficulty: 1,
  concept: 'A conta principal da cloud controla tudo e precisa da proteção mais forte.',
  prompt: 'A conta root da cloud da Empresa Atlas só tem password. Que proteção deves ativar já?',
  placeholder: 'Sigla',
  accept: ['MFA', '2FA', 'autenticação multifator', 'autenticação de dois fatores', 'dois fatores'],
  explanation: 'Quem entrar na conta root pode apagar tudo ou criar recursos à tua custa. Ativa MFA com uma chave física e usa contas com menos permissões no dia a dia.',
});
