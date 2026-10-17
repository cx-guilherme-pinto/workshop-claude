import { answer, normalize } from '../../templates/answer.js';
import { caesar } from '../../lib/hash.js';

const CIPHER = 'DWWDFN DW QRRQ';

export default answer({
  id: 'cr-01',
  title: "Decrypt Caesar's message",
  category: 'cryptography',
  difficulty: 1,
  concept: 'The Caesar cipher replaces each letter with another one a fixed distance away. With only 25 keys, it breaks in seconds.',
  prompt: 'You intercepted a message encrypted with the Caesar cipher, with a shift of 3. What does it say?',
  scenario: {
    kind: 'text',
    label: 'Intercepted message',
    lines: [
      CIPHER,
    ],
  },
  check: (n) => n === normalize(caesar(CIPHER, -3)),
  explanation: 'Each letter moves back 3 places: D becomes A, W becomes T. An attacker tries all 25 keys in seconds. It is for learning, not for protecting.',
});
