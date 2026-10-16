import { resposta, normalizar } from '../../templates/resposta.js';
import { cesar } from '../../lib/hash.js';

const CIPHER = 'DWWDFN DW QRRQ';

export default resposta({
  id: 'cr-01',
  title: "Decrypt Caesar's message",
  category: 'criptografia',
  difficulty: 1,
  concept: 'The Caesar cipher replaces each letter with another one a fixed distance away. With only 25 keys, it breaks in seconds.',
  prompt: 'You intercepted a message encrypted with the Caesar cipher, with a shift of 3. What does it say?',
  scenario: {
    kind: 'texto',
    label: 'Intercepted message',
    lines: [
      CIPHER,
    ],
  },
  check: (n) => n === normalizar(cesar(CIPHER, -3)),
  explanation: 'Each letter moves back 3 places: D becomes A, W becomes T. An attacker tries all 25 keys in seconds. It is for learning, not for protecting.',
});
