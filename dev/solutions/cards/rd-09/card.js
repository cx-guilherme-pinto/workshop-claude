import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'rd-09',
  title: 'O router mal configurado',
  category: 'networks',
  difficulty: 2,
  concept: 'Um router de casa tem várias portas: o próprio Wi-Fi, a página de administração e os aparelhos ligados a ele.',
  prompt: 'Estas são as definições do router da família Silva. Que linhas deixam um vizinho que não sabe a password do Wi-Fi entrar na rede?',
  language: 'text',
  segments: [
    'Nome da rede: CasaSilva',
    'Segurança do Wi-Fi: WEP',
    'Password da página de administração: admin (a de fábrica)',
    'WPS: ligado, com PIN de 8 algarismos',
    'UPnP: ligado',
    'Administração remota: desligada',
  ],
  answer: [1, 3],
  explanation: 'Um vizinho ao alcance do sinal pode atacar o próprio Wi-Fi durante dias sem ninguém dar por isso. Usa WPA3 (ou WPA2) com uma password longa, desliga o WPS, muda a password de fábrica da administração e desliga o UPnP se não precisares dele.',
});
