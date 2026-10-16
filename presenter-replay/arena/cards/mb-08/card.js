import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'mb-08',
  title: 'Carregar no aeroporto',
  category: 'mobile',
  difficulty: 2,
  concept: 'Uma porta USB pública pode trocar dados com o telemóvel, não só energia.',
  prompt: 'No aeroporto, queres carregar o telemóvel. O que é mais seguro?',
  explanation: "Pela tomada só passa energia. Se usares uma porta USB, nunca aceites 'Confiar neste computador'.",
  options: [
    { id: 'a', text: "Usar a porta USB e aceitar 'Confiar neste computador'" },
    { id: 'b', text: 'Usar o teu carregador numa tomada, ou um bloqueador de dados USB' },
    { id: 'c', text: 'Usar a porta USB com o Wi-Fi desligado' },
    { id: 'd', text: 'Usar a porta USB com o telemóvel em silêncio' },
  ],
  answer: 'b',
});
