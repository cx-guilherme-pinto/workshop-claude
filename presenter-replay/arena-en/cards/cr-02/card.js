import { answer, normalize } from '../../templates/answer.js';
import { fromBase64 } from '../../lib/hash.js';

const TOKEN = 'cm9sZT1yZWFkZXI=';

export default answer({
  id: 'cr-02',
  title: 'The Base64 cookie',
  category: 'cryptography',
  difficulty: 1,
  concept: 'Base64 is a way of writing bytes as text, not a cipher: anyone can reverse it.',
  prompt: 'This cookie looks encrypted, but it is only Base64. What does it say once decoded?',
  scenario: {
    kind: 'text',
    label: 'Cookie stored in the browser',
    lines: [
      'session=cm9sZT1yZWFkZXI=',
    ],
  },
  placeholder: 'Decoded text',
  check: (n) => n === normalize(fromBase64(TOKEN)),
  explanation: 'Anyone can decode the cookie and swap it for role=admin. Keep the role on the server or sign the cookie, instead of trusting Base64.',
});
