import { answer } from '../../templates/answer.js';

export default answer({
  id: 'rd-07',
  title: 'DNS que ninguém lê',
  category: 'networks',
  difficulty: 2,
  concept: 'O DNS tradicional viaja sem cifra; o DoH esconde os nomes que consultas.',
  prompt: 'Que sigla designa o DNS cifrado dentro de HTTPS?',
  placeholder: 'Sigla',
  accept: ['DoH', 'DNS over HTTPS', 'DNS sobre HTTPS'],
  explanation: 'Sem cifra, quem está na rede vê e pode falsificar os nomes que pedes. Ativa o DNS cifrado (DoH ou DoT) no browser ou no sistema.',
});
