import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'mb-06',
  title: 'Perdeste o telemóvel',
  category: 'mobile',
  difficulty: 1,
  concept: 'Bloquear e apagar à distância protege os dados de um telemóvel perdido.',
  prompt: 'Perdeste o telemóvel com o email da empresa. O que fazes primeiro?',
  explanation: 'Com a função de encontrar o dispositivo, localizas, bloqueias e apagas o telemóvel. Avisa a empresa para terminar as sessões abertas.',
  options: [
    { id: 'a', text: 'Espero que alguém o devolva' },
    { id: 'b', text: 'Bloqueio-o à distância, apago-o se for preciso e aviso a empresa' },
    { id: 'c', text: 'Publico nas redes sociais que o perdi' },
    { id: 'd', text: 'Compro outro e esqueço o assunto' },
  ],
  answer: 'b',
});
