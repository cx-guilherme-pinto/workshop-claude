import { answer, normalize } from '../../templates/answer.js';
import { fromBase64 } from '../../lib/hash.js';

const TOKEN = 'cGFwZWw9bGVpdG9y';

export default answer({
  id: 'cr-02',
  title: 'O cookie em Base64',
  category: 'cryptography',
  difficulty: 1,
  concept: 'Base64 é uma forma de escrever bytes como texto, não uma cifra: qualquer pessoa o reverte.',
  prompt: 'Este cookie parece cifrado, mas está só em Base64. O que diz depois de descodificado?',
  scenario: {
    kind: 'text',
    label: 'Cookie guardado no browser',
    lines: [
      'sessao=cGFwZWw9bGVpdG9y',
    ],
  },
  placeholder: 'Texto descodificado',
  check: (n) => n === normalize(fromBase64(TOKEN)),
  explanation: 'Qualquer pessoa descodifica o cookie e pode trocá-lo por papel=admin. Guarda o papel no servidor ou assina o cookie, em vez de confiar no Base64.',
});
