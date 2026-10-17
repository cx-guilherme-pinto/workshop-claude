import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'mb-07',
  title: 'A app pronta para a loja?',
  category: 'mobile',
  difficulty: 3,
  concept: 'Uma app publicada não deve estar em modo de depuração nem aceitar tráfego sem cifra.',
  prompt: 'Este é o manifesto Android da versão que vai para a loja. Que linhas são inseguras?',
  language: 'html',
  segments: [
    '<application',
    '  android:label="Atlas"',
    '  android:debuggable="true"',
    '  android:allowBackup="false"',
    '  android:usesCleartextTraffic="true">',
  ],
  answer: [2, 4],
  explanation: 'O modo de depuração deixa ligar ferramentas à app e o tráfego sem cifra pode ser lido na rede. Publica com debuggable a false e só com HTTPS.',
});
