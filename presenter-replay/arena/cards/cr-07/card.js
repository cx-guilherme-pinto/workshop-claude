import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'cr-07',
  title: 'Da chave mais fraca à mais forte',
  category: 'criptografia',
  difficulty: 1,
  concept: 'Cada bit a mais numa chave duplica o número de chaves que um atacante tem de testar.',
  prompt: 'Ordena estas cifras, da chave mais fraca à mais forte.',
  explanation: 'César e DES partem-se por força bruta; o AES-128 já está fora de alcance e o AES-256 dá margem extra. Usa AES com chaves de 128 ou 256 bits.',
  items: [
    { id: 'a', text: 'DES (56 bits)' },
    { id: 'b', text: 'AES-128' },
    { id: 'c', text: 'AES-256' },
    { id: 'd', text: 'César (25 chaves)' },
  ],
  answer: ['d', 'a', 'b', 'c'],
});
