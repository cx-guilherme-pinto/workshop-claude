import { choice } from '../../templates/choice.js';

export default choice({
  id: 'rd-08',
  title: 'Onde ligar as câmaras baratas',
  category: 'networks',
  difficulty: 2,
  concept: 'Separar dispositivos pouco fiáveis numa rede própria limita o estrago se forem atacados.',
  prompt: 'Compraste câmaras Wi-Fi baratas para casa. Onde as ligas?',
  options: [
    { id: 'a', text: 'Na mesma rede do portátil do trabalho' },
    { id: 'b', text: 'Numa rede separada, como a de convidados' },
    { id: 'c', text: 'Diretamente à internet, sem router' },
    { id: 'd', text: 'Em qualquer rede, desde que tenha password' },
  ],
  answer: 'b',
  explanation: 'Se uma câmara for atacada, numa rede separada não chega ao portátil nem aos teus ficheiros. Muda-lhe também a password de fábrica e atualiza o firmware.',
});
