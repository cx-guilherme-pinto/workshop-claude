import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'cr-08',
  title: 'Guardar passwords: do pior ao melhor',
  category: 'criptografia',
  difficulty: 2,
  concept: 'Passwords guardam-se com um hash lento e com salt, feito de propósito para custar a testar.',
  prompt: 'Ordena estas formas de guardar passwords, da pior à melhor.',
  items: [
    { id: 'a', text: 'SHA-256 com salt' },
    { id: 'b', text: 'Texto simples' },
    { id: 'c', text: 'Argon2id com salt' },
    { id: 'd', text: 'MD5 sem salt' },
  ],
  answer: ['b', 'd', 'a', 'c'],
  explanation: 'O SHA-256 é rápido de mais: uma placa gráfica testa milhares de milhões de palpites por segundo. Usa Argon2id, scrypt ou bcrypt, que são lentos de propósito.',
});
