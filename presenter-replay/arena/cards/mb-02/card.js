import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'mb-02',
  title: 'O jogo pago de graça',
  category: 'mobile',
  difficulty: 1,
  concept: 'Apps instaladas fora das lojas oficiais são a principal porta de entrada de malware no telemóvel.',
  prompt: 'Um amigo envia-te o APK de um jogo pago, \'de graça\'. O que fazes?',
  explanation: 'Apps pirateadas trazem muitas vezes malware escondido. Instala só da loja oficial e mantém desligada a instalação de origens desconhecidas.',
  options: [
    { id: 'a', text: 'Instalo e ativo \'origens desconhecidas\'' },
    { id: 'b', text: 'Não instalo; uso só a loja oficial' },
    { id: 'c', text: 'Instalo e depois corro um antivírus' },
    { id: 'd', text: 'Instalo num telemóvel antigo' },
  ],
  answer: 'b',
});
