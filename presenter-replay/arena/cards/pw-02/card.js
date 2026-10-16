import { ordenar } from '../../templates/ordenar.js';

export default ordenar({
  id: 'pw-02',
  title: 'Do segundo fator mais forte ao mais fraco',
  category: 'passwords',
  difficulty: 1,
  concept: 'Nem todo o segundo fator protege o mesmo: os que resistem a phishing ficam no topo.',
  prompt: 'Ordena estas formas de entrar numa conta, da mais segura para a menos segura.',
  explanation: 'Chaves de segurança e passkeys não funcionam num site falso, por isso resistem a phishing. O SMS pode ser desviado com uma troca de SIM, mas ainda é melhor do que só a password.',
  items: [
    { id: 'a', text: 'Código por SMS' },
    { id: 'b', text: 'Só password' },
    { id: 'c', text: 'Chave de segurança ou passkey' },
    { id: 'd', text: 'App autenticadora (código de 6 dígitos)' },
  ],
  answer: ['c', 'd', 'a', 'b'],
});
