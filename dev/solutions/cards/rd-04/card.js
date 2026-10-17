import { order } from '../../templates/order.js';

export default order({
  id: 'rd-04',
  title: 'O que acontece ao abrir um site HTTPS',
  category: 'networks',
  difficulty: 2,
  concept: 'Antes de qualquer dado seguir cifrado, o browser confirma o certificado do servidor.',
  prompt: 'Abres https://loja.example. Ordena os passos, do primeiro ao último.',
  items: [
    { id: 'a', text: 'O servidor envia o seu certificado' },
    { id: 'b', text: 'Abre-se a ligação TCP ao servidor' },
    { id: 'c', text: 'O DNS traduz loja.example num endereço IP' },
    { id: 'd', text: 'O pedido HTTP segue cifrado' },
    { id: 'e', text: 'O browser valida o certificado' },
  ],
  answer: ['c', 'b', 'a', 'e', 'd'],
  explanation: 'Se o certificado não for válido para loja.example, o browser para antes de enviar dados. Nunca ignores esse aviso.',
});
