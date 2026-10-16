import { escolha } from '../../templates/escolha.js';

export default escolha({
  id: 'rd-10',
  title: 'Aviso de certificado',
  category: 'redes',
  difficulty: 1,
  concept: 'Um aviso de certificado pode ser sinal de que alguém está a intercetar a ligação.',
  prompt: "No Wi-Fi do hotel, o browser avisa 'A ligação não é privada' ao abrir loja.example. O que fazes?",
  options: [
    { id: 'a', text: "Carrego em 'Avançar mesmo assim'" },
    { id: 'b', text: 'Saio da página e não escrevo dados' },
    { id: 'c', text: 'Recarrego até o aviso desaparecer' },
    { id: 'd', text: 'Desligo o antivírus' },
  ],
  answer: 'b',
  explanation: 'Um certificado inválido pode querer dizer que alguém se pôs no meio da ligação. Sai, usa os dados móveis e tenta mais tarde.',
});
