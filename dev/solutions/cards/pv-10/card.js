import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'pv-10',
  title: 'Quem vê a tua publicação?',
  category: 'privacidade',
  difficulty: 1,
  concept: 'Cada nível de partilha alarga quem vê o que publicas; o mais restrito é o mais privado.',
  prompt: 'Ordena as opções de partilha, da mais privada à mais pública.',
  items: [
    { id: 'a', text: 'Amigos' },
    { id: 'b', text: 'Só eu' },
    { id: 'c', text: 'Público' },
    { id: 'd', text: 'Amigos de amigos' },
  ],
  answer: ['b', 'a', 'd', 'c'],
  explanation: 'Amigos de amigos podem ser milhares de desconhecidos. Escolhe Amigos por omissão e revê as publicações antigas.',
});
