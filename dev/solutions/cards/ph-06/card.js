import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'ph-06',
  title: 'Lê o URL pela ordem certa',
  category: 'phishing',
  difficulty: 2,
  concept: 'O domínio é o que fica entre :// e a primeira barra; é ele que diz de quem é o site.',
  prompt: 'Ordena as partes deste URL, da esquerda para a direita: https://bancoluz.example/entrar?ref=email',
  items: [
    { id: 'a', text: '?ref=email (parâmetros)' },
    { id: 'b', text: 'https:// (protocolo)' },
    { id: 'c', text: 'bancoluz.example (domínio)' },
    { id: 'd', text: '/entrar (caminho)' },
  ],
  answer: ['b', 'c', 'd', 'a'],
  explanation: "Só o domínio diz quem controla o site; o caminho e os parâmetros podem ter qualquer texto, até 'bancoluz'. Encontra o domínio antes de confiar.",
});
