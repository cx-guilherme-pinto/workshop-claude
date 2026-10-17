import { choice } from '../../templates/choice.js';

export default choice({
  id: 'rd-05',
  title: 'O que uma VPN não faz',
  category: 'networks',
  difficulty: 2,
  concept: 'Uma VPN cifra o caminho até ao servidor da VPN; não trava phishing nem malware.',
  prompt: 'Ligaste uma VPN. De que é que ela te protege mesmo?',
  options: [
    { id: 'a', text: 'De sites de phishing' },
    { id: 'b', text: 'De quem está na mesma rede Wi-Fi ver o teu tráfego' },
    { id: 'c', text: 'De malware que já está no portátil' },
    { id: 'd', text: 'De o site saber quem és depois do login' },
  ],
  answer: 'b',
  explanation: 'A VPN esconde o tráfego da rede local, mas o fornecedor da VPN passa a vê-lo. Para phishing e malware precisas de outras defesas, como MFA e atualizações.',
});
