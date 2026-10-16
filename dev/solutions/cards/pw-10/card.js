import { resposta } from '../../templates/resposta.js';

export default resposta({
  id: 'pw-10',
  title: 'Entrar sem password',
  category: 'passwords',
  difficulty: 2,
  concept: 'Uma passkey troca a password por um par de chaves: a chave privada nunca sai do teu dispositivo.',
  prompt: 'Que nome tem a credencial que substitui a password por um par de chaves guardado no telemóvel ou no computador?',
  placeholder: 'Uma palavra',
  accept: ['passkey', 'passkeys', 'chave de acesso', 'chaves de acesso'],
  explanation: 'A passkey só funciona no domínio verdadeiro e o servidor guarda apenas a chave pública, por isso não há segredo para roubar. Ativa-a nos sites que a oferecem.',
});
